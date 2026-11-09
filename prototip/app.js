// PomoDoors · oda prototipi.
// Veriler sahte ve yalnızca bu sayfada tutulur; üyelik, sunucu ve canlı eşzamanlama yok.
// Avatar seti avatars.js içinde.

const BREAK_MINUTES = 5;
const MAX_INTENT = 80;
const PREVIEW_INTENT = 'Portfolyo vaka çalışmasının ilk taslağı';

// `sample`, diğer katılımcıların tur başında yazmış gibi görünen niyetidir.
// `leftTurn`, odak sırasında turdan ayrılmış bir katılımcıyı örnekler.
const people = [
  { id: 'me', name: 'Sen', avatar: 'gozluklu', intent: '', sample: '' },
  { id: 'deniz', name: 'Deniz', avatar: 'kivircik', intent: 'Tez için literatür notlarını toparlamak', sample: 'Tez için literatür notlarını toparlamak' },
  { id: 'ece', name: 'Ece', avatar: 'kakullu', intent: '', sample: 'Faturaları ve makbuzları düzenlemek' },
  { id: 'arda', name: 'Arda', avatar: 'bereli', intent: '', sample: '', leftTurn: true },
  { id: 'ipek', name: 'İpek', avatar: 'kulaklikli', intent: 'Sunum notlarını sadeleştirmek', sample: 'Sunum notlarını sadeleştirmek' },
];
const me = people[0];
const personById = (id) => people.find((person) => person.id === id);

const messages = [
  { author: 'ece', text: 'Faturaların yarısı bitti, fena değil.' },
  { author: 'deniz', text: 'Su almaya gidiyorum, sonraki tura varım.' },
  { author: 'ipek', text: 'Sonraki tur 45 dk olsun mu? Bende uzun bir iş var.' },
];

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
};

/* Oyun öğeleri: sahte, yalnızca bu sayfada. Kazanılan hiçbir şey geri alınmaz. */

const XP_PER_LEVEL = 100;      // 1 dk odak = 1 XP = 1 Yaprak
const MINUTES_PER_GROWTH = 5;  // her 5 dk odak bahçede bir büyüme adımı
const MAX_STAGE = 4;           // 0 boş tarh · 1 tohum · 2 filiz · 3 genç bitki · 4 çiçek
const STAGE_NAMES = ['boş tarh', 'tohum', 'filiz', 'genç bitki', 'çiçek'];

const game = {
  xp: 240,
  leaves: 240,
  streak: 3,
  countedToday: false,  // bugünkü ilk odak seriye eklendi mi
  weekMinutes: 95,
  growthCarry: 0,       // bir sonraki büyüme adımına biriken dakikalar
  garden: [4, 4, 3, 3, 2, 2, 1, 1, 0, 0, 0, 0],
  show: { garden: true, xp: true, streak: true, board: false },
};

// Tabloya katılmayı seçmiş diğer pilot üyeleri (sahte).
const BOARD_SAMPLE = [
  { id: 'deniz', minutes: 140 },
  { id: 'ipek', minutes: 110 },
  { id: 'ece', minutes: 60 },
];

const levelOf = (xp) => Math.floor(xp / XP_PER_LEVEL) + 1;

function growGarden(steps) {
  for (let i = 0; i < steps; i += 1) {
    const index = game.garden.findIndex((stage) => stage < MAX_STAGE);
    if (index === -1) game.garden.push(1);
    else game.garden[index] += 1;
  }
}

// Gerçekten katılınan odak dakikalarını ödüle çevirir. Seri sessizce artar; hiçbir değer eksilmez.
function award(minutes) {
  if (minutes <= 0) return null;
  const levelBefore = levelOf(game.xp);
  game.xp += minutes;
  game.leaves += minutes;
  game.weekMinutes += minutes;
  const total = game.growthCarry + minutes;
  const steps = Math.floor(total / MINUTES_PER_GROWTH);
  game.growthCarry = total % MINUTES_PER_GROWTH;
  growGarden(steps);
  const level = levelOf(game.xp);
  if (level > levelBefore) game.garden.push(0); // her yeni seviyede bir tarh açılır
  if (!game.countedToday) {
    game.streak += 1;
    game.countedToday = true;
  }
  return { minutes, steps, level: level > levelBefore ? level : 0 };
}

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

const PHASE_NAMES = { waiting: 'Bekleme', focus: 'Odak', break: 'Mola' };
const FOCUS_BLOCKS = { in: 'focus', none: 'join', left: 'left' };
const FOCUS_STATUS = { in: 'focus', none: 'none', left: 'left' };
const SUMMARY_LABELS = { complete: 'turun sonuna kadar kaldın', late: 'sonradan katıldı', left: 'turdan ayrıldı' };
const PHASE_ANNOUNCEMENTS = {
  focus: () => `Odak başladı · ${state.duration} dk`,
  break: () => 'Odak bitti · Mola başladı, sohbet açık',
  waiting: () => 'Mola bitti · Oda beklemede',
};

const STATUS_LABELS = { waiting: 'Beklemede', focus: 'Odakta', break: 'Molada', left: 'Turdan ayrıldı', none: 'Henüz katılmadı' };
const MY_STATUS_LABELS = { ...STATUS_LABELS, left: 'Turdan ayrıldın', none: 'Henüz katılmadın' };

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
  preview: $('preview'),
  previewToggle: $('previewToggle'),
  previewPhaseButtons: document.querySelectorAll('[data-goto]'),
  profileButton: document.querySelector('[data-open="profile"]'),
  stats: $('stats'),
  summaryReward: $('summaryReward'),
  gardenCaption: $('gardenCaption'),
  boardSection: $('boardSection'),
  boardList: $('boardList'),
  gameToggles: document.querySelectorAll('[data-game]'),
};

const timeFormat = new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' });
const clockAt = (ms) => timeFormat.format(new Date(ms));
const minutesText = (minutes) => (minutes < 1 ? "1 dk'dan kısa" : `${minutes} dk`);
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

function fillSampleIntents() {
  people.forEach((person) => {
    if (person !== me && !person.intent) person.intent = person.sample;
  });
}

function clearMyIntent() {
  me.intent = '';
  els.intentInput.value = '';
  els.intentCount.textContent = `0/${MAX_INTENT}`;
}

/* Aşama geçişleri */

function startPhase(phase, { elapsed = 0, silent = false } = {}) {
  const now = Date.now();
  state.phase = phase;

  if (phase === 'focus') {
    state.phaseTotal = state.duration * 60;
    state.participation = 'in';
    state.late = false;
    state.joinedAt = now - elapsed * 1000;
    state.focusedMs = 0;
    state.turnIntent = me.intent;
    state.summary = null;
    fillSampleIntents();
  } else if (phase === 'break') {
    state.phaseTotal = BREAK_MINUTES * 60;
  } else {
    state.phaseTotal = 0;
    // Niyetler yeni tura taşınmaz.
    people.forEach((person) => { person.intent = ''; });
    clearMyIntent();
  }

  state.endsAt = now + (state.phaseTotal - elapsed) * 1000;
  render();
  if (!silent) announcePhase(phase);
}

function finishFocus() {
  if (state.participation === 'in') state.focusedMs += Date.now() - state.joinedAt;
  // Özet yalnızca bu tura katılmış kullanıcıya gösterilir ve gerçekten katılınan süreyi yazar.
  if (state.participation === 'none') {
    state.summary = null;
  } else {
    const kind = state.participation === 'left' ? 'left' : state.late ? 'late' : 'complete';
    const minutes = kind === 'complete' ? state.duration : Math.floor(state.focusedMs / 60000);
    state.summary = { kind, minutes, intent: state.turnIntent, reward: award(minutes) };
  }
  startPhase('break');
}

function advance() {
  if (state.phase === 'focus') finishFocus();
  else if (state.phase === 'break') startPhase('waiting');
  else startPhase('focus');
}

// Kalan süreye katılma ya da tura geri dönme: kayıt bu andan başlar, ortak zamanlayıcıya dokunulmaz.
function joinTurn() {
  state.participation = 'in';
  state.late = true;
  state.joinedAt = Date.now();
  state.turnIntent = me.intent;
  render();
}

function leaveTurn() {
  state.focusedMs += Date.now() - state.joinedAt;
  state.participation = 'left';
  render();
}

function tick() {
  if (state.phase === 'waiting') return;
  const remaining = remainingSeconds();
  renderClock(remaining);
  if (remaining === 0) advance();
}

function showView(view) {
  if (state.view === view) return;
  state.view = view;
  els.roomView.hidden = view !== 'room';
  els.profileView.hidden = view !== 'profile';
  els.profileButton.setAttribute('aria-pressed', String(view === 'profile'));
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
    els.timer.setAttribute('aria-label', `${m} dakika ${s} saniye`);
  }
  if (state.phaseTotal) {
    els.progressFill.style.width = `${(1 - seconds / state.phaseTotal) * 100}%`;
  }
}

function render() {
  const { phase } = state;
  const block = phase === 'focus' ? FOCUS_BLOCKS[state.participation] : phase;

  document.body.dataset.phase = phase;
  els.phaseName.textContent = PHASE_NAMES[phase];
  els.phaseDetail.textContent =
    phase === 'focus' ? `· ${state.duration} dk tur` : phase === 'break' ? `· ${BREAK_MINUTES} dk` : '';
  els.blocks.forEach((node) => { node.hidden = !node.dataset.block.split(' ').includes(block); });
  els.progress.hidden = phase === 'waiting';
  els.timer.classList.toggle('is-idle', block !== 'focus' && block !== 'break');

  if (phase === 'waiting') {
    renderClock(state.duration * 60);
    els.stageMeta.textContent = 'Yeni tur başlamayı bekliyor.';
  } else {
    renderClock(remainingSeconds());
    const end = clockAt(state.endsAt);
    if (phase === 'break') {
      els.stageMeta.textContent = `Beklemeye geçiş ${end} · Yeni tur kendiliğinden başlamaz`;
    } else {
      els.stageMeta.textContent = block === 'focus'
        ? `Mola başlangıcı ${end}`
        : `Oda turu devam ediyor · Mola başlangıcı ${end}`;
    }
  }

  if (block === 'waiting' || block === 'join') {
    const joining = block === 'join';
    els.durations.hidden = joining;
    els.startBtn.textContent = joining ? 'Kalan süreye katıl' : 'Turu başlat';
    els.startNote.textContent = joining
      ? 'Kaydın katıldığın andan başlar; ortak zamanlayıcı değişmez.'
      : 'Odadaki herkes turu başlatabilir. Başlayan tur herkes için birlikte ilerler.';
  }
  if (block === 'focus') {
    els.myIntent.textContent = state.turnIntent || 'Bu tur için niyet eklemedin.';
    els.myIntent.classList.toggle('is-empty', !state.turnIntent);
    els.lateNote.hidden = !state.late;
  }
  if (block === 'left') {
    els.leftSummary.textContent = `Şimdiye kadar ${minutesText(focusedMinutesSoFar())} odak kaydedildi.`;
  }
  if (block === 'break') {
    els.summaryCard.hidden = !state.summary;
    if (state.summary) renderSummary();
    els.breakNote.textContent = state.summary
      ? 'Ekrandan birkaç dakika uzaklaşmak iyi gelebilir.'
      : 'Oda molada; sohbet herkese açık. Mola bitince yeni turu odadaki herkes başlatabilir.';
  }

  renderPeople();
  renderChat();
  renderProfile();
  renderStats();
  renderGarden();
  renderBoard();
  els.previewPhaseButtons.forEach((button) => {
    button.setAttribute('aria-pressed', String(state.view === 'room' && button.dataset.goto === phase));
  });
}

function renderSummary() {
  const { kind, minutes, intent } = state.summary;
  els.summaryLine.textContent = `${minutesText(minutes)} odak · ${SUMMARY_LABELS[kind]}`;
  els.summaryIntent.textContent = intent ? `“${intent}”` : 'Bu tur için niyet eklenmemişti.';
  els.summaryIntent.classList.toggle('is-empty', !intent);
  renderReward(state.summary.reward);
}

// Ödül satırları olanı aktarır; kutlama, ünlem ya da kıyas yok.
function renderReward(reward) {
  const lines = [];
  if (reward && game.show.xp) {
    lines.push(['leaf', `+${reward.minutes} XP · +${reward.minutes} Yaprak`]);
  }
  if (reward && game.show.garden) {
    lines.push(['sprout', reward.steps
      ? `Bahçen ${reward.steps} adım büyüdü`
      : 'Dakikaların bir sonraki büyümeye eklendi']);
  }
  if (reward && reward.level && game.show.xp) {
    lines.push(['star', game.show.garden
      ? `Seviye ${reward.level} · bahçende yeni bir tarh açıldı`
      : `Seviye ${reward.level}`]);
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
    items.push(`<li class="stat">${pixelIcon('star')}<span>Seviye ${levelOf(game.xp)}</span>`
      + `<span class="xp-bar" aria-hidden="true"><span style="width:${percent}%"></span></span>`
      + `<span class="visually-hidden">${into} / ${XP_PER_LEVEL} XP</span></li>`);
    items.push(`<li class="stat">${pixelIcon('leaf')}<span>${game.leaves} Yaprak</span></li>`);
  }
  if (game.show.streak) {
    items.push(`<li class="stat">${pixelIcon('calendar')}<span>Seri: ${game.streak} gün</span></li>`);
  }
  els.stats.innerHTML = items.join('');
  els.stats.hidden = !items.length;
}

// Bitkilerin kendisi sahnede (scene.js) çizilir; burada yalnızca kısa açıklama güncellenir.
function renderGarden() {
  els.gardenCaption.hidden = !game.show.garden;
  if (!game.show.garden) return;
  const planted = game.garden.filter((stage) => stage > 0).length;
  els.gardenCaption.textContent = `Bahçen: ${planted} bitki · Odakta geçen her ${MINUTES_PER_GROWTH} dakika bir bitkiyi bir adım büyütür. Bitkiler solmaz.`;
}

// Tablo yalnızca kullanıcı katılmayı seçtiğinde görünür; sıra numarası ve alt sıra vurgusu yok.
function renderBoard() {
  els.boardSection.hidden = !game.show.board;
  if (!game.show.board) return;
  const rows = [...BOARD_SAMPLE, { id: 'me', minutes: game.weekMinutes }]
    .sort((a, b) => b.minutes - a.minutes);
  els.boardList.replaceChildren(...rows.map(({ id, minutes }) => {
    const person = personById(id);
    const row = el('li', `board-row${id === 'me' ? ' is-me' : ''}`);
    row.innerHTML = avatarMarkup(person.avatar);
    row.append(el('span', 'board-name', person.name), el('span', 'board-minutes', `${minutes} dk`));
    return row;
  }));
}

function statusOf(person) {
  if (state.phase !== 'focus') return state.phase;
  if (person === me) return FOCUS_STATUS[state.participation];
  return person.leftTurn ? 'left' : 'focus';
}

function emptyIntentText(person, status) {
  if (person !== me) return 'Niyet paylaşılmadı';
  return status === 'waiting' || status === 'none' ? 'Niyetin burada görünür' : 'Niyet eklenmedi';
}

function personRow(person) {
  const status = statusOf(person);
  const item = el('li', `person is-${status}`);
  item.innerHTML = avatarMarkup(person.avatar);

  const chip = el('span', 'status');
  chip.innerHTML = icon(status);
  chip.append((person === me ? MY_STATUS_LABELS : STATUS_LABELS)[status]);
  const head = el('div', 'person-head');
  head.append(el('p', 'person-name', person.name), chip);

  const body = el('div', 'person-body');
  body.append(head);
  // Turdan ayrılan kişinin niyeti o tur için gösterilmez.
  if (status !== 'left') {
    const intent = el('p', 'person-intent');
    if (person.intent) {
      intent.innerHTML = icon('intent');
      intent.append(el('span', 'visually-hidden', 'Niyet: '), el('span', '', person.intent));
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
  els.peopleCount.textContent = `${people.length} kişi`;
  els.peopleList.replaceChildren(...people.map(personRow));
}

function messageRow({ author, text }) {
  const person = personById(author);
  const item = el('li', 'message');
  item.innerHTML = avatarMarkup(person.avatar);
  const body = el('div', 'message-body');
  body.append(el('p', 'message-name', person.name), el('p', 'message-text', text));
  item.append(body);
  return item;
}

function renderChat() {
  // Molada sohbet, önceki tura katılıp katılmadığından bağımsız olarak herkese açıktır.
  const open = state.phase === 'break';
  els.chatState.textContent = open ? 'Açık' : 'Kapalı';
  els.chatState.classList.toggle('is-open', open);
  els.chatLocked.hidden = open;
  els.messages.hidden = !open;
  // Kapanırken yazılmakta olan metin silinmez; yalnızca gönderim kapanır.
  els.msgInput.disabled = !open;
  els.msgInput.placeholder = open ? 'Mesaj yaz…' : 'Sohbet molada açılır';
  els.sendBtn.disabled = !open || !els.msgInput.value.trim();

  if (open) {
    els.messages.replaceChildren(...messages.map(messageRow));
  } else if (state.phase === 'focus') {
    els.lockedTitle.textContent = 'Odak sırasında sohbet kapalı';
    els.lockedText.textContent = `Kimse bölünmesin diye. Mola başlayınca (${clockAt(state.endsAt)}) herkes için açılır.`;
  } else {
    els.lockedTitle.textContent = 'Sohbet molada açılır';
    els.lockedText.textContent = 'Bekleme ve odak sırasında sohbet herkes için kapalıdır.';
  }
}

function renderProfile() {
  const { label } = AVATAR_BY_ID[me.avatar];
  els.meAvatar.innerHTML = avatarMarkup(me.avatar);
  els.meAvatar.setAttribute('aria-label', `Profilin: ${label}`);
  els.profilePreview.replaceChildren(personRow(me));
  els.avatarLabel.textContent = `Seçili avatar: ${label}`;
}

function renderAvatarPicker() {
  els.avatarGrid.innerHTML = AVATARS.map(({ id, label }) => `
    <label class="avatar-option">
      <input class="visually-hidden" type="radio" name="avatar" value="${id}"${id === me.avatar ? ' checked' : ''}>
      ${avatarMarkup(id)}
      <span class="avatar-check" aria-hidden="true">${icon('check')}</span>
      <span class="visually-hidden">${label}</span>
    </label>`).join('');
}

/* Aşama bildirimi ve isteğe bağlı ses */

let bannerTimer;
let audioCtx;

function announcePhase(phase) {
  els.banner.textContent = PHASE_ANNOUNCEMENTS[phase]();
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
  if (state.phase === 'waiting') startPhase('focus');
  else if (state.phase === 'focus' && state.participation === 'none') joinTurn();
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

els.rejoinBtn.addEventListener('click', joinTurn);

els.msgInput.addEventListener('input', () => {
  els.sendBtn.disabled = state.phase !== 'break' || !els.msgInput.value.trim();
});

els.composer.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = els.msgInput.value.trim();
  // Gerçek üründe aynı kural sunucuda da uygulanmalı; arayüz kilidi tek başına yeterli değil.
  if (state.phase !== 'break' || !text) return;
  messages.push({ author: me.id, text });
  els.msgInput.value = '';
  renderChat();
  els.messages.scrollTop = els.messages.scrollHeight;
});

els.avatarGrid.addEventListener('change', (event) => {
  me.avatar = event.target.value;
  render();
});

els.profileDone.addEventListener('click', () => showView('room'));

els.soundToggle.addEventListener('click', () => {
  state.sound = !state.sound;
  els.soundToggle.setAttribute('aria-pressed', String(state.sound));
  els.soundState.textContent = state.sound ? 'açık' : 'kapalı';
  chime();
});

els.gameToggles.forEach((input) => {
  input.addEventListener('change', () => {
    game.show[input.dataset.game] = input.checked;
    render();
  });
});

/* Geçici önizleme kontrolü */

const previewFocusElapsed = () => Math.min(7 * 60, state.duration * 60 - 60);

function goTo(phase) {
  if (phase === 'waiting') {
    startPhase('waiting');
    return;
  }
  // Önizlemede alanlar boş görünmesin diye örnek niyet doldurulur.
  if (!me.intent) me.intent = PREVIEW_INTENT;
  if (phase === 'focus') {
    startPhase('focus', { elapsed: previewFocusElapsed() });
  } else {
    // Önceki odak turuna baştan sona katılmış gibi.
    fillSampleIntents();
    state.summary = { kind: 'complete', minutes: state.duration, intent: me.intent, reward: award(state.duration) };
    startPhase('break', { elapsed: 60 });
  }
}

// Kullanıcı odaya ilk kez, aşama sürerken girer; aşama zaten sürüyorsa ortak zamanlayıcı olduğu gibi kalır.
function arriveDuring(phase) {
  clearMyIntent();
  if (state.phase !== phase) {
    startPhase(phase, { elapsed: phase === 'focus' ? previewFocusElapsed() : 60, silent: true });
  }
  state.participation = 'none';
  state.late = false;
  state.focusedMs = 0;
  state.turnIntent = '';
  state.summary = null;
  fillSampleIntents();
  render();
}

// Aşamanın sonuna ileri sarar; katılım süreleri gerçek akıştaki gibi hesaplanır.
function skipToPhaseEnd() {
  if (state.phase === 'waiting') {
    startPhase('focus');
    return;
  }
  const delta = state.endsAt - Date.now();
  state.endsAt -= delta;
  state.joinedAt -= delta;
  tick();
}

els.preview.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button || button === els.previewToggle) return;
  if (button.dataset.open === 'profile') {
    showView('profile');
    return;
  }
  showView('room');
  if (button.dataset.goto) goTo(button.dataset.goto);
  else if (button.dataset.arrive) arriveDuring(button.dataset.arrive);
  else if ('next' in button.dataset) skipToPhaseEnd();
  else if ('nearLevel' in button.dataset) {
    game.xp = levelOf(game.xp) * XP_PER_LEVEL - 2;
    render();
  }
});

els.previewToggle.addEventListener('click', () => {
  const collapsed = els.preview.classList.toggle('is-collapsed');
  els.previewToggle.setAttribute('aria-expanded', String(!collapsed));
  els.previewToggle.textContent = collapsed ? 'Göster' : 'Gizle';
});

/* Başlangıç */

renderAvatarPicker();
render();
scene.init();
setInterval(tick, 250);
document.addEventListener('visibilitychange', tick);
