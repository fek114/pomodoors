// PomoDoors · piksel karakterler.
// Sahnede, katılımcı listesinde, sohbette ve profilde aynı karakter kullanılır.
// Görünüm (look) dört sayıdan oluşur: ten, saç rengi, kıyafet rengi ve saç stili.
// Çizimler özgündür; her harf bir renk, nokta boş piksel.

const LOOK_PALETTES = {
  skin: ['#F3D5BC', '#E8B996', '#C98E66', '#9A6644', '#6E4630'],
  hair: ['#2B2622', '#5C3B27', '#9C5B34', '#C89B5B', '#A39D93', '#3E672C'],
  shirt: ['#C9A46A', '#2F6B5E', '#C78A6C', '#7E949A', '#3A3833', '#B85C7A'],
};
const LOOK_STYLES = 3; // 0 kısa saç, 1 uzun saç, 2 bere
const DEFAULT_LOOK = { skin: 1, hair: 0, shirt: 0, style: 0 };

const randomLook = () => ({
  skin: Math.floor(Math.random() * LOOK_PALETTES.skin.length),
  hair: Math.floor(Math.random() * LOOK_PALETTES.hair.length),
  shirt: Math.floor(Math.random() * LOOK_PALETTES.shirt.length),
  style: Math.floor(Math.random() * LOOK_STYLES),
});

function normalizeLook(look) {
  const safe = { ...DEFAULT_LOOK, ...(look || {}) };
  return {
    skin: Math.min(Math.max(0, safe.skin | 0), LOOK_PALETTES.skin.length - 1),
    hair: Math.min(Math.max(0, safe.hair | 0), LOOK_PALETTES.hair.length - 1),
    shirt: Math.min(Math.max(0, safe.shirt | 0), LOOK_PALETTES.shirt.length - 1),
    style: Math.min(Math.max(0, safe.style | 0), LOOK_STYLES - 1),
  };
}

// o çizgi, h saç (berede bere rengi), k ten, e göz, s gömlek, p pantolon, b ayakkabı
const CHAR_BODY = {
  8: '....osssssso....',
  9: '...osssssssso...',
  10: '...okssssssko...',
  11: '....osssssso....',
};
const CHAR_LEGS = [
  { 12: '....oppppppo....', 13: '....opp..ppo....', 14: '....obb..bbo....' },
  { 12: '....oppppppo....', 13: '...opp....ppo...', 14: '...obb....bbo...' },
];
const CHAR_HEADS = {
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
// Uzun saç omuzlara iner; bere saçı örter ve alt kenarı koyu bir şerittir.
const STYLE_PATCH = {
  1: {
    down: { 7: '...hokkkkkkoh...', 8: '...hossssssoh...', 9: '...hsssssssshh..' },
    up: { 7: '...ohhhhhhhho...', 8: '...hhhhhhhhhh...', 9: '...hhssssssshh..' },
    side: { 7: '...hhhkkkko.....', 8: '...hhosssssso...', 9: '...hsssssssso...' },
  },
  2: {
    down: { 4: '...oooooooooo...', 5: '...okkkkkkkko...' },
    up: { 4: '...oooooooooo...', 5: '...ohhhhhhhho...' },
    side: { 4: '...oooooooooo...', 5: '...okkkkkkkko...' },
  },
};

function characterRows(look, dir = 'down', frame = 0) {
  const patch = (STYLE_PATCH[look.style] || {})[dir] || {};
  return Array.from({ length: 16 }, (_, i) =>
    patch[i] || CHAR_HEADS[dir][i] || CHAR_BODY[i] || CHAR_LEGS[frame][i] || '................');
}

function characterPalette(look) {
  const l = normalizeLook(look);
  return {
    o: '#2B2622',
    h: LOOK_PALETTES.hair[l.hair],
    k: LOOK_PALETTES.skin[l.skin],
    e: '#2B2622',
    s: LOOK_PALETTES.shirt[l.shirt],
    p: '#3B4A66',
    b: '#6B4526',
  };
}

// Liste, sohbet ve profil için baş ve omuz portresi (ilk 12 satır), keskin piksellerle SVG.
function portraitSvg(look) {
  const l = normalizeLook(look);
  const palette = characterPalette(l);
  const rows = characterRows(l, 'down', 0).slice(0, 12);
  let rects = '';
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      let w = 1;
      while (row[x + w] === ch) w += 1;
      if (ch !== '.') rects += `<rect x="${x}" y="${y}" width="${w}" height="1" fill="${palette[ch]}"/>`;
      x += w;
    }
  });
  return `<svg viewBox="1 0 14 13" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${rects}</svg>`;
}
