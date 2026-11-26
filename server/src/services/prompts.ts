export const MATH_SCENARIO_THEMES = [
  'space exploration & satellite orbits',
  'school robotics & 3D printing club',
  'marine biology & coral conservation',
  'sustainable architecture & green cities',
  'swimming & track athletics statistics',
  'culinary arts & bakery scaling',
  'botanical garden & greenhouse experiments',
  'archaeology museum & ancient artifacts',
  'high-speed rail & transit timetables',
  'solar & wind renewable energy microgrids',
  'campus book fair & library inventory',
  'mountain weather station & climate data',
];

export function pickDistinctThemes(): [string, string] {
  const pool = [...MATH_SCENARIO_THEMES];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return [pool[0], pool[1]];
}

export function stripJsonTicks(text: string): string {
  let textToParse = (text || '').trim();
  if (textToParse.startsWith('```json')) {
    textToParse = textToParse.substring(7);
  } else if (textToParse.startsWith('```')) {
    textToParse = textToParse.substring(3);
  }
  if (textToParse.endsWith('```')) {
    textToParse = textToParse.substring(0, textToParse.length - 3);
  }
  return textToParse.trim();
}

export function parseLLMArrayJSON<T = Record<string, unknown>>(jsonString: string): T[] {
  const cleaned = stripJsonTicks(jsonString);
  const parsed = JSON.parse(cleaned) as unknown;
  if (Array.isArray(parsed)) return parsed as T[];
  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    const candidate = obj.items ?? obj.questions ?? obj.words ?? obj.data;
    if (Array.isArray(candidate)) return candidate as T[];
  }
  return [];
}

export function parseLLMObjectJSON<T = Record<string, unknown>>(jsonString: string): T {
  const cleaned = stripJsonTicks(jsonString);
  const parsed = JSON.parse(cleaned) as unknown;
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    return parsed as T;
  }
  throw new Error('Expected JSON object from LLM');
}

export function getPromptsForCategory(
  category: string,
  language: string,
  difficulty = 'standard',
  weakPoints: string[] = [],
  recentQuestions: string[] = []
): [string, string] {
  const isZh = language === 'zh';
  const langReq = isZh
    ? '- All text (questions, options, explanations, category names) MUST be strictly written in Simplified Chinese.'
    : '- All text (questions, options, explanations, category names) MUST be in English.';

  const [theme1, theme2] = pickDistinctThemes();
  const cleanRecent = Array.isArray(recentQuestions)
    ? recentQuestions
        .filter((s) => typeof s === 'string')
        .map((s) => s.replace(/\s+/g, ' ').trim().slice(0, 120))
        .filter(Boolean)
        .slice(0, 20)
    : [];

  const antiRepeatDirective =
    cleanRecent.length > 0
      ? isZh
        ? `\n- 【严禁出重复题】：学生近期已做过以下题干，请务必避开这些题目及仅替换数字的雷同题，确保情景、提问方式与考察角度全新：\n  ${cleanRecent.map((q, i) => `${i + 1}. ${q}`).join('\n  ')}`
        : `\n- [AVOID REPEATING RECENT QUESTIONS]: Do NOT repeat or merely swap numbers from these recently seen question stems; invent fresh scenarios and angles:\n  ${cleanRecent.map((q, i) => `${i + 1}. ${q}`).join('\n  ')}`
      : '';

  const variationDirective = (theme: string) =>
    isZh
      ? `\n- 【情境多样性】：本次请优先结合「${theme}」等真实跨学科场景出题，避免陈旧套路化数字。`
      : `\n- [FRESH CONTEXT SEED]: Ground word problems creatively around "${theme}" where appropriate so each practice set feels fresh.`;

  let difficultyDirective = '';
  if (difficulty === 'foundation') {
    difficultyDirective = isZh
      ? '- 难度档位：【基础巩固】。聚焦核心定义、基本运算法则与基础单步计算，题目表述通俗易懂直截了当，不设多重弯绕，着重夯实基本功并建立数学信心。'
      : '- Difficulty Tier: [FOUNDATION & BASICS]. Focus on core definitions, fundamental operations, and direct single-step calculations. Straightforward wording without convoluted traps to build strong core fundamentals and student confidence.';
  } else if (difficulty === 'challenge') {
    difficultyDirective = isZh
      ? '- 难度档位：【挑战与奥数】。高阶思维拓展、奥数竞赛题型与跨知识点综合推理，多步复杂情境，要求严密数理逻辑与创新解题视角。'
      : '- Difficulty Tier: [OLYMPIAD & ADVANCED CHALLENGE]. Advanced mathematical reasoning, Olympiad competition-style problems, multi-step problem solving, and cross-topic integration requiring deep analytical thinking.';
  } else {
    difficultyDirective = isZh
      ? '- 难度档位：【进阶拓展】。严格贴合六年级（11~12岁）标准课标，包含两步及以上应用题、现实生活建模与综合概念应用。'
      : '- Difficulty Tier: [STANDARD CURRICULUM]. Standard curriculum for 11-12 year old Grade 6 students. Multi-step word problems, practical modeling, and solid conceptual application.';
  }

  let weakPointsDirective = '';
  if (Array.isArray(weakPoints) && weakPoints.length > 0) {
    const listStr = weakPoints.join(', ');
    weakPointsDirective = isZh
      ? `\n- 【错题弱项靶向强化】：学生近期在以下知识模块存在错题或薄弱点：[${listStr}]。请务必将出题重点向这些薄弱知识点定向倾斜（至少分配 60% 题目针对相关概念出题），从不同角度与情境进行专项巩固！`
      : `\n- [TARGETED WEAK-POINT DRILL]: The student recently made errors in these topics: [${listStr}]. Please allocate at least 60% of questions specifically to reinforce and remediate these weak points from varied angles.`;
  }

  const sharedTail = (theme: string) => `${variationDirective(theme)}${antiRepeatDirective}`;
  const jsonWrapRule =
    '- Return a strict JSON object of the form {"items": [...]} where each item has keys: "id", "question", "options" (array of 4 distinct strings), "correctAnswer" (exact match to one option), "hint", "explanation", "category".';

  switch (category) {
    case 'ratios_percentages':
      return [
        `You are a professional Grade 6 Math teacher. Generate exactly 5 high-quality math practice questions on Ratios, Rates & Proportions.
Topics to cover:
1. Understanding ratio concepts and using ratio language.
2. Calculating unit rates (e.g., speed, unit price).
3. Solving real-world ratio and rate problems using tables or equations.
4. Scale drawings and scale factor.
Requirements:
${langReq}
${difficultyDirective}${weakPointsDirective}${sharedTail(theme1)}
- Each question must have 4 distinct options with exactly one correct answer.
- Provide a concise "hint" (解题思路与思考方向) that guides the student's problem-solving thinking without revealing the actual correct answer or option.
- Provide a detailed step-by-step explanation.
- Category attribute must clearly state the specific knowledge point name (e.g., "${isZh ? '比和比率' : 'Ratios & Rates'}").
${jsonWrapRule}`,

        `You are a professional Grade 6 Math teacher. Generate exactly 5 high-quality math practice questions on Percentages & Applications.
Topics to cover:
1. Finding a percent of a quantity as a rate per 100.
2. Solving problems involving finding the whole, given a part and the percent.
3. Real-world percentage applications: discounts, sales tax, markups, tips.
4. Percent of increase and decrease.
Requirements:
${langReq}
${difficultyDirective}${weakPointsDirective}${sharedTail(theme2)}
- Each question must have 4 distinct options with exactly one correct answer.
- Provide a concise "hint" (解题思路与思考方向) that guides the student's problem-solving thinking without revealing the actual correct answer or option.
- Provide a detailed step-by-step explanation.
- Category attribute must clearly state the specific knowledge point name (e.g., "${isZh ? '百分数应用' : 'Percentages & Applications'}").
${jsonWrapRule}`,
      ];

    case 'fractions_decimals':
      return [
        `You are a professional Grade 6 Math teacher. Generate exactly 5 high-quality math practice questions on Fractions Operations.
Topics to cover:
1. Interpreting and computing quotients of fractions (dividing fractions by fractions).
2. Solving word problems involving fraction division using visual models and equations.
3. Multi-step operations with fractions and mixed numbers.
Requirements:
${langReq}
${difficultyDirective}${weakPointsDirective}${sharedTail(theme1)}
- Each question must have 4 distinct options with exactly one correct answer.
- Provide a concise "hint" (解题思路与思考方向) that guides the student's problem-solving thinking without revealing the actual correct answer or option.
- Provide a detailed step-by-step explanation.
- Category attribute must clearly state the specific knowledge point name (e.g., "${isZh ? '分数乘除法与混合运算' : 'Fraction Operations'}").
${jsonWrapRule}`,

        `You are a professional Grade 6 Math teacher. Generate exactly 5 high-quality math practice questions on Decimals & Mixed Operations.
Topics to cover:
1. Fluently adding, subtracting, multiplying, and dividing multi-digit decimals using standard algorithms.
2. Converting between fractions, decimals, and mixed numbers.
3. Multi-step real-world problem solving with fractions and decimals.
Requirements:
${langReq}
${difficultyDirective}${weakPointsDirective}${sharedTail(theme2)}
- Each question must have 4 distinct options with exactly one correct answer.
- Provide a concise "hint" (解题思路与思考方向) that guides the student's problem-solving thinking without revealing the actual correct answer or option.
- Provide a detailed step-by-step explanation.
- Category attribute must clearly state the specific knowledge point name (e.g., "${isZh ? '小数运算与综合应用' : 'Decimals & Mixed Operations'}").
${jsonWrapRule}`,
      ];

    case 'algebra_equations':
      return [
        `You are a professional Grade 6 Math teacher. Generate exactly 5 high-quality math practice questions on Algebraic Expressions.
Topics to cover:
1. Writing, reading, and evaluating algebraic expressions in which letters stand for numbers.
2. Evaluating expressions with whole-number exponents.
3. Applying properties of operations to generate equivalent expressions (distributive property, combining like terms).
Requirements:
${langReq}
${difficultyDirective}${weakPointsDirective}${sharedTail(theme1)}
- Each question must have 4 distinct options with exactly one correct answer.
- Provide a concise "hint" (解题思路与思考方向) that guides the student's problem-solving thinking without revealing the actual correct answer or option.
- Provide a detailed step-by-step explanation.
- Category attribute must clearly state the specific knowledge point name (e.g., "${isZh ? '代数式与化简' : 'Algebraic Expressions'}").
${jsonWrapRule}`,

        `You are a professional Grade 6 Math teacher. Generate exactly 5 high-quality math practice questions on One-Step Equations & Inequalities.
Topics to cover:
1. Solving equations of the form x + p = q and px = q for cases in which p, q, and x are all non-negative rational numbers.
2. Using variables to represent numbers and write equations when solving a real-world or mathematical problem.
3. Writing and interpreting simple inequalities (x > c, x <= c) to represent conditions in real-world problems.
Requirements:
${langReq}
${difficultyDirective}${weakPointsDirective}${sharedTail(theme2)}
- Each question must have 4 distinct options with exactly one correct answer.
- Provide a concise "hint" (解题思路与思考方向) that guides the student's problem-solving thinking without revealing the actual correct answer or option.
- Provide a detailed step-by-step explanation.
- Category attribute must clearly state the specific knowledge point name (e.g., "${isZh ? '一元一次方程与不等式' : 'Equations & Inequalities'}").
${jsonWrapRule}`,
      ];

    case 'circles_geometry':
      return [
        `You are a professional Grade 6 Math teacher. Generate exactly 5 high-quality math practice questions on Circles & Circumference/Area.
Topics to cover:
1. Understanding the relationship between diameter, radius, and circumference of a circle (pi).
2. Calculating circumference of a circle given radius or diameter.
3. Calculating the area of a circle (A = pi * r^2).
4. Finding area or perimeter of semicircles and composite circle shapes.
Requirements:
${langReq}
${difficultyDirective}${weakPointsDirective}${sharedTail(theme1)}
- Use 3.14 or 22/7 for pi when needed.
- Each question must have 4 distinct options with exactly one correct answer.
- Provide a concise "hint" (解题思路与思考方向) that guides the student's problem-solving thinking without revealing the actual correct answer or option.
- Provide a detailed step-by-step explanation.
- Category attribute must clearly state the specific knowledge point name (e.g., "${isZh ? '圆的周长与面积' : 'Circles & Area'}").
${jsonWrapRule}`,

        `You are a professional Grade 6 Math teacher. Generate exactly 5 high-quality math practice questions on 3D Geometry (Surface Area & Volume).
Topics to cover:
1. Finding the volume of a right rectangular prism with fractional edge lengths.
2. Finding the surface area of rectangular prisms, cubes, and cylinders.
3. Using nets made up of rectangles and triangles to find the surface area of 3D figures.
Requirements:
${langReq}
${difficultyDirective}${weakPointsDirective}${sharedTail(theme2)}
- Each question must have 4 distinct options with exactly one correct answer.
- Provide a concise "hint" (解题思路与思考方向) that guides the student's problem-solving thinking without revealing the actual correct answer or option.
- Provide a detailed step-by-step explanation.
- Category attribute must clearly state the specific knowledge point name (e.g., "${isZh ? '立体图形表面积与体积' : 'Surface Area & Volume'}").
${jsonWrapRule}`,
      ];

    case 'integers_coordinates':
      return [
        `You are a professional Grade 6 Math teacher. Generate exactly 5 high-quality math practice questions on Negative Numbers & Absolute Value.
Topics to cover:
1. Using positive and negative numbers to represent quantities in real-world contexts (temperature, debt, elevation).
2. Recognizing opposite signs of numbers and locating integers on a number line.
3. Understanding absolute value of a rational number as its distance from 0 on the number line.
4. Comparing and ordering rational numbers, including negative numbers.
Requirements:
${langReq}
${difficultyDirective}${weakPointsDirective}${sharedTail(theme1)}
- Each question must have 4 distinct options with exactly one correct answer.
- Provide a concise "hint" (解题思路与思考方向) that guides the student's problem-solving thinking without revealing the actual correct answer or option.
- Provide a detailed step-by-step explanation.
- Category attribute must clearly state the specific knowledge point name (e.g., "${isZh ? '正负数与绝对值' : 'Integers & Absolute Value'}").
${jsonWrapRule}`,

        `You are a professional Grade 6 Math teacher. Generate exactly 5 high-quality math practice questions on The Coordinate Plane.
Topics to cover:
1. Finding and positioning pairs of integers and other rational numbers on a four-quadrant coordinate plane.
2. Identifying which quadrant a point (x, y) lies in.
3. Finding horizontal and vertical distances between points with the same first coordinate or second coordinate.
4. Reflecting points across the x-axis or y-axis.
Requirements:
${langReq}
${difficultyDirective}${weakPointsDirective}${sharedTail(theme2)}
- Each question must have 4 distinct options with exactly one correct answer.
- Provide a concise "hint" (解题思路与思考方向) that guides the student's problem-solving thinking without revealing the actual correct answer or option.
- Provide a detailed step-by-step explanation.
- Category attribute must clearly state the specific knowledge point name (e.g., "${isZh ? '平面直角坐标系' : 'Coordinate Plane'}").
${jsonWrapRule}`,
      ];

    case 'all':
    default:
      return [
        `You are a professional Grade 6 Math teacher. Generate exactly 5 high-quality Grade 6 math practice questions covering:
1. Unit rates, ratios, and percentages in real world problems.
2. Dividing fractions by fractions and multi-step fraction operations.
3. Writing and evaluating algebraic expressions with variables and exponents.
Requirements:
${langReq}
${difficultyDirective}${weakPointsDirective}${sharedTail(theme1)}
- Each question must have 4 distinct options with exactly one correct answer.
- Provide a concise "hint" (解题思路与思考方向) that guides the student's problem-solving thinking without revealing the actual correct answer or option.
- Provide a detailed step-by-step explanation.
- Category attribute must identify the specific knowledge point for each question (e.g., "${isZh ? '比与比例' : 'Ratios'}", "${isZh ? '分数运算' : 'Fractions'}", "${isZh ? '代数式' : 'Algebra'}").
${jsonWrapRule}`,

        `You are a professional Grade 6 Math teacher. Generate exactly 5 high-quality Grade 6 math practice questions covering:
1. Solving one-step/two-step linear equations.
2. Circumference and area of circles, or volume/surface area of 3D prisms.
3. Negative integers, absolute value, and the four-quadrant coordinate plane.
Requirements:
${langReq}
${difficultyDirective}${weakPointsDirective}${sharedTail(theme2)}
- Each question must have 4 distinct options with exactly one correct answer.
- Provide a concise "hint" (解题思路与思考方向) that guides the student's problem-solving thinking without revealing the actual correct answer or option.
- Provide a detailed step-by-step explanation.
- Category attribute must identify the specific knowledge point for each question (e.g., "${isZh ? '一元一次方程' : 'Equations'}", "${isZh ? '圆与立体几何' : 'Geometry'}", "${isZh ? '负数与坐标系' : 'Integers & Coordinates'}").
${jsonWrapRule}`,
      ];
  }
}

export function buildPracticeCurriculumContext(
  subjectId: string,
  grade: string,
  trackId: string,
  trackName: string,
  topics: string[]
): { langRule: string; curriculum: string; guard: string } {
  const gradeStr = grade === 'G6' ? 'Grade 6 (age 11-12)' : 'Grade 7 (age 12-13)';
  const trackLine = trackName ? `Active Unit / Track: ${trackName}${trackId ? ` (${trackId})` : ''}.` : '';
  const topicLine = topics.length > 0 ? `Curriculum Topics to cover: ${topics.join(', ')}.` : '';

  if (subjectId === 'shanghai-math') {
    return {
      langRule: '- ALL fields (question, options, explanation, topic) MUST be strictly written in Simplified Chinese (简体中文).',
      curriculum: `Shanghai Five-Four Curriculum (沪教版五四制) Mathematics for ${grade === 'G6' ? '六年级' : '七年级'}. ${trackLine} ${topicLine}`,
      guard: '- Problems must require genuine multi-step reasoning or conceptual understanding rather than trivial recall. Include varied real-world contexts or fresh numbers.',
    };
  }
  if (subjectId === 'ig-math') {
    return {
      langRule: '- ALL fields (question, options, explanation, topic) MUST be strictly written in clear academic English.',
      curriculum: `Cambridge Lower Secondary / International Mathematics (${grade === 'G6' ? 'Stage 7 / UKMT Junior' : 'Stage 8 / AMC 8'}) for ${gradeStr}. ${trackLine} ${topicLine}`,
      guard: '- Vary contexts creatively (architecture, astronomy, sports telemetry, finance, geometry puzzles). Avoid repetitive textbook templates.',
    };
  }
  if (subjectId === 'science') {
    return {
      langRule: '- ALL fields (question, options, explanation, topic) MUST be strictly written in clear Cambridge Science English.',
      curriculum: `Cambridge Lower Secondary Science ${grade === 'G6' ? 'Stage 7 (0893)' : 'Stage 8 (0893)'} for ${gradeStr}. ${trackLine} ${topicLine}`,
      guard: '- Design experiment-based, data-interpretation, cause-and-effect, or quantitative reasoning scenarios with fresh contexts and realistic lab observations.',
    };
  }
  if (subjectId === 'humanity') {
    return {
      langRule: '- ALL fields (question, options, explanation, topic) MUST be strictly written in clear academic English.',
      curriculum:
        grade === 'G6'
          ? `SUIS / IB MYP / Oxford / TCI Grade 6 World Humanities & Geography. ${trackLine} ${topicLine}`
          : `Middle School World History & Human Geography for ${gradeStr}. ${trackLine} ${topicLine}`,
      guard: '- Strictly stay aligned with World Biomes, Early Humans, Ancient River/Classical Civilizations, GRAPES historical analysis, or Map & Geographic Inquiry. Do NOT ask Chinese domestic history/geography trivia questions.',
    };
  }
  return {
    langRule: '- ALL fields (question, options, explanation, topic) MUST be strictly written in clear English.',
    curriculum: `International School English Language Arts (vocabulary in context, nuanced grammar, punctuation, figurative language, rhetoric, and short passage inference) for ${gradeStr}. ${topicLine}`,
    guard: '- Create brand-new sentences, short 2-3 sentence mini-passages, or precise editing items so the student cannot guess by memorizing static templates.',
  };
}
