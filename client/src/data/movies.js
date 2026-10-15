const YT = 'https://www.youtube.com/embed/';

export const M = [
  {
    id: 'im',
    t: 'Iron Man',
    y: 2008,
    g: ['Action', 'Sci-Fi'],
    age: '13+',
    r: 4.6,
    len: 126,
    mv: 1,
    c: ['#c4161c', '#f5a623'],
    trailerId: '8ugaeA-nMTc',
    deck: 'A billionaire builds his way out of a cave.',
    about:
      'Genius inventor, one cobbled-together suit, and the start of everything. Best watched with snacks and loud opinions.',
  },
  {
    id: 'av',
    t: 'The Avengers',
    y: 2012,
    g: ['Action', 'Adventure'],
    age: '13+',
    r: 4.7,
    len: 143,
    mv: 1,
    c: ['#1d4ed8', '#e11d48'],
    trailerId: 'eOrNdBpGMv8',
    deck: 'Six strong personalities, one portal in the sky. The ultimate group-chat movie.',
    about:
      'Six strong personalities, one portal in the sky. The ultimate group-chat movie.',
  },
  {
    id: 'bp',
    t: 'Black Panther',
    y: 2018,
    g: ['Action', 'Fantasy'],
    age: '13+',
    r: 4.5,
    len: 134,
    mv: 1,
    c: ['#6d28d9', '#0ea5e9'],
    trailerId: 'xjDjIWPwcPU',
    deck: 'A king, a kingdom, a choice.',
    about:
      'Wakanda opens to the world. Rich design, big stakes, perfect for a reaction-heavy room.',
  },
  {
    id: 'gg',
    t: 'Guardians of the Galaxy',
    y: 2014,
    g: ['Sci-Fi', 'Comedy'],
    age: '13+',
    r: 4.6,
    len: 121,
    mv: 1,
    c: ['#ea580c', '#a21caf'],
    trailerId: 'd96cjJhvlMA',
    deck: 'Misfits, a mixtape, and an orb.',
    about:
      'Space outlaws become a family. Funniest pick for a chat that never stops.',
  },
  {
    id: 'ds',
    t: 'Doctor Strange',
    y: 2016,
    g: ['Fantasy', 'Action'],
    age: '13+',
    r: 4.3,
    len: 115,
    mv: 1,
    c: ['#b45309', '#7c3aed'],
    trailerId: 'Lt-U_t2pUHI',
    deck: 'Reality, folded like paper.',
    about:
      'A surgeon learns that the world is wider than it looks. Great for a mind-bend poll.',
  },
  {
    id: 'sp',
    t: 'Spider-Man: Brand New Day',
    y: 2026,
    g: ['Action', 'Adventure'],
    age: '13+',
    r: 4.7,
    len: 148,
    mv: 1,
    c: ['#dc2626', '#1e3a8a'],
    trailerId: 'spider-man-brand-new-day',
    deck: 'Every mistake comes home.',
    about:
      'The next chapter of Spider-Man. A crowd-pleaser that rewards a room full of gasps.',
  },
  {
    id: 'bb',
    t: 'Big Buck Bunny',
    y: 2008,
    g: ['Animation', 'Comedy'],
    age: 'All',
    r: 4.2,
    len: 10,
    c: ['#16a34a', '#facc15'],
    trailerId: 'aqz-KE-bpKQ',
    deck: 'A gentle giant, three pests.',
    about: 'Blender Foundation open movie (CC-BY).',
  },
  {
    id: 'si',
    t: 'Sintel',
    y: 2010,
    g: ['Animation', 'Fantasy'],
    age: '10+',
    r: 4.3,
    len: 15,
    c: ['#0891b2', '#be185d'],
    trailerId: 'eRsGyueVLvQ',
    deck: 'A girl, a dragon, a long road.',
    about: 'Blender Foundation open movie (CC-BY).',
  },
  {
    id: 'jm',
    t: 'Jumanji',
    y: 2017,
    g: ['Adventure', 'Comedy', 'Action'],
    age: '13+',
    r: 4.0,
    len: 119,
    c: ['#15803d', '#f59e0b'],
    trailerId: '2QKg5SZ_35I',
    deck: 'Four teens, one cursed game, zero respawns.',
    about:
      'Welcome to the Jungle: sucked into a video game as their avatars, four mismatched players must finish the quest together. A guaranteed laugh-out-loud room.',
  },
  {
    id: 'is',
    t: 'Interstellar',
    y: 2014,
    g: ['Sci-Fi', 'Adventure'],
    age: '13+',
    r: 4.7,
    len: 169,
    c: ['#0e7490', '#e2e8f0'],
    trailerId: 'zSWdZVtXT7E',
    deck: 'Love, gravity and the last way out.',
    about:
      'A team of explorers travels through a wormhole to find humanity a new home. Big ideas, bigger organ music, and a great poll generator.',
  },
  {
    id: 're',
    t: 'Resident Evil',
    y: 2026,
    g: ['Horror', 'Action'],
    age: '18+',
    r: 3.8,
    len: 95,
    c: ['#7f1d1d', '#111827'],
    trailerId: 'resident-evil-2026',
    deck: 'One bad night. No safe rooms.',
    about:
      'A courier is dragged into a non-stop race for survival. Best watched in a room that loves to scream together.',
  },
].map((m) => ({
  ...m,
  src: m.trailerId.startsWith('http') ? m.trailerId : YT + m.trailerId,
  tags: (m.mv ? 'marvel mcu superhero ' : '') + m.g.join(' '),
}));

export const art = (m) => {
  let h = 0;
  for (const ch of String(m.id || m.t || 'q'))
    h = (h * 31 + ch.charCodeAt(0)) % 97;

  return `radial-gradient(60% 80% at ${38 + (h % 46)}% ${28 + (h % 26)}%,rgba(176,18,48,.95),transparent 70%),radial-gradient(55% 70% at ${8 + (h % 32)}% ${74 + (h % 20)}%,rgba(214,160,64,.8),transparent 70%),#0e0712`;
};

const PUB = process.env.PUBLIC_URL || '';

const DOC_POSTERS = {
  im: 'image2.jpg',
  av: 'image4.jpg',
  bp: 'image6.jpg',
  gg: 'image8.jpg',
  ds: 'image10.jpg',
  sp: 'image12.jpg',
  bb: 'bb_poster.jpg',
  si: 'si_poster.jpg',
  jm: 'jm_poster.jpg',
  is: 'is_poster.jpg',
  re: 're_poster.jpg',
};

const DOC_HERO = {
  im: 'image1.jpg',
  av: 'image3.jpg',
  bp: 'image5.jpg',
  gg: 'image7.jpg',
  ds: 'image9.jpg',
  sp: 'image11.jpg',
  bb: 'bb_hero.jpg',
  si: 'si_hero.jpg',
  jm: 'jm_hero.jpg',
  is: 'is_hero.jpg',
  re: 're_hero.jpg',
};

export const safeId = (x) =>
  String(x || 'custom').replace(/[^\w-]/g, '') || 'custom';

export const fallbackSrc = (id) => `${PUB}/posters/${safeId(id)}.svg`;

export const posterSrc = (m, hero = false) => {
  const id = safeId(m.id);
  const f = hero ? DOC_HERO[id] : DOC_POSTERS[id];

  return f ? `${PUB}/posters/document/${f}` : fallbackSrc(id);
};
