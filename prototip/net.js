// PomoDoors · Supabase bağlantısı.
// Takma adla giriş arka planda anonim oturumla yapılır; e-posta ya da parola yok.
// Yayınlanabilir (publishable) anahtar istemcide durabilir; kimin neyi okuyup yazabileceğini
// veritabanı kuralları (RLS) ve sunucu fonksiyonları belirler.

const net = (() => {
  const PROJECT_URL = 'https://ajwnzpxpducoxtgpsrwa.supabase.co';
  const PUBLISHABLE_KEY = 'sb_publishable_muVQ25OLJYvPFMHLyOAXCw_EHuDLPWA';
  const MOVE_INTERVAL_MS = 100;

  const db = supabase.createClient(PROJECT_URL, PUBLISHABLE_KEY);
  // room: girilen odanın kimliği (ortak, ders, kod, yazi ya da ev sahibi odası r-xxxxxxxx).
  const api = { offset: 0, userId: null, room: 'ortak' };
  let lobby = null;
  let lobbySubscribed = false;
  let lobbyWanted = false;
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
  api.createProfile = (nickname, look) =>
    check(db.from('profiles').insert({ id: api.userId, nickname, look }).select().single());
  api.updateProfile = (fields) =>
    check(db.from('profiles').update(fields).eq('id', api.userId).select().single());

  // Sunucu saatiyle aradaki fark; aşamalar herkeste aynı anda değişsin diye.
  api.syncClock = async () => {
    const sentAt = Date.now();
    const serverNow = await check(db.rpc('server_now'));
    const receivedAt = Date.now();
    api.offset = Date.parse(serverNow) - (sentAt + receivedAt) / 2;
  };

  api.loadParticipation = (turnStartedAt) => check(db.from('participations').select('*')
    .eq('room_id', api.room).eq('turn_started_at', turnStartedAt).eq('user_id', api.userId).maybeSingle());

  api.loadRoom = (id = api.room) => check(db.from('rooms').select('*').eq('id', id).maybeSingle());
  api.createRoom = (name) => check(db.rpc('create_room', { p_name: name }));
  api.leaderboard = () => check(db.rpc('week_leaderboard'));
  api.companions = () => check(db.rpc('week_companions'));
  api.setRoomTiming = (focus, brk) =>
    check(db.rpc('set_room_timing', { p_room: api.room, p_focus: focus, p_break: brk }));
  api.joinTurn = (intent) => check(db.rpc('join_turn', { p_room: api.room, p_intent: intent || null }));
  api.leaveTurn = () => check(db.rpc('leave_turn', { p_room: api.room }));
  api.claimReward = () => check(db.rpc('claim_reward', { p_room: api.room }));
  api.plantSeed = (index, kind) => check(db.rpc('plant_seed', { p_index: index, p_kind: kind, p_room: api.room }));
  api.buySeed = (kind) => check(db.rpc('buy_seed', { p_kind: kind }));
  api.harvest = (index) => check(db.rpc('harvest', { p_index: index, p_room: api.room }));
  api.buyCabinItem = (item) => check(db.rpc('buy_cabin_item', { p_item: item }));
  api.history = () => check(db.rpc('my_history'));
  api.weekMinutes = () => check(db.rpc('room_week_minutes', { p_room: api.room }));

  api.loadMessages = (sinceIso) => check(db.from('messages').select('*')
    .eq('room_id', api.room).gte('created_at', sinceIso).order('created_at').limit(100));
  api.sendMessage = (body) => check(db.from('messages').insert({ room_id: api.room, body }).select().single());

  // Oda kanalı: kimlerin odada olduğu (presence), molada karakter konumları (broadcast),
  // oda süreleri ve yeni mesajlar (veritabanı değişiklikleri). Tur, duvar saatine hizalı döngüden hesaplanır.
  api.connect = (handlers) => {
    channel = db.channel(`room:${api.room}`, {
      config: { presence: { key: api.userId }, broadcast: { self: false } },
    });
    channel
      .on('presence', { event: 'sync' }, () => handlers.presence(channel.presenceState()))
      .on('broadcast', { event: 'move' }, ({ payload }) => handlers.move(payload))
      .on('broadcast', { event: 'emote' }, ({ payload }) => handlers.emote(payload))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${api.room}` },
        ({ new: row }) => handlers.room(row))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${api.room}` },
        ({ new: row }) => handlers.message(row))
      .subscribe((status) => {
        subscribed = status === 'SUBSCRIBED';
        if (subscribed) {
          lastPresence = '';
          handlers.ready();
        }
      });
  };

  api.disconnect = async () => {
    subscribed = false;
    lastPresence = '';
    if (channel) {
      const old = channel;
      channel = null;
      await old.untrack().catch(() => {});
      await db.removeChannel(old);
    }
  };

  api.leaveImmediately = () => {
    subscribed = false;
    lobbySubscribed = false;
    lastPresence = '';
    const ch = channel;
    const lb = lobby;
    channel = null;
    lobby = null;
    try { if (ch) ch.untrack(); } catch {}
    try { if (lb) lb.untrack(); } catch {}
    try { db.realtime?.disconnect?.(); } catch {}
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

  function tabKey() {
    try {
      let key = sessionStorage.getItem('pomodoors.tab');
      if (!key) {
        key = `t-${Math.random().toString(36).slice(2)}`;
        sessionStorage.setItem('pomodoors.tab', key);
      }
      return key;
    } catch {
      return `v-${Math.random().toString(36).slice(2)}`;
    }
  }

  // Lobi: herkes hangi odada olduğunu burada da paylaşır; giriş ekranı oturum açmadan sayıları okur.
  api.watchLobby = (onCounts) => {
    if (lobby) db.removeChannel(lobby).catch(() => {});
    lobby = db.channel('lobby', { config: { presence: { key: tabKey() } } });
    lobby
      .on('presence', { event: 'sync' }, () => {
        const counts = {};
        Object.values(lobby.presenceState()).forEach((entries) => {
          const entry = entries[0];
          if (entry && entry.room) counts[entry.room] = (counts[entry.room] || 0) + 1;
        });
        onCounts(counts);
      })
      .subscribe((status) => {
        lobbySubscribed = status === 'SUBSCRIBED';
        if (lobbySubscribed && lobbyWanted) lobby.track({ room: api.room });
      });
  };

  api.trackLobby = () => {
    lobbyWanted = true;
    if (lobby && lobbySubscribed) lobby.track({ room: api.room });
  };

  return api;
})();
