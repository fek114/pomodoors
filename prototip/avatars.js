// Eşlik — avatar seti.
// Her avatar aynı parçalardan kurulur: zemin, gövde, saç, yüz ve küçük bir aksesuar.
// Renkler sakin ve sınırlı tutulur; zemin tonları temaya göre styles.css içinde değişir.

const AV_LINE = '#2B2622';
const AV_BLUSH = '#E39A86';
const AV_SAGE = '#2F6B5E';
const AV_SAGE_DARK = '#24564B';
const AV_GOLD = '#C9A46A';

const AV_SKIN = { light: '#F3D5BC', warm: '#E8B996', tan: '#C98E66', brown: '#9A6644', deep: '#6E4630' };
const AV_HAIR = { ink: '#2B2622', brown: '#5C3B27', auburn: '#9C5B34', grey: '#A39D93', honey: '#C89B5B' };
const AV_SHIRT = { sage: AV_SAGE, ochre: AV_GOLD, slate: '#7E949A', clay: '#C78A6C', ink: '#3A3833' };

const AV_CROP = 'M19.5 30c-.8-8.2 4.6-14.5 12.5-14.5S45.3 21.8 44.5 30c-2.2-4.6-6.3-7.4-12.5-7.4S21.7 25.4 19.5 30z';
const AV_CURLS = [[20.5, 26, 4], [22.5, 20.5, 4.6], [27.5, 16.8, 4.8], [33.5, 15.6, 5], [39.2, 17.4, 4.8], [43, 21.6, 4.4], [44.2, 27, 3.6], [19.6, 31, 2.8], [30, 20.5, 3.5], [36, 20, 3.5]];

// Başın arkasında kalan saç parçaları.
const AV_BACK_HAIR = {
  bob: (c) => `<path fill="${c}" d="M17.5 31c0-9.5 6.5-16 14.5-16s14.5 6.5 14.5 16v9.5a2.5 2.5 0 0 1-2.5 2.5H20a2.5 2.5 0 0 1-2.5-2.5z"/>`,
  long: (c) => `<path fill="${c}" d="M17 31c0-9.8 6.6-16 15-16s15 6.2 15 16v16c0 2.8-2.2 5-5 5-1.8 0-3.2-.8-4-2H26c-.8 1.2-2.2 2-4 2-2.8 0-5-2.2-5-5z"/>`,
  bun: (c) => `<circle fill="${c}" cx="32" cy="13.5" r="5.5"/>`,
  puffs: (c) => `<circle fill="${c}" cx="19.5" cy="19" r="6"/><circle fill="${c}" cx="44.5" cy="19" r="6"/>`,
};

// Alnın üstündeki saç parçaları.
const AV_FRONT_HAIR = {
  crop: (c) => `<path fill="${c}" d="${AV_CROP}"/>`,
  curly: (c) => `<path fill="${c}" d="${AV_CROP}"/>${AV_CURLS.map(([x, y, r]) => `<circle fill="${c}" cx="${x}" cy="${y}" r="${r}"/>`).join('')}`,
  bob: (c) => `<path fill="${c}" d="M19.6 28.5c.6-7.2 5.8-12 12.4-12 6.8 0 12 4.8 12.4 12-4.4-.4-8.8-2.4-11.6-5.6-2.6 3.2-7.6 5.2-13.2 5.6z"/>`,
  long: (c) => `<path fill="${c}" d="M19.8 29c.4-7.6 5.6-12.8 12.2-12.8S43.8 21.4 44.2 29c-3.6-1.6-7.8-4.8-9.8-8.4a2.7 2.7 0 0 0-4.8 0c-2 3.6-6.2 6.8-9.8 8.4z"/>`,
  bun: (c) => `<path fill="${c}" d="M19.6 29.5c-.4-8 5-14 12.4-14s12.8 6 12.4 14c-3-3.8-7.4-6-12.4-6s-9.4 2.2-12.4 6z"/>`,
  wave: (c) => `<path fill="${c}" d="M19.6 31c-1-9 4.6-15.6 12.8-15.6 6.4 0 11.4 3.8 12.4 10.4-3.8-2.6-8.8-3-13.2-1.6-4.2 1.4-8.6 3.6-12 6.8z"/>`,
  puffs: (c) => `<path fill="${c}" d="M19.8 28c.6-7 5.6-11.6 12.2-11.6S43.6 21 44.2 28c-3.4-2.8-7.6-4.2-12.2-4.2s-8.8 1.4-12.2 4.2z"/>`,
};

const AV_EYES = {
  dot: `<g fill="${AV_LINE}"><circle cx="27" cy="31" r="1.5"/><circle cx="37" cy="31" r="1.5"/></g>`,
  happy: `<path fill="none" stroke="${AV_LINE}" stroke-width="1.4" stroke-linecap="round" d="M25.2 31.8q1.8-2.2 3.6 0M35.2 31.8q1.8-2.2 3.6 0"/>`,
};

const AV_FACE = [
  `<path fill="none" stroke="${AV_LINE}" stroke-width="1.4" stroke-linecap="round" d="M29.4 36.4q2.6 2.4 5.2 0"/>`,
  `<g fill="${AV_BLUSH}" opacity=".45"><circle cx="23.8" cy="35.4" r="2.2"/><circle cx="40.2" cy="35.4" r="2.2"/></g>`,
].join('');

const AV_EXTRAS = {
  glasses: `<g fill="none" stroke="${AV_LINE}" stroke-width="1.3"><circle cx="27" cy="31" r="3.9"/><circle cx="37" cy="31" r="3.9"/><path d="M30.9 31h2.2M23.1 30.4l-3-1M40.9 30.4l3-1"/></g>`,
  earring: `<circle fill="${AV_GOLD}" cx="19.6" cy="36.6" r="1.4"/>`,
  leaf: `<path fill="${AV_SAGE}" d="M38.6 20.2c2.4-3 6.4-3.6 8.2-3-.2 2.2-2.6 5.2-6.4 5.4z"/><path fill="none" stroke="${AV_SAGE_DARK}" stroke-width=".7" stroke-linecap="round" d="M39.6 20.9l5.8-3"/>`,
  freckles: `<g fill="#A0674A" opacity=".55">${[[24.4, 34.4], [26, 35.6], [23.4, 36], [39.6, 34.4], [38, 35.6], [40.6, 36]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".6"/>`).join('')}</g>`,
  beanie: `<path fill="${AV_SAGE}" d="M18.8 25.5c0-7.6 5.8-12.8 13.2-12.8s13.2 5.2 13.2 12.8z"/><rect fill="${AV_SAGE_DARK}" x="18" y="22.8" width="28" height="5.2" rx="2.6"/><circle fill="${AV_SAGE_DARK}" cx="32" cy="11.6" r="3.2"/>`,
  headphones: `<path fill="none" stroke="${AV_SAGE}" stroke-width="2.4" stroke-linecap="round" d="M17.2 31c0-9.6 6.6-16.4 14.8-16.4S46.8 21.4 46.8 31"/><rect fill="${AV_SAGE}" x="14.6" y="27.5" width="5.4" height="9.5" rx="2.7"/><rect fill="${AV_SAGE}" x="44" y="27.5" width="5.4" height="9.5" rx="2.7"/>`,
};

// `label`, avatar seçiminde ekran okuyuculara okunan açıklamadır.
const AVATARS = [
  { id: 'gozluklu', label: 'Kısa siyah saç ve yuvarlak gözlük', bg: 'sage', skin: 'light', hair: ['crop', 'ink'], eyes: 'dot', extras: ['glasses'], shirt: 'ochre' },
  { id: 'kivircik', label: 'Kıvırcık siyah saç ve altın küpe', bg: 'sand', skin: 'tan', hair: ['curly', 'ink'], eyes: 'happy', extras: ['earring'], shirt: 'sage' },
  { id: 'kakullu', label: 'Kâküllü kahverengi saç ve yaprak toka', bg: 'mist', skin: 'warm', hair: ['bob', 'brown'], eyes: 'dot', extras: ['leaf'], shirt: 'clay' },
  { id: 'bereli', label: 'Yeşil bere', bg: 'sand', skin: 'brown', hair: null, eyes: 'dot', extras: ['beanie'], shirt: 'slate' },
  { id: 'cilli', label: 'Uzun kızıl saç ve çiller', bg: 'sage', skin: 'light', hair: ['long', 'auburn'], eyes: 'happy', extras: ['freckles'], shirt: 'ink' },
  { id: 'kulaklikli', label: 'Topuz ve kulaklık', bg: 'clay', skin: 'deep', hair: ['bun', 'ink'], eyes: 'dot', extras: ['headphones'], shirt: 'ochre' },
  { id: 'dalgali', label: 'Dalgalı gri saç ve gözlük', bg: 'mist', skin: 'warm', hair: ['wave', 'grey'], eyes: 'happy', extras: ['glasses'], shirt: 'sage' },
  { id: 'iki-topuz', label: 'İki topuzlu bal rengi saç', bg: 'clay', skin: 'tan', hair: ['puffs', 'honey'], eyes: 'dot', extras: [], shirt: 'slate' },
];

const AVATAR_BY_ID = Object.fromEntries(AVATARS.map((avatar) => [avatar.id, avatar]));

function avatarSvg(id) {
  const avatar = AVATAR_BY_ID[id];
  const skin = AV_SKIN[avatar.skin];
  const [hairStyle, hairColor] = avatar.hair ?? [];
  const hair = AV_HAIR[hairColor];
  // Uzun ve kâküllü saç kulakları örter.
  const showEars = hairStyle !== 'bob' && hairStyle !== 'long';

  return [
    '<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">',
    `<rect class="av-bg av-bg-${avatar.bg}" width="64" height="64"/>`,
    `<path fill="${AV_SHIRT[avatar.shirt]}" d="M12 64c1.6-9.6 9.6-15.4 20-15.4S50.4 54.4 52 64z"/>`,
    AV_BACK_HAIR[hairStyle]?.(hair) ?? '',
    `<rect fill="${skin}" x="28.2" y="39" width="7.6" height="10" rx="3.4"/>`,
    showEars ? `<circle fill="${skin}" cx="19.6" cy="32" r="2.6"/><circle fill="${skin}" cx="44.4" cy="32" r="2.6"/>` : '',
    `<ellipse fill="${skin}" stroke="${AV_LINE}" stroke-opacity=".12" stroke-width=".8" cx="32" cy="30.5" rx="12.5" ry="13.5"/>`,
    AV_FRONT_HAIR[hairStyle]?.(hair) ?? '',
    AV_EYES[avatar.eyes],
    AV_FACE,
    ...avatar.extras.map((extra) => AV_EXTRAS[extra]),
    '</svg>',
  ].join('');
}
