// PomoDoors · bahçe sahnesi.
// Yukarıdan bakan 2B piksel sahne: 16×16 karolar, 20×12 karoluk harita.
// Tüm çizimler bu dosyada kodla üretilir; dış görsel kullanılmaz.
// Odakta sahne sakindir: karakterler kendi tarhlarında çalışır, bitkiler dakikalar geçtikçe büyür.
// Bekleme ve molada kullanıcı kendi karakteriyle dolaşabilir ve boş tarhlara tohum ekebilir.
// app.js'teki state, game, people, messages gibi değerleri çalışma anında okur.

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
  const TREES = [[1, 0], [11, 0], [18, 0], [0, 9]];
  const BUSHES = [[4, 2], [10, 3], [19, 4], [9, 10], [15, 10]];
  const BENCH = [11, 4];
  const FENCE_Y = 11;
  const FENCE_FROM = 2;

  const MY_PLOT = { x: 2, y: 8, cols: 5, rows: 3 };
  const OTHER_PLOTS = {
    deniz: { x: 8, y: 8, plants: [4, 3, 4, 2] },
    ece: { x: 11, y: 8, plants: [2, 3, 1, 3] },
    ipek: { x: 14, y: 8, plants: [4, 4, 3, 3] },
    arda: { x: 17, y: 8, plants: [1, 2, 0, 1] },
  };

  // Karakterlerin ayak konumları (karo biriminde)
  const SPOTS = {
    plot: { me: [4.5, 7.9], deniz: [9, 7.9], ece: [12, 7.9], ipek: [15, 7.9], arda: [18, 7.9] },
    gather: { me: [7.5, 4.9], deniz: [16.8, 5.3], ece: [10.4, 5.5], ipek: [12.6, 5.4], arda: [9, 4.9] },
    cabin: { me: [6.4, 4.8], arda: [8.6, 4.8] },
    path: { me: [7.5, 5.7] },
  };

  // Karakter sprite'ları. o çizgi, h saç, k ten, e göz, s gömlek, p pantolon, b ayakkabı
  const BODY = {
    8: '....osssssso....',
    9: '...osssssssso...',
    10: '...okssssssko...',
    11: '....osssssso....',
  };
  const LEGS = [
    { 12: '....oppppppo....', 13: '....opp..ppo....', 14: '....obb..bbo....' },
    { 12: '....oppppppo....', 13: '...opp....ppo...', 14: '...obb....bbo...' },
  ];
  const HEADS = {
    down: {
      1: '.....oooooo.....', 2: '....ohhhhhho....', 3: '...ohhhhhhhho...', 4: '...ohhhhhhhho...',
      5: '...ohkkkkkkho...', 6: '...okkekkekko...', 7: '....okkkkkko....',
    },
    up: {
      1: '.....oooooo.....', 2: '....ohhhhhho....', 3: '...ohhhhhhhho...', 4: '...ohhhhhhhho...',
      5: '...ohhhhhhhho...', 6: '...ohhhhhhhho...', 7: '....ohhhhhho....',
    },
    side: {
      1: '.....oooooo.....', 2: '....ohhhhhho....', 3: '...ohhhhhhhho...', 4: '...ohhhhhhhho...',
      5: '...ohhhhkkkko...', 6: '...ohhhkkkeko...', 7: '....ohhkkkko....',
    },
  };
  const spriteRows = (head, frame) => Array.from({ length: 16 }, (_, i) =>
    HEADS[head][i] || BODY[i] || LEGS[frame][i] || '................');

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const darkMode = matchMedia('(prefers-color-scheme: dark)');

  let canvas;
  let ctx;
  let wrap;
  let labels;
  let hint;
  let staticLayer;
  let staticKey = '';
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
      rect(g, wx + 1, y + 43, 12, 8, darkMode.matches ? C.glassLit : C.glass);
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

  /* Engeller */

  const blocked = new Set();
  function block(tx, ty) { blocked.add(`${tx},${ty}`); }
  for (let ty = CABIN.y; ty < CABIN.y + CABIN.h; ty += 1) {
    for (let tx = CABIN.x; tx < CABIN.x + CABIN.w; tx += 1) block(tx, ty);
  }
  TREES.forEach(([tx, ty]) => { block(tx, ty + 1); block(tx + 1, ty + 1); block(tx, ty); block(tx + 1, ty); });
  BUSHES.forEach(([tx, ty]) => block(tx, ty));
  block(...BENCH);
  for (let tx = FENCE_FROM; tx < COLS; tx += 1) block(tx, FENCE_Y);
  GROUND.forEach((row, ty) => [...row].forEach((ch, tx) => { if (ch === 'W') block(tx, ty); }));

  function isBlocked(x, y) {
    const points = [[x - 0.3, y - 0.05], [x + 0.3, y - 0.05], [x - 0.3, y - 0.3], [x + 0.3, y - 0.3]];
    return points.some(([px, py]) =>
      px < 0 || py < 0 || px >= COLS || py >= ROWS || blocked.has(`${Math.floor(px)},${Math.floor(py)}`));
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
    TREES.forEach(([tx, ty]) => tree(g, tx, ty));
  }

  /* Bitkiler */

  const PLANT_COLORS = { g: C.leaf, G: C.leafDark, s: C.leafDark, f: C.petal, y: C.gold, b: C.woodDark };

  function drawPlant(stage, tx, ty) {
    if (!stage) return;
    const rows = PLANT_SPRITES[stage];
    rows.forEach((row, py) => {
      for (let px = 0; px < row.length; px += 1) {
        const color = PLANT_COLORS[row[px]];
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
      garden.slice(0, MY_PLOT.cols * MY_PLOT.rows).forEach((stage, i) => drawPlant(stage, ...plotTile(i)));
    }
    Object.values(OTHER_PLOTS).forEach(({ x, y, plants }) => {
      plants.forEach((stage, i) => drawPlant(stage, x + (i % 2), y + Math.floor(i / 2)));
    });
  }

  /* Karakterler */

  function paletteFor(person) {
    const avatar = AVATAR_BY_ID[person.avatar];
    const [, hairColor] = avatar.hair ?? [];
    return {
      o: C.outline,
      h: hairColor ? AV_HAIR[hairColor] : C.door,
      k: AV_SKIN[avatar.skin],
      e: C.outline,
      s: AV_SHIRT[avatar.shirt],
      p: C.pants,
      b: C.woodDark,
    };
  }

  function targetFor(person) {
    const status = statusOf(person);
    const id = person.id;
    if (status === 'focus') return SPOTS.plot[id];
    if (status === 'left') return SPOTS.cabin[id] || SPOTS.cabin.arda;
    if (status === 'none') return SPOTS.path.me;
    return SPOTS.gather[id];
  }

  const canRoam = () => state.phase !== 'focus' && state.view === 'room';

  function updateActors(dt) {
    people.forEach((person) => {
      const target = targetFor(person);
      let actor = actors[person.id];
      if (!actor) {
        actor = { x: target[0], y: target[1], dir: 'down', flip: false, moving: false, walk: 0, roamed: false };
        actors[person.id] = actor;
      }
      if (person === me && canRoam()) {
        moveByKeys(actor, dt);
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
      const stepLen = Math.min(dist, NPC_SPEED * dt);
      actor.x += (dx / dist) * stepLen;
      actor.y += (dy / dist) * stepLen;
      actor.moving = true;
      actor.walk += dt;
      faceToward(actor, dx, dy);
    });
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
      if (Math.hypot(gx, gy) < 0.12) {
        const plant = actor.goal[2];
        actor.goal = null;
        actor.moving = false;
        if (plant) plantHere();
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

  function drawCharacter(person, actor) {
    const palette = paletteFor(person);
    const frame = actor.moving ? Math.floor(actor.walk / 0.16) % 2 : 0;
    const working = statusOf(person) === 'focus' && !actor.moving && !reduceMotion.matches;
    const bob = working && Math.floor(clock / 0.7) % 2 ? 1 : 0;
    const rows = spriteRows(actor.dir, frame);
    const left = Math.round(actor.x * T) - 8;
    const top = Math.round(actor.y * T) - 15 + bob;
    ctx.globalAlpha = statusOf(person) === 'left' ? 0.55 : 1;
    rect(ctx, left + 4, Math.round(actor.y * T) - 1, 8, 2, C.shadow);
    rows.forEach((row, py) => {
      for (let px = 0; px < 16; px += 1) {
        const ch = row[actor.flip ? 15 - px : px];
        if (ch !== '.') rect(ctx, left + px, top + py, 1, 1, palette[ch]);
      }
    });
    ctx.globalAlpha = 1;
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

  function updateLabels() {
    const speaker = currentSpeaker();
    // Ölçek her karede canvas'ın gerçek boyutundan okunur; yeniden boyutlamada etiketler kaymaz.
    const shown = canvas.clientWidth / W || scale;
    labels.style.left = `${canvas.offsetLeft}px`;
    people.forEach((person) => {
      const actor = actors[person.id];
      if (!actor) return;
      let node = labelNodes[person.id];
      if (!node) {
        node = document.createElement('div');
        node.className = 'scene-tag';
        node.innerHTML = '<span class="scene-bubble" hidden></span><span class="scene-name"></span>';
        labels.append(node);
        labelNodes[person.id] = node;
      }
      node.querySelector('.scene-name').textContent = person.name;
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
        if (status === 'focus') return 'Sen kendi tarhında çalışıyorsun';
        return `Sen: ${MY_STATUS_LABELS[status]}`;
      }
      return `${person.name}: ${STATUS_LABELS[status]}`;
    }).join('. ');
    let plants = '';
    if (game.show.garden) {
      const parts = [];
      for (let stage = MAX_STAGE; stage >= 0; stage -= 1) {
        const count = garden.filter((value) => value === stage).length;
        if (count) parts.push(`${count} ${STAGE_NAMES[stage]}`);
      }
      plants = ` Bahçende ${parts.join(', ')} var.`;
    }
    return `Bahçe sahnesi, ${PHASE_NAMES[state.phase]}. ${who}.${plants}`;
  }

  function baseHint() {
    if (state.phase === 'focus') {
      return state.participation === 'in'
        ? 'Karakterin bahçende çalışıyor. Dolaşmak molada açılır.'
        : 'Oda odakta. Dolaşmak molada açılır.';
    }
    return game.show.garden
      ? 'Bir yere dokun ya da ok tuşları / WASD ile dolaş. Boş bir tarha dokunursan ya da üstündeyken E\'ye basarsan tohum ekersin.'
      : 'Bir yere dokun ya da ok tuşları / WASD ile dolaş.';
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
    const actor = actors.me;
    const tx = Math.floor(actor.x);
    const ty = Math.floor(actor.y - 0.1);
    const col = tx - MY_PLOT.x;
    const row = ty - MY_PLOT.y;
    if (col < 0 || col >= MY_PLOT.cols || row < 0 || row >= MY_PLOT.rows) return;
    const index = row * MY_PLOT.cols + col;
    if (index >= game.garden.length) return;
    if (game.garden[index] !== 0) {
      showHint(`Bu tarhta ${STAGE_NAMES[game.garden[index]]} var.`);
      return;
    }
    game.garden[index] = 1;
    showHint('Tohum ekildi.');
    render();
  }

  function showHint(text) {
    hintOverride = text;
    hintUntil = performance.now() + 2800;
  }

  /* Döngü */

  function frame(time) {
    const dt = Math.min(0.05, (time - lastTime) / 1000 || 0);
    lastTime = time;
    clock += dt;

    const key = `${darkMode.matches}|${game.show.garden}`;
    if (key !== staticKey) {
      drawStatic();
      staticKey = key;
    }
    updateActors(dt);

    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(staticLayer, 0, 0);
    const garden = visibleGarden();
    drawPlants(garden);
    people
      .map((person) => [person, actors[person.id]])
      .sort((a, b) => a[1].y - b[1].y)
      .forEach(([person, actor]) => drawCharacter(person, actor));

    if (darkMode.matches) {
      // Gece: sahne kararır, pencereler yanık kalır.
      rect(ctx, 0, 0, W, H, 'rgba(18, 22, 52, .38)');
      [CABIN.x * T + 14, CABIN.x * T + 54].forEach((wx) => {
        rect(ctx, wx, CABIN.y * T + 43, 12, 8, C.glassLit);
        rect(ctx, wx + 5, CABIN.y * T + 43, 1, 8, C.woodDark);
        rect(ctx, wx, CABIN.y * T + 46, 12, 1, C.woodDark);
      });
    }

    updateLabels();
    updateText(garden);
    requestAnimationFrame(frame);
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

  function init() {
    canvas = document.getElementById('scene');
    wrap = document.getElementById('sceneWrap');
    labels = document.getElementById('sceneLabels');
    hint = document.getElementById('sceneHint');
    ctx = canvas.getContext('2d');
    staticLayer = document.createElement('canvas');
    staticLayer.width = W;
    staticLayer.height = H;
    canvas.width = W;
    canvas.height = H;

    canvas.addEventListener('keydown', (event) => {
      const dir = KEY_MAP[event.key];
      if (dir) {
        event.preventDefault();
        if (canRoam()) keys.add(dir);
      } else if (event.key === 'e' || event.key === 'E' || event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        plantHere();
      }
    });
    canvas.addEventListener('keyup', (event) => {
      const dir = KEY_MAP[event.key];
      if (dir) keys.delete(dir);
    });
    canvas.addEventListener('blur', () => keys.clear());
    // Dokunma ya da tıklama: karakter o noktaya yürür; boş bir tarha dokunulduysa orada tohum eker.
    canvas.addEventListener('pointerdown', (event) => {
      canvas.focus();
      if (!canRoam() || !actors.me) return;
      const box = canvas.getBoundingClientRect();
      const x = ((event.clientX - box.left) / box.width) * COLS;
      const y = ((event.clientY - box.top) / box.height) * ROWS;
      const tx = Math.floor(x);
      const ty = Math.floor(y);
      const col = tx - MY_PLOT.x;
      const row = ty - MY_PLOT.y;
      const onPlot = col >= 0 && col < MY_PLOT.cols && row >= 0 && row < MY_PLOT.rows;
      const index = row * MY_PLOT.cols + col;
      const plant = onPlot && game.show.garden && game.garden[index] === 0;
      actors.me.goal = onPlot ? [tx + 0.5, ty + 0.75, plant] : [x, y + 0.3, false];
    });

    new ResizeObserver(fit).observe(wrap);
    fit();
    requestAnimationFrame(frame);
  }

  return { init };
})();
