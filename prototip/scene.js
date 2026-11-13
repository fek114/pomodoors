// PomoDoors · bahçe sahnesi.
// Yukarıdan bakan 2B piksel sahne: 16×16 karolar, 20×12 karoluk harita.
// Tüm çizimler bu dosyada kodla üretilir; dış görsel kullanılmaz.
// Odakta sahne sakindir: karakterler kendi tarhlarında çalışır, bitkiler dakikalar geçtikçe büyür.
// Bekleme ve molada kullanıcı kendi karakteriyle dolaşabilir ve boş tarhlara tohum ekebilir.
// app.js'teki state, game, people, messages gibi değerleri çalışma anında okur.
// Diğer katılımcılar sırayla dört küçük tarha yerleşir; molada konumları net.js ile paylaşılır.

const scene = (() => {
  const T = 16;
  const COLS = 20;
  const ROWS = 12;
  const W = COLS * T;
  const H = ROWS * T;
  const SPEED = 3.2;        // karakter hızı (karo/sn)
  const NPC_SPEED = 2.2;

  const C = {
    grass: '#6FAE4A', grassDark: '#5A9A3C', grassLight: '#8CC45E',
    path: '#D9B26F', pathDark: '#C49A57', pebble: '#B08348',
    soil: '#8A5A36', soilDark: '#6E4529', soilLine: '#5C3A22',
    water: '#4E9CC8', waterLight: '#8CC9E6', waterDark: '#3A7FA8',
    wood: '#9A6A3F', woodDark: '#6B4526', woodLight: '#B9864F',
    roof: '#4F6F8A', roofDark: '#3D566C', roofLight: '#6D8CA6',
    wall: '#C99A62', wallDark: '#A97C48', stone: '#9C9A92', stoneDark: '#7C7A72',
    glass: '#BFE3F0', glassLit: '#F2D27A',
    leaf: '#4E8F3A', leafDark: '#2F6B2C', leafLight: '#78B455', trunk: '#7A5132',
    petal: '#E07A6A', petal2: '#F2C14E', petal3: '#B58BD6', gold: '#E3B458',
    door: '#3E672C', doorLight: '#5E8C4A',
    outline: '#2B2622', pants: '#3B4A66', shadow: 'rgba(0, 0, 0, .18)',
  };

  // Haftalık mevsim paletleri (0 sonbahar, 1 kış, 2 ilkbahar, 3 yaz). Bitkiler kendi renklerini korur.
  const SEASONS = [
    { grass: '#9AA84A', grassDark: '#83903C', grassLight: '#C2B85A', leaf: '#C9762E', leafDark: '#9C5524', leafLight: '#E8A44A', snow: false },
    { grass: '#CFD9D3', grassDark: '#B2C2BC', grassLight: '#F4F7F5', leaf: '#5E8C6A', leafDark: '#3E6B4E', leafLight: '#EEF4F2', snow: true },
    { grass: '#74B84E', grassDark: '#5FA13F', grassLight: '#9CD06A', leaf: '#5E9E46', leafDark: '#3E7A34', leafLight: '#F2B8C6', snow: false },
    { grass: '#7CB043', grassDark: '#66963A', grassLight: '#A6C85A', leaf: '#4E8F3A', leafDark: '#2F6B2C', leafLight: '#78B455', snow: false },
  ];
  let snowy = false;
  function applySeason(index) {
    const season = SEASONS[index] || SEASONS[3];
    snowy = season.snow;
    Object.assign(C, season);
  }

  // Zemin: G çim, P patika, S sürülmüş toprak, W su
  const GROUND = [
    'GGGGGGGGGGGGGGGGGGGG',
    'GGGGGGGGGGGGGGWWWGGG',
    'GGGGGGGGGGGGGWWWWGGG',
    'GGGGGGGGGGGGGWWWWGGG',
    'GGGGGGGPGGGGGGWWGGGG',
    'GGGGGGGPGGGGGGGGGGGG',
    'GPPPPPPPPPPPPPPPPPPG',
    'GGGGGGGGGGGGGGGGGGGG',
    'GGSSSSSGSSGSSGSSGSSG',
    'GGSSSSSGSSGSSGSSGSSG',
    'GGSSSSSGGGGGGGGGGGGG',
    'GGGGGGGGGGGGGGGGGGGG',
  ];

  const CABIN = { x: 5, y: 0, w: 5, h: 4 };
  const TREES = [[1, 0], [18, 0], [0, 9]];
  const SHARED_TREE = [11, 0]; // ortak ağaç: odanın haftalık toplam dakikasıyla büyür
  const SHARED_TREE_STEPS = [0, 60, 200, 500, 1000, 2000];
  const BUSHES = [[0, 4], [14, 10], [19, 4], [9, 10], [15, 10]];
  const BENCH = [14, 5];
  const FENCE_Y = 11;
  const FENCE_FROM = 2;

  // Ortak bahçedeki 4 portal kapı (PomoDoors): yürüyerek ya da dokunarak başka evrenlere geçilir.
  const PORTALS = [
    { id: 'ders', tx: 1, ty: 3, arch: '#4F6F8A', trim: '#3D566C', door: '#2C4768', light: '#F2D27A' },
    { id: 'kod', tx: 3, ty: 3, arch: '#3E675E', trim: '#2A4D45', door: '#1E3D37', light: '#7CE0C3' },
    { id: 'work', tx: 10, ty: 3, arch: '#9C6234', trim: '#6B4526', door: '#5C381C', light: '#F2C14E' },
    { id: 'hobby', tx: 12, ty: 3, arch: '#A65353', trim: '#783636', door: '#632B2B', light: '#F2B8C6' },
  ];
  const UNIVERSE_ROOMS = ['ders', 'kod', 'work', 'hobby'];
  const hasPortals = () => !state.online || net.room === 'ortak';
  const isUniverse = () => state.online && UNIVERSE_ROOMS.includes(net.room);

  const MY_PLOT = { x: 2, y: 8, cols: 5, rows: 3 };
  const OTHER_PLOT_X = [8, 11, 14, 17];
  const OTHER_PLOT_Y = 8;

  // Ayak konumları (karo biriminde). Diğerleri odadaki sıralarına göre yerleşir.
  const MY_SPOTS = { plot: [4.5, 7.9], gather: [7.5, 4.9], cabin: [6.4, 4.8], path: [7.5, 5.7] };
  const OTHER_PLOT_SPOTS = OTHER_PLOT_X.map((x) => [x + 1, 7.9]);
  const UNIVERSE_SPOTS = {
    myFocus: [4.5, 6.2],
    myWait: [9.5, 10.2],
    myLeft: [7.5, 9.8],
    otherFocus: [[7.5, 6.2], [10.5, 6.2], [13.5, 6.2], [16.5, 6.2], [4.5, 8.8], [7.5, 8.8], [13.5, 8.8], [16.5, 8.8]],
    gather: [[6.5, 7.6], [8.5, 7.8], [11.5, 7.6], [13.5, 7.9], [7.5, 9.1], [10.5, 9.1], [12.5, 9.1], [15.5, 8.2]],
  };

  // Bahçe sakinleri: ortak bahçede her zaman bulunan iki karakter. Gerçek kullanıcı değiller; katılımcı
  // listesinde görünmezler, sahnede etiketleri ayrı biçimdedir. Odakta ortak ağacın yanında çalışır,
  // molada ve beklemede yavaşça dolaşır, ara sıra el sallarlar.
  const RESIDENTS = [
    {
      id: 'resident-fatih', name: 'Fatih', resident: true, status: 'focus',
      look: { skin: 2, hair: 0, shirt: 3, style: 0 },
      work: [13.4, 4.6],
      wander: [[12.4, 4.7], [15.6, 6.6], [13.4, 6.6], [18.4, 5.2]],
    },
    {
      id: 'resident-melis', name: 'Melis', resident: true, status: 'focus',
      look: { skin: 1, hair: 2, shirt: 5, style: 1 },
      work: [11.5, 2.4],
      wander: [[10.4, 4.8], [8.6, 6.6], [11.4, 6.6], [6.4, 6.6]],
    },
  ];
  const everyone = () => (isUniverse() ? people : [...people, ...RESIDENTS]);
  const GATHER_SPOTS = [[9, 4.9], [10.4, 5.5], [12.6, 5.4], [18.4, 5.3], [9.8, 6.6], [12, 6.6], [14.2, 6.6], [16.4, 6.6]];
  const extraSpot = (i) => [3 + (i % 10) * 1.6, 5.4 + Math.floor(i / 10) * 0.5];

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

  let canvas;
  let ctx;
  let wrap;
  let labels;
  let hint;
  let previewCanvas;
  let previewCtx;
  let previewWrap;
  let staticLayer;
  let staticKey = '';
  let loopStarted = false;
  let roomBound = false;
  let scale = 1;
  let lastTime = 0;
  let clock = 0;
  let lastAria = '';
  let lastHint = '';
  let hintUntil = 0;
  let hintOverride = '';
  const keys = new Set();
  const actors = {};
  const labelNodes = {};
  const portalNodes = {};
  const emotes = {};       // kişi kimliği -> { kind, until }
  let portalBusy = false;

  /* Yardımcılar */

  function hash(x, y, seed = 0) {
    let n = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 982451653);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  }

  function rect(g, x, y, w, h, color) {
    g.fillStyle = color;
    g.fillRect(x, y, w, h);
  }

  const groundAt = (tx, ty) => (GROUND[ty] && GROUND[ty][tx]) || 'G';
  const inRect = (tx, ty, r) => tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h;

  /* Zemin karoları */

  function grassTile(g, tx, ty) {
    const x = tx * T;
    const y = ty * T;
    rect(g, x, y, T, T, C.grass);
    if (snowy) {
      for (let i = 0; i < 5; i += 1) rect(g, x + Math.floor(hash(tx, ty, i + 40) * 15), y + Math.floor(hash(tx, ty, i + 50) * 15), 1, 1, '#FFFFFF');
    }
    for (let i = 0; i < 7; i += 1) {
      const px = Math.floor(hash(tx, ty, i) * 15);
      const py = Math.floor(hash(tx, ty, i + 20) * 14);
      rect(g, x + px, y + py, 1, 2, i % 2 ? C.grassDark : C.grassLight);
    }
  }

  function flowerOn(g, tx, ty) {
    if (hash(tx, ty, 99) > 0.16) return;
    const x = tx * T + 3 + Math.floor(hash(tx, ty, 7) * 9);
    const y = ty * T + 3 + Math.floor(hash(tx, ty, 8) * 9);
    const petal = [C.petal, C.petal2, C.petal3][Math.floor(hash(tx, ty, 9) * 3)];
    rect(g, x - 1, y, 3, 1, petal);
    rect(g, x, y - 1, 1, 3, petal);
    rect(g, x, y, 1, 1, C.gold);
  }

  function pathTile(g, tx, ty) {
    const x = tx * T;
    const y = ty * T;
    rect(g, x, y, T, T, C.path);
    if (groundAt(tx, ty - 1) !== 'P') rect(g, x, y, T, 1, C.pathDark);
    if (groundAt(tx, ty + 1) !== 'P') rect(g, x, y + T - 1, T, 1, C.pathDark);
    if (groundAt(tx - 1, ty) !== 'P') rect(g, x, y, 1, T, C.pathDark);
    if (groundAt(tx + 1, ty) !== 'P') rect(g, x + T - 1, y, 1, T, C.pathDark);
    for (let i = 0; i < 3; i += 1) {
      rect(g, x + 2 + Math.floor(hash(tx, ty, i) * 11), y + 2 + Math.floor(hash(tx, ty, i + 5) * 11), 2, 1, C.pebble);
    }
  }

  function soilTile(g, tx, ty) {
    const x = tx * T;
    const y = ty * T;
    rect(g, x, y, T, T, C.soil);
    for (let row = 3; row < T; row += 4) rect(g, x + 1, y + row, T - 2, 1, C.soilLine);
    for (let i = 0; i < 4; i += 1) {
      rect(g, x + Math.floor(hash(tx, ty, i) * 15), y + Math.floor(hash(tx, ty, i + 9) * 15), 1, 1, C.soilDark);
    }
    if (groundAt(tx, ty - 1) !== 'S') rect(g, x, y, T, 1, C.soilDark);
    if (groundAt(tx, ty + 1) !== 'S') rect(g, x, y + T - 1, T, 1, C.soilDark);
    if (groundAt(tx - 1, ty) !== 'S') rect(g, x, y, 1, T, C.soilDark);
    if (groundAt(tx + 1, ty) !== 'S') rect(g, x + T - 1, y, 1, T, C.soilDark);
  }

  function waterTile(g, tx, ty) {
    const x = tx * T;
    const y = ty * T;
    rect(g, x, y, T, T, C.water);
    for (let i = 0; i < 3; i += 1) {
      rect(g, x + 2 + Math.floor(hash(tx, ty, i) * 9), y + 2 + Math.floor(hash(tx, ty, i + 3) * 12), 4, 1, C.waterLight);
    }
    if (groundAt(tx, ty - 1) !== 'W') rect(g, x, y, T, 2, C.waterDark);
    if (groundAt(tx - 1, ty) !== 'W') rect(g, x, y, 1, T, C.waterDark);
    if (groundAt(tx + 1, ty) !== 'W') rect(g, x + T - 1, y, 1, T, C.waterDark);
    if (groundAt(tx, ty + 1) !== 'W') rect(g, x, y + T - 1, T, 1, C.waterDark);
  }

  /* Nesneler */

  function drawPortalDoor(g, portal) {
    const x = portal.tx * T;
    const y = portal.ty * T - 6;
    // Gölge ve taş eşik
    rect(g, x + 1, y + 21, 14, 2, C.shadow);
    rect(g, x + 1, y + 20, 14, 3, C.stoneDark);
    rect(g, x + 1, y + 20, 14, 1, C.stone);
    // Kemerli kapı çerçevesi
    rect(g, x + 2, y + 2, 12, 19, portal.trim);
    rect(g, x + 3, y, 10, 3, portal.arch);
    rect(g, x + 1, y + 2, 14, 2, portal.arch);
    if (snowy) rect(g, x + 3, y, 10, 2, '#F4F7F5');
    // Kapı kanadı ve ışıklı pencere
    rect(g, x + 4, y + 4, 8, 16, portal.door);
    rect(g, x + 6, y + 6, 4, 5, portal.light);
    rect(g, x + 6, y + 13, 4, 5, portal.trim);
    rect(g, x + 10, y + 12, 1, 2, C.gold);
  }

  function cabin(g) {
    const x = CABIN.x * T;
    const y = CABIN.y * T;
    const w = CABIN.w * T;
    // Gölge
    rect(g, x + 4, y + 62, w - 4, 3, C.shadow);
    // Çatı: arduvaz kiremit sıraları
    rect(g, x + 1, y, w - 2, 36, C.roof);
    rect(g, x + 1, y, w - 2, 2, C.roofLight);
    for (let row = 5; row < 34; row += 5) {
      rect(g, x + 1, y + row, w - 2, 1, C.roofDark);
      for (let col = (row % 10 ? 3 : 7); col < w - 2; col += 8) rect(g, x + col, y + row - 4, 1, 4, C.roofDark);
    }
    rect(g, x, y + 34, w, 2, C.roofDark);
    if (snowy) {
      rect(g, x + 1, y, w - 2, 7, '#F4F7F5');
      for (let col = 4; col < w - 4; col += 9) rect(g, x + col, y + 7, 3, 2, '#F4F7F5');
    }
    // Baca
    rect(g, x + 60, y + 2, 9, 12, C.stone);
    rect(g, x + 60, y + 2, 9, 2, C.stoneDark);
    rect(g, x + 62, y + 7, 3, 1, C.stoneDark);
    // Duvar: dikey tahtalar
    rect(g, x + 3, y + 36, w - 6, 24, C.wall);
    for (let col = 8; col < w - 4; col += 6) rect(g, x + col, y + 36, 1, 24, C.wallDark);
    // Temel taşları
    rect(g, x + 3, y + 59, w - 6, 5, C.stone);
    for (let col = 6; col < w - 6; col += 7) rect(g, x + col, y + 60, 1, 4, C.stoneDark);
    // Pencereler
    [x + 13, x + 53].forEach((wx) => {
      rect(g, wx - 1, y + 41, 16, 12, C.woodDark);
      rect(g, wx + 1, y + 43, 12, 8, dayPart().lit ? C.glassLit : C.glass);
      rect(g, wx + 6, y + 43, 1, 8, C.woodDark);
      rect(g, wx + 1, y + 46, 12, 1, C.woodDark);
      // Saksı ve çiçekler
      rect(g, wx, y + 54, 14, 3, C.wood);
      [1, 4, 7, 10].forEach((fx, i) => rect(g, wx + fx + 1, y + 52, 2, 2, [C.petal, C.petal2, C.petal3, C.petal][i]));
    });
    // Kapı: PomoDoors'un yeşil kapısı
    const dx = 7 * T + 2;
    rect(g, dx - 1, y + 39, 14, 21, C.woodDark);
    rect(g, dx + 1, y + 41, 10, 19, C.door);
    rect(g, dx + 3, y + 43, 6, 6, C.doorLight);
    rect(g, dx + 3, y + 51, 6, 6, C.doorLight);
    rect(g, dx + 9, y + 50, 1, 2, C.gold);
    // Basamak
    rect(g, dx - 2, y + 60, 16, 4, C.stoneDark);
    rect(g, dx - 2, y + 60, 16, 1, C.stone);
  }

  function tree(g, tx, ty) {
    const x = tx * T;
    const y = ty * T;
    rect(g, x + 7, y + 29, 18, 3, C.shadow);
    rect(g, x + 13, y + 19, 6, 12, C.trunk);
    rect(g, x + 13, y + 19, 2, 12, C.woodDark);
    rect(g, x + 11, y + 29, 10, 2, C.trunk);
    const cx = 16;
    const cy = 12;
    for (let py = 0; py < 26; py += 1) {
      for (let px = 2; px < 30; px += 1) {
        const d = Math.hypot(px - cx, (py - cy) * 1.1);
        if (d > 13) continue;
        let color = C.leaf;
        if (d > 12) color = C.leafDark;
        else if (px - cx + py - cy > 8) color = C.leafDark;
        else if (px - cx + py - cy < -9) color = C.leafLight;
        else if (hash(tx * 40 + px, ty * 40 + py, 3) > 0.86) color = C.leafDark;
        else if (hash(tx * 40 + px, ty * 40 + py, 4) > 0.9) color = C.leafLight;
        rect(g, x + px, y + py, 1, 1, color);
      }
    }
  }

  // Ortak ağaç: küçük bir fidandan çiçek açmış büyük bir ağaca kadar altı aşama.
  function sharedTreeStage() {
    let stage = 0;
    SHARED_TREE_STEPS.forEach((min, i) => { if (game.roomWeekMinutes >= min) stage = i; });
    return stage;
  }

  function sharedTree(g) {
    const stage = sharedTreeStage();
    const [tx, ty] = SHARED_TREE;
    const x = tx * T;
    const y = ty * T;
    const radius = [3, 6, 8, 10, 12, 13][stage];
    const trunkTop = 31 - Math.max(4, Math.round(radius * 0.9));
    rect(g, x + 16 - radius, y + 29, radius * 2, 3, C.shadow);
    rect(g, x + 15, y + trunkTop, stage ? 3 : 2, 31 - trunkTop, C.trunk);
    const cx = 16;
    const cy = trunkTop - radius + 3;
    for (let py = 0; py < 32; py += 1) {
      for (let px = 0; px < 32; px += 1) {
        const d = Math.hypot(px - cx, (py - cy) * 1.1);
        if (d > radius) continue;
        let color = C.leaf;
        if (d > radius - 1) color = C.leafDark;
        else if (px - cx + py - cy < -radius * 0.6) color = C.leafLight;
        else if (hash(px, py, 21) > 0.88) color = C.leafDark;
        if (stage >= 4 && hash(px, py, 22) > (stage === 5 ? 0.86 : 0.94)) color = C.petal3;
        rect(g, x + px, y + py, 1, 1, color);
      }
    }
  }

  function bush(g, tx, ty) {
    const x = tx * T;
    const y = ty * T;
    rect(g, x + 2, y + 14, 12, 2, C.shadow);
    for (let py = 2; py < 15; py += 1) {
      for (let px = 1; px < 15; px += 1) {
        const d = Math.hypot(px - 8, (py - 9) * 1.15);
        if (d > 7) continue;
        let color = d > 6 ? C.leafDark : C.leaf;
        if (px + py < 10) color = C.leafLight;
        rect(g, x + px, y + py, 1, 1, color);
      }
    }
    rect(g, x + 5, y + 6, 2, 2, C.petal);
    rect(g, x + 10, y + 9, 2, 2, C.petal2);
  }

  function bench(g, tx, ty) {
    const x = tx * T;
    const y = ty * T;
    rect(g, x + 1, y + 13, 14, 2, C.shadow);
    rect(g, x + 1, y + 3, 14, 2, C.woodDark);
    rect(g, x + 1, y + 6, 14, 4, C.wood);
    rect(g, x + 1, y + 6, 14, 1, C.woodLight);
    rect(g, x + 2, y + 10, 2, 4, C.woodDark);
    rect(g, x + 12, y + 10, 2, 4, C.woodDark);
  }

  function fence(g, tx, ty) {
    const x = tx * T;
    const y = ty * T;
    rect(g, x, y + 5, T, 2, C.wood);
    rect(g, x, y + 10, T, 2, C.wood);
    rect(g, x, y + 7, T, 1, C.woodDark);
    rect(g, x, y + 12, T, 1, C.woodDark);
    rect(g, x + 2, y + 2, 4, 12, C.wood);
    rect(g, x + 2, y + 2, 4, 1, C.woodLight);
    rect(g, x + 5, y + 3, 1, 11, C.woodDark);
  }

  function lilyPad(g) {
    rect(g, 15 * T + 3, 2 * T + 6, 5, 3, C.leafLight);
    rect(g, 15 * T + 4, 2 * T + 5, 3, 1, C.leafLight);
    rect(g, 15 * T + 5, 2 * T + 6, 1, 1, C.petal);
  }

  /* Ortak ağaçla açılan yerler: 1 meydan, 2 çeşme, 3 sera, 4 fener festivali, 5 çiçek tarlası */

  const PLAZA = { x: 10, y: 4, w: 3, h: 2 };
  const PLAZA_LANTERNS = [[9, 5], [13, 5]];
  const FOUNTAIN = { x: 16, y: 4 };
  const GREENHOUSE = { x: 17, y: 2, w: 3, h: 2 };
  const FESTIVAL_X = [2, 6, 10, 14, 18];

  function plaza(g) {
    for (let ty = PLAZA.y; ty < PLAZA.y + PLAZA.h; ty += 1) {
      for (let tx = PLAZA.x; tx < PLAZA.x + PLAZA.w; tx += 1) {
        if (tx === BENCH[0] && ty === BENCH[1]) continue;
        rect(g, tx * T, ty * T, T, T, '#C9C2B2');
        rect(g, tx * T, ty * T + 7, T, 1, '#A8A090');
        rect(g, tx * T + (ty % 2 ? 4 : 11), ty * T, 1, 7, '#A8A090');
        rect(g, tx * T + (ty % 2 ? 11 : 4), ty * T + 8, 1, 8, '#A8A090');
      }
    }
    bench(g, ...BENCH);
    PLAZA_LANTERNS.forEach(([tx, ty]) => lanternPost(g, tx, ty));
  }

  function lanternPost(g, tx, ty) {
    const x = tx * T;
    const y = ty * T;
    rect(g, x + 6, y + 13, 5, 2, C.shadow);
    rect(g, x + 7, y + 4, 2, 10, C.woodDark);
    rect(g, x + 5, y + 1, 6, 5, C.woodDark);
    rect(g, x + 6, y + 2, 4, 3, '#F2D27A');
  }

  function fountain(g) {
    const x = FOUNTAIN.x * T;
    const y = FOUNTAIN.y * T;
    rect(g, x + 2, y + 26, 28, 4, C.shadow);
    rect(g, x + 1, y + 8, 30, 20, C.stoneDark);
    rect(g, x + 3, y + 10, 26, 16, C.stone);
    rect(g, x + 5, y + 12, 22, 12, C.water);
    rect(g, x + 7, y + 14, 6, 1, C.waterLight);
    rect(g, x + 18, y + 19, 6, 1, C.waterLight);
    rect(g, x + 14, y + 2, 4, 14, C.stoneDark);
    rect(g, x + 13, y + 1, 6, 3, C.stone);
    rect(g, x + 15, y + 4, 2, 6, C.waterLight);
  }

  function greenhouse(g) {
    const x = GREENHOUSE.x * T;
    const y = GREENHOUSE.y * T;
    const w = GREENHOUSE.w * T;
    rect(g, x + 2, y + 30, w - 2, 3, C.shadow);
    rect(g, x, y + 4, w, 28, '#2F5A4E');
    rect(g, x + 2, y + 6, w - 4, 24, 'rgba(191, 227, 240, .75)');
    for (let col = 2; col < w; col += 8) rect(g, x + col, y + 4, 1, 28, '#2F5A4E');
    rect(g, x, y + 16, w, 1, '#2F5A4E');
    rect(g, x + 4, y, w - 8, 5, '#2F5A4E');
    [6, 14, 22, 30, 38].forEach((col, i) => {
      rect(g, x + col, y + 24, 4, 4, C.soil);
      rect(g, x + col, y + 20, 4, 4, [C.petal, '#F2C14E', '#B58BD6', C.petal, '#F4F1EA'][i]);
    });
    rect(g, x + w / 2 - 4, y + 22, 8, 10, '#2F5A4E');
  }

  function festival(g) {
    rect(g, 0, 6 * T - 1, W, 1, 'rgba(60, 40, 20, .55)');
    FESTIVAL_X.forEach((tx) => {
      const x = tx * T + 6;
      rect(g, x + 1, 6 * T, 1, 2, '#6B4526');
      rect(g, x, 6 * T + 2, 4, 5, '#E8833A');
      rect(g, x, 6 * T + 4, 4, 1, '#C25E2A');
    });
  }

  function meadow(g) {
    for (let tx = 7; tx < COLS; tx += 1) {
      if (BUSHES.some(([bx, by]) => bx === tx && by === 10)) continue;
      for (let i = 0; i < 5; i += 1) {
        const px = tx * T + 2 + Math.floor(hash(tx, 10, i + 60) * 12);
        const py = 10 * T + 2 + Math.floor(hash(tx, 10, i + 70) * 12);
        rect(g, px, py, 2, 2, [C.petal, '#F2C14E', '#B58BD6', '#F4F1EA'][i % 4]);
      }
    }
  }

  function drawUnlocks(g, stage) {
    if (stage >= 1) plaza(g);
    if (stage >= 2) fountain(g);
    if (stage >= 3) greenhouse(g);
    if (stage >= 4) festival(g);
    if (stage >= 5) meadow(g);
  }

  // Akşam ve gece fenerlerin ışığı (sahne karartıldıktan sonra çizilir).
  function drawGlow(stage, target = ctx) {
    const glow = (x, y) => {
      rect(target, x - 3, y - 3, 10, 9, 'rgba(242, 210, 122, .18)');
      rect(target, x, y, 4, 3, '#F2D27A');
    };
    if (stage >= 1) PLAZA_LANTERNS.forEach(([tx, ty]) => glow(tx * T + 6, ty * T + 2));
    if (stage >= 4) FESTIVAL_X.forEach((tx) => glow(tx * T + 6, 6 * T + 3));
  }

  /* Engeller */

  const blocked = new Set();
  function block(tx, ty) { blocked.add(`${tx},${ty}`); }
  for (let ty = CABIN.y; ty < CABIN.y + CABIN.h; ty += 1) {
    for (let tx = CABIN.x; tx < CABIN.x + CABIN.w; tx += 1) block(tx, ty);
  }
  [...TREES, SHARED_TREE].forEach(([tx, ty]) => { block(tx, ty + 1); block(tx + 1, ty + 1); block(tx, ty); block(tx + 1, ty); });
  BUSHES.forEach(([tx, ty]) => block(tx, ty));
  block(...BENCH);
  for (let tx = FENCE_FROM; tx < COLS; tx += 1) block(tx, FENCE_Y);
  const WATER_TILES = [];
  GROUND.forEach((row, ty) => [...row].forEach((ch, tx) => {
    if (ch === 'W') {
      block(tx, ty);
      WATER_TILES.push([tx, ty]);
    }
  }));

  const unlockBlocked = new Set();
  function rebuildUnlockBlocked(stage) {
    unlockBlocked.clear();
    if (stage >= 1) PLAZA_LANTERNS.forEach(([tx, ty]) => unlockBlocked.add(`${tx},${ty}`));
    if (stage >= 2) [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([dx, dy]) => unlockBlocked.add(`${FOUNTAIN.x + dx},${FOUNTAIN.y + dy}`));
    if (stage >= 3) {
      for (let dx = 0; dx < GREENHOUSE.w; dx += 1) {
        for (let dy = 0; dy < GREENHOUSE.h; dy += 1) unlockBlocked.add(`${GREENHOUSE.x + dx},${GREENHOUSE.y + dy}`);
      }
    }
  }

  function isBlocked(x, y) {
    const points = [[x - 0.3, y - 0.05], [x + 0.3, y - 0.05], [x - 0.3, y - 0.3], [x + 0.3, y - 0.3]];
    const walls = mode === 'home' ? HOME_BLOCKED : isUniverse() ? UNIVERSE_BLOCKED : blocked;
    return points.some(([px, py]) => {
      const key = `${Math.floor(px)},${Math.floor(py)}`;
      if (px < 0 || py < 0 || px >= COLS || py >= ROWS) return true;
      if (walls.has(key)) return true;
      if (mode !== 'home' && !isUniverse()) {
        if (unlockBlocked.has(key)) return true;
        if (hasPortals() && PORTALS.some((p) => Math.floor(px) === p.tx && (Math.floor(py) === p.ty || Math.floor(py) === p.ty - 1))) {
          return true;
        }
      }
      return false;
    });
  }

  /* Statik katman: zemin ve nesneler. Tema ya da bahçe görünürlüğü değişince yeniden çizilir. */

  function drawStatic() {
    const g = staticLayer.getContext('2d');
    g.clearRect(0, 0, W, H);
    const gardenOn = game.show.garden;
    for (let ty = 0; ty < ROWS; ty += 1) {
      for (let tx = 0; tx < COLS; tx += 1) {
        const ground = groundAt(tx, ty);
        const mine = tx >= MY_PLOT.x && tx < MY_PLOT.x + MY_PLOT.cols && ty >= MY_PLOT.y && ty < MY_PLOT.y + MY_PLOT.rows;
        if (ground === 'P') pathTile(g, tx, ty);
        else if (ground === 'W') waterTile(g, tx, ty);
        else if (ground === 'S' && (gardenOn || !mine)) soilTile(g, tx, ty);
        else {
          grassTile(g, tx, ty);
          if (!blocked.has(`${tx},${ty}`) && ground === 'G') flowerOn(g, tx, ty);
        }
      }
    }
    lilyPad(g);
    for (let tx = FENCE_FROM; tx < COLS; tx += 1) fence(g, tx, FENCE_Y);
    BUSHES.forEach(([tx, ty]) => bush(g, tx, ty));
    bench(g, ...BENCH);
    cabin(g);
    drawUnlocks(g, sharedTreeStage());
    TREES.forEach(([tx, ty]) => tree(g, tx, ty));
    sharedTree(g);
    if (hasPortals()) PORTALS.forEach((portal) => drawPortalDoor(g, portal));
  }

  /* Bitkiler */

  // Tohum çeşitleri: ilk üç aşama hepsinde aynı, olgun hali çeşide göre değişir.
  const KIND_COLORS = [
    { f: '#F4F1EA', y: C.gold },          // 0 papatya
    { f: '#D9534F', y: '#B23A36' },       // 1 lale
    { f: C.gold, y: '#6B4526' },          // 2 ayçiçeği
    { f: '#E8833A', y: '#E8833A' },       // 3 havuç
    { f: '#D9534F', y: '#F4F1EA' },       // 4 çilek
    { f: '#E8833A', y: '#C25E2A' },       // 5 kabak (sonbahar)
    { f: '#F7F7F2', y: '#B8D8C0' },       // 6 kardelen (kış)
    { f: '#D93A2E', y: '#2B2622' },       // 7 gelincik (ilkbahar)
    { f: '#9B7BC8', y: '#7A5BB0' },       // 8 lavanta (yaz)
  ];
  const BASE_COLORS = { g: C.leaf, G: C.leafDark, s: C.leafDark, b: C.woodDark };

  function matureRows(kind) {
    const base = [...PLANT_SPRITES[3]];
    if (kind === 1) {
      return Object.assign(base, { 1: '......f.f.f.....', 2: '......fffff.....', 3: '......fyfff.....', 4: '.......fff......', 5: '........s.......' });
    }
    if (kind === 2) {
      return Object.assign(base, { 0: '......f.ff.f....', 1: '.....fffffff....', 2: '....ffyyyyyff...', 3: '.....fyyyyyf....', 4: '....ffyyyyyff...', 5: '......fffff.....' });
    }
    if (kind === 3) {
      return Object.assign(base, { 3: '......g.g.g.....', 11: '.......ff.......' });
    }
    if (kind === 4) {
      return Object.assign(base, { 7: '..gfGg..s.gGfg..', 8: '...gGGgss.gfg...', 9: '......f.s.f.....' });
    }
    if (kind === 5) {
      return Object.assign(base, { 8: '...gGGg..ffff...', 9: '......g.ffyfff..', 10: '........ffffff..', 11: '.........ffff...' });
    }
    if (kind === 6) {
      return Object.assign(base, { 2: '......ss.ss.....', 3: '.....f..s..f....', 4: '.....ff.s.ff....', 5: '......y.s.y.....' });
    }
    if (kind === 7) {
      return Object.assign(base, { 1: '......f.f.......', 2: '.....fffff......', 3: '.....ffyff......', 4: '......fff.......', 5: '.......s........' });
    }
    if (kind === 8) {
      return Object.assign(base, { 1: '.....f..f..f....', 2: '.....y..f..y....', 3: '.....f..y..f....', 4: '.....y..f..y....', 5: '.....s..s..s....' });
    }
    return [...PLANT_SPRITES[4]];
  }

  function drawPlant(stage, tx, ty, kind = 0) {
    if (!stage) return;
    const rows = stage === MAX_STAGE ? matureRows(kind) : PLANT_SPRITES[stage];
    const colors = { ...BASE_COLORS, ...(KIND_COLORS[kind] || KIND_COLORS[0]) };
    rows.forEach((row, py) => {
      for (let px = 0; px < row.length; px += 1) {
        const color = colors[row[px]];
        if (color) rect(ctx, tx * T + px, ty * T + py - 2, 1, 1, color);
      }
    });
  }

  // Odak sürerken birikmekte olan büyüme adımları bahçede hemen görünür.
  function visibleGarden() {
    const garden = [...game.garden];
    if (state.phase !== 'focus' || state.participation === 'none') return garden;
    let steps = Math.floor((game.growthCarry + focusedMinutesSoFar()) / MINUTES_PER_GROWTH);
    while (steps > 0) {
      const index = garden.findIndex((stage) => stage < MAX_STAGE);
      if (index === -1) garden.push(1);
      else garden[index] += 1;
      steps -= 1;
    }
    return garden;
  }

  function plotTile(index) {
    return [MY_PLOT.x + (index % MY_PLOT.cols), MY_PLOT.y + Math.floor(index / MY_PLOT.cols)];
  }

  function drawPlants(garden) {
    if (game.show.garden) {
      garden.slice(0, MY_PLOT.cols * MY_PLOT.rows)
        .forEach((stage, i) => drawPlant(stage, ...plotTile(i), game.gardenKinds[i] || 0));
    }
    people.slice(1, 1 + OTHER_PLOT_X.length).forEach((person, slot) => {
      (person.garden || []).slice(0, 4).forEach((stage, i) =>
        drawPlant(stage, OTHER_PLOT_X[slot] + (i % 2), OTHER_PLOT_Y + Math.floor(i / 2), (person.kinds || [])[i] || 0));
    });
  }

  /* Karakterler */

  function residentTarget(resident, index) {
    if (state.phase === 'focus') return resident.work;
    // Her 14 saniyede bir sıradaki noktaya yürür; iki sakin farklı zamanlarda hareket eder.
    const step = Math.floor((clock + index * 7) / 14);
    return resident.wander[step % resident.wander.length];
  }

  function targetFor(person) {
    if (person.resident) return residentTarget(person, RESIDENTS.indexOf(person));
    const status = statusOf(person);
    if (isUniverse()) {
      if (person === me) {
        if (status === 'focus') return UNIVERSE_SPOTS.myFocus;
        if (status === 'left') return UNIVERSE_SPOTS.myLeft;
        return UNIVERSE_SPOTS.myWait;
      }
      const slot = people.indexOf(person) - 1;
      if (status === 'focus') return UNIVERSE_SPOTS.otherFocus[slot] || extraSpot(slot);
      if (status === 'left' || status === 'none') return [8 + (slot % 4) * 1.1, 8.8 + Math.floor(slot / 4) * 0.6];
      if (person.pos) return [person.pos.x, person.pos.y];
      return UNIVERSE_SPOTS.gather[slot] || extraSpot(slot);
    }
    if (person === me) {
      if (status === 'focus') return MY_SPOTS.plot;
      if (status === 'left') return MY_SPOTS.cabin;
      if (status === 'none') return MY_SPOTS.path;
      return MY_SPOTS.gather;
    }
    const slot = people.indexOf(person) - 1;
    if (status === 'focus') return OTHER_PLOT_SPOTS[slot] || extraSpot(slot);
    if (status === 'left' || status === 'none') return [8.6 + (slot % 4) * 0.7, 4.8 + Math.floor(slot / 4) * 0.4];
    // Molada ve beklemede diğerleri paylaştıkları konuma yürür.
    if (person.pos) return [person.pos.x, person.pos.y];
    return GATHER_SPOTS[slot] || extraSpot(slot);
  }

  // Aktif odak turuna katılmışken dolaşmak kapalıdır; henüz katılmayan kişi kapılardan geçebilir.
  const canRoam = () => state.view === 'room' && (state.phase !== 'focus' || state.participation !== 'in');

  function updateActors(dt, list = everyone()) {
    Object.keys(actors).forEach((id) => {
      if (!personById(id) && !RESIDENTS.some((resident) => resident.id === id)) {
        delete actors[id];
        labelNodes[id]?.remove();
        delete labelNodes[id];
      }
    });
    list.forEach((person) => {
      const target = targetFor(person);
      let actor = actors[person.id];
      if (!actor) {
        actor = { x: target[0], y: target[1], dir: 'down', flip: false, moving: false, walk: 0, roamed: false };
        actors[person.id] = actor;
      }
      if (person === me && mode === 'home') return; // içerideyken bahçedeki karakter yerinde bekler
      if (person === me && canRoam()) {
        const wasMoving = actor.moving;
        moveByKeys(actor, dt);
        if (state.phase !== 'focus') {
          if (actor.moving) net.sendMove({ x: actor.x, y: actor.y, dir: actor.dir, flip: actor.flip });
          else if (wasMoving) {
            net.sendMove({ x: actor.x, y: actor.y, dir: actor.dir, flip: actor.flip }, true);
            trackPresence(); // sonradan gelenler de son konumu görsün
          }
        }
        return;
      }
      if (person === me) {
        actor.roamed = false;
        actor.goal = null;
      }
      const dx = target[0] - actor.x;
      const dy = target[1] - actor.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.05 || reduceMotion.matches) {
        actor.x = target[0];
        actor.y = target[1];
        actor.moving = false;
        actor.dir = 'down';
        actor.flip = false;
        return;
      }
      const stepLen = Math.min(dist, (person.pos ? SPEED * 1.2 : NPC_SPEED) * dt);
      actor.x += (dx / dist) * stepLen;
      actor.y += (dy / dist) * stepLen;
      actor.moving = true;
      actor.walk += dt;
      faceToward(actor, dx, dy);
    });
  }

  function nearbyPortal(actor) {
    if (!hasPortals() || mode === 'home') return null;
    return PORTALS.find((p) => Math.abs(actor.x - (p.tx + 0.5)) < 0.65 && actor.y >= p.ty + 0.7 && actor.y <= p.ty + 1.5) || null;
  }

  function triggerPortal(id) {
    if (portalBusy || typeof onEnterPortal !== 'function') return;
    portalBusy = true;
    keys.clear();
    Promise.resolve(onEnterPortal(id)).finally(() => { portalBusy = false; });
  }

  // Molada kullanıcı kendi yerine geri gönderilmez; dolaştığı yerde kalır.
  function moveByKeys(actor, dt) {
    let dx = 0;
    let dy = 0;
    if (keys.has('left')) dx -= 1;
    if (keys.has('right')) dx += 1;
    if (keys.has('up')) dy -= 1;
    if (keys.has('down')) dy += 1;
    if (!dx && !dy && actor.goal) {
      const gx = actor.goal[0] - actor.x;
      const gy = actor.goal[1] - actor.y;
      if (Math.hypot(gx, gy) < 0.14) {
        const action = actor.goal[2];
        actor.goal = null;
        actor.moving = false;
        if (action === 'door') enterHome();
        else if (action === 'exit') leaveHome();
        else if (action === 'return') triggerPortal('ortak');
        else if (typeof action === 'string' && action.startsWith('portal:')) triggerPortal(action.slice(7));
        else if (action) plantHere();
        return;
      }
      dx = gx;
      dy = gy;
    } else if (dx || dy) {
      actor.goal = null;
    }
    if (!dx && !dy) {
      actor.moving = false;
      return;
    }
    actor.roamed = true;
    const len = Math.hypot(dx, dy);
    const nx = actor.x + (dx / len) * SPEED * dt;
    const ny = actor.y + (dy / len) * SPEED * dt;
    const before = [actor.x, actor.y];
    if (!isBlocked(nx, actor.y)) actor.x = nx;
    if (!isBlocked(actor.x, ny)) actor.y = ny;
    // Kapıya doğrudan yürüyen kullanıcı eşikteyse otomatik olarak içeri geçer.
    if (dy < -0.1 && before[1] === actor.y) {
      const portal = nearbyPortal(actor);
      if (portal) {
        actor.goal = null;
        triggerPortal(portal.id);
        return;
      }
      if (!isUniverse() && mode === 'garden' && Math.abs(actor.x - 7.5) < 0.65 && actor.y <= 4.45) {
        actor.goal = null;
        enterHome();
        return;
      }
    }
    if (isUniverse() && actor.y > 11.2) {
      triggerPortal('ortak');
      return;
    }
    // Dokunarak verilen hedefe ulaşılamıyorsa (engel) yürüme durur.
    if (actor.goal && before[0] === actor.x && before[1] === actor.y) actor.goal = null;
    actor.moving = true;
    actor.walk += dt;
    faceToward(actor, dx, dy);
  }

  function faceToward(actor, dx, dy) {
    if (Math.abs(dx) > Math.abs(dy)) {
      actor.dir = 'side';
      actor.flip = dx < 0;
    } else {
      actor.dir = dy < 0 ? 'up' : 'down';
      actor.flip = false;
    }
  }

  function drawCharacter(person, actor, target = ctx) {
    const look = normalizeLook(person.look);
    const palette = characterPalette(look);
    const frame = actor.moving ? Math.floor(actor.walk / 0.16) % 2 : 0;
    const working = statusOf(person) === 'focus' && !actor.moving && !reduceMotion.matches;
    const bob = working && Math.floor(clock / 0.7) % 2 ? 1 : 0;
    const rows = characterRows(look, actor.dir, frame);
    const left = Math.round(actor.x * T) - 8;
    const top = Math.round(actor.y * T) - 15 + bob;
    target.globalAlpha = statusOf(person) === 'left' ? 0.55 : 1;
    rect(target, left + 4, Math.round(actor.y * T) - 1, 8, 2, C.shadow);
    rows.forEach((row, py) => {
      for (let px = 0; px < 16; px += 1) {
        const ch = row[actor.flip ? 15 - px : px];
        if (ch !== '.') rect(target, left + px, top + py, 1, 1, palette[ch]);
      }
    });
    target.globalAlpha = 1;
  }

  /* Ad etiketleri ve konuşma balonları: keskin ve okunaklı kalsın diye HTML katmanında */

  function lastMessageBy(id) {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].author === id) return messages[i].text;
    }
    return '';
  }

  // Molada balonlar üst üste binmesin diye aynı anda tek kişi konuşur; en yeni mesaj önce gelir.
  let seenMessages = 0;
  let rotationStart = 0;
  function currentSpeaker() {
    if (state.phase !== 'break') return '';
    const speakers = [];
    messages.forEach(({ author }) => {
      const at = speakers.indexOf(author);
      if (at !== -1) speakers.splice(at, 1);
      speakers.push(author);
    });
    if (!speakers.length) return '';
    if (messages.length !== seenMessages) {
      seenMessages = messages.length;
      rotationStart = clock;
    }
    const turn = Math.floor((clock - rotationStart) / 4);
    return speakers[(speakers.length - 1 + turn) % speakers.length];
  }

  function updatePortalLabels(shown) {
    const items = [];
    if (hasPortals() && state.online) {
      PORTALS.forEach((p) => {
        const count = (typeof lobbyCounts !== 'undefined' && lobbyCounts[p.id]) || 0;
        const text = count ? `${t(`room.${p.id}`)} · ${count}` : t(`room.${p.id}`);
        items.push({ key: p.id, text, x: (p.tx + 0.5) * T, y: p.ty * T - 8, hasPeople: count > 0, isReturn: false });
      });
    } else if (isUniverse()) {
      items.push({ key: 'return', text: t('portal.return'), x: (HOME_DOOR.x + 1) * T, y: HOME_DOOR.y * T - 6, hasPeople: false, isReturn: true });
    }
    const activeKeys = new Set(items.map((item) => item.key));
    Object.keys(portalNodes).forEach((key) => {
      if (!activeKeys.has(key)) {
        portalNodes[key].remove();
        delete portalNodes[key];
      }
    });
    items.forEach((item) => {
      let node = portalNodes[item.key];
      if (!node) {
        node = document.createElement('span');
        labels.append(node);
        portalNodes[item.key] = node;
      }
      node.className = `scene-portal${item.hasPeople ? ' has-people' : ''}${item.isReturn ? ' is-return' : ''}`;
      node.textContent = item.text;
      node.style.transform = `translate(${item.x * shown}px, ${item.y * shown}px) translate(-50%, -100%)`;
    });
  }

  function updateLabels() {
    const speaker = currentSpeaker();
    // Ölçek her karede canvas'ın gerçek boyutundan okunur; yeniden boyutlamada etiketler kaymaz.
    const shown = canvas.clientWidth / W || scale;
    labels.style.left = `${canvas.offsetLeft}px`;
    updatePortalLabels(shown);
    everyone().forEach((person) => {
      const actor = actors[person.id];
      if (!actor) return;
      let node = labelNodes[person.id];
      if (!node) {
        node = document.createElement('div');
        node.className = person.resident ? 'scene-tag is-resident' : 'scene-tag';
        node.innerHTML = '<span class="scene-emote" hidden></span><span class="scene-bubble" hidden></span><span class="scene-name"></span>';
        labels.append(node);
        labelNodes[person.id] = node;
      }
      node.querySelector('.scene-name').textContent = person.name;
      const emoteNode = node.querySelector('.scene-emote');
      const emote = emotes[person.id];
      const showEmoteNow = emote && emote.until > clock;
      if (showEmoteNow && emoteNode.dataset.kind !== emote.kind) {
        emoteNode.innerHTML = pixelIcon(emote.kind);
        emoteNode.dataset.kind = emote.kind;
      }
      emoteNode.hidden = !showEmoteNow;
      if (!showEmoteNow) emoteNode.dataset.kind = '';
      const bubble = node.querySelector('.scene-bubble');
      const text = person.id === speaker ? lastMessageBy(person.id) : '';
      bubble.hidden = !text;
      if (text) bubble.textContent = text.length > 34 ? `${text.slice(0, 33)}…` : text;
      node.style.transform = `translate(${actor.x * T * shown}px, ${(actor.y * T - 17) * shown}px) translate(-50%, -100%)`;
    });
  }

  /* Erişilebilir metinler */

  function describe(garden) {
    const who = people.map((person) => {
      const status = statusOf(person);
      if (person === me) {
        if (status === 'focus') return t('scene.meFocus', { name: person.name });
        return t('scene.meStatus', { name: person.name, status: statusLabel(status, true) });
      }
      return `${person.name}: ${statusLabel(status)}`;
    }).join('. ');
    let plants = '';
    if (game.show.garden) {
      const parts = [];
      for (let stage = MAX_STAGE; stage >= 0; stage -= 1) {
        const count = garden.filter((value) => value === stage).length;
        if (count) parts.push(t(`stage.${stage}`, { n: count }));
      }
      plants = t('scene.plants', { list: parts.join(', ') });
    }
    return `${t('scene.desc', { phase: t(`phase.${state.phase}`), who, plants })} ${t('scene.residents')}`;
  }

  function baseHint() {
    if (mode === 'home') return t('home.hint');
    if (state.phase === 'focus' && state.participation === 'in') return t('hint.focusIn');
    if (isUniverse()) return t('hint.roamUniverse', { name: t(`room.${net.room}`) });
    if (state.phase === 'focus') return t('hint.focusOut');
    return game.show.garden
      ? t('hint.roamGarden')
      : t('hint.roam');
  }

  function updateText(garden) {
    const aria = describe(garden);
    if (aria !== lastAria) {
      canvas.setAttribute('aria-label', aria);
      lastAria = aria;
    }
    const text = hintOverride && performance.now() < hintUntil ? hintOverride : baseHint();
    if (text !== lastHint) {
      hint.textContent = text;
      lastHint = text;
    }
  }

  /* Ekme */

  function plantHere() {
    if (!canRoam() || !game.show.garden) return;
    if (state.phase !== 'break') {
      showHint(t('hint.focusPlant'));
      return;
    }
    const actor = actors[me.id];
    const tx = Math.floor(actor.x);
    const ty = Math.floor(actor.y - 0.1);
    const col = tx - MY_PLOT.x;
    const row = ty - MY_PLOT.y;
    if (col < 0 || col >= MY_PLOT.cols || row < 0 || row >= MY_PLOT.rows) return;
    const index = row * MY_PLOT.cols + col;
    if (index >= game.garden.length) return;
    if (game.garden[index] === MAX_STAGE) {
      onHarvest(index);
      return;
    }
    if (game.garden[index] !== 0) {
      showHint(t('hint.occupied', { name: t(`stageName.${game.garden[index]}`) }));
      return;
    }
    onPlantSeed(index);
  }

  function showHint(text) {
    hintOverride = text;
    hintUntil = performance.now() + 2800;
  }

  /* Portal evrenleri: Ders (kütüphane), Kod (gece atölyesi), İş (çalışma salonu), Hobi (cam sera) */

  const HOME_DOOR = { x: 9, y: 11 };
  const UNIVERSE_BLOCKED = new Set();
  (() => {
    for (let tx = 0; tx < COLS; tx += 1) {
      for (let ty = 0; ty < 3; ty += 1) UNIVERSE_BLOCKED.add(`${tx},${ty}`);
      if (tx < HOME_DOOR.x || tx > HOME_DOOR.x + 1) UNIVERSE_BLOCKED.add(`${tx},11`);
    }
    [[3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [10, 4], [11, 4], [12, 4], [13, 4], [14, 4], [15, 4], [16, 4]].forEach(([tx, ty]) => UNIVERSE_BLOCKED.add(`${tx},${ty}`));
    [[1, 3], [18, 3]].forEach(([tx, ty]) => UNIVERSE_BLOCKED.add(`${tx},${ty}`));
  })();
  let universeLayer;
  let universeKey = '';

  const UNIVERSE_THEMES = {
    ders: { wall: '#DFCFAF', stripe: '#D4C29E', floor: '#A67546', seam: '#875C34', trim: '#5E3D22', rug: '#8A444E', rugIn: '#A35A64', door: '#3B5C85', wrap: '#5E3D22' },
    kod: { wall: '#323846', stripe: '#2B303D', floor: '#524438', seam: '#3E332A', trim: '#232730', rug: '#2F6B5E', rugIn: '#3D8272', door: '#2E6B62', wrap: '#232730' },
    work: { wall: '#ECE0C6', stripe: '#E2D3B4', floor: '#C2955E', seam: '#A67844', trim: '#6B4526', rug: '#7E949A', rugIn: '#98ACB1', door: '#9C6234', wrap: '#6B4526' },
    hobby: { wall: '#C6DDD1', stripe: '#B2CFC0', floor: '#C98A68', seam: '#A86E4E', trim: '#5E8C4A', rug: '#E3B458', rugIn: '#ECC578', door: '#A65353', wrap: '#4E6B46' },
  };

  function drawSkyWindow(g, x, y, w, h, frameColor, part, mullions = 1) {
    rect(g, x - 2, y - 2, w + 4, h + 4, frameColor);
    const sky = part.lit ? '#1B2542' : part.name === 'dusk' ? '#F09D64' : part.name === 'dawn' ? '#F4B88A' : '#BFE3F0';
    rect(g, x, y, w, h, sky);
    if (part.lit) {
      for (let i = 0; i < Math.max(3, Math.floor(w / 10)); i += 1) {
        rect(g, x + 3 + Math.floor(hash(i, x, 7) * (w - 6)), y + 3 + Math.floor(hash(i, y, 9) * (h - 6)), 1, 1, '#F2D27A');
      }
    }
    for (let i = 1; i <= mullions; i += 1) {
      rect(g, x + Math.round((w * i) / (mullions + 1)), y, 2, h, frameColor);
    }
  }

  function drawDeskRow(g, part, kind) {
    [48, 96, 160, 208].forEach((x, idx) => {
      rect(g, x, 64, 40, 14, kind === 'kod' ? '#3B342E' : '#8A5A36');
      rect(g, x, 64, 40, 2, kind === 'kod' ? '#524840' : '#B9864F');
      rect(g, x + 3, 78, 3, 6, '#4E3420');
      rect(g, x + 34, 78, 3, 6, '#4E3420');
      if (kind === 'kod') {
        rect(g, x + 10, 54, 18, 11, '#1E232B');
        rect(g, x + 12, 56, 14, 7, idx % 2 ? '#7CE0C3' : '#8CC9E6');
        rect(g, x + 31, 61, 4, 4, '#F4F1EA');
      } else if (kind === 'ders') {
        rect(g, x + 8, 59, 12, 6, '#F4F1EA');
        rect(g, x + 9, 60, 4, 4, '#D9C49E');
        rect(g, x + 28, 53, 2, 11, '#2B2622');
        rect(g, x + 24, 50, 10, 5, '#F2D27A');
      } else if (kind === 'work') {
        rect(g, x + 9, 55, 16, 10, '#3B4A66');
        rect(g, x + 11, 57, 12, 6, part.lit ? '#8CC9E6' : '#DCEBF2');
        rect(g, x + 29, 58, 6, 6, '#E8D9B5');
      } else {
        rect(g, x + 6, 56, 10, 8, '#F4F1EA');
        rect(g, x + 8, 58, 6, 4, ['#E07A6A', '#F2C14E', '#78B455', '#B58BD6'][idx]);
        rect(g, x + 23, 56, 7, 8, '#A9754A');
        rect(g, x + 24, 52, 5, 5, '#4E8F3A');
      }
    });
  }

  function drawUniverse(part) {
    const id = UNIVERSE_ROOMS.includes(net.room) ? net.room : 'ders';
    const theme = UNIVERSE_THEMES[id];
    const g = universeLayer.getContext('2d');
    rect(g, 0, 0, W, H, theme.floor);
    for (let y = 48; y < H; y += 8) rect(g, 0, y, W, 1, theme.seam);
    for (let y = 48, row = 0; y < H; y += 8, row += 1) {
      for (let x = (row % 2) * 16; x < W; x += 32) rect(g, x, y, 1, 8, theme.seam);
    }
    rect(g, 0, 0, W, 46, theme.wall);
    for (let x = 0; x < W; x += 10) rect(g, x, 0, 2, 46, theme.stripe);
    rect(g, 0, 44, W, 4, theme.trim);

    if (id === 'ders') {
      [14, 126, 266].forEach((bx) => {
        rect(g, bx, 6, 40, 38, '#5E3D22');
        [10, 21, 32].forEach((sy) => {
          rect(g, bx + 2, sy + 8, 36, 2, '#3E2715');
          ['#B85C7A', '#2F6B5E', '#E3B458', '#4F6F8A', '#C78A6C', '#78B455'].forEach((c, i) => rect(g, bx + 3 + i * 6, sy, 5, 8, c));
        });
      });
      drawSkyWindow(g, 72, 8, 36, 28, '#5E3D22', part, 1);
      drawSkyWindow(g, 194, 8, 36, 28, '#5E3D22', part, 1);
    } else if (id === 'kod') {
      drawSkyWindow(g, 64, 6, 176, 28, '#1E232B', part, 3);
      rect(g, 14, 18, 34, 26, '#3B342E');
      rect(g, 20, 12, 12, 10, '#7E949A');
      rect(g, 22, 14, 8, 5, '#F2D27A');
      rect(g, 262, 10, 40, 34, '#232730');
      rect(g, 268, 16, 28, 10, '#2F6B5E');
      rect(g, 268, 30, 12, 10, '#E3B458');
    } else if (id === 'work') {
      rect(g, 20, 10, 48, 24, '#6B4526');
      rect(g, 23, 13, 42, 18, '#D9B26F');
      [[27, 16, '#F4F1EA'], [39, 18, '#F2C14E'], [51, 15, '#A6D17F']].forEach(([px, py, c]) => rect(g, px, py, 8, 6, c));
      drawSkyWindow(g, 92, 8, 56, 26, '#6B4526', part, 2);
      drawSkyWindow(g, 172, 8, 56, 26, '#6B4526', part, 2);
      rect(g, 256, 18, 44, 26, '#7A5132');
      rect(g, 264, 10, 10, 10, '#C78A6C');
      rect(g, 280, 12, 8, 8, '#F4F1EA');
    } else {
      drawSkyWindow(g, 18, 4, 84, 34, '#5E8C4A', part, 2);
      drawSkyWindow(g, 118, 4, 84, 34, '#5E8C4A', part, 2);
      drawSkyWindow(g, 218, 4, 84, 34, '#5E8C4A', part, 2);
      [24, 62, 132, 184, 240, 284].forEach((vx) => {
        rect(g, vx, 4, 4, 12, '#4E8F3A');
        rect(g, vx + 1, 16, 2, 6, '#78B455');
      });
      rect(g, 266, 86, 22, 26, '#7A5132');
      rect(g, 269, 88, 16, 14, '#F4F1EA');
      rect(g, 272, 91, 10, 4, '#8CC9E6');
      rect(g, 272, 95, 10, 5, '#6FAE4A');
    }

    drawDeskRow(g, part, id);
    rect(g, 88, 106, 144, 44, theme.rug);
    rect(g, 94, 110, 132, 36, theme.rugIn);
    [[16, 52], [290, 52]].forEach(([x, y]) => {
      rect(g, x, y + 8, 10, 8, '#A9754A');
      rect(g, x - 1, y, 12, 9, '#4E8F3A');
    });
    rect(g, 0, 176, W, 16, theme.trim);
    rect(g, HOME_DOOR.x * T, 176, 32, 16, theme.door);
    rect(g, HOME_DOOR.x * T + 4, 166, 24, 8, '#C9A46A');
  }

  function resetRoom(fromRoom = '') {
    mode = 'garden';
    keys.clear();
    Object.keys(actors).forEach((id) => delete actors[id]);
    Object.keys(labelNodes).forEach((id) => { labelNodes[id].remove(); delete labelNodes[id]; });
    Object.keys(portalNodes).forEach((id) => { portalNodes[id].remove(); delete portalNodes[id]; });
    staticKey = '';
    universeKey = '';
    const portal = PORTALS.find((p) => p.id === fromRoom);
    if (net.room === 'ortak' && portal) {
      actors[me.id] = { x: portal.tx + 0.5, y: portal.ty + 1.45, dir: 'down', flip: false, moving: false, walk: 0, roamed: true, goal: null };
    } else if (isUniverse()) {
      actors[me.id] = { x: HOME_DOOR.x + 1, y: 10.1, dir: 'up', flip: false, moving: false, walk: 0, roamed: true, goal: null };
    }
  }

  /* Evin içi: kişisel çalışma köşesi. Yalnızca molada ve beklemede; içeride diğerleri görünmez. */

  let mode = 'garden';
  const homeActor = { x: 10, y: 10.6, dir: 'up', flip: false, moving: false, walk: 0, roamed: true, goal: null };
  const HOME_BLOCKED = new Set();
  (() => {
    for (let tx = 0; tx < COLS; tx += 1) {
      for (let ty = 0; ty < 3; ty += 1) HOME_BLOCKED.add(`${tx},${ty}`);
      if (tx < HOME_DOOR.x || tx > HOME_DOOR.x + 1) HOME_BLOCKED.add(`${tx},11`);
    }
    [[13, 3], [14, 3], [15, 3], [16, 3]].forEach(([tx, ty]) => HOME_BLOCKED.add(`${tx},${ty}`));
    for (let tx = 16; tx <= 18; tx += 1) for (let ty = 6; ty <= 8; ty += 1) HOME_BLOCKED.add(`${tx},${ty}`);
    [[1, 9], [18, 3], [0, 3]].forEach(([tx, ty]) => HOME_BLOCKED.add(`${tx},${ty}`));
  })();
  let homeLayer;
  let homeKey = '';

  function drawHome(part) {
    const g = homeLayer.getContext('2d');
    // Zemin: sıcak ahşap tahtalar
    rect(g, 0, 0, W, H, '#B9864F');
    for (let y = 48; y < H; y += 6) rect(g, 0, y, W, 1, '#9A6A3F');
    for (let y = 48, row = 0; y < H; y += 6, row += 1) {
      for (let x = (row % 2) * 13; x < W; x += 26) rect(g, x, y, 1, 6, '#9A6A3F');
    }
    // Duvar ve süpürgelik
    rect(g, 0, 0, W, 46, '#E8D9B5');
    for (let x = 0; x < W; x += 8) rect(g, x, 0, 2, 46, '#DCC9A0');
    rect(g, 0, 44, W, 4, '#6B4526');
    // Pencere: gündüz gök mavisi, akşam ve gece koyu ve yıldızlı
    rect(g, 64, 8, 36, 26, '#6B4526');
    rect(g, 67, 11, 30, 20, part.lit ? '#1E2A4A' : '#BFE3F0');
    if (part.lit) [[70, 14], [82, 18], [91, 13], [75, 25]].forEach(([x, y]) => rect(g, x, y, 1, 1, '#F2D27A'));
    rect(g, 81, 11, 2, 20, '#6B4526');
    rect(g, 67, 20, 30, 2, '#6B4526');
    // Kitaplık
    rect(g, 12, 6, 40, 40, '#6B4526');
    [10, 22, 34].forEach((y) => {
      rect(g, 14, y + 9, 36, 2, '#4E3420');
      ['#B85C7A', '#2F6B5E', '#E3B458', '#7E949A', '#C78A6C', '#3E672C', '#9C5B34'].forEach((color, i) => {
        rect(g, 15 + i * 5, y, 4, 9, color);
      });
    });
    // Şömine ve ateş
    rect(g, 128, 6, 40, 40, '#9C9A92');
    rect(g, 126, 4, 44, 4, '#7C7A72');
    rect(g, 138, 22, 20, 22, '#2B2622');
    rect(g, 142, 32, 12, 10, '#E8833A');
    rect(g, 145, 28, 6, 8, '#F2D27A');
    // Masa, dizüstü bilgisayar ve lamba
    rect(g, 208, 40, 64, 18, '#7A5132');
    rect(g, 208, 40, 64, 3, '#9A6A3F');
    rect(g, 214, 58, 3, 8, '#4E3420');
    rect(g, 263, 58, 3, 8, '#4E3420');
    rect(g, 228, 30, 22, 12, '#3B4A66');
    rect(g, 230, 32, 18, 8, part.lit ? '#8CC9E6' : '#BFE3F0');
    rect(g, 258, 26, 2, 14, '#2B2622');
    rect(g, 253, 22, 12, 6, '#F2D27A');
    rect(g, 228, 66, 14, 10, '#9A6A3F');
    // Halı
    rect(g, 112, 80, 96, 64, '#B85C7A');
    rect(g, 116, 84, 88, 56, '#C77A92');
    rect(g, 120, 88, 80, 48, '#B85C7A');
    // Yatak
    rect(g, 256, 96, 48, 52, '#7A5132');
    rect(g, 258, 98, 44, 48, '#7E949A');
    rect(g, 262, 100, 36, 10, '#F4F1EA');
    // Saksılar
    [[18, 146], [290, 52], [6, 52]].forEach(([x, y]) => {
      rect(g, x, y + 8, 10, 8, '#A9754A');
      rect(g, x - 1, y, 12, 9, '#4E8F3A');
      rect(g, x + 3, y - 3, 4, 4, '#5E9A3C');
    });
    // Kişisel kulübe eşyaları (Yaprak ekonomisiyle açılır)
    const owned = new Set(game.cabin || []);
    if (owned.has('plant')) {
      rect(g, 43, 1, 8, 5, '#A9754A');
      rect(g, 41, 4, 11, 4, '#4E8F3A');
      rect(g, 49, 8, 3, 8, '#2F6B5E');
      rect(g, 44, 8, 2, 5, '#4E8F3A');
    }
    if (owned.has('lantern')) {
      rect(g, 188, 0, 2, 8, '#4E3420');
      rect(g, 185, 8, 8, 9, '#6B4526');
      rect(g, 187, 10, 4, 5, '#F2D27A');
    }
    if (owned.has('tea')) {
      rect(g, 106, 39, 16, 7, '#7A5132');
      rect(g, 108, 36, 12, 3, '#A9754A');
      rect(g, 110, 32, 5, 4, '#C78A6C');
      rect(g, 116, 33, 3, 3, '#FFF8E8');
    }
    if (owned.has('cat')) {
      rect(g, 87, 25, 7, 6, '#E8833A');
      rect(g, 87, 23, 2, 2, '#E8833A');
      rect(g, 92, 23, 2, 2, '#E8833A');
      rect(g, 89, 26, 1, 1, '#2B2622');
      rect(g, 91, 26, 1, 1, '#2B2622');
    }
    if (owned.has('turntable')) {
      rect(g, 251, 35, 14, 6, '#5C3A21');
      rect(g, 253, 34, 8, 3, '#2B2622');
      rect(g, 262, 36, 2, 3, '#D9534F');
    }
    if (owned.has('cushion')) {
      rect(g, 144, 104, 24, 14, '#7E4D6B');
      rect(g, 146, 106, 20, 10, '#9E6689');
      rect(g, 152, 108, 8, 6, '#F4F1EA');
      rect(g, 156, 108, 1, 6, '#C8C1B4');
    }
    // Kapı (alt duvar) ve paspas
    rect(g, 0, 176, W, 16, '#6B4526');
    rect(g, HOME_DOOR.x * T, 176, 32, 16, '#3E672C');
    rect(g, HOME_DOOR.x * T + 4, 166, 24, 8, '#C9A46A');
  }

  function drawHomeAmbience(now) {
    if (reduceMotion.matches) return;
    const owned = new Set(game.cabin || []);
    if (owned.has('lantern')) {
      const pulse = 0.14 + 0.06 * Math.sin(now / 650);
      rect(ctx, 181, 6, 16, 14, `rgba(242, 210, 122, ${pulse.toFixed(2)})`);
    }
    if (owned.has('tea')) {
      const dy = Math.floor(now / 500) % 3;
      rect(ctx, 112, 29 - dy, 1, 2, 'rgba(255, 248, 232, .7)');
      rect(ctx, 117, 30 - ((dy + 1) % 3), 1, 2, 'rgba(255, 248, 232, .55)');
    }
    if (owned.has('cat')) {
      const wag = Math.floor(now / 700) % 2;
      rect(ctx, 94, 28 + wag, 2, 2, '#E8833A');
    }
    if (owned.has('turntable')) {
      const spin = Math.floor(now / 260) % 2;
      rect(ctx, 256 + spin, 35, 1, 1, '#E3B458');
    }
  }

  function enterHome() {
    if (!canRoam() || mode === 'home') return;
    mode = 'home';
    Object.assign(homeActor, { x: HOME_DOOR.x + 1, y: 10.4, dir: 'up', goal: null, moving: false });
    keys.clear();
    showHint(t('home.enter'));
  }

  function leaveHome() {
    if (mode !== 'home') return;
    mode = 'garden';
    const mine = actors[me.id];
    if (mine) Object.assign(mine, { x: 7.5, y: 4.5, dir: 'down', goal: null, roamed: true });
    keys.clear();
  }

  /* Döngü ve sakin atmosfer */

  function ensureLayers() {
    if (!staticLayer) {
      staticLayer = document.createElement('canvas');
      staticLayer.width = W;
      staticLayer.height = H;
    }
    if (!homeLayer) {
      homeLayer = document.createElement('canvas');
      homeLayer.width = W;
      homeLayer.height = H;
    }
    if (!universeLayer) {
      universeLayer = document.createElement('canvas');
      universeLayer.width = W;
      universeLayer.height = H;
    }
  }

  function drawAtmosphere(target, part, { preview }) {
    const animated = !reduceMotion.matches;

    // Göl üzerinde yavaş parıltı
    if (animated && WATER_TILES.length) {
      const slot = Math.floor(clock * 1.4);
      [0, 3].forEach((offset) => {
        const [tx, ty] = WATER_TILES[(slot + offset) % WATER_TILES.length];
        const rx = tx * T + 3 + ((slot + offset) % 7);
        const ry = ty * T + 4 + (((slot + offset) * 3) % 8);
        rect(target, rx, ry, 3, 1, C.waterLight);
      });
    }

    // Kulübe bacasından ince duman
    if (animated) {
      const puff = Math.floor(clock * 1.5) % 3;
      const cx = CABIN.x * T + 63 + (puff === 1 ? 1 : 0);
      rect(target, cx, 1, 2, 1, 'rgba(244, 241, 234, .55)');
      if (puff !== 2) rect(target, cx + 1, 0, 2, 1, 'rgba(244, 241, 234, .35)');
    }

    // Kışın yavaş yağan kar taneleri
    if (snowy && animated) {
      for (let i = 0; i < 16; i += 1) {
        const sx = Math.round((hash(i, 1, 7) * W + Math.sin(clock * 0.8 + i) * 6 + W) % W);
        const sy = Math.round((hash(i, 2, 13) * H + clock * (9 + (i % 4) * 2)) % H);
        rect(target, sx, sy, i % 3 === 0 ? 2 : 1, 1, 'rgba(244, 247, 245, .8)');
      }
    }

    // Akşam ve gece ateşböcekleri (kış hariç)
    if (part.lit && !snowy && animated) {
      for (let i = 0; i < 7; i += 1) {
        const phase = clock * 1.1 + i * 1.9;
        const alpha = 0.25 + 0.65 * (0.5 + 0.5 * Math.sin(phase * 1.7));
        const fx = Math.round(40 + hash(i, 4, 21) * (W - 70) + Math.sin(phase) * 8);
        const fy = Math.round(36 + hash(i, 5, 29) * (H - 56) + Math.cos(phase * 0.8) * 5);
        rect(target, fx, fy, 1, 1, `rgba(242, 210, 122, ${alpha.toFixed(2)})`);
      }
    }

    // Odakta çalışanların yanında sakin sıcak fener ve büyüyen tarh parıltısı
    if (!preview && state.phase === 'focus') {
      everyone().forEach((person) => {
        if (person.resident || statusOf(person) !== 'focus') return;
        const actor = actors[person.id];
        if (!actor) return;
        const lx = Math.round(actor.x * T) + 7;
        const ly = Math.round(actor.y * T) - 4;
        rect(target, lx - 2, ly - 2, 6, 6, part.lit ? 'rgba(242, 210, 122, .26)' : 'rgba(242, 210, 122, .14)');
        rect(target, lx, ly, 2, 2, '#F2D27A');
      });
      if (animated && state.participation === 'in' && game.show.garden) {
        const growing = visibleGarden().findIndex((s) => s < MAX_STAGE);
        if (growing !== -1 && growing < MY_PLOT.cols * MY_PLOT.rows) {
          const [tx, ty] = plotTile(growing);
          const pulse = Math.floor(clock * 2) % 4;
          if (pulse < 2) {
            rect(target, tx * T + 7, ty * T + 3 - pulse, 1, 1, '#A6D17F');
          }
        }
      }
    }
  }

  function renderGarden(target, part, stage, list, { preview }) {
    target.clearRect(0, 0, W, H);
    target.drawImage(staticLayer, 0, 0);
    const garden = preview ? [] : visibleGarden();
    if (!preview) drawPlants(garden);
    list
      .map((person) => [person, actors[person.id]])
      .filter(([, actor]) => actor)
      .sort((a, b) => a[1].y - b[1].y)
      .forEach(([person, actor]) => drawCharacter(person, actor, target));

    if (part.tint) rect(target, 0, 0, W, H, part.tint);
    if (part.lit) {
      // Akşam ve gece: sahne kararır, pencereler yanık kalır.
      [CABIN.x * T + 14, CABIN.x * T + 54].forEach((wx) => {
        rect(target, wx, CABIN.y * T + 43, 12, 8, C.glassLit);
        rect(target, wx + 5, CABIN.y * T + 43, 1, 8, C.woodDark);
        rect(target, wx, CABIN.y * T + 46, 12, 1, C.woodDark);
      });
      drawGlow(stage, target);
    }
    drawAtmosphere(target, part, { preview });
    return garden;
  }

  function frame(time) {
    const dt = Math.min(0.05, (time - lastTime) / 1000 || 0);
    lastTime = time;
    clock += dt;

    const part = dayPart();
    const stage = sharedTreeStage();
    const season = currentSeason();
    const key = `${net.room}|${part.name}|${game.show.garden}|${stage}|${season}`;
    if (key !== staticKey && !isUniverse()) {
      applySeason(season);
      rebuildUnlockBlocked(stage);
      drawStatic();
      staticKey = key;
    }

    if (!state.online) {
      if (previewCtx) {
        if (previewWrap) previewWrap.style.background = edgeColor(part);
        updateActors(dt, RESIDENTS);
        renderGarden(previewCtx, part, stage, RESIDENTS, { preview: true });
      }
      requestAnimationFrame(frame);
      return;
    }

    // Odak başlarsa ya da profil açılırsa kişi evin içinden bahçeye döner.
    if (mode === 'home' && !canRoam()) leaveHome();
    if (isUniverse()) {
      const theme = UNIVERSE_THEMES[net.room] || UNIVERSE_THEMES.ders;
      wrap.style.background = theme.wrap;
      updateActors(dt);
      const uKey = `${net.room}|${part.name}`;
      if (uKey !== universeKey) {
        drawUniverse(part);
        universeKey = uKey;
      }
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(universeLayer, 0, 0);
      everyone()
        .map((person) => [person, actors[person.id]])
        .filter(([, actor]) => actor)
        .sort((a, b) => a[1].y - b[1].y)
        .forEach(([person, actor]) => drawCharacter(person, actor, ctx));
      if (part.lit) rect(ctx, 0, 0, W, H, 'rgba(18, 22, 52, .16)');
      if (state.phase === 'focus') {
        everyone().forEach((person) => {
          if (statusOf(person) !== 'focus') return;
          const actor = actors[person.id];
          if (!actor) return;
          const lx = Math.round(actor.x * T) + 7;
          const ly = Math.round(actor.y * T) - 4;
          rect(ctx, lx - 2, ly - 2, 6, 6, 'rgba(242, 210, 122, .24)');
          rect(ctx, lx, ly, 2, 2, '#F2D27A');
        });
      }
      labels.hidden = false;
      updateLabels();
      updateText(visibleGarden());
      requestAnimationFrame(frame);
      return;
    }

    wrap.style.background = mode === 'home' ? '#6B4526' : edgeColor(part);
    updateActors(dt);

    if (mode === 'home') {
      const nextHomeKey = `${part.name}|${(game.cabin || []).join(',')}`;
      if (nextHomeKey !== homeKey) {
        drawHome(part);
        homeKey = nextHomeKey;
      }
      moveByKeys(homeActor, dt);
      if (homeActor.y > 11.3) leaveHome();
      ctx.clearRect(0, 0, W, H);
      ctx.drawImage(homeLayer, 0, 0);
      drawHomeAmbience(now);
      drawCharacter(me, homeActor, ctx);
      if (part.lit) rect(ctx, 0, 0, W, H, 'rgba(18, 22, 52, .18)');
      labels.hidden = true;
      updateText(visibleGarden());
      requestAnimationFrame(frame);
      return;
    }
    labels.hidden = false;

    const garden = renderGarden(ctx, part, stage, everyone(), { preview: false });

    residentEmotes();
    updateLabels();
    updateText(garden);
    requestAnimationFrame(frame);
  }

  // Gerçek saate göre gün döngüsü (kullanıcının yerel saati). Tema seçiminden bağımsızdır.
  // edge: canvas'ın iki yanındaki boşluğun rengi, çim rengiyle katmanın karışımı.
  const DAY_PARTS = [
    { name: 'night', from: 0, to: 5, tint: 'rgba(18, 22, 52, .42)', edge: '#4A6E3E', lit: true },
    { name: 'dawn', from: 5, to: 7, tint: 'rgba(255, 170, 120, .16)', edge: '#80AE58', lit: false },
    { name: 'day', from: 7, to: 17, tint: '', edge: '#6FAE4A', lit: false },
    { name: 'dusk', from: 17, to: 19.5, tint: 'rgba(255, 140, 60, .18)', edge: '#87A93D', lit: false },
    { name: 'evening', from: 19.5, to: 21, tint: 'rgba(40, 40, 110, .3)', edge: '#576E54', lit: true },
    { name: 'night', from: 21, to: 24, tint: 'rgba(18, 22, 52, .42)', edge: '#4A6E3E', lit: true },
  ];

  // canvas'ın iki yanındaki boşluk: mevsimin çim rengi ile günün katmanının karışımı.
  function edgeColor(part) {
    const base = C.grass.match(/\w\w/g).map((h) => parseInt(h, 16));
    const tint = part.tint.match(/[\d.]+/g);
    if (!tint) return C.grass;
    const [r, g, b, a] = tint.map(Number);
    const mix = base.map((value, i) => Math.round(value * (1 - a) + [r, g, b][i] * a));
    return `rgb(${mix.join(',')})`;
  }

  function dayPart() {
    const now = new Date();
    const hour = now.getHours() + now.getMinutes() / 60;
    return DAY_PARTS.find((part) => hour >= part.from && hour < part.to) || DAY_PARTS[2];
  }

  function fit() {
    const avail = wrap.clientWidth;
    scale = avail >= W * 2 ? Math.floor(avail / W) : avail / W;
    canvas.style.width = `${W * scale}px`;
    canvas.style.height = `${H * scale}px`;
    labels.style.left = `${canvas.offsetLeft}px`;
    labels.style.width = `${W * scale}px`;
  }

  const KEY_MAP = {
    ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
    a: 'left', d: 'right', w: 'up', s: 'down', A: 'left', D: 'right', W: 'up', S: 'down',
  };

  function initPreview() {
    previewCanvas = document.getElementById('joinScene');
    previewWrap = document.getElementById('joinSceneWrap');
    if (!previewCanvas) return;
    ensureLayers();
    previewCanvas.width = W;
    previewCanvas.height = H;
    previewCtx = previewCanvas.getContext('2d');
    if (!loopStarted) {
      loopStarted = true;
      requestAnimationFrame(frame);
    }
  }

  function init() {
    previewCanvas = null;
    previewCtx = null;
    previewWrap = null;
    canvas = document.getElementById('scene');
    wrap = document.getElementById('sceneWrap');
    labels = document.getElementById('sceneLabels');
    hint = document.getElementById('sceneHint');
    ctx = canvas.getContext('2d');
    ensureLayers();
    canvas.width = W;
    canvas.height = H;

    if (!roomBound) {
      roomBound = true;
      canvas.addEventListener('keydown', (event) => {
        const dir = KEY_MAP[event.key];
        if (dir) {
          event.preventDefault();
          if (canRoam()) keys.add(dir);
        } else if (event.key === 'e' || event.key === 'E' || event.key === ' ' || event.key === 'Enter') {
          event.preventDefault();
          if (mode === 'home') {
            if (homeActor.y > 10.2) leaveHome();
            return;
          }
          const mine = actors[me.id];
          if (!mine || !canRoam()) return;
          if (isUniverse()) {
            if (mine.y > 10.2) triggerPortal('ortak');
            return;
          }
          const portal = nearbyPortal(mine);
          if (portal) triggerPortal(portal.id);
          else if (Math.hypot(mine.x - 7.5, mine.y - 4.2) < 0.9) enterHome();
          else plantHere();
        }
      });
      canvas.addEventListener('keyup', (event) => {
        const dir = KEY_MAP[event.key];
        if (dir) keys.delete(dir);
      });
      canvas.addEventListener('blur', () => keys.clear());
      // Dokunma ya da tıklama: karakter o noktaya yürür; kapıya dokunulduysa o evrene geçer.
      canvas.addEventListener('pointerdown', (event) => {
        canvas.focus();
        const mine = actors[me.id];
        if (!mine) return;
        const box = canvas.getBoundingClientRect();
        const x = ((event.clientX - box.left) / box.width) * COLS;
        const y = ((event.clientY - box.top) / box.height) * ROWS;
        const tx = Math.floor(x);
        const ty = Math.floor(y);
        if (!canRoam()) {
          const hitPortal = hasPortals() && PORTALS.some((p) => tx === p.tx && (ty === p.ty || ty === p.ty - 1));
          const hitExit = isUniverse() && ty >= HOME_DOOR.y && tx >= HOME_DOOR.x && tx < HOME_DOOR.x + 2;
          if (hitPortal || hitExit) showHint(t('portal.focusLocked'));
          return;
        }
        if (mode === 'home') {
          const atDoor = ty >= HOME_DOOR.y && tx >= HOME_DOOR.x && tx < HOME_DOOR.x + 2;
          homeActor.goal = atDoor ? [HOME_DOOR.x + 1, 11.6, 'exit'] : [x, y + 0.3, false];
          return;
        }
        if (isUniverse()) {
          const atReturn = ty >= HOME_DOOR.y && tx >= HOME_DOOR.x && tx < HOME_DOOR.x + 2;
          mine.goal = atReturn ? [HOME_DOOR.x + 1, 11.5, 'return'] : [x, y + 0.3, false];
          return;
        }
        const portal = hasPortals() && PORTALS.find((p) => tx === p.tx && (ty === p.ty || ty === p.ty - 1));
        if (portal) {
          mine.goal = [portal.tx + 0.5, portal.ty + 1.35, `portal:${portal.id}`];
          return;
        }
        const col = tx - MY_PLOT.x;
        const row = ty - MY_PLOT.y;
        const onPlot = col >= 0 && col < MY_PLOT.cols && row >= 0 && row < MY_PLOT.rows;
        const index = row * MY_PLOT.cols + col;
        if (tx === 7 && ty === 3) {
          mine.goal = [7.5, 4.35, 'door'];
          return;
        }
        const stage = game.garden[index];
        const act = onPlot && game.show.garden && state.phase === 'break' && (stage === 0 || stage === MAX_STAGE);
        if (onPlot && game.show.garden && state.phase !== 'break') showHint(t('hint.focusPlant'));
        else if (onPlot && game.show.garden && stage > 0 && stage < MAX_STAGE) showHint(t('hint.occupied', { name: t(`stageName.${stage}`) }));
        mine.goal = onPlot ? [tx + 0.5, ty + 0.75, act] : [x, y + 0.3, false];
      });

      new ResizeObserver(fit).observe(wrap);
    }
    fit();
    if (!loopStarted) {
      loopStarted = true;
      requestAnimationFrame(frame);
    }
  }

  // Kullanıcının son konumu; presence ile paylaşılır.
  function myPosition() {
    const actor = actors[me.id];
    if (!actor || !actor.roamed) return null;
    return { x: Math.round(actor.x * 10) / 10, y: Math.round(actor.y * 10) / 10 };
  }

  // Sakinler molada ara sıra, birbirinden farklı zamanlarda kısa bir tepki verir.
  let nextResidentEmote = 8;
  function residentEmotes() {
    if (state.phase === 'focus' || clock < nextResidentEmote) return;
    const resident = RESIDENTS[Math.floor(Math.random() * RESIDENTS.length)];
    const kind = ['wave', 'coffee', 'heart'][Math.floor(Math.random() * 3)];
    showEmote(resident.id, kind);
    if (typeof onResidentEmote === 'function') onResidentEmote(resident.name, kind);
    nextResidentEmote = clock + 18 + Math.random() * 20;
  }

  // Karakterin üstünde kısa bir piksel tepki (el sallama, kalp, kahve); 3 saniye görünür.
  function showEmote(id, kind) {
    emotes[id] = { kind, until: clock + 3 };
  }

  return { init, initPreview, resetRoom, myPosition, showEmote, showHint, sharedTreeStage, SHARED_TREE_STEPS, isHome: () => mode === 'home' };
})();
