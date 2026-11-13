export type SubjectId = 'english' | 'ig-math' | 'shanghai-math' | 'humanity' | 'science';
export type GradeLevel = 'G6' | 'G7';

export interface PracticeQuestion {
  id: string;
  grade: GradeLevel;
  topic: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface EssayPrompt {
  id: string;
  grade: GradeLevel;
  genre: string;
  title: string;
  prompt: string;
  targetWords: [number, number];
  tips: string[];
}

export interface SubjectConfig {
  id: SubjectId;
  name: string;
  nameZh: string;
  tagline: string;
  badge: string;
  accentText: string;
  accentBg: string;
  accentBorder: string;
  overview: Record<GradeLevel, string>;
  topics: Record<GradeLevel, string[]>;
  externalUrl?: {
    label: string;
    url: string;
  };
  questions: PracticeQuestion[];
}

export const ESSAY_PROMPTS: EssayPrompt[] = [
  {
    id: 'g6-narrative-1',
    grade: 'G6',
    genre: 'Narrative / 记叙文',
    title: 'A Challenge I Overcame',
    prompt:
      'Write about a time when you faced a difficult task at school or in daily life. Describe what happened, how you felt, and what you learned from the experience.',
    targetWords: [150, 250],
    tips: [
      'Hook: Start with a vivid moment or dialogue.',
      'Body: Show your struggle and turning point with sensory details.',
      'Conclusion: Reflect on how this moment helped you grow.'
    ]
  },
  {
    id: 'g6-persuasive-1',
    grade: 'G6',
    genre: 'Persuasive / 议论文',
    title: 'Should Schools Have Longer Breaks?',
    prompt:
      'Some students believe longer breaks between classes improve focus and health, while others worry it shortens learning time. State your opinion and support it with clear reasons.',
    targetWords: [150, 250],
    tips: [
      'Thesis: State your clear position in the opening paragraph.',
      'Reasons: Give 2–3 concrete examples or school observations.',
      'Counterargument: Briefly address the opposing view.'
    ]
  },
  {
    id: 'g7-argument-1',
    grade: 'G7',
    genre: 'Argumentative / 思辨议论文',
    title: 'AI Tools in Middle School Learning',
    prompt:
      'Artificial intelligence tools are increasingly used by Grade 7 students for research and writing. Should AI tutors be encouraged in daily homework, or should strict limits apply? Defend your stance.',
    targetWords: [200, 320],
    tips: [
      'Claim: Define a nuanced thesis (e.g., guided use vs. over-reliance).',
      'Evidence: Compare skill-building with shortcut risks.',
      'Transitions: Use cohesive markers (However, Consequently, Furthermore).'
    ]
  },
  {
    id: 'g7-expository-1',
    grade: 'G7',
    genre: 'Expository / 说明文',
    title: 'Designing a Sustainable City',
    prompt:
      'Imagine you are designing an eco-friendly neighborhood for the year 2040. Explain three key systems (energy, transport, or green space) that would make it both livable and sustainable.',
    targetWords: [200, 320],
    tips: [
      'Structure: Dedicate one clear paragraph to each system.',
      'Precision: Use strong academic verbs and specific examples.',
      'Conclusion: Summarize how the systems work together.'
    ]
  }
];

export const K12_SUBJECTS: SubjectConfig[] = [
  {
    id: 'english',
    name: 'English',
    nameZh: '英语语言与写作',
    tagline: 'Wordsmith 造句训练 + 命题作文工作台',
    badge: 'G6 / G7 Core',
    accentText: 'text-indigo-400',
    accentBg: 'bg-indigo-500/10',
    accentBorder: 'border-indigo-500/30',
    overview: {
      G6: '六年级重点强化高阶词汇在语境中的精准造句（Wordsmith），并完成 150–250 词的记叙文与观点类命题作文训练。',
      G7: '七年级聚焦学术词汇搭配、复杂句式构建（Wordsmith），以及 200–320 词的思辨议论文与说明文命题写作。'
    },
    topics: {
      G6: ['Wordsmith 核心词汇造句', '记叙文细节描写', '观点类命题作文结构', '语法与时态一致性'],
      G7: ['学术词汇与复杂句型', '思辨议论文立论与反驳', '说明文逻辑衔接', '同伴互评与自查润色']
    },
    externalUrl: {
      label: '启动 Wordsmith 造句',
      url: 'https://wordsmith.vanpower.live'
    },
    questions: [
      {
        id: 'eng-g6-1',
        grade: 'G6',
        topic: 'Vocabulary in Context',
        question: 'Choose the sentence that uses the word "resilient" most accurately:',
        options: [
          'The resilient glass shattered the moment it touched the floor.',
          'Although the team lost the first match, the resilient players practiced harder and won the next.',
          'She felt resilient because she forgot to bring her lunch.',
          'The soup was too resilient to eat without salt.'
        ],
        correctIndex: 1,
        explanation: '"Resilient" means able to recover quickly from difficulties or setbacks—bouncing back after losing a match fits accurately.'
      },
      {
        id: 'eng-g7-1',
        grade: 'G7',
        topic: 'Essay Thesis & Cohesion',
        question: 'Which thesis statement is strongest for a Grade 7 argumentative essay on school uniforms?',
        options: [
          'School uniforms are something many schools have.',
          'I like uniforms and I will write about them.',
          'While critics argue uniforms limit self-expression, standardized dress codes reduce peer pressure and strengthen campus focus.',
          'Uniforms are blue or grey in most schools.'
        ],
        correctIndex: 2,
        explanation: 'A strong argumentative thesis acknowledges a counterargument ("While critics argue...") and states a clear, specific claim with reasons.'
      }
    ]
  },
  {
    id: 'ig-math',
    name: 'IG Math',
    nameZh: 'IGCSE 国际数学',
    tagline: '剑桥体系英文数学思维与阶梯训练',
    badge: 'Cambridge Track',
    accentText: 'text-emerald-400',
    accentBg: 'bg-emerald-500/10',
    accentBorder: 'border-emerald-500/30',
    overview: {
      G6: '衔接 Cambridge Lower Secondary Stage 7：整数与比值、百分数应用、基础代数式化简、周长面积与基础概率。',
      G7: '对标 IGCSE Pre-Foundation（Stage 8）：线性方程与不等式、一次函数图像、几何角关系、体积与表面积、统计图表分析。'
    },
    topics: {
      G6: ['Ratios, Rates & Percentages', 'Algebraic Expressions', 'Area & Perimeter of Compound Shapes', 'Introductory Probability'],
      G7: ['Linear Equations & Inequalities', 'Gradient & Straight-Line Graphs', 'Angles in Parallel Lines & Polygons', 'Volume, Surface Area & Data Handling']
    },
    externalUrl: {
      label: '打开 MathGenius 刷题',
      url: 'https://mathgenius.vanpower.live'
    },
    questions: [
      {
        id: 'igm-g6-1',
        grade: 'G6',
        topic: 'Ratios & Percentages',
        question: 'A jacket originally costs $80. During a sale, the price is reduced by 25%. What is the sale price?',
        options: ['$55', '$60', '$65', '$20'],
        correctIndex: 1,
        explanation: '25% of $80 is 0.25 × 80 = $20. Subtracting the discount: $80 - $20 = $60.'
      },
      {
        id: 'igm-g7-1',
        grade: 'G7',
        topic: 'Linear Equations',
        question: 'Solve for x: 3(2x - 4) = 18',
        options: ['x = 3', 'x = 5', 'x = 7', 'x = 10'],
        correctIndex: 1,
        explanation: 'Divide both sides by 3: 2x - 4 = 6. Add 4 to both sides: 2x = 10, so x = 5.'
      }
    ]
  },
  {
    id: 'shanghai-math',
    name: '上海数学',
    nameZh: '沪教版初中数学',
    tagline: '紧扣上海六/七年级考纲与压轴思维训练',
    badge: '沪教版同步',
    accentText: 'text-teal-400',
    accentBg: 'bg-teal-500/10',
    accentBorder: 'border-teal-500/30',
    overview: {
      G6: '上海六年级（预初）核心模块：数的整除、分数与比和比例、圆和扇形、有理数运算以及一元一次方程与不等式。',
      G7: '上海七年级核心模块：整式的加减乘除与因式分解、分式运算、相交线与平行线证明、全等三角形与平面直角坐标系。'
    },
    topics: {
      G6: ['数的整除与素数分解', '分数、比和比例应用题', '圆与扇形的周长面积', '有理数与一元一次方程'],
      G7: ['整式乘法与因式分解', '分式方程与化简求值', '相交线、平行线几何证明', '全等三角形与平面直角坐标系']
    },
    questions: [
      {
        id: 'shm-g6-1',
        grade: 'G6',
        topic: '圆与扇形',
        question: '一个半径为 6 cm 的圆，其圆心角为 120° 的扇形面积是多少？（结果保留 π）',
        options: ['6π cm²', '12π cm²', '24π cm²', '36π cm²'],
        correctIndex: 1,
        explanation: '扇形面积公式 S = (n/360) × πr² = (120/360) × π × 6² = (1/3) × 36π = 12π cm²。'
      },
      {
        id: 'shm-g7-1',
        grade: 'G7',
        topic: '因式分解',
        question: '将多项式 x² - 9y² 因式分解，结果正确的是：',
        options: ['(x - 3y)²', '(x + 9y)(x - 9y)', '(x + 3y)(x - 3y)', '(x - 3y)(x - 3y)'],
        correctIndex: 2,
        explanation: '利用平方差公式 a² - b² = (a + b)(a - b)，其中 a = x, b = 3y，得 (x + 3y)(x - 3y)。'
      }
    ]
  },
  {
    id: 'humanity',
    name: 'Humanity',
    nameZh: '人文与社会科学',
    tagline: '历史思辨 · 人文地理 · 史料分析',
    badge: 'History & Geography',
    accentText: 'text-amber-400',
    accentBg: 'bg-amber-500/10',
    accentBorder: 'border-amber-500/30',
    overview: {
      G6: '六年级聚焦古代大河文明（美索不达米亚、埃及、黄河与印度河）、地图比例尺与地形气候、以及一手史料与二手史料的辨析。',
      G7: '七年级深入丝绸之路跨文化交流、中世纪至文艺复兴转型、人口迁移与城市化地理议题，培养基于证据的因果论证能力。'
    },
    topics: {
      G6: ['Ancient River Valley Civilizations', 'Map Skills & Climate Zones', 'Primary vs. Secondary Sources', 'Early Trade & Cultural Exchange'],
      G7: ['The Silk Road & Global Connections', 'Renaissance & Scientific Shift', 'Urbanization & Human Geography', 'Source Reliability & Bias Analysis']
    },
    questions: [
      {
        id: 'hum-g6-1',
        grade: 'G6',
        topic: 'Historical Sources',
        question: 'Which of the following is an example of a PRIMARY source from Ancient Egypt?',
        options: [
          'A modern Grade 6 history textbook chapter on pharaohs',
          'A documentary filmed in 2024 about the pyramids',
          'A carved stone inscription created during Pharaoh Ramesses II’s reign',
          'An encyclopedia article written by a historian'
        ],
        correctIndex: 2,
        explanation: 'A primary source is created during the time period being studied. A stone inscription from Ramesses II’s reign is firsthand evidence.'
      },
      {
        id: 'hum-g7-1',
        grade: 'G7',
        topic: 'Silk Road Impact',
        question: 'Beyond silk and spices, what was one of the most significant long-term impacts of the Silk Road?',
        options: [
          'It prevented any cultural contact between East and West.',
          'It facilitated the spread of technologies (like papermaking), religions, and ideas across Eurasia.',
          'It replaced all maritime trade routes permanently.',
          'It was used exclusively by military armies.'
        ],
        correctIndex: 1,
        explanation: 'The Silk Road connected Eurasia not only through goods, but also through papermaking, printing, astronomy, and religious traditions.'
      }
    ]
  },
  {
    id: 'science',
    name: 'Science',
    nameZh: '综合科学探索',
    tagline: '物理 · 化学 · 生物 · 科学探究方法',
    badge: 'Lab & Inquiry',
    accentText: 'text-sky-400',
    accentBg: 'bg-sky-500/10',
    accentBorder: 'border-sky-500/30',
    overview: {
      G6: '六年级建立科学探究基础：物质的三态与混合物分离、细胞结构与植物光合作用、力与简单机械、地球水循环与天气系统。',
      G7: '七年级进阶实验设计（控制变量法）：元素周期表与化学反应、能量守恒与电路基础、人体呼吸与循环系统、板块构造与生态平衡。'
    },
    topics: {
      G6: ['States of Matter & Mixtures', 'Plant & Animal Cells', 'Forces, Friction & Gravity', 'Water Cycle & Weather'],
      G7: ['Scientific Method & Fair Testing', 'Elements, Compounds & Reactions', 'Energy Transfer & Simple Circuits', 'Ecosystems & Plate Tectonics']
    },
    questions: [
      {
        id: 'sci-g6-1',
        grade: 'G6',
        topic: 'Biology: Cell Structure',
        question: 'Which organelle is found in plant cells—but NOT in animal cells—and converts sunlight into chemical energy?',
        options: ['Nucleus', 'Mitochondria', 'Chloroplast', 'Cell membrane'],
        correctIndex: 2,
        explanation: 'Chloroplasts contain chlorophyll and carry out photosynthesis in plant cells; animal cells do not have chloroplasts.'
      },
      {
        id: 'sci-g7-1',
        grade: 'G7',
        topic: 'Scientific Inquiry',
        question: 'In an experiment testing how temperature affects the rate at which sugar dissolves in water, what is the independent variable?',
        options: [
          'The time it takes for the sugar to dissolve',
          'The temperature of the water',
          'The volume of water used in each beaker',
          'The brand of sugar'
        ],
        correctIndex: 1,
        explanation: 'The independent variable is the factor intentionally changed by the experimenter—in this case, water temperature. Dissolving time is the dependent variable, and water volume/sugar brand are controlled variables.'
      }
    ]
  }
];
