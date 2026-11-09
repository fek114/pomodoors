// PomoDoors · oda.
// Oda durumu, katılımlar, ödüller ve sohbet Supabase'te tutulur (net.js); kurallar sunucuda uygulanır.
// Bu dosya arayüzü çizer ve sunucudan gelen durumu yerel aşama akışına çevirir.
// Piksel karakterler characters.js, bahçe sahnesi scene.js, metinler i18n.js içinde.
// Oda saat ayarlıdır: her :00 ve :30'da 25 dk odak, ardından 5 dk mola.

// Odak ve mola süreleri odanın satırından gelir (sunucu). Gerçek düzen 25 + 5 dk; test modunda kısaltılabilir.
const timing = { focus: 1500, brk: 300, dev: false };
const focusMs = () => timing.focus * 1000;
const cycleMs = () => (timing.focus + timing.brk) * 1000;
const MAX_INTENT = 80;
// İlk kişi her zaman kullanıcının kendisi; diğerleri odaya bağlanınca presence ile gelir.
const people = [
  { id: 'me', name: 'Sen', look: { ...DEFAULT_LOOK }, intent: '' },
];
const me = people[0];
const personById = (id) => people.find((person) => person.id === id);

// Yalnızca içinde bulunulan molanın mesajları: { id, author, name, avatar, text }
const messages = [];

const state = {
  view: 'room',         // 'room' | 'profile'
  phase: 'waiting',     // 'focus' | 'break' ('waiting' yalnızca bağlanana kadar)
  duration: 25,
  phaseTotal: 0,        // aktif aşamanın toplam süresi (sn)
  endsAt: 0,            // aktif aşamanın bitiş zamanı (ms)
  participation: 'in',  // bu odak turunda: 'in' katılıyor | 'none' henüz katılmadı | 'left' ayrıldı
  late: false,          // tur başladıktan sonra mı katıldı
  joinedAt: 0,
  focusedMs: 0,         // bu turda biriken odak süresi; ayrılıp dönülürse toplanır
  turnIntent: '',
  summary: null,        // yalnızca önceki tura katılan kullanıcı için { kind, minutes, intent, reward }
  sound: false,
  turnStart: 0,         // içinde bulunulan 30 dk'lık dilimin başlangıcı (sunucu saati, ms)
  autoJoin: true,       // molada: sıradaki tura otomatik katıl
  seedKind: 0,          // molada ekilecek tohum çeşidi
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
  gardenKinds: [],
  seeds: {},            // tohum kesesi: { çeşit: adet }
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

// Saat ayarlı oda: dilim başlangıcı her :00 ve :30.
const slotStart = (at) => Math.floor(at / cycleMs()) * cycleMs();

// Süre metni: tam dakikaysa dakika, değilse saniye (test modundaki kısa turlar için).
const durationText = (seconds) => (seconds % 60 === 0 ? t('time.min', { n: seconds / 60 }) : t('time.sec', { n: seconds }));

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
  intentLabel: $('intentLabel'),
  autoJoin: $('autoJoin'),
  autoJoinRow: $('autoJoinRow'),
  autoJoinText: $('autoJoinText'),
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
  lookEditor: $('lookEditor'),
  lookBig: $('lookBig'),
  profilePreview: $('profilePreview'),
  seedsSection: $('seedsSection'),
  seedList: $('seedList'),
  treeText: $('treeText'),
  ambientSelect: $('ambientSelect'),
  tourDialog: $('tourDialog'),
  tourStep: $('tourStep'),
  tourTitle: $('tourTitle'),
  tourText: $('tourText'),
  tourSkip: $('tourSkip'),
  tourNext: $('tourNext'),
  devBar: $('devBar'),
  roomButton: $('roomButton'),
  liveCount: $('liveCount'),
  joinDoors: $('joinDoors'),
  doorList: $('doorList'),
  inviteNote: $('inviteNote'),
  roomsDialog: $('roomsDialog'),
  roomsDoorList: $('roomsDoorList'),
  roomsClose: $('roomsClose'),
  shareRow: $('shareRow'),
  copyLink: $('copyLink'),
  hostForm: $('hostForm'),
  hostName: $('hostName'),
  leaderList: $('leaderList'),
  companionList: $('companionList'),
  devButtons: document.querySelectorAll('[data-timing]'),
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
  langToggle: $('langToggle'),
  emoteButtons: document.querySelectorAll('[data-emote]'),
  stats: $('stats'),
  summaryReward: $('summaryReward'),
  gardenCaption: $('gardenCaption'),
  boardSection: $('boardSection'),
  gameToggles: document.querySelectorAll('[data-game]'),
};

// Ekranda gösterilen saatler sunucu saatidir (duvar saati); yerel saat farkı geri eklenir.
const wallClock = (localMs) => clockAt(localMs + net.offset);
const clockAt = (ms) => new Intl.DateTimeFormat(lang === 'tr' ? 'tr-TR' : 'en-GB', { hour: '2-digit', minute: '2-digit' }).format(new Date(ms));
const minutesText = (minutes) => (minutes < 1 ? t('time.short') : t('time.min', { n: minutes }));
const remainingSeconds = () => Math.max(0, Math.ceil((state.endsAt - Date.now()) / 1000));
const focusedMinutesSoFar = () =>
  Math.floor((state.focusedMs + (state.participation === 'in' ? Date.now() - state.joinedAt : 0)) / 60000);

const icon = (name) =>
  `<svg class="icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;
const avatarMarkup = (look) => `<span class="avatar avatar-pixel">${portraitSvg(look)}</span>`;

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
  return at - slotStart(at) < focusMs() ? 'focus' : 'break';
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
  const newTurn = slotStart(serverNow()) !== state.turnStart;
  if (phase !== state.phase || newTurn) enterPhase(phase, { silent });
}

function enterPhase(phase, { silent = false } = {}) {
  const slot = slotStart(serverNow());
  const newTurn = slot !== state.turnStart;
  const wasHere = state.phase === 'break' && !silent;
  state.phase = phase;
  state.turnStart = slot;

  if (phase === 'focus') {
    state.phaseTotal = timing.focus;
    state.endsAt = toLocal(slot + focusMs());
    state.summary = null;
    if (newTurn) {
      applyParticipation(null);
      // Molada "sıradaki tura katıl" seçiliyse tur başlar başlamaz katılınır; yoksa kayıt yoklanır.
      if (wasHere && state.autoJoin) startOrJoin();
      else loadParticipation();
    }
  } else {
    state.phaseTotal = timing.brk;
    state.endsAt = toLocal(slot + cycleMs());
    messages.length = 0;
    // Niyetler yeni tura taşınmaz; molada sıradaki tur için yeniden yazılır.
    clearMyIntent();
    loadBreak();
  }

  render();
  if (!silent) announcePhase(phase);
}

async function loadParticipation() {
  const slot = state.turnStart;
  try {
    const part = await net.loadParticipation(new Date(slot).toISOString());
    if (state.turnStart === slot) {
      applyParticipation(part);
      render();
    }
  } catch (error) {
    console.error(error);
  }
}

// Molada: önceki tura katılan kullanıcının ödülü sunucuda hesaplanır, sonra sohbet yüklenir.
async function loadBreak() {
  const breakIso = new Date(state.turnStart + focusMs()).toISOString();
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
      refreshSocial();
    }
    rows.forEach(addMessage);
    render();
  } catch (error) {
    console.error(error);
  }
}

function addMessage(row) {
  if (messages.some((message) => message.id === row.id)) return;
  messages.push({ id: row.id, author: row.user_id, name: row.nickname, look: row.look, text: row.body });
}

function applyProfile(profile) {
  me.id = profile.id;
  me.name = profile.nickname;
  me.look = normalizeLook(profile.look);
  game.xp = profile.xp;
  game.leaves = profile.leaves;
  game.streak = profile.streak;
  game.weekMinutes = profile.week_minutes;
  game.growthCarry = profile.growth_carry;
  game.garden = [...profile.garden];
  game.gardenKinds = [...(profile.garden_kinds || [])];
  game.seeds = { ...(profile.seeds || {}) };
}

async function refreshProfile() {
  const [profile, week] = await Promise.all([net.loadProfile(), net.weekMinutes()]);
  if (profile) applyProfile(profile);
  game.roomWeekMinutes = week;
}

// Kalan süreye katılma ya da tura geri dönme. Ortak zamanlayıcıya dokunmaz.
async function startOrJoin() {
  if (roomPhase() !== 'focus' || state.participation === 'in') return;
  try {
    applyParticipation(await net.joinTurn(me.intent));
    state.turnIntent = state.myPart?.intent || me.intent;
    render();
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
    phase === 'focus' ? t('phase.detailFocus', { d: durationText(timing.focus) })
      : phase === 'break' ? t('phase.detailBreak', { d: durationText(timing.brk) }) : '';
  els.blocks.forEach((node) => { node.hidden = !node.dataset.block.split(' ').includes(block); });
  els.progress.hidden = phase === 'waiting';
  els.timer.classList.toggle('is-idle', block !== 'focus' && block !== 'break');

  if (phase === 'waiting') {
    renderClock(timing.focus);
    els.stageMeta.textContent = '';
  } else {
    renderClock(remainingSeconds());
    const end = wallClock(state.endsAt);
    if (phase === 'break') {
      els.stageMeta.textContent = t('meta.break', { time: end });
    } else {
      els.stageMeta.textContent = block === 'focus'
        ? t('meta.focus', { time: end })
        : t('meta.focusOut', { time: end });
    }
  }

  if (block === 'join' || block === 'break') {
    // Odakta: kalan süreye katıl. Molada: sıradaki tur için niyet ve otomatik katılım.
    const joining = block === 'join';
    const next = wallClock(state.endsAt);
    els.intentLabel.textContent = t(joining ? 'intent.label' : 'next.label');
    els.startBtn.hidden = !joining;
    els.startBtn.textContent = t('start.join');
    els.autoJoinRow.hidden = joining;
    els.autoJoinText.textContent = t('next.autoJoin', { time: next });
    els.autoJoin.checked = state.autoJoin;
    els.startNote.textContent = t(joining ? 'start.joinNote' : 'next.autoNote');
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
      : t('break.noteOut', { time: wallClock(state.endsAt) });
  }

  renderPeople();
  renderChat();
  renderProfile();
  renderStats();
  renderGarden();
  renderBoard();
  renderSeeds();
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
    look: me.look,
    status,
    intent: status === 'left' ? '' : (state.phase === 'focus' ? state.turnIntent : me.intent),
    garden: game.show.garden ? game.garden.slice(0, 4) : [],
    kinds: game.show.garden ? game.gardenKinds.slice(0, 4) : [],
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
  // Ortak ağaç sahnede; burada aşaması ve bir sonraki büyümeye kalan süre yazılır.
  const stage = scene.sharedTreeStage();
  const nextAt = scene.SHARED_TREE_STEPS[stage + 1];
  els.treeText.textContent = nextAt
    ? t('tree.caption', { stage, n: nextAt - game.roomWeekMinutes })
    : t('tree.full');
  renderLeaders();
  renderCompanions();
}

/* Sosyal: haftalık liderlik tablosu ve birlikte çalışılan kişiler */

const social = { leaders: [], companions: [] };

async function refreshSocial() {
  try {
    const [leaders, companions] = await Promise.all([net.leaderboard(), net.companions()]);
    social.leaders = leaders || [];
    social.companions = companions || [];
    renderBoard();
  } catch (error) {
    console.error(error);
  }
}

// Liderlik tablosu sakin bir dille: başlık "en çok odaklananlar", alt sıra vurgusu ya da "geride kaldın" yok.
function renderLeaders() {
  if (!social.leaders.length) {
    els.leaderList.replaceChildren(el('li', 'leader-empty', t('leader.empty')));
    return;
  }
  const rows = social.leaders.map((row, index) => {
    const item = el('li', `leader-row${row.id === me.id ? ' is-me' : ''}`);
    item.append(el('span', 'leader-rank', String(index + 1)));
    const face = el('span', '');
    face.innerHTML = avatarMarkup(row.look);
    item.append(face.firstElementChild, el('span', 'leader-name', row.nickname), el('span', 'leader-minutes', t('leader.minutes', { n: row.minutes })));
    return item;
  });
  if (game.weekMinutes > 0 && !social.leaders.some((row) => row.id === me.id)) {
    rows.push(el('li', 'leader-you', t('leader.you', { n: game.weekMinutes })));
  }
  els.leaderList.replaceChildren(...rows);
}

function renderCompanions() {
  if (!social.companions.length) {
    els.companionList.replaceChildren(el('li', 'leader-empty', t('companions.empty')));
    return;
  }
  els.companionList.replaceChildren(...social.companions.map((row) => {
    const item = el('li', 'companion-row');
    const face = el('span', '');
    face.innerHTML = avatarMarkup(row.look);
    item.append(face.firstElementChild, el('span', 'leader-name', row.nickname), el('span', 'leader-minutes', t('companions.item', { n: row.turns })));
    return item;
  }));
}

/* Odalar: temalı kapılar, ev sahibi odaları, canlı sayaç */

const PUBLIC_ROOMS = ['ortak', 'ders', 'kod', 'yazi'];
const ROOM_KEY = 'pomodoors.room';
let roomRow = null;
let lobbyCounts = {};

const isHosted = (id) => id.startsWith('r-');
const roomTitle = () => (roomRow && roomRow.name) || t(`room.${net.room}`);
const roomLink = (id) => `${location.origin}${location.pathname}?oda=${encodeURIComponent(id)}`;

function goToRoom(id) {
  if (id === net.room && state.online) {
    els.roomsDialog.close();
    return;
  }
  try {
    localStorage.setItem(ROOM_KEY, id);
  } catch {
    // Tercih bu oturumla sınırlı kalır.
  }
  if (state.online) location.href = roomLink(id);
  else {
    net.room = id;
    renderDoors();
  }
}

function doorButton(id) {
  const count = lobbyCounts[id] || 0;
  const button = el('button', `door${id === net.room ? ' is-current' : ''}`);
  button.type = 'button';
  button.dataset.room = id;
  button.setAttribute('aria-pressed', String(id === net.room));
  button.innerHTML = '<span class="door-icon" aria-hidden="true"></span>';
  const text = el('span', 'door-text');
  text.append(el('span', 'door-name', t(`room.${id}`)), el('span', 'door-desc', t(`room.desc.${id}`)));
  button.append(text, el('span', 'door-count', state.online && id === net.room ? t('doors.current') : t('doors.count', { n: count })));
  return button;
}

function renderDoors() {
  const total = Object.values(lobbyCounts).reduce((sum, n) => sum + n, 0);
  els.liveCount.textContent = total ? t('live.total', { n: total }) : t('live.none');
  const invited = isHosted(net.room);
  els.joinDoors.hidden = invited;
  els.inviteNote.hidden = !invited;
  els.inviteNote.textContent = t('invite.note');
  els.doorList.replaceChildren(...PUBLIC_ROOMS.map(doorButton));
  els.roomsDoorList.replaceChildren(...PUBLIC_ROOMS.map(doorButton));
  els.shareRow.hidden = !isHosted(net.room);
  if (state.online) els.roomButton.textContent = t('room.change', { name: roomTitle() });
}

function chooseInitialRoom() {
  const fromLink = new URLSearchParams(location.search).get('oda');
  let saved = null;
  try {
    saved = localStorage.getItem(ROOM_KEY);
  } catch {
    saved = null;
  }
  const id = fromLink || saved || 'ortak';
  net.room = /^[a-z0-9-]{2,20}$/.test(id) ? id : 'ortak';
}

[els.doorList, els.roomsDoorList].forEach((list) => {
  list.addEventListener('click', (event) => {
    const button = event.target.closest('[data-room]');
    if (button) goToRoom(button.dataset.room);
  });
});

els.roomButton.addEventListener('click', () => {
  renderDoors();
  els.roomsDialog.showModal();
});
els.roomsClose.addEventListener('click', () => els.roomsDialog.close());

els.copyLink.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(roomLink(net.room));
    showToast(t('host.copied'));
  } catch {
    showToast(roomLink(net.room));
  }
});

els.hostForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = els.hostName.value.trim();
  if (!name) return;
  try {
    const room = await net.createRoom(name);
    goToRoom(room.id);
  } catch (error) {
    console.error(error);
    showToast(t('host.limit'));
  }
});

/* Tohum kesesi */

const SEED_KINDS = [0, 1, 2, 3, 4];
const SEED_PRICES = { 0: 0, 1: 15, 2: 30, 3: 20, 4: 40 }; // sunucudaki seed_price ile aynı
const SEED_ICONS = {
  0: ['..w.w...', '.wwyww..', '..wyw...', '.ww.ww..', '...g....', '..gg....', '...g....', '........'],
  1: ['.f.f.f..', '.fffff..', '.fffff..', '..fff...', '...g....', '..gg.g..', '...gg...', '........'],
  2: ['.y.yy.y.', 'yyBBBBy.', '.yBBBBy.', 'yyBBBBy.', '.yyyyy..', '...g....', '..ggg...', '........'],
  3: ['..g.g...', '...gg...', '..oooo..', '..ooo...', '..ooo...', '...oo...', '...o....', '........'],
  4: ['...gg...', '..gggg..', '.ffffff.', '.fwfffw.', '.ffffff.', '..fwff..', '...ff...', '........'],
};
const SEED_ICON_COLORS = {
  0: { w: '#F4F1EA', y: '#E3B458', g: '#4E8F3A' },
  1: { f: '#D9534F', g: '#4E8F3A' },
  2: { y: '#E3B458', B: '#6B4526', g: '#4E8F3A' },
  3: { o: '#E8833A', g: '#4E8F3A' },
  4: { f: '#D9534F', w: '#F4F1EA', g: '#4E8F3A' },
};

function seedIcon(kind) {
  const colors = SEED_ICON_COLORS[kind];
  let rects = '';
  SEED_ICONS[kind].forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (colors[ch]) rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${colors[ch]}"/>`;
    });
  });
  return `<svg class="sprite" viewBox="0 0 8 8" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${rects}</svg>`;
}

function renderSeeds() {
  els.seedsSection.hidden = !game.show.garden;
  if (!game.show.garden) return;
  els.seedList.replaceChildren(...SEED_KINDS.map((kind) => {
    const owned = game.seeds[kind] || 0;
    const row = el('li', 'seed-row');
    const pick = el('label', 'seed-pick');
    pick.innerHTML = `<input type="radio" name="seedKind" value="${kind}"${state.seedKind === kind ? ' checked' : ''}><span class="seed-icon">${seedIcon(kind)}</span>`;
    pick.append(el('span', 'seed-name', t(`seed.${kind}`)));
    const meta = el('span', 'seed-meta', kind === 0 ? t('seeds.free') : t('seeds.owned', { n: owned }));
    row.append(pick, meta);
    if (kind > 0) {
      const buy = el('button', 'btn btn-quiet btn-small seed-buy', t('seeds.buy', { price: SEED_PRICES[kind] }));
      buy.type = 'button';
      buy.dataset.buy = kind;
      buy.disabled = game.leaves < SEED_PRICES[kind];
      if (buy.disabled) buy.title = t('seeds.notEnough', { price: SEED_PRICES[kind] });
      row.append(buy);
    }
    return row;
  }));
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
  item.innerHTML = avatarMarkup(person.look);

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

function messageRow({ name, look, text }) {
  const item = el('li', 'message');
  item.innerHTML = avatarMarkup(look);
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
    els.lockedText.textContent = t('chat.focusText', { time: wallClock(state.endsAt) });
  } else {
    els.lockedTitle.textContent = t('chat.waitTitle');
    els.lockedText.textContent = t('chat.waitText');
  }
}

function renderProfile() {
  els.meAvatar.innerHTML = avatarMarkup(me.look);
  els.meAvatar.setAttribute('aria-label', t('profile.aria', { name: me.name }));
  els.profilePreview.replaceChildren(personRow(me));
  els.lookBig.innerHTML = portraitSvg(me.look);
}

// Karakter düzenleyici: ten, saç rengi, saç stili ve kıyafet. Her seçenek erişilebilir bir radyo düğmesi.
function renderLookEditor() {
  const groups = [
    ['skin', LOOK_PALETTES.skin.length],
    ['hair', LOOK_PALETTES.hair.length],
    ['style', LOOK_STYLES],
    ['shirt', LOOK_PALETTES.shirt.length],
  ];
  els.lookEditor.replaceChildren(...groups.map(([group, count]) => {
    const fieldset = el('fieldset', 'look-group');
    fieldset.append(el('legend', '', t(`look.${group}`)));
    const options = el('div', 'look-options');
    for (let i = 0; i < count; i += 1) {
      const option = el('label', 'look-option');
      const input = el('input', 'visually-hidden');
      input.type = 'radio';
      input.name = `look-${group}`;
      input.value = i;
      input.dataset.group = group;
      input.checked = me.look[group] === i;
      const swatch = el('span', 'look-swatch');
      if (group === 'style') {
        swatch.classList.add('look-swatch-wide');
        swatch.innerHTML = portraitSvg({ ...me.look, style: i });
      } else {
        swatch.style.background = LOOK_PALETTES[group][i];
      }
      const label = group === 'style' ? t(`look.style.${i}`) : t('look.option', { group: t(`look.${group}`), n: i + 1 });
      option.append(input, swatch, el('span', 'visually-hidden', label));
      options.append(option);
    }
    fieldset.append(options);
    return fieldset;
  }));
}

/* Aşama bildirimi ve isteğe bağlı ses */

let bannerTimer;
let audioCtx;

function announcePhase(phase) {
  els.banner.textContent = t(`announce.${phase}`, { d: durationText(timing.focus) });
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

els.autoJoin.addEventListener('change', () => {
  state.autoJoin = els.autoJoin.checked;
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

els.lookEditor.addEventListener('change', (event) => {
  const { group } = event.target.dataset;
  if (!group) return;
  me.look = normalizeLook({ ...me.look, [group]: Number(event.target.value) });
  renderLookEditor();
  render();
  net.updateProfile({ look: me.look }).catch((error) => console.error(error));
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

// Molada boş tarha seçili tohumu ekme (scene.js çağırır). Arayüz hemen günceller, sunucu doğrular.
function onPlantSeed(index) {
  const kind = state.seedKind;
  if (kind > 0 && !(game.seeds[kind] > 0)) {
    scene.showHint(t('seeds.none', { name: t(`seed.${kind}`) }));
    return;
  }
  game.garden[index] = 1;
  game.gardenKinds[index] = kind;
  if (kind > 0) game.seeds[kind] -= 1;
  scene.showHint(t('hint.planted'));
  render();
  net.plantSeed(index, kind).then((result) => {
    game.garden = [...result.garden];
    game.gardenKinds = [...result.kinds];
    game.seeds = { ...result.seeds };
    render();
  }).catch(async (error) => {
    console.error(error);
    await refreshProfile().catch(() => {});
    render();
  });
}

els.seedList.addEventListener('change', (event) => {
  if (event.target.name === 'seedKind') state.seedKind = Number(event.target.value);
});

els.seedList.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-buy]');
  if (!button) return;
  button.disabled = true;
  try {
    const result = await net.buySeed(Number(button.dataset.buy));
    game.leaves = result.leaves;
    game.seeds = { ...result.seeds };
    state.seedKind = Number(button.dataset.buy);
  } catch (error) {
    console.error(error);
    showToast(t('seeds.notEnough', { price: SEED_PRICES[button.dataset.buy] }));
  }
  render();
});

/* İlk giriş turu: üç kısa adım, atlanabilir, bir kez gösterilir */

const TOUR_KEY = 'pomodoors.tour';
const TOUR_STEPS = 3;
let tourIndex = 0;

function renderTour() {
  els.tourStep.textContent = t('tour.step', { n: tourIndex + 1, total: TOUR_STEPS });
  els.tourTitle.textContent = t(`tour.${tourIndex + 1}.title`);
  els.tourText.textContent = t(`tour.${tourIndex + 1}.text`);
  els.tourNext.textContent = t(tourIndex === TOUR_STEPS - 1 ? 'tour.done' : 'tour.next');
}

function maybeShowTour() {
  try {
    if (localStorage.getItem(TOUR_KEY)) return;
  } catch {
    return;
  }
  tourIndex = 0;
  renderTour();
  els.tourDialog.showModal();
}

function closeTour() {
  try {
    localStorage.setItem(TOUR_KEY, '1');
  } catch {
    // Depolama kapalıysa tur bir dahaki girişte yeniden gösterilir.
  }
  els.tourDialog.close();
}

els.tourNext.addEventListener('click', () => {
  if (tourIndex < TOUR_STEPS - 1) {
    tourIndex += 1;
    renderTour();
  } else {
    closeTour();
  }
});
els.tourSkip.addEventListener('click', closeTour);
els.tourDialog.addEventListener('cancel', closeTour);

/* Ortam sesi: tarayıcıda üretilir, dosya yok. Varsayılan kapalı, düşük ses. */

const AMBIENT_KEY = 'pomodoors.ambient';
let ambient = { kind: 'off', nodes: [], timer: 0 };

function noiseBuffer(ctx, seconds, brown = false) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i += 1) {
    const white = Math.random() * 2 - 1;
    last = brown ? (last + 0.02 * white) / 1.02 : white;
    data[i] = brown ? last * 3.5 : white;
  }
  return buffer;
}

function stopAmbient() {
  clearTimeout(ambient.timer);
  ambient.nodes.forEach((node) => { try { node.stop?.(); node.disconnect(); } catch { /* zaten durdu */ } });
  ambient = { kind: 'off', nodes: [], timer: 0 };
}

function startAmbient(kind) {
  stopAmbient();
  if (kind === 'off') return;
  audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
  audioCtx.resume();
  const ctx = audioCtx;
  const out = ctx.createGain();
  out.gain.value = 0.0001;
  out.gain.exponentialRampToValueAtTime(kind === 'birds' ? 0.5 : 0.05, ctx.currentTime + 1.5);
  out.connect(ctx.destination);
  ambient = { kind, nodes: [out], timer: 0 };

  if (kind === 'rain' || kind === 'fire') {
    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer(ctx, 4, kind === 'fire');
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = kind === 'rain' ? 1400 : 500;
    source.connect(filter).connect(out);
    source.start();
    ambient.nodes.push(source, filter);
  }

  // Kuş cıvıltısı ya da şömine çıtırtısı: rastgele aralıklarla kısa sesler.
  const sparkle = () => {
    if (ambient.kind !== kind) return;
    const t0 = ctx.currentTime;
    if (kind === 'birds') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(2200 + Math.random() * 800, t0);
      osc.frequency.exponentialRampToValueAtTime(3200 + Math.random() * 900, t0 + 0.09);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.06, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);
      osc.connect(gain).connect(out);
      osc.start(t0);
      osc.stop(t0 + 0.16);
    } else if (kind === 'fire') {
      const pop = ctx.createBufferSource();
      pop.buffer = noiseBuffer(ctx, 0.03);
      const gain = ctx.createGain();
      gain.gain.value = 0.4 + Math.random() * 0.4;
      pop.connect(gain).connect(out);
      pop.start(t0);
    }
    const wait = kind === 'birds' ? 1500 + Math.random() * 4500 : 120 + Math.random() * 900;
    ambient.timer = setTimeout(sparkle, wait);
  };
  if (kind === 'birds' || kind === 'fire') sparkle();
}

els.ambientSelect.addEventListener('change', () => {
  const kind = els.ambientSelect.value;
  try {
    localStorage.setItem(AMBIENT_KEY, kind);
  } catch {
    // Tercih bu oturumla sınırlı kalır.
  }
  startAmbient(kind);
});

// Kayıtlı ortam sesi, tarayıcı izin verdiği için ilk dokunuşta başlar.
function restoreAmbient() {
  let saved = 'off';
  try {
    saved = localStorage.getItem(AMBIENT_KEY) || 'off';
  } catch {
    saved = 'off';
  }
  els.ambientSelect.value = saved;
  if (saved === 'off') return;
  const begin = () => startAmbient(els.ambientSelect.value);
  window.addEventListener('pointerdown', begin, { once: true });
}

/* Oda bağlantısı */

function onPresence(presence) {
  const others = Object.values(presence)
    .map((entries) => entries[0])
    .filter((entry) => entry && entry.id !== me.id);
  const kept = others.map((entry) => {
    const person = personById(entry.id) || { id: entry.id };
    return Object.assign(person, {
      name: entry.name, look: normalizeLook(entry.look),
      status: entry.status, intent: entry.intent || '', garden: entry.garden || [], kinds: entry.kinds || [],
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
  els.soundState.textContent = t(state.sound ? 'sound.on' : 'sound.off');
  renderLookEditor();
  renderDoors();
  if (els.tourDialog.open) renderTour();
  lastClock = '';
  render();
});

function setTiming(row) {
  timing.focus = row.focus_seconds;
  timing.brk = row.break_seconds;
  timing.dev = row.dev_mode;
  els.devBar.hidden = !timing.dev;
  els.devButtons.forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.timing === `${timing.focus},${timing.brk}`));
  });
}

function onRoom(row) {
  setTiming(row);
  syncPhase();
  render();
}

// Test modu: süreleri herkes için değiştirir. Yalnızca odada dev_mode açıkken çalışır (sunucu denetler).
els.devBar.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-timing]');
  if (!button) return;
  const [focus, brk] = button.dataset.timing.split(',').map(Number);
  try {
    onRoom(await net.setRoomTiming(focus, brk));
  } catch (error) {
    console.error(error);
    showToast(t('toast.error'));
  }
});

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
  let room = await net.loadRoom();
  if (!room) {
    // Link geçersizse ya da oda kapatıldıysa ortak odaya girilir.
    net.room = 'ortak';
    room = await net.loadRoom();
  }
  roomRow = room;
  try {
    localStorage.setItem(ROOM_KEY, net.room);
  } catch {
    // Tercih bu oturumla sınırlı kalır.
  }
  setTiming(room);
  game.roomWeekMinutes = await net.weekMinutes();
  net.trackLobby();
  refreshSocial();
  setInterval(refreshSocial, 60000);
  renderDoors();
  state.online = true;
  renderLookEditor();
  enterPhase(roomPhase(), { silent: true });
  net.connect({ presence: onPresence, move: onMove, emote: onEmote, room: onRoom, message: onMessage, ready: trackPresence });
  scene.init();
  setInterval(tick, 250);
  document.addEventListener('visibilitychange', tick);
  maybeShowTour();
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
    const look = randomLook();
    let profile = await net.loadProfile();
    if (!profile) {
      // Saklı oturum artık geçerli değilse (ör. kullanıcı silindiyse) yeni bir anonim oturum açılır.
      profile = await net.createProfile(nickname, look).catch(async () => {
        await net.signIn();
        return net.createProfile(nickname, look);
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
  els.soundState.textContent = t('sound.off');
  restoreAmbient();
  chooseInitialRoom();
  net.watchLobby((counts) => {
    lobbyCounts = counts;
    renderDoors();
  });
  renderDoors();
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
