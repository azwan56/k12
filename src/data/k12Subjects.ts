export type SubjectId = 'english' | 'ig-math' | 'shanghai-math' | 'humanity' | 'science';
export type GradeLevel = 'G6' | 'G7';

export interface PracticeQuestion {
  id: string;
  grade: GradeLevel;
  track?: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

export interface SubTrack {
  id: string;
  name: string;
  nameZh: string;
  emoji: string;
  topics: string[];
}

export interface Subject {
  id: SubjectId;
  name: string;
  nameZh: string;
  emoji: string;
  /** One short line per grade. Keep it under ~20 characters. */
  short: Record<GradeLevel, string>;
  topics: Record<GradeLevel, string[]>;
  tracks?: Partial<Record<GradeLevel, SubTrack[]>>;
  questions: PracticeQuestion[];
}

export interface EssayPrompt {
  id: string;
  grade: GradeLevel;
  genre: string;
  title: string;
  prompt: string;
  words: [number, number];
  tips: string[];
}

const q = (
  id: string,
  grade: GradeLevel,
  track: string | undefined,
  question: string,
  options: string[],
  answer: number,
  explanation: string
): PracticeQuestion => ({ id, grade, track, question, options, answer, explanation });

export const ESSAY_PROMPTS: EssayPrompt[] = [
  {
    id: 'g6-narrative-1',
    grade: 'G6',
    genre: '记叙文',
    title: 'A Challenge I Overcame',
    prompt: 'Write about a time you faced something hard. What happened, how did you feel, and what did you learn?',
    words: [150, 250],
    tips: ['Start with an exciting moment.', 'Show your feelings with details.', 'End with what you learned.']
  },
  {
    id: 'g6-persuasive-1',
    grade: 'G6',
    genre: '议论文',
    title: 'Should Schools Have Longer Breaks?',
    prompt: 'Do longer breaks help students learn better? Give your opinion and 2–3 reasons.',
    words: [150, 250],
    tips: ['Say your opinion first.', 'Give clear reasons with examples.', 'Mention the other side briefly.']
  },
  {
    id: 'g7-argument-1',
    grade: 'G7',
    genre: '议论文',
    title: 'AI Tools for Homework',
    prompt: 'Should students use AI tutors for homework, or should there be strict limits? Defend your view.',
    words: [200, 320],
    tips: ['Make a clear, balanced claim.', 'Compare benefits and risks.', 'Use linking words: However, Therefore.']
  },
  {
    id: 'g7-expository-1',
    grade: 'G7',
    genre: '说明文',
    title: 'My Green City in 2040',
    prompt: 'Design an eco-friendly neighborhood. Explain three systems that make it great to live in.',
    words: [200, 320],
    tips: ['One paragraph per system.', 'Use specific examples.', 'Show how they work together.']
  }
];

export const SUBJECTS: Subject[] = [
  {
    id: 'english',
    name: 'English',
    nameZh: '英语',
    emoji: '📚',
    short: { G6: '造句 + 作文，一起变强', G7: '学术词汇 + 思辨写作' },
    topics: {
      G6: ['词汇造句', '记叙文', '观点作文', '时态语法'],
      G7: ['学术词汇', '议论文', '说明文', '复杂句型']
    },
    questions: [
      q('en6-1', 'G6', undefined, 'Which sentence uses "resilient" correctly?', [
        'The resilient glass broke at once.',
        'After losing, the resilient team trained harder and won.',
        'She felt resilient because she forgot lunch.',
        'The soup was too resilient to eat.'
      ], 1, '"Resilient" means able to bounce back after a setback.'),
      q('en6-2', 'G6', undefined, 'Choose the correct verb: "Every student ___ a library card."', [
        'have', 'has', 'having', 'are having'
      ], 1, '"Every student" is singular, so we use "has".'),
      q('en6-3', 'G6', undefined, 'Which word is a synonym of "enormous"?', [
        'tiny', 'gigantic', 'quiet', 'ancient'
      ], 1, '"Enormous" and "gigantic" both mean very big.'),
      q('en7-1', 'G7', undefined, 'Which is the strongest thesis statement?', [
        'School uniforms exist in many schools.',
        'I will write about uniforms.',
        'Although some say uniforms limit self-expression, they reduce peer pressure and improve focus.',
        'Uniforms are often blue.'
      ], 2, 'A strong thesis makes a clear claim and answers the other side.'),
      q('en7-2', 'G7', undefined, 'Pick the best linking word: "The plan was cheap. ___, it was too slow."', [
        'Therefore', 'However', 'For example', 'Similarly'
      ], 1, '"However" shows a contrast between two ideas.'),
      q('en7-3', 'G7', undefined, 'Which sentence is in the passive voice?', [
        'The scientist tested the sample.',
        'The sample was tested by the scientist.',
        'The scientist is testing the sample.',
        'The scientist will test the sample.'
      ], 1, 'Passive voice: object + be + past participle (+ by ...).')
    ]
  },
  {
    id: 'ig-math',
    name: 'IG Math',
    nameZh: '国际数学',
    emoji: '🧮',
    short: { G6: '比例、百分数、代数入门', G7: '方程、函数图像、几何' },
    topics: {
      G6: ['Ratios & %', 'Algebra Basics', 'Area & Perimeter', 'Probability'],
      G7: ['Linear Equations', 'Straight-Line Graphs', 'Angles', 'Volume & Data']
    },
    questions: [
      q('igm6-1', 'G6', undefined, 'A $80 jacket is 25% off. What is the sale price?', ['$55', '$60', '$65', '$20'], 1,
        '25% of 80 = 20, and 80 − 20 = 60.'),
      q('igm6-2', 'G6', undefined, 'Simplify the ratio 18 : 24.', ['3 : 4', '2 : 3', '9 : 16', '6 : 9'], 0,
        'Divide both by 6: 18 ÷ 6 = 3, 24 ÷ 6 = 4.'),
      q('igm6-3', 'G6', undefined, 'If a = 4, what is 3a + 5?', ['12', '17', '35', '9'], 1,
        '3 × 4 + 5 = 12 + 5 = 17.'),
      q('igm7-1', 'G7', undefined, 'Solve: 3(2x − 4) = 18', ['x = 3', 'x = 5', 'x = 7', 'x = 10'], 1,
        '2x − 4 = 6, so 2x = 10, x = 5.'),
      q('igm7-2', 'G7', undefined, 'What is the gradient of y = 3x − 2?', ['−2', '3', '2', '−3'], 1,
        'In y = mx + c, the gradient is m = 3.'),
      q('igm7-3', 'G7', undefined, 'The angles of a triangle are 50°, 60° and x. Find x.', ['60°', '70°', '80°', '90°'], 1,
        'Angles in a triangle add to 180°: 180 − 50 − 60 = 70.')
    ]
  },
  {
    id: 'shanghai-math',
    name: '上海数学',
    nameZh: '沪教版',
    emoji: '📐',
    short: { G6: '分数、比例、圆与方程', G7: '整式、分式、几何证明' },
    topics: {
      G6: ['数的整除', '比和比例', '圆与扇形', '一元一次方程'],
      G7: ['整式乘法', '因式分解', '分式', '全等三角形']
    },
    questions: [
      q('sh6-1', 'G6', undefined, '半径 6 cm、圆心角 120° 的扇形面积是？', ['6π cm²', '12π cm²', '24π cm²', '36π cm²'], 1,
        'S = 120/360 × π × 6² = 12π。'),
      q('sh6-2', 'G6', undefined, '解方程：2x + 7 = 19', ['x = 5', 'x = 6', 'x = 13', 'x = 4'], 1,
        '2x = 12，x = 6。'),
      q('sh6-3', 'G6', undefined, '36 和 48 的最大公因数是？', ['6', '8', '12', '24'], 2,
        '36 = 12 × 3，48 = 12 × 4，最大公因数是 12。'),
      q('sh7-1', 'G7', undefined, '因式分解：x² − 9y²', ['(x − 3y)²', '(x + 9y)(x − 9y)', '(x + 3y)(x − 3y)', 'x(x − 9y)'], 2,
        '平方差公式：a² − b² = (a + b)(a − b)。'),
      q('sh7-2', 'G7', undefined, '计算：(a + 2)²', ['a² + 4', 'a² + 2a + 4', 'a² + 4a + 4', 'a² + 4a + 2'], 2,
        '完全平方公式：(a + b)² = a² + 2ab + b²。'),
      q('sh7-3', 'G7', undefined, '判定两个三角形全等，下列哪个条件不一定成立？', ['SSS', 'SAS', 'ASA', 'AAA'], 3,
        '三个角相等只能说明形状相同，大小不一定相同。')
    ]
  },
  {
    id: 'humanity',
    name: 'Humanity',
    nameZh: '人文',
    emoji: '🌍',
    short: { G6: '古文明与地图', G7: '历史 + 地理' },
    topics: {
      G6: ['大河文明', '地图技能', '史料辨析', '早期贸易'],
      G7: []
    },
    tracks: {
      G7: [
        { id: 'history', name: 'History', nameZh: '历史', emoji: '🏛️', topics: ['丝绸之路', '中世纪', '文艺复兴', '史料与偏见'] },
        { id: 'geography', name: 'Geography', nameZh: '地理', emoji: '🗺️', topics: ['气候与生物群落', '人口迁移', '城市化', '可持续发展'] }
      ]
    },
    questions: [
      q('hu6-1', 'G6', undefined, 'Which is a PRIMARY source about Ancient Egypt?', [
        'A modern textbook', 'A 2024 documentary', 'A stone carving from Ramesses II’s time', 'An encyclopedia article'
      ], 2, 'Primary sources come from the time being studied.'),
      q('hu6-2', 'G6', undefined, 'Ancient Egypt grew along which river?', ['Tigris', 'Nile', 'Yellow River', 'Indus'], 1,
        'The Nile’s floods made the land rich for farming.'),
      q('hu6-3', 'G6', undefined, 'On a map, the scale 1 : 100 000 means 1 cm equals…', ['100 m', '1 km', '10 km', '100 km'], 1,
        '100 000 cm = 1 000 m = 1 km.'),
      q('hu7h-1', 'G7', 'history', 'Besides goods, what did the Silk Road spread?', [
        'Nothing else', 'Ideas, religions and technology like papermaking', 'Only soldiers', 'Only gold'
      ], 1, 'Ideas and inventions travelled with traders.'),
      q('hu7h-2', 'G7', 'history', 'The Renaissance began in which country?', ['England', 'Italy', 'China', 'Egypt'], 1,
        'It began in Italian cities like Florence in the 14th century.'),
      q('hu7h-3', 'G7', 'history', 'Under feudalism, who gave land to knights in return for service?', ['Peasants', 'Lords', 'Merchants', 'Monks'], 1,
        'Lords granted land (fiefs) to knights for military service.'),
      q('hu7g-1', 'G7', 'geography', 'Which is a PULL factor for moving to a city?', [
        'Drought on farms', 'No schools nearby', 'Better-paid jobs in the city', 'River flooding'
      ], 2, 'Pull factors attract people; push factors drive them away.'),
      q('hu7g-2', 'G7', 'geography', 'Which biome has the most rainfall?', ['Desert', 'Tundra', 'Tropical rainforest', 'Grassland'], 2,
        'Tropical rainforests get rain almost every day.'),
      q('hu7g-3', 'G7', 'geography', 'Which energy source is renewable?', ['Coal', 'Natural gas', 'Solar', 'Oil'], 2,
        'Sunlight never runs out, so solar is renewable.')
    ]
  },
  {
    id: 'science',
    name: 'Science',
    nameZh: '科学',
    emoji: '🔬',
    short: { G6: '物理 · 生物 · 化学', G7: '物理 · 生物 · 化学' },
    topics: { G6: [], G7: [] },
    tracks: {
      G6: [
        { id: 'physics', name: 'Physics', nameZh: '物理', emoji: '⚡', topics: ['力与重力', '摩擦力', '简单机械'] },
        { id: 'biology', name: 'Biology', nameZh: '生物', emoji: '🌱', topics: ['动植物细胞', '光合作用', '食物链'] },
        { id: 'chemistry', name: 'Chemistry', nameZh: '化学', emoji: '🧪', topics: ['物质三态', '溶解', '混合物分离'] }
      ],
      G7: [
        { id: 'physics', name: 'Physics', nameZh: '物理', emoji: '⚡', topics: ['速度与图像', '能量守恒', '电路', '光与声'] },
        { id: 'biology', name: 'Biology', nameZh: '生物', emoji: '🌱', topics: ['呼吸与循环', '细胞呼吸', '生态系统', '适应与多样性'] },
        { id: 'chemistry', name: 'Chemistry', nameZh: '化学', emoji: '🧪', topics: ['元素周期表', '物理/化学变化', '酸碱与 pH', '中和反应'] }
      ]
    },
    questions: [
      q('sc6p-1', 'G6', 'physics', 'A book rests on a table. The forces on it are…', [
        'Only gravity', 'Balanced: gravity and the table’s push', 'Friction bigger than gravity', 'No forces at all'
      ], 1, 'At rest means the forces are balanced.'),
      q('sc6p-2', 'G6', 'physics', 'Which force slows a sliding box?', ['Magnetism', 'Friction', 'Upthrust', 'Gravity only'], 1,
        'Friction acts against motion.'),
      q('sc6p-3', 'G6', 'physics', 'A lever helps us by…', ['Making things heavier', 'Reducing the force we need', 'Creating energy', 'Removing gravity'], 1,
        'Levers trade distance for a smaller effort force.'),
      q('sc6b-1', 'G6', 'biology', 'Which part is in plant cells but NOT animal cells?', ['Nucleus', 'Mitochondria', 'Chloroplast', 'Cell membrane'], 2,
        'Chloroplasts do photosynthesis.'),
      q('sc6b-2', 'G6', 'biology', 'Plants need which gas for photosynthesis?', ['Oxygen', 'Carbon dioxide', 'Nitrogen', 'Helium'], 1,
        'CO₂ + water + light → glucose + oxygen.'),
      q('sc6b-3', 'G6', 'biology', 'In grass → rabbit → fox, the rabbit is a…', ['Producer', 'Primary consumer', 'Top predator', 'Decomposer'], 1,
        'It eats the producer (grass).'),
      q('sc6c-1', 'G6', 'chemistry', 'Best way to get pure water from salt water?', ['Filtration', 'Distillation', 'Magnet', 'Sieving'], 1,
        'Distillation boils the water and collects it again.'),
      q('sc6c-2', 'G6', 'chemistry', 'In which state are particles furthest apart?', ['Solid', 'Liquid', 'Gas', 'All the same'], 2,
        'Gas particles move freely and are far apart.'),
      q('sc6c-3', 'G6', 'chemistry', 'Sand and water can be separated by…', ['Filtration', 'Evaporation only', 'Dissolving', 'Melting'], 0,
        'Sand does not dissolve, so filter paper catches it.'),
      q('sc7p-1', 'G7', 'physics', 'In a parallel circuit, one bulb breaks. The other bulb…', [
        'Goes out', 'Stays on', 'Explodes', 'Gets twice as bright'
      ], 1, 'Each branch has its own path to the battery.'),
      q('sc7p-2', 'G7', 'physics', 'A car travels 120 km in 2 hours. Its speed is…', ['240 km/h', '60 km/h', '120 km/h', '30 km/h'], 1,
        'Speed = distance ÷ time = 120 ÷ 2.'),
      q('sc7p-3', 'G7', 'physics', 'Sound cannot travel through…', ['Water', 'Steel', 'Air', 'A vacuum'], 3,
        'Sound needs particles to vibrate.'),
      q('sc7b-1', 'G7', 'biology', 'Aerobic respiration needs glucose and…', ['Carbon dioxide', 'Oxygen', 'Sunlight', 'Nitrogen'], 1,
        'Glucose + oxygen → CO₂ + water + energy.'),
      q('sc7b-2', 'G7', 'biology', 'Which organ pumps blood around the body?', ['Lungs', 'Heart', 'Liver', 'Kidney'], 1,
        'The heart is a muscular pump.'),
      q('sc7b-3', 'G7', 'biology', 'In an energy pyramid, most energy is at the…', ['Top predators', 'Producers', 'Decomposers', 'Middle'], 1,
        'Energy is lost at each level going up.'),
      q('sc7c-1', 'G7', 'chemistry', 'Acid + alkali gives…', ['Hydrogen + oxygen', 'Salt + water', 'CO₂ + glucose', 'Metal + gas'], 1,
        'This is neutralization: HCl + NaOH → NaCl + H₂O.'),
      q('sc7c-2', 'G7', 'chemistry', 'Which is a chemical change?', ['Ice melting', 'Paper burning', 'Sugar dissolving', 'Glass breaking'], 1,
        'Burning makes new substances and can’t be undone.'),
      q('sc7c-3', 'G7', 'chemistry', 'A solution with pH 2 is…', ['Strongly acidic', 'Neutral', 'Weakly alkaline', 'Strongly alkaline'], 0,
        'pH below 7 is acidic; the lower, the stronger.')
    ]
  }
];

export const getSubject = (id?: string) => SUBJECTS.find((s) => s.id === id);

export const gradeLabel = (g: GradeLevel) => (g === 'G6' ? '六年级' : '七年级');
