// PomoDoors · Supabase bağlantısı.
// Takma adla giriş arka planda anonim oturumla yapılır; e-posta ya da parola yok.
// Yayınlanabilir (publishable) anahtar istemcide durabilir; kimin neyi okuyup yazabileceğini
// veritabanı kuralları (RLS) ve sunucu fonksiyonları belirler.

const net = (() => {
  const PROJECT_URL = 'https://ajwnzpxpducoxtgpsrwa.supabase.co';
  const PUBLISHABLE_KEY = 'sb_publishable_muVQ25OLJYvPFMHLyOAXCw_EHuDLPWA';
  const ROOM = 'ortak';
  const MOVE_INTERVAL_MS = 100;

  const db = supabase.createClient(PROJECT_URL, PUBLISHABLE_KEY);
  const api = { offset: 0, userId: null, room: ROOM };
  let channel = null;
  let subscribed = false;
  let lastPresence = '';
  let lastMoveAt = 0;

  async function check(request) {
    const { data, error } = await request;
    if (error) throw error;
    return data;
  }

  api.restoreSession = async () => {
    const { data } = await db.auth.getSession();
    api.userId = data.session?.user?.id ?? null;
    return api.userId;
  };

  api.signIn = async () => {
    const data = await check(db.auth.signInAnonymously());
    api.userId = data.user.id;
    return api.userId;
  };

  api.loadProfile = () => check(db.from('profiles').select('*').eq('id', api.userId).maybeSingle());
  api.createProfile = (nickname, avatar) =>
    check(db.from('profiles').insert({ id: api.userId, nickname, avatar }).select().single());
  api.updateProfile = (fields) =>
    check(db.from('profiles').update(fields).eq('id', api.userId).select().single());

  // Sunucu saatiyle aradaki fark; aşamalar herkeste aynı anda değişsin diye.
  api.syncClock = async () => {
    const sentAt = Date.now();
    const serverNow = await check(db.rpc('server_now'));
    const receivedAt = Date.now();
    api.offset = Date.parse(serverNow) - (sentAt + receivedAt) / 2;
  };

  api.loadRoom = () => check(db.from('rooms').select('*').eq('id', ROOM).single());
  api.loadParticipation = (turnStartedAt) => check(db.from('participations').select('*')
    .eq('room_id', ROOM).eq('turn_started_at', turnStartedAt).eq('user_id', api.userId).maybeSingle());

  api.startTurn = (minutes, intent) =>
    check(db.rpc('start_turn', { p_room: ROOM, p_minutes: minutes, p_intent: intent || null }));
  api.joinTurn = (intent) => check(db.rpc('join_turn', { p_room: ROOM, p_intent: intent || null }));
  api.leaveTurn = () => check(db.rpc('leave_turn', { p_room: ROOM }));
  api.claimReward = () => check(db.rpc('claim_reward', { p_room: ROOM }));
  api.plantSeed = (index) => check(db.rpc('plant_seed', { p_index: index }));
  api.weekMinutes = () => check(db.rpc('room_week_minutes', { p_room: ROOM }));

  api.loadMessages = (sinceIso) => check(db.from('messages').select('*')
    .eq('room_id', ROOM).gte('created_at', sinceIso).order('created_at').limit(100));
  api.sendMessage = (body) => check(db.from('messages').insert({ room_id: ROOM, body }).select().single());

  // Oda kanalı: kimlerin odada olduğu (presence), molada karakter konumları (broadcast),
  // tur başlangıcı ve yeni mesajlar (veritabanı değişiklikleri).
  api.connect = (handlers) => {
    channel = db.channel(`room:${ROOM}`, {
      config: { presence: { key: api.userId }, broadcast: { self: false } },
    });
    channel
      .on('presence', { event: 'sync' }, () => handlers.presence(channel.presenceState()))
      .on('broadcast', { event: 'move' }, ({ payload }) => handlers.move(payload))
      .on('broadcast', { event: 'emote' }, ({ payload }) => handlers.emote(payload))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${ROOM}` },
        ({ new: row }) => handlers.room(row))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${ROOM}` },
        ({ new: row }) => handlers.message(row))
      .subscribe((status) => {
        subscribed = status === 'SUBSCRIBED';
        if (subscribed) {
          lastPresence = '';
          handlers.ready();
        }
      });
  };

  api.track = (payload) => {
    const text = JSON.stringify(payload);
    if (!subscribed || text === lastPresence) return;
    lastPresence = text;
    channel.track(payload);
  };

  api.sendMove = (position, force = false) => {
    const now = performance.now();
    if (!subscribed || (!force && now - lastMoveAt < MOVE_INTERVAL_MS)) return;
    lastMoveAt = now;
    channel.send({ type: 'broadcast', event: 'move', payload: { id: api.userId, ...position } });
  };

  api.sendEmote = (kind) => {
    if (subscribed) channel.send({ type: 'broadcast', event: 'emote', payload: { id: api.userId, kind } });
  };

  return api;
})();
