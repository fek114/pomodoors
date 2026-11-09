// PomoDoors · oda.
// Oda durumu, katılımlar, ödüller ve sohbet Supabase'te tutulur (net.js); kurallar sunucuda uygulanır.
// Bu dosya arayüzü çizer ve sunucudan gelen durumu yerel aşama akışına çevirir.
// Avatar seti avatars.js, bahçe sahnesi scene.js içinde.

const BREAK_MINUTES = 5;
const MAX_INTENT = 80;
// İlk kişi her zaman kullanıcının kendisi; diğerleri odaya bağlanınca presence ile gelir.
const people = [
  { id: 'me', name: 'Sen', avatar: 'gozluklu', intent: '' },
];
const me = people[0];
const personById = (id) => people.find((person) => person.id === id);

// Yalnızca içinde bulunulan molanın mesajları: { id, author, name, avatar, text }
const messages = [];

const state = {
  view: 'room',         // 'room' | 'profile'
  phase: 'waiting',     // 'waiting' | 'focus' | 'break'
  duration: 25,         // seçili odak süresi (dk)
  phaseTotal: 0,        // aktif aşamanın toplam süresi (sn)
  endsAt: 0,            // aktif aşamanın bitiş zamanı (ms)
  participation: 'in',  // bu odak turunda: 'in' katılıyor | 'none' henüz katılmadı | 'left' ayrıldı
  late: false,          // tur başladıktan sonra mı katıldı
  joinedAt: 0,
  focusedMs: 0,         // bu turda biriken odak süresi; ayrılıp dönülürse toplanır
  turnIntent: '',
  summary: null,        // yalnızca önceki tura katılan kullanıcı için { kind, minutes, intent, reward }
  sound: false,
  room: { startedIso: null, startedAt: 0, minutes: 25 },  // sunucudaki oda satırı
  turnStart: 0,         // yerelde işlenen turun başlangıcı (sunucu saati, ms)
  myPart: null,         // bu turdaki katılım satırı
  online: false,
};

/* Oyun öğeleri: sahte, yalnızca bu sayfada. Kazanılan hiçbir şey geri alınmaz. */

const XP_PER_LEVEL = 100;      // 1 dk odak = 1 XP = 1 Yaprak
const MINUTES_PER_GROWTH = 5;  // her 5 dk odak bahçede bir büyüme adımı
const MAX_STAGE = 4;           // 0 boş tarh · 1 tohum · 2 filiz · 3 genç bitki · 4 çiçek

const SHOW_KEY = 'pomodoors.show';

const game = {
  xp: 0,
  leaves: 0,
  streak: 0,
  weekMinutes: 0,
  roomWeekMinutes: 0,   // ortak bahçe: odadakilerin bu hafta birlikte topladığı dakikalar
  growthCarry: 0,       // bir sonraki büyüme adımına biriken dakikalar
  garden: [],
  show: { garden: true, xp: true, streak: true, board: true, ...readShow() },
};

// Görünürlük tercihleri yalnızca bu tarayıcıda saklanır; okunamazsa varsayılanlar kullanılır.
function readShow() {
  try {
    return JSON.parse(localStorage.getItem(SHOW_KEY)) || {};
  } catch {
    return {};
  }
}

function saveShow() {
  try {
    localStorage.setItem(SHOW_KEY, JSON.stringify(game.show));
  } catch {
    // Tarayıcı depolaması kapalıysa tercih bu oturumla sınırlı kalır.
  }
}

const levelOf = (xp) => Math.floor(xp / XP_PER_LEVEL) + 1;

/* 16×16 ve 8×8 piksel sprite'lar. Her harf bir renk sınıfı, nokta boş piksel. */

const PX = { g: 'px-leaf', G: 'px-leaf-dark', s: 'px-stem', f: 'px-petal', y: 'px-gold', b: 'px-seed', d: 'px-soil', D: 'px-soil-dark' };
const rowsOf = (size, map) => Array.from({ length: size }, (_, i) => map[i] || '');

const SOIL = { 12: '..dddddddddddd..', 13: '.dDdddDddddDddd.', 14: '.ddddDdddDdddDd.', 15: '..dddddddddddd..' };
const STEM = { 10: '........s.......', 11: '........s.......' };
const YOUNG = {
  4: '.......gg.......',
  5: '......gGGg......',
  6: '...gg...s..gg...',
  7: '..gGGg..s.gGGg..',
  8: '...gGGgss.gGg...',
  9: '......g.s.g.....',
};
const PLANT_SPRITES = [
  rowsOf(16, SOIL),
  rowsOf(16, { ...SOIL, 11: '......DbbD......' }),
  rowsOf(16, { ...SOIL, ...STEM, 8: '.....gg..gg.....', 9: '......ggsgg.....' }),
  rowsOf(16, { ...SOIL, ...STEM, ...YOUNG }),
  rowsOf(16, {
    ...SOIL, ...STEM, ...YOUNG,
    1: '.......ff.......', 2: '......fyyf......', 3: '.....ffyyff.....', 4: '......fyyf......', 5: '........s.......',
  }),
];
const PIXEL_ICONS = {
  star: ['...y....', '...y....', '..yyy...', 'yyyyyyy.', '.yyyyy..', '..yyy...', '.yy.yy..', '.y...y..'],
  leaf: ['....GGG.', '..GGggG.', '.GgggGG.', '.GggGG..', 'GgGGG...', 'GG......', 'G.......', '........'],
  calendar: ['D.D.D...', 'DDDDDDD.', 'DdddddD.', 'DdDdDdD.', 'DdddddD.', 'DdDdddD.', 'DDDDDDD.', '........'],
  sprout: ['........', '.gg..gg.', '.gGg.gG.', '..gGsG..', '....s...', '....s...', '..dddd..', '.dDddDd.'],
  wave: ['.y.y.y..', '.y.y.y.y', '.yyyyy.y', '.yyyyyyy', 'yyyyyyy.', '.yyyyy..', '..yyy...', '........'],
  heart: ['.ff.ff..', 'fffffff.', 'fffffff.', '.fffff..', '..fff...', '...f....', '........', '........'],
  coffee: ['..y.y...', '.y.y....', 'DDDDDD..', 'DddddDD.', 'DddddD.D', 'DddddDD.', '.DDDD...', '........'],
};

function sprite(rows) {
  let rects = '';
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      let w = 1;
      while (row[x + w] === ch) w += 1;
      if (ch !== '.') rects += `<rect class="${PX[ch]}" x="${x}" y="${y}" width="${w}" height="1"/>`;
      x += w;
    }
  });
  return `<svg class="sprite" viewBox="0 0 ${rows.length} ${rows.length}" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${rects}</svg>`;
}
const pixelIcon = (name) => sprite(PIXEL_ICONS[name]);

const FOCUS_BLOCKS = { in: 'focus', none: 'join', left: 'left' };
const FOCUS_STATUS = { in: 'focus', none: 'none', left: 'left' };
// Durum metni: kullanıcının kendisi için ayrılma ve katılmama ikinci tekil şahısla yazılır.
const statusLabel = (status, mine = false) =>
  (mine && (status === 'left' || status === 'none') ? t(`mystatus.${status}`) : t(`status.${status}`));

// Planlı ortak turlar: her gün bu UTC saatlerinde (İstanbul 10:00, 14:00, 21:00) 25 dk'lık tur kendiliğinden başlar.
const SCHEDULED_UTC_HOURS = [7, 11, 18];

function nextScheduledTurn(at = serverNow()) {
  const day = new Date(at);
  for (let offset = 0; offset < 2; offset += 1) {
    for (const hour of SCHEDULED_UTC_HOURS) {
      const candidate = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate() + offset, hour);
      if (candidate > at) return candidate; // duvar saati; gösterirken kaydırılmaz
    }
  }
  return null;
}

const scheduleTimesText = () => SCHEDULED_UTC_HOURS
  .map((hour) => clockAt(Date.UTC(2026, 0, 1, hour)))
  .join(', ');

const ICONS = {
  waiting: '<circle cx="8" cy="8" r="5.5"/><path d="M8 5.2V8l1.8 1.3"/>',
  focus: '<circle cx="8" cy="8" r="5.5"/><circle cx="8" cy="8" r="2.1" fill="currentColor" stroke="none"/>',
  break: '<path d="M3 6.5h7.5v2.8A3.7 3.7 0 0 1 6.8 13h-.1A3.7 3.7 0 0 1 3 9.3z"/><path d="M10.5 7.6h.9a1.7 1.7 0 0 1 0 3.4h-1.1"/><path d="M5.2 2.6v1.6M8.2 2.6v1.6"/>',
  left: '<path d="M8.5 2.8H4.2v10.4h4.3"/><path d="M7 8h6.8M11.2 5.4 13.8 8l-2.6 2.6"/>',
  none: '<circle cx="8" cy="8" r="5.5" stroke-dasharray="2.4 2.1"/>',
  intent: '<path d="M2.8 13.2l.7-2.9 7.4-7.4a1.5 1.5 0 0 1 2.1 0l.1.1a1.5 1.5 0 0 1 0 2.1l-7.4 7.4z"/><path d="M9.6 4.2l2.2 2.2"/>',
  check: '<path d="M3.8 8.4l2.6 2.6 5.8-6"/>',
};

const $ = (id) => document.getElementById(id);
const els = {
  roomView: $('roomView'),
  profileView: $('profileView'),
  timer: $('timer'),
  phaseName: $('phaseName'),
  phaseDetail: $('phaseDetail'),
  stageMeta: $('stageMeta'),
  progress: $('progress'),
  progressFill: $('progressFill'),
  blocks: document.querySelectorAll('[data-block]'),
  startForm: $('startForm'),
  intentInput: $('intentInput'),
  intentCount: $('intentCount'),
  durations: $('durations'),
  durationInputs: document.querySelectorAll('input[name="duration"]'),
  startBtn: $('startBtn'),
  startNote: $('startNote'),
  myIntent: $('myIntent'),
  lateNote: $('lateNote'),
  leaveBtn: $('leaveBtn'),
  leftSummary: $('leftSummary'),
  rejoinBtn: $('rejoinBtn'),
  summaryCard: $('summaryCard'),
  summaryLine: $('summaryLine'),
  summaryIntent: $('summaryIntent'),
  breakNote: $('breakNote'),
  peopleList: $('peopleList'),
  peopleCount: $('peopleCount'),
  chatState: $('chatState'),
  chatLocked: $('chatLocked'),
  lockedTitle: $('lockedTitle'),
  lockedText: $('lockedText'),
  messages: $('messages'),
  composer: $('composer'),
  msgInput: $('msgInput'),
  sendBtn: $('sendBtn'),
  avatarGrid: $('avatarGrid'),
  profilePreview: $('profilePreview'),
  avatarLabel: $('avatarLabel'),
  profileDone: $('profileDone'),
  leaveDialog: $('leaveDialog'),
  leaveMinutes: $('leaveMinutes'),
  banner: $('phaseBanner'),
  soundToggle: $('soundToggle'),
  soundState: $('soundState'),
  meAvatar: $('meAvatar'),
  joinView: $('joinView'),
  joinForm: $('joinForm'),
  nicknameInput: $('nicknameInput'),
  joinBtn: $('joinBtn'),
  joinError: $('joinError'),
  communalText: $('communalText'),
  joinSchedule: $('joinSchedule'),
  langToggle: $('langToggle'),
  emoteButtons: document.querySelectorAll('[data-emote]'),
  stats: $('stats'),
  summaryReward: $('summaryReward'),
  gardenCaption: $('gardenCaption'),
  boardSection: $('boardSection'),
  gameToggles: document.querySelectorAll('[data-game]'),
};

const clockAt = (ms) => new Intl.DateTimeFormat(lang === 'tr' ? 'tr-TR' : 'en-GB', { hour: '2-digit', minute: '2-digit' }).format(new Date(ms));
const minutesText = (minutes) => (minutes < 1 ? t('time.short') : t('time.min', { n: minutes }));
const remainingSeconds = () => Math.max(0, Math.ceil((state.endsAt - Date.now()) / 1000));
const focusedMinutesSoFar = () =>
  Math.floor((state.focusedMs + (state.participation === 'in' ? Date.now() - state.joinedAt : 0)) / 60000);

const icon = (name) =>
  `<svg class="icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
const avatarMarkup = (id) => `<span class="avatar">${avatarSvg(id)}</span>`;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function clearMyIntent() {
  me.intent = '';
  els.intentInput.value = '';
  els.intentCount.textContent = `0/${MAX_INTENT}`;
}

/* Aşama geçişleri: sunucudaki oda satırından hesaplanır */

const serverNow = () => Date.now() + net.offset;
const toLocal = (serverMs) => serverMs - net.offset;

function roomPhase(at = serverNow()) {
  const { startedAt, minutes } = state.room;
  if (!startedAt) return 'waiting';
  if (at < startedAt + minutes * 60000) return 'focus';
  if (at < startedAt + (minutes + BREAK_MINUTES) * 60000) return 'break';
  return 'waiting';
}

function setRoom(row) {
  state.room = {
    startedIso: row.started_at,
    startedAt: row.started_at ? Date.parse(row.started_at) : 0,
    minutes: row.focus_minutes,
  };
}

function applyParticipation(part) {
  state.myPart = part || null;
  if (!part) {
    state.participation = 'none';
    state.late = false;
    state.focusedMs = 0;
    return;
  }
  state.participation = part.left_at ? 'left' : 'in';
  state.late = part.late;
  state.joinedAt = toLocal(Date.parse(part.joined_at));
  state.focusedMs = part.focused_seconds * 1000;
  state.turnIntent = part.intent || '';
}

function syncPhase({ silent = false } = {}) {
  const phase = roomPhase();
  const newTurn = phase === 'focus' && state.room.startedAt !== state.turnStart;
  if (phase !== state.phase || newTurn) enterPhase(phase, { silent });
}

function enterPhase(phase, { silent = false } = {}) {
  const { startedAt, minutes } = state.room;
  const previousTurn = state.turnStart;
  state.phase = phase;

  if (phase === 'focus') {
    state.turnStart = startedAt;
    state.duration = minutes;
    state.phaseTotal = minutes * 60;
    state.endsAt = toLocal(startedAt + minutes * 60000);
    state.summary = null;
    if (previousTurn !== startedAt) {
      applyParticipation(state.myPart && state.myPart.turn_started_at === state.room.startedIso ? state.myPart : null);
      loadParticipation();
    }
  } else if (phase === 'break') {
    state.turnStart = startedAt;
    state.phaseTotal = BREAK_MINUTES * 60;
    state.endsAt = toLocal(startedAt + (minutes + BREAK_MINUTES) * 60000);
    messages.length = 0;
    loadBreak();
  } else {
    state.phaseTotal = 0;
    state.summary = null;
    messages.length = 0;
    // Niyetler yeni tura taşınmaz.
    clearMyIntent();
  }

  render();
  if (!silent) announcePhase(phase);
}

async function loadParticipation() {
  const iso = state.room.startedIso;
  try {
    const part = await net.loadParticipation(iso);
    if (state.room.startedIso === iso) {
      applyParticipation(part);
      render();
    }
  } catch (error) {
    console.error(error);
  }
}

// Molada: önceki tura katılan kullanıcının ödülü sunucuda hesaplanır, sonra sohbet yüklenir.
async function loadBreak() {
  const { startedAt, minutes } = state.room;
  const breakIso = new Date(startedAt + minutes * 60000).toISOString();
  try {
    const [reward, rows] = await Promise.all([net.claimReward(), net.loadMessages(breakIso)]);
    if (reward) {
      state.summary = {
        kind: reward.kind,
        minutes: reward.minutes,
        intent: reward.intent || '',
        reward: reward.minutes > 0 ? reward : null,
      };
      await refreshProfile();
    }
    rows.forEach(addMessage);
    render();
  } catch (error) {
    console.error(error);
  }
}

function addMessage(row) {
  if (messages.some((message) => message.id === row.id)) return;
  messages.push({ id: row.id, author: row.user_id, name: row.nickname, avatar: row.avatar, text: row.body });
}

function applyProfile(profile) {
  me.id = profile.id;
  me.name = profile.nickname;
  me.avatar = profile.avatar;
  game.xp = profile.xp;
  game.leaves = profile.leaves;
  game.streak = profile.streak;
  game.weekMinutes = profile.week_minutes;
  game.growthCarry = profile.growth_carry;
  game.garden = [...profile.garden];
}

async function refreshProfile() {
  const [profile, week] = await Promise.all([net.loadProfile(), net.weekMinutes()]);
  if (profile) applyProfile(profile);
  game.roomWeekMinutes = week;
}

async function startOrJoin() {
  try {
    if (roomPhase() === 'waiting') {
      const room = await net.startTurn(state.duration, me.intent);
      setRoom(room);
      // Aynı anda başka biri başlattıysa kullanıcı kalan süreye katılma seçeneğini görür.
      if (room.started_by === me.id) {
        applyParticipation({
          turn_started_at: room.started_at, joined_at: room.started_at, left_at: null,
          late: false, focused_seconds: 0, intent: me.intent,
        });
        state.myPart.turn_started_at = room.started_at;
      }
      syncPhase();
    } else if (state.phase === 'focus' && state.participation !== 'in') {
      applyParticipation(await net.joinTurn(me.intent));
      render();
    }
  } catch (error) {
    console.error(error);
    showToast(t('toast.error'));
  }
}

async function leaveTurn() {
  try {
    applyParticipation(await net.leaveTurn());
    render();
  } catch (error) {
    console.error(error);
  }
}

function tick() {
  if (!state.online) return;
  syncPhase();
  if (state.phase === 'waiting') return;
  renderClock(remainingSeconds());
}

function showToast(text) {
  els.banner.textContent = text;
  els.banner.classList.add('show');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => els.banner.classList.remove('show'), 4000);
}

function showView(view) {
  if (state.view === view) return;
  state.view = view;
  els.roomView.hidden = view !== 'room';
  els.profileView.hidden = view !== 'profile';
  els.meAvatar.setAttribute('aria-expanded', String(view === 'profile'));
  window.scrollTo(0, 0);
  render();
}

/* Görünüm */

let lastClock = '';

function renderClock(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const text = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  if (text !== lastClock) {
    lastClock = text;
    els.timer.innerHTML = [...text]
      .map((ch) => (ch === ':' ? '<span class="colon">:</span>' : `<span class="digit">${ch}</span>`))
      .join('');
    els.timer.setAttribute('aria-label', t('timer.aria', { m, s }));
  }
  if (state.phaseTotal) {
    els.progressFill.style.width = `${(1 - seconds / state.phaseTotal) * 100}%`;
  }
}

function render() {
  const { phase } = state;
  const block = phase === 'focus' ? FOCUS_BLOCKS[state.participation] : phase;

  document.body.dataset.phase = phase;
  els.phaseName.textContent = t(`phase.${phase}`);
  els.phaseDetail.textContent =
    phase === 'focus' ? t('phase.detailFocus', { n: state.duration })
      : phase === 'break' ? t('phase.detailBreak', { n: BREAK_MINUTES }) : '';
  els.blocks.forEach((node) => { node.hidden = !node.dataset.block.split(' ').includes(block); });
  els.progress.hidden = phase === 'waiting';
  els.timer.classList.toggle('is-idle', block !== 'focus' && block !== 'break');

  if (phase === 'waiting') {
    renderClock(state.duration * 60);
    els.stageMeta.textContent = t('meta.waiting', { time: clockAt(nextScheduledTurn()) });
  } else {
    renderClock(remainingSeconds());
    const end = clockAt(state.endsAt);
    if (phase === 'break') {
      els.stageMeta.textContent = t('meta.break', { time: end });
    } else {
      els.stageMeta.textContent = block === 'focus'
        ? t('meta.focus', { time: end })
        : t('meta.focusOut', { time: end });
    }
  }

  if (block === 'waiting' || block === 'join') {
    const joining = block === 'join';
    els.durations.hidden = joining;
    els.startBtn.textContent = t(joining ? 'start.join' : 'start.button');
    els.startNote.textContent = t(joining ? 'start.joinNote' : 'start.note');
  }
  if (block === 'focus') {
    els.myIntent.textContent = state.turnIntent || t('focus.noIntent');
    els.myIntent.classList.toggle('is-empty', !state.turnIntent);
    els.lateNote.hidden = !state.late;
  }
  if (block === 'left') {
    els.leftSummary.textContent = t('left.saved', { time: minutesText(focusedMinutesSoFar()) });
  }
  if (block === 'break') {
    els.summaryCard.hidden = !state.summary;
    if (state.summary) renderSummary();
    els.breakNote.textContent = state.summary
      ? t('break.noteIn')
      : t('break.noteOut');
  }

  renderPeople();
  renderChat();
  renderProfile();
  renderStats();
  renderGarden();
  renderBoard();
  renderEmotes();
  trackPresence();
}

// Tepkiler yalnızca bekleme ve molada; odakta kimse bölünmesin.
function renderEmotes() {
  const closed = state.phase === 'focus';
  els.emoteButtons.forEach((button) => {
    button.disabled = closed;
    button.title = closed ? t('emote.closed') : '';
  });
}

// Odadakilere görünen bilgiler: ad, avatar, durum, niyet ve bahçenin ilk dört tarhı.
function trackPresence() {
  if (!state.online) return;
  const status = statusOf(me);
  net.track({
    id: me.id,
    name: me.name,
    avatar: me.avatar,
    status,
    intent: status === 'left' ? '' : (state.phase === 'focus' ? state.turnIntent : me.intent),
    garden: game.show.garden ? game.garden.slice(0, 4) : [],
    pos: state.phase === 'focus' ? null : scene.myPosition(),
  });
}

function renderSummary() {
  const { kind, minutes, intent } = state.summary;
  els.summaryLine.textContent = t('summary.line', { time: minutesText(minutes), kind: t(`summary.${kind}`) });
  els.summaryIntent.textContent = intent ? `“${intent}”` : t('summary.noIntent');
  els.summaryIntent.classList.toggle('is-empty', !intent);
  renderReward(state.summary.reward);
}

// Ödül satırları olanı aktarır; kutlama, ünlem ya da kıyas yok.
function renderReward(reward) {
  const lines = [];
  if (reward && game.show.xp) {
    lines.push(['leaf', t('reward.xp', { n: reward.minutes })]);
  }
  if (reward && game.show.garden) {
    lines.push(['sprout', reward.steps
      ? t('reward.steps', { n: reward.steps })
      : t('reward.carry')]);
  }
  if (reward && reward.level && game.show.xp) {
    lines.push(['star', game.show.garden
      ? t('reward.levelGarden', { n: reward.level })
      : t('reward.level', { n: reward.level })]);
  }
  els.summaryReward.innerHTML = lines
    .map(([name, text]) => `<li>${pixelIcon(name)}<span>${text}</span></li>`)
    .join('');
  els.summaryReward.hidden = !lines.length;
}

function renderStats() {
  const items = [];
  if (game.show.xp) {
    const into = game.xp % XP_PER_LEVEL;
    const percent = Math.round((into / XP_PER_LEVEL) * 100);
    items.push(`<li class="stat">${pixelIcon('star')}<span>${t('stats.level', { n: levelOf(game.xp) })}</span>`
      + `<span class="xp-bar" aria-hidden="true"><span style="width:${percent}%"></span></span>`
      + `<span class="visually-hidden">${into} / ${XP_PER_LEVEL} XP</span></li>`);
    items.push(`<li class="stat">${pixelIcon('leaf')}<span>${t('stats.leaves', { n: game.leaves })}</span></li>`);
  }
  if (game.show.streak) {
    items.push(`<li class="stat">${pixelIcon('calendar')}<span>${t('stats.streak', { n: game.streak })}</span></li>`);
  }
  els.stats.innerHTML = items.join('');
  els.stats.hidden = !items.length;
}

// Bitkilerin kendisi sahnede (scene.js) çizilir; burada yalnızca kısa açıklama güncellenir.
function renderGarden() {
  els.gardenCaption.hidden = !game.show.garden;
  if (!game.show.garden) return;
  const planted = game.garden.filter((stage) => stage > 0).length;
  els.gardenCaption.textContent = t('garden.caption', { n: planted, m: MINUTES_PER_GROWTH });
}

// Ortak bahçe: odadakilerin bu hafta birlikte topladığı süre. Kişi bazında sıralama yok.
function renderBoard() {
  els.boardSection.hidden = !game.show.board;
  if (!game.show.board) return;
  els.communalText.textContent = game.roomWeekMinutes
    ? t('board.text', { n: game.roomWeekMinutes })
    : t('board.empty');
}

function statusOf(person) {
  if (state.phase !== 'focus') return state.phase;
  if (person === me) return FOCUS_STATUS[state.participation];
  return ['focus', 'left', 'none'].includes(person.status) ? person.status : 'none';
}

function emptyIntentText(person, status) {
  if (person !== me) return t('intent.emptyOther');
  return status === 'waiting' || status === 'none' ? t('intent.emptyMine') : t('intent.emptyAdded');
}

function personRow(person) {
  const status = statusOf(person);
  const item = el('li', `person is-${status}`);
  item.innerHTML = avatarMarkup(person.avatar);

  const chip = el('span', 'status');
  chip.innerHTML = icon(status);
  chip.append(statusLabel(status, person === me));
  const head = el('div', 'person-head');
  head.append(el('p', 'person-name', person.name), chip);

  const body = el('div', 'person-body');
  body.append(head);
  // Turdan ayrılan kişinin niyeti o tur için gösterilmez.
  if (status !== 'left') {
    const intent = el('p', 'person-intent');
    if (person.intent) {
      intent.innerHTML = icon('intent');
      intent.append(el('span', 'visually-hidden', t('intent.sr')), el('span', '', person.intent));
    } else {
      intent.classList.add('is-empty');
      intent.textContent = emptyIntentText(person, status);
    }
    body.append(intent);
  }
  item.append(body);
  return item;
}

function renderPeople() {
  els.peopleCount.textContent = t('people.count', { n: people.length });
  els.peopleList.replaceChildren(...people.map(personRow));
}

function messageRow({ name, avatar, text }) {
  const item = el('li', 'message');
  item.innerHTML = avatarMarkup(AVATAR_BY_ID[avatar] ? avatar : 'gozluklu');
  const body = el('div', 'message-body');
  body.append(el('p', 'message-name', name), el('p', 'message-text', text));
  item.append(body);
  return item;
}

function renderChat() {
  // Molada sohbet, önceki tura katılıp katılmadığından bağımsız olarak herkese açıktır.
  const open = state.phase === 'break';
  els.chatState.textContent = t(open ? 'chat.open' : 'chat.closed');
  els.chatState.classList.toggle('is-open', open);
  els.chatLocked.hidden = open;
  els.messages.hidden = !open;
  // Kapanırken yazılmakta olan metin silinmez; yalnızca gönderim kapanır.
  els.msgInput.disabled = !open;
  els.msgInput.placeholder = t(open ? 'chat.placeholder' : 'chat.placeholderClosed');
  els.sendBtn.disabled = !open || !els.msgInput.value.trim();

  if (open) {
    els.messages.replaceChildren(...messages.map(messageRow));
  } else if (state.phase === 'focus') {
    els.lockedTitle.textContent = t('chat.focusTitle');
    els.lockedText.textContent = t('chat.focusText', { time: clockAt(state.endsAt) });
  } else {
    els.lockedTitle.textContent = t('chat.waitTitle');
    els.lockedText.textContent = t('chat.waitText');
  }
}

function renderProfile() {
  const label = avatarLabel(me.avatar);
  els.meAvatar.innerHTML = avatarMarkup(me.avatar);
  els.meAvatar.setAttribute('aria-label', t('profile.aria', { name: me.name, label }));
  els.profilePreview.replaceChildren(personRow(me));
  els.avatarLabel.textContent = t('profile.selected', { label });
}

function renderAvatarPicker() {
  els.avatarGrid.innerHTML = AVATARS.map(({ id }) => `
    <label class="avatar-option">
      <input class="visually-hidden" type="radio" name="avatar" value="${id}"${id === me.avatar ? ' checked' : ''}>
      ${avatarMarkup(id)}
      <span class="avatar-check" aria-hidden="true">${icon('check')}</span>
      <span class="visually-hidden">${avatarLabel(id)}</span>
    </label>`).join('');
}

/* Aşama bildirimi ve isteğe bağlı ses */

let bannerTimer;
let audioCtx;

function announcePhase(phase) {
  els.banner.textContent = t(`announce.${phase}`, { n: state.duration });
  els.banner.classList.add('show');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => els.banner.classList.remove('show'), 4000);
  chime();
}

function chime() {
  if (!state.sound) return;
  audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
  const start = audioCtx.currentTime;
  [660, 880].forEach((frequency, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const t = start + i * 0.18;
    osc.type = 'sine';
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.08, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 1);
  });
}

/* Etkileşimler */

els.intentInput.addEventListener('input', () => {
  me.intent = els.intentInput.value.trim();
  els.intentCount.textContent = `${els.intentInput.value.length}/${MAX_INTENT}`;
  renderPeople();
});

els.durationInputs.forEach((input) => {
  input.addEventListener('change', () => {
    state.duration = Number(input.value);
    if (state.phase === 'waiting') renderClock(state.duration * 60);
  });
});

els.startForm.addEventListener('submit', (event) => {
  event.preventDefault();
  startOrJoin();
});

els.leaveBtn.addEventListener('click', () => {
  els.leaveMinutes.textContent = minutesText(focusedMinutesSoFar());
  els.leaveDialog.returnValue = '';
  els.leaveDialog.showModal();
});

els.leaveDialog.addEventListener('close', () => {
  if (els.leaveDialog.returnValue === 'leave' && state.phase === 'focus' && state.participation === 'in') {
    leaveTurn();
  }
});

els.rejoinBtn.addEventListener('click', startOrJoin);

els.msgInput.addEventListener('input', () => {
  els.sendBtn.disabled = state.phase !== 'break' || !els.msgInput.value.trim();
});

els.composer.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = els.msgInput.value.trim();
  // Sunucu da yalnızca molada mesaj kabul eder; reddedilirse yazılan metin silinmez.
  if (state.phase !== 'break' || !text) return;
  els.sendBtn.disabled = true;
  net.sendMessage(text).then((row) => {
    addMessage(row);
    els.msgInput.value = '';
    renderChat();
    els.messages.scrollTop = els.messages.scrollHeight;
  }).catch((error) => {
    console.error(error);
    showToast(t('toast.msgFail'));
    renderChat();
  });
});

els.avatarGrid.addEventListener('change', (event) => {
  me.avatar = event.target.value;
  render();
  net.updateProfile({ avatar: me.avatar }).catch((error) => console.error(error));
});

els.meAvatar.addEventListener('click', () => showView(state.view === 'profile' ? 'room' : 'profile'));

els.profileDone.addEventListener('click', () => showView('room'));

els.soundToggle.addEventListener('click', () => {
  state.sound = !state.sound;
  els.soundToggle.setAttribute('aria-pressed', String(state.sound));
  els.soundState.textContent = t(state.sound ? 'sound.on' : 'sound.off');
  chime();
});

els.gameToggles.forEach((input) => {
  input.addEventListener('change', () => {
    game.show[input.dataset.game] = input.checked;
    saveShow();
    render();
  });
});

// Molada boş tarha tohum ekme (scene.js çağırır). Arayüz hemen günceller, sunucu doğrular.
function onPlantSeed(index) {
  game.garden[index] = 1;
  render();
  net.plantSeed(index).then((garden) => {
    if (garden) game.garden = [...garden];
    render();
  }).catch((error) => {
    console.error(error);
    game.garden[index] = 0;
    render();
  });
}

/* Oda bağlantısı */

function onPresence(presence) {
  const others = Object.values(presence)
    .map((entries) => entries[0])
    .filter((entry) => entry && entry.id !== me.id);
  const kept = others.map((entry) => {
    const person = personById(entry.id) || { id: entry.id };
    return Object.assign(person, {
      name: entry.name, avatar: AVATAR_BY_ID[entry.avatar] ? entry.avatar : 'gozluklu',
      status: entry.status, intent: entry.intent || '', garden: entry.garden || [],
      pos: person.pos || entry.pos || null,
    });
  });
  people.splice(1, people.length - 1, ...kept);
  render();
}

function onMove(payload) {
  const person = personById(payload.id);
  if (person && person !== me) person.pos = { x: payload.x, y: payload.y, dir: payload.dir, flip: payload.flip };
}

function onEmote(payload) {
  if (state.phase === 'focus' || !personById(payload.id)) return;
  scene.showEmote(payload.id, payload.kind);
}

const EMOTES = ['wave', 'heart', 'coffee'];
let lastEmoteAt = 0;

els.emoteButtons.forEach((button) => {
  button.querySelector('.emote-icon').innerHTML = pixelIcon(button.dataset.emote);
  button.addEventListener('click', () => {
    const kind = button.dataset.emote;
    const now = performance.now();
    if (state.phase === 'focus' || !EMOTES.includes(kind) || now - lastEmoteAt < 800) return;
    lastEmoteAt = now;
    scene.showEmote(me.id, kind);
    net.sendEmote(kind);
  });
});

els.langToggle.addEventListener('click', () => {
  setLang(lang === 'tr' ? 'en' : 'tr');
  els.joinSchedule.textContent = t('join.schedule', { times: scheduleTimesText() });
  els.soundState.textContent = t(state.sound ? 'sound.on' : 'sound.off');
  renderAvatarPicker();
  lastClock = '';
  render();
});

function onRoom(row) {
  setRoom(row);
  syncPhase();
}

function onMessage(row) {
  if (state.phase !== 'break') return;
  addMessage(row);
  renderChat();
  els.messages.scrollTop = els.messages.scrollHeight;
}

async function enterRoom(profile) {
  applyProfile(profile);
  els.joinView.hidden = true;
  els.roomView.hidden = false;
  document.body.classList.remove('is-joining');
  await net.syncClock();
  const [room, week] = await Promise.all([net.loadRoom(), net.weekMinutes()]);
  setRoom(room);
  game.roomWeekMinutes = week;
  if (room.started_at) applyParticipation(await net.loadParticipation(room.started_at));
  state.online = true;
  state.turnStart = roomPhase() === 'waiting' ? 0 : state.room.startedAt;
  renderAvatarPicker();
  enterPhase(roomPhase(), { silent: true });
  net.connect({ presence: onPresence, move: onMove, emote: onEmote, room: onRoom, message: onMessage, ready: trackPresence });
  scene.init();
  setInterval(tick, 250);
  document.addEventListener('visibilitychange', tick);
}

function showJoin(message = '') {
  els.joinView.hidden = false;
  els.roomView.hidden = true;
  document.body.classList.add('is-joining');
  els.joinError.textContent = message;
  els.joinError.hidden = !message;
  els.nicknameInput.focus();
}

els.joinForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const nickname = els.nicknameInput.value.trim();
  if (!nickname) return;
  els.joinBtn.disabled = true;
  try {
    if (!net.userId) await net.signIn();
    const avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)].id;
    let profile = await net.loadProfile();
    if (!profile) {
      // Saklı oturum artık geçerli değilse (ör. kullanıcı silindiyse) yeni bir anonim oturum açılır.
      profile = await net.createProfile(nickname, avatar).catch(async () => {
        await net.signIn();
        return net.createProfile(nickname, avatar);
      });
    }
    await enterRoom(profile);
  } catch (error) {
    console.error(error);
    showJoin(t('join.error'));
  } finally {
    els.joinBtn.disabled = false;
  }
});

/* Başlangıç */

async function boot() {
  applyStaticText();
  els.joinSchedule.textContent = t('join.schedule', { times: scheduleTimesText() });
  els.soundState.textContent = t('sound.off');
  render();
  try {
    const userId = await net.restoreSession();
    const profile = userId ? await net.loadProfile() : null;
    if (profile) await enterRoom(profile);
    else showJoin();
  } catch (error) {
    console.error(error);
    showJoin(t('join.error'));
  }
}

boot();
