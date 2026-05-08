export const SIGNALS = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    pair: "XAUUSD",
    type: "BUY",
    entry: 2345.50,
    sl: 2335.00,
    tp1: 2360.00,
    tp2: 2380.00,
    status: "LIVE",
    rr: 2.5,
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 mins ago
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    pair: "BTCUSD",
    type: "SELL",
    entry: 65400,
    sl: 66500,
    tp1: 63000,
    tp2: 61000,
    status: "TP_HIT",
    rr: 3.2,
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2h ago
    pipsGain: 2400,
    resultImage: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=400&auto=format&fit=crop||https://images.unsplash.com/photo-1642543492481-44e81e3914a7?q=80&w=400&auto=format&fit=crop"
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    pair: "GBPJPY",
    type: "BUY",
    entry: 191.20,
    sl: 190.50,
    tp1: 192.50,
    tp2: 194.00,
    status: "LIVE",
    rr: 1.8,
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    pair: "EURUSD",
    type: "SELL",
    entry: 1.0850,
    sl: 1.0880,
    tp1: 1.0800,
    tp2: 1.0750,
    status: "CLOSED",
    rr: 2.1,
    timestamp: new Date(Date.now() - 1000 * 60 * 300).toISOString(), // 5h ago
    pipsGain: 50
  },
  {
    id: '00000000-0000-0000-0000-000000000005',
    pair: "XAUUSD",
    type: "SELL",
    entry: 2358.20,
    sl: 2365.00,
    tp1: 2340.00,
    tp2: 2320.00,
    status: "SL_HIT",
    rr: 2.8,
    timestamp: new Date(Date.now() - 1000 * 60 * 600).toISOString(), // 10h ago
  },
  {
    id: '00000000-0000-0000-0000-000000000006',
    pair: "NAS100",
    type: "BUY",
    entry: 18250,
    sl: 18100,
    tp1: 18500,
    tp2: 18800,
    status: "LIVE",
    rr: 3.5,
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 mins ago
  }
];

export const ACADEMY_MODULES = [
  {
    id: 1,
    title: "Structure du Marché",
    lessonCount: 0,
    tag: "FONDAMENTAUX",
    locked: false,
    lessons: []
  },
  {
    id: 2,
    title: "Lecture des Chandeliers",
    lessonCount: 0,
    tag: "FONDAMENTAUX",
    locked: false,
    lessons: []
  },
  {
    id: 3,
    title: "Price Action Avancée",
    lessonCount: 0,
    tag: "PRICE ACTION",
    locked: true,
    lessons: []
  },
  {
    id: 4,
    title: "Gestion du Risque & du Capital",
    lessonCount: 0,
    tag: "GESTION DU RISQUE",
    locked: true,
    lessons: []
  },
  {
    id: 5,
    title: "Psychologie du Trader",
    lessonCount: 0,
    tag: "PSYCHOLOGIE",
    locked: true,
    lessons: []
  },
  {
    id: 6,
    title: "Stratégies Hybrides",
    lessonCount: 0,
    tag: "PRICE ACTION",
    locked: true,
    lessons: []
  }
];

export const TIMELINE = [
  { year: "2019", milestone: "Premiers pas sur les marchés Forex" },
  { year: "2020", milestone: "Maîtrise du Price Action & structures de marché" },
  { year: "2021", milestone: "Premières formations privées" },
  { year: "2022", milestone: "Lancement de la communauté MrTech 237" },
  { year: "2023", milestone: "500 traders formés en Afrique centrale" },
  { year: "2024", milestone: "Expansion vers XM & Exness Partnership" },
  { year: "2025", milestone: "Lancement du Trading Terminal Pro" },
  { year: "2026", milestone: "Objectif : 2000 traders autonomes" },
];
