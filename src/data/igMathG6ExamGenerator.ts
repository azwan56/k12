export type IgMathG6ExamTopicId =
  | 'angles'
  | 'equations'
  | 'inequalities'
  | 'scale'
  | 'interest';

export interface IgMathG6ExamTopicMeta {
  id: IgMathG6ExamTopicId;
  nameEn: string;
  nameZh: string;
  emoji: string;
  tipZh: string;
}

export const IG_MATH_G6_EXAM_TOPICS: readonly IgMathG6ExamTopicMeta[] = [
  {
    id: 'angles',
    nameEn: 'Angles & Lines',
    nameZh: '角与直线',
    emoji: '📐',
    tipZh: '平角和 180°、直角互余 90°、对顶角严格相等；注意分清点、线段、直线与垂线定义。',
  },
  {
    id: 'equations',
    nameEn: 'Linear Equations',
    nameZh: '一元一次方程',
    emoji: '⚖️',
    tipZh: '负号去括号每项都要变号；“A subtracted from B” 应列式为 B − A 而非 A − B。',
  },
  {
    id: 'inequalities',
    nameEn: 'Inequalities',
    nameZh: '不等式与数轴',
    emoji: '📏',
    tipZh: '空心圈 ○ 表示严格 < 或 >（不含端点），实心点 ● 表示 ≤ 或 ≥；注意至少/不大于等词汇。',
  },
  {
    id: 'scale',
    nameEn: 'Scale Drawing',
    nameZh: '比例尺与方位',
    emoji: '🗺️',
    tipZh: '先统一单位再化简比例尺（1 m = 100 cm，1 km = 100000 cm），答实际距离要带对单位。',
  },
  {
    id: 'interest',
    nameEn: 'Simple Interest',
    nameZh: '单利与本息和',
    emoji: '💰',
    tipZh: '先看清问的是单利 I 还是本息总和 A = P + I；月数必须先除以 12 化为年再代入 I = PRT/100。',
  },
];

export const IG_MATH_G6_EXAM_SIZE = 20;
export const IG_MATH_G6_REMEDIATION_SIZE = 10;
export const IG_MATH_G6_PASS_THRESHOLD_PCT = 80;

export type ExamDiagramSpec =
  | {
      kind: 'straight_line';
      leftLabel: string;
      rightLabel: string;
      rayAngleDeg: number;
    }
  | {
      kind: 'right_angle';
      topLabel: string;
      bottomLabel: string;
      rayAngleDeg: number;
    }
  | {
      kind: 'vertical_angles';
      leftLabel: string;
      rightLabel: string;
      topLabel?: string;
      bottomLabel?: string;
    }
  | {
      kind: 'number_line';
      min: number;
      max: number;
      step: number;
      variableLabel: string;
      mode: 'ray_left' | 'ray_right' | 'between';
      start: number;
      startInclusive: boolean;
      end?: number;
      endInclusive?: boolean;
    }
  | {
      kind: 'scale_map';
      scaleText: string;
      fromLabel: string;
      toLabel: string;
      distanceLabel: string;
      direction: 'east' | 'south' | 'southeast' | 'north' | 'west';
    };

export interface IgMathG6ExamQuestion {
  id: string;
  topicId: IgMathG6ExamTopicId;
  subSkill: string;
  topicLabel: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
  diagram?: ExamDiagramSpec;
}

export interface ExamTopicStat {
  topicId: IgMathG6ExamTopicId;
  nameEn: string;
  nameZh: string;
  emoji: string;
  correct: number;
  total: number;
  wrongCount: number;
  accuracyPct: number;
  missedSubSkills: string[];
  tipZh: string;
}

export interface ExamDiagnosticReport {
  score: number;
  total: number;
  accuracyPct: number;
  passed80: boolean;
  topicStats: ExamTopicStat[];
  weakTopicNames: string[];
}

export interface RemediationAllocationItem {
  topicId: IgMathG6ExamTopicId;
  count: number;
  targetSubSkills: string[];
}

let examSeq = 0;

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(items: readonly T[]): T {
  return items[randInt(0, items.length - 1)];
}

function shuffleLocal<T>(items: readonly T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function roundTo(val: number, decimals = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round((val + Number.EPSILON) * factor) / factor;
}

function fmtNum(val: number): string {
  const clean = Math.abs(val) < 1e-9 ? 0 : val;
  if (Number.isInteger(clean)) return String(clean);
  return String(roundTo(clean, 2));
}

function fmtSigned(val: number): string {
  return val < 0 ? `−${Math.abs(val)}` : String(val);
}

function fmtMoney(currency: string, val: number): string {
  const clean = roundTo(val, 2);
  if (Number.isInteger(clean)) {
    return `${currency}${clean.toLocaleString('en-US')}`;
  }
  const fixed = clean.toFixed(2).replace(/0$/, '');
  const [intPart, decPart] = fixed.split('.');
  return `${currency}${Number(intPart).toLocaleString('en-US')}.${decPart}`;
}

function buildUniqueOptions(
  correctRaw: string,
  distractorsRaw: readonly string[],
  fallbackNumeric?: { base: number; unit?: string; prefix?: string; allowNegative?: boolean }
): { options: string[]; answer: number } {
  const cleanCorrect = correctRaw.trim().slice(0, 280);
  const chosen: string[] = [cleanCorrect];
  const seen = new Set<string>([cleanCorrect]);

  for (const cand of distractorsRaw) {
    const c = cand.trim().slice(0, 280);
    if (c && !seen.has(c)) {
      seen.add(c);
      chosen.push(c);
      if (chosen.length === 4) break;
    }
  }

  let step = 1;
  while (chosen.length < 4) {
    const delta = (step % 2 === 1 ? Math.ceil(step / 2) : -Math.ceil(step / 2)) * 2;
    let candidate: string;
    if (fallbackNumeric) {
      let val = fallbackNumeric.base + delta;
      if (!fallbackNumeric.allowNegative && val <= 0) {
        val = fallbackNumeric.base + step * 3;
      }
      const numStr = Number.isInteger(val) && val < 0 ? fmtSigned(val) : fmtNum(val);
      candidate = `${fallbackNumeric.prefix ?? ''}${numStr}${fallbackNumeric.unit ?? ''}`;
    } else {
      candidate = `${cleanCorrect} [Alt ${step}]`;
    }
    if (!seen.has(candidate)) {
      seen.add(candidate);
      chosen.push(candidate);
    }
    step += 1;
  }

  const finalOptions = shuffleLocal(chosen);
  return {
    options: finalOptions,
    answer: finalOptions.indexOf(cleanCorrect),
  };
}

function makeExamQuestion(params: {
  topicId: IgMathG6ExamTopicId;
  subSkill: string;
  topicLabel: string;
  question: string;
  correct: string;
  distractors: readonly string[];
  explanation: string;
  diagram?: ExamDiagramSpec;
  fallbackNumeric?: { base: number; unit?: string; prefix?: string; allowNegative?: boolean };
}): IgMathG6ExamQuestion {
  examSeq += 1;
  const built = buildUniqueOptions(params.correct, params.distractors, params.fallbackNumeric);
  return {
    id: `g6exam_${params.topicId}_${params.subSkill}_${examSeq}_${Math.random()
      .toString(36)
      .slice(2, 6)}`,
    topicId: params.topicId,
    subSkill: params.subSkill,
    topicLabel: params.topicLabel.slice(0, 80),
    question: params.question.replace(/\s+/g, ' ').trim().slice(0, 580),
    options: built.options,
    answer: built.answer,
    explanation: params.explanation.trim(),
    ...(params.diagram ? { diagram: params.diagram } : {}),
  };
}

interface SubSkillGenerator {
  subSkill: string;
  topicId: IgMathG6ExamTopicId;
  build: () => IgMathG6ExamQuestion;
}

// =====================================================================
// Topic 1: Angles & Lines (5 sub-skills)
// =====================================================================
const ANGLES_GENERATORS: SubSkillGenerator[] = [
  {
    subSkill: 'angles_straight_line',
    topicId: 'angles',
    build: () => {
      const a = pick([28, 35, 42, 47, 54, 63, 72, 108, 118, 127, 135, 146, 151]);
      const ans = 180 - a;
      const onLeft = randInt(0, 1) === 1;
      const compTrap = a < 85 ? 90 - a : a - 15;
      return makeExamQuestion({
        topicId: 'angles',
        subSkill: 'angles_straight_line',
        topicLabel: 'Angles · Straight Line',
        question: `Find the missing angle ∠1 on the straight line shown below.`,
        correct: `${ans}°`,
        distractors: [`${compTrap}°`, `${a}°`, `${ans + 10}°`],
        explanation: `Angles on a straight line add up to 180°. Therefore ∠1 = 180° − ${a}° = ${ans}°.`,
        diagram: {
          kind: 'straight_line',
          leftLabel: onLeft ? `${a}°` : '∠1',
          rightLabel: onLeft ? '∠1' : `${a}°`,
          rayAngleDeg: onLeft ? a : 180 - a,
        },
        fallbackNumeric: { base: ans, unit: '°' },
      });
    },
  },
  {
    subSkill: 'angles_right_comp',
    topicId: 'angles',
    build: () => {
      const a = pick([21, 25, 29, 34, 38, 41, 52, 57, 64, 68]);
      const ans = 90 - a;
      const givenTop = randInt(0, 1) === 1;
      return makeExamQuestion({
        topicId: 'angles',
        subSkill: 'angles_right_comp',
        topicLabel: 'Angles · Right Angle',
        question: `Two rays form a 90° right angle as shown. Find the missing angle x°.`,
        correct: `${ans}°`,
        distractors: [`${180 - a}°`, `${a}°`, `${ans + 10}°`],
        explanation: `Complementary angles inside a right angle sum to 90°. So x = 90° − ${a}° = ${ans}°.`,
        diagram: {
          kind: 'right_angle',
          topLabel: givenTop ? `${a}°` : 'x°',
          bottomLabel: givenTop ? 'x°' : `${a}°`,
          rayAngleDeg: givenTop ? 90 - a : a,
        },
        fallbackNumeric: { base: ans, unit: '°' },
      });
    },
  },
  {
    subSkill: 'angles_vertical_opp',
    topicId: 'angles',
    build: () => {
      const a = pick([36, 42, 48, 53, 61, 67, 114, 126, 134]);
      const compTrap = a < 85 ? 90 - a : 180 - a - 10;
      const suppTrap = 180 - a;
      return makeExamQuestion({
        topicId: 'angles',
        subSkill: 'angles_vertical_opp',
        topicLabel: 'Angles · Vertically Opposite',
        question: `Two straight lines intersect as shown. Find the measure of the opposite angle x°.`,
        correct: `${a}°`,
        distractors: [`${compTrap}°`, `${suppTrap}°`, `${a + 12}°`],
        explanation: `Vertically opposite angles formed by two intersecting straight lines are always equal, so x° = ${a}° (do not subtract from 90°).`,
        diagram: {
          kind: 'vertical_angles',
          leftLabel: 'x°',
          rightLabel: `${a}°`,
        },
        fallbackNumeric: { base: a, unit: '°' },
      });
    },
  },
  {
    subSkill: 'angles_intersect_pair',
    topicId: 'angles',
    build: () => {
      const a = pick([45, 54, 58, 62, 68, 74, 116, 126, 132]);
      const adj = 180 - a;
      const compShift = Math.max(10, 90 - (a > 80 ? adj : a));
      const d3 = compShift === a ? compShift + 10 : compShift;
      return makeExamQuestion({
        topicId: 'angles',
        subSkill: 'angles_intersect_pair',
        topicLabel: 'Angles · Intersecting Lines',
        question: `In the intersecting lines diagram, find BOTH ∠1 (opposite to ${a}°) and ∠2 (adjacent on the straight line).`,
        correct: `∠1 = ${a}°, ∠2 = ${adj}°`,
        distractors: [
          `∠1 = ${adj}°, ∠2 = ${a}°`,
          `∠1 = ${a}°, ∠2 = ${a}°`,
          `∠1 = ${d3}°, ∠2 = ${adj}°`,
          `∠1 = ${adj}°, ∠2 = ${adj}°`,
        ],
        explanation: `∠1 is vertically opposite to ${a}°, so ∠1 = ${a}°. ∠2 forms a straight line with ${a}°, so ∠2 = 180° − ${a}° = ${adj}°.`,
        diagram: {
          kind: 'vertical_angles',
          topLabel: `${a}°`,
          bottomLabel: '∠1',
          leftLabel: '∠2',
          rightLabel: '',
        },
      });
    },
  },
  {
    subSkill: 'angles_vocab',
    topicId: 'angles',
    build: () => {
      const vocabItems = [
        {
          prompt: 'Which geometric term describes a straight path that extends without end in opposite directions?',
          correct: 'Line',
          distractors: ['Line segment', 'Point', 'Parallel lines'],
          exp: 'A line extends infinitely in both opposite directions, whereas a line segment has two endpoints.',
        },
        {
          prompt: 'Which term describes a part of a line bounded between two exact endpoints?',
          correct: 'Line segment',
          distractors: ['Line', 'Ray', 'Perpendicular lines'],
          exp: 'A line segment connects two fixed endpoints and has a definite finite length.',
        },
        {
          prompt: 'Which geometric term names an exact location in space with zero size or dimension?',
          correct: 'Point',
          distractors: ['Line', 'Line segment', 'Parallel lines'],
          exp: 'A point marks an exact position in space and is usually named with a capital letter.',
        },
        {
          prompt: 'Which term describes two lines in the same plane that NEVER intersect and always stay the same distance apart?',
          correct: 'Parallel lines',
          distractors: ['Perpendicular lines', 'Intersecting lines', 'Line segments'],
          exp: 'Parallel lines remain equidistant and never meet no matter how far extended.',
        },
        {
          prompt: 'Which term describes two lines that intersect to form exact 90° right angles?',
          correct: 'Perpendicular lines',
          distractors: ['Parallel lines', 'Obtuse angles', 'Line segments'],
          exp: 'Perpendicular lines cross at a 90° right angle.',
        },
        {
          prompt: 'How is an obtuse angle accurately defined?',
          correct: 'An angle measuring greater than 90° and less than 180°',
          distractors: [
            'An angle measuring strictly less than 90°',
            'An angle measuring exactly 180°',
            'An angle measuring greater than 180°',
          ],
          exp: 'Acute is 0°–90°, Right is 90°, Obtuse is between 90° and 180°, and Straight is 180°.',
        },
      ];
      const item = pick(vocabItems);
      return makeExamQuestion({
        topicId: 'angles',
        subSkill: 'angles_vocab',
        topicLabel: 'Angles · Geometry Vocabulary',
        question: item.prompt,
        correct: item.correct,
        distractors: item.distractors,
        explanation: item.exp,
      });
    },
  },
];

// =====================================================================
// Topic 2: Linear Equations (5 sub-skills)
// =====================================================================
const EQUATIONS_GENERATORS: SubSkillGenerator[] = [
  {
    subSkill: 'eq_neg_bracket',
    topicId: 'equations',
    build: () => {
      // Solve a*j - (b - c*j) = d*j + e -> (a+c-d)j = b + e
      const j = pick([-5, -4, -3, -2, 2, 3, 4, 5]);
      const a = randInt(1, 3);
      const c = randInt(2, 5);
      const d = a + c + pick([-3, -2, 2, 3]);
      const b = randInt(3, 9);
      const e = (a + c - d) * j - b;
      const eStr = e === 0 ? '' : e > 0 ? ` + ${e}` : ` − ${Math.abs(e)}`;
      const aStr = a === 1 ? 'j' : `${a}j`;
      const wrongBracketJ = Math.round((b + e) / (a - c - d || 2));
      return makeExamQuestion({
        topicId: 'equations',
        subSkill: 'eq_neg_bracket',
        topicLabel: 'Equations · Brackets',
        question: `Solve the linear equation: ${aStr} − (${b} − ${c}j) = ${d}j${eStr}. What is j?`,
        correct: `j = ${fmtSigned(j)}`,
        distractors: [
          `j = ${fmtSigned(-j)}`,
          `j = ${fmtSigned(wrongBracketJ === j ? j + 3 : wrongBracketJ)}`,
          `j = ${fmtSigned(j + 2)}`,
          `j = ${fmtSigned(j - 2)}`,
        ],
        explanation: `Distribute the minus sign carefully: ${aStr} − ${b} + ${c}j = ${d}j${eStr}. Combine terms: ${a + c}j − ${b} = ${d}j${eStr}, giving j = ${fmtSigned(j)}.`,
        fallbackNumeric: { base: j, prefix: 'j = ', allowNegative: true },
      });
    },
  },
  {
    subSkill: 'eq_both_sides_bracket',
    topicId: 'equations',
    build: () => {
      // k(a - b*r) = -c*r - d
      const k = pick([2, 3]);
      const b = randInt(2, 4);
      const c = k * b - pick([2, 3]);
      const a = randInt(3, 7);
      const r = randInt(4, 14);
      const d = (k * b - c) * r - k * a;
      const rhsConst = d >= 0 ? ` − ${d}` : ` + ${Math.abs(d)}`;
      return makeExamQuestion({
        topicId: 'equations',
        subSkill: 'eq_both_sides_bracket',
        topicLabel: 'Equations · Variables Both Sides',
        question: `Solve for r: ${k}(${a} − ${b}r) = −${c}r${rhsConst}.`,
        correct: `r = ${r}`,
        distractors: [`r = ${fmtSigned(-r)}`, `r = ${r + 3}`, `r = ${Math.max(1, r - 4)}`, `r = ${r + 2}`],
        explanation: `Expand left: ${k * a} − ${k * b}r = −${c}r${rhsConst}. Move terms: ${k * a + d} = ${k * b - c}r, so r = ${k * a + d} ÷ ${k * b - c} = ${r}.`,
        fallbackNumeric: { base: r, prefix: 'r = ', allowNegative: true },
      });
    },
  },
  {
    subSkill: 'eq_subtracted_from',
    topicId: 'equations',
    build: () => {
      // "When A is subtracted from B times a number, the result is -C"
      const x = pick([-6, -5, -4, -3, 3, 4, 5, 6, 7]);
      const mult = randInt(3, 7);
      const sub = randInt(8, 22);
      const res = mult * x - sub;
      const resStr = res < 0 ? `−${Math.abs(res)}` : String(res);
      const reversedX = fmtNum(roundTo((sub - res) / mult, 1));
      return makeExamQuestion({
        topicId: 'equations',
        subSkill: 'eq_subtracted_from',
        topicLabel: 'Equations · Word Modeling',
        question: `When ${sub} is subtracted from ${mult} times a certain number, the result is ${resStr}. What is the number?`,
        correct: fmtSigned(x),
        distractors: [
          fmtSigned(-x),
          reversedX === String(x) ? fmtSigned(x + 2) : reversedX,
          fmtSigned(x + 4),
        ],
        explanation: `"${sub} subtracted from ${mult}x" translates to ${mult}x − ${sub} = ${resStr} (NOT ${sub} − ${mult}x). Add ${sub}: ${mult}x = ${res + sub}, so x = ${fmtSigned(x)}.`,
        fallbackNumeric: { base: x, allowNegative: true },
      });
    },
  },
  {
    subSkill: 'eq_board_cut',
    topicId: 'equations',
    build: () => {
      const shortLen = randInt(3, 8);
      const mult = randInt(2, 4);
      const extra = randInt(2, 6);
      const longLen = mult * shortLen + extra;
      const total = shortLen + longLen;
      return makeExamQuestion({
        topicId: 'equations',
        subSkill: 'eq_board_cut',
        topicLabel: 'Equations · Word Modeling',
        question: `A ${total} ft wooden board is cut into two pieces. The longer piece is ${extra} ft longer than ${mult} times the shorter piece. How long are the two pieces?`,
        correct: `${shortLen} ft and ${longLen} ft`,
        distractors: [
          `${shortLen + 2} ft and ${longLen - 2} ft`,
          `${shortLen - 1} ft and ${total - (shortLen - 1)} ft`,
          `${shortLen + 1} ft and ${total - (shortLen + 1)} ft`,
          `${shortLen + 3} ft and ${total - (shortLen + 3)} ft`,
        ],
        explanation: `Let the shorter piece be x ft. Longer piece = ${mult}x + ${extra}. Equation: x + (${mult}x + ${extra}) = ${total} => ${mult + 1}x = ${total - extra}, so x = ${shortLen} ft and the other is ${longLen} ft.`,
      });
    },
  },
  {
    subSkill: 'eq_triangle_or_consecutive',
    topicId: 'equations',
    build: () => {
      if (randInt(0, 1) === 1) {
        // Two angles equal x; third is d smaller -> x + x + (x - d) = 180 -> 3x = 180 + d
        const d = pick([9, 12, 15, 18, 24, 30]);
        const equalAngle = (180 + d) / 3;
        const thirdAngle = equalAngle - d;
        return makeExamQuestion({
          topicId: 'equations',
          subSkill: 'eq_triangle_or_consecutive',
          topicLabel: 'Equations · Triangle Angles',
          question: `Two angles of a triangle have the exact same size (x°). The third angle is ${d}° smaller than each of the first two angles. Find the three angles.`,
          correct: `${equalAngle}°, ${equalAngle}°, ${thirdAngle}°`,
          distractors: [
            `${(180 - d) / 3}°, ${(180 - d) / 3}°, ${(180 - d) / 3 + d}°`,
            `${equalAngle + 2}°, ${equalAngle + 2}°, ${thirdAngle - 4}°`,
            `${equalAngle - 2}°, ${equalAngle - 2}°, ${thirdAngle + 4}°`,
            `60°, 60°, 60°`,
          ],
          explanation: `Set up x + x + (x − ${d}) = 180 => 3x = ${180 + d}, so x = ${equalAngle}°. Third angle = ${equalAngle} − ${d} = ${thirdAngle}°.`,
        });
      }
      // Consecutive even or odd integers
      const isEven = randInt(0, 1) === 1;
      if (isEven) {
        const n1 = randInt(16, 48) * 2;
        const n2 = n1 + 2;
        const sum = n1 + n2;
        return makeExamQuestion({
          topicId: 'equations',
          subSkill: 'eq_triangle_or_consecutive',
          topicLabel: 'Equations · Consecutive Integers',
          question: `The sum of two consecutive EVEN integers is ${sum}. What are the two integers?`,
          correct: `${n1} and ${n2}`,
          distractors: [`${n1 - 2} and ${n1}`, `${n2} and ${n2 + 2}`, `${n1 + 1} and ${n2 + 1}`],
          explanation: `Let the consecutive even integers be n and n + 2: 2n + 2 = ${sum} => 2n = ${sum - 2}, so n = ${n1}, and the pair is ${n1} and ${n2}.`,
        });
      }
      const n1 = randInt(15, 39) * 2 + 1;
      const n2 = n1 + 2;
      const n3 = n1 + 4;
      const sum = n1 + n2 + n3;
      return makeExamQuestion({
        topicId: 'equations',
        subSkill: 'eq_triangle_or_consecutive',
        topicLabel: 'Equations · Consecutive Integers',
        question: `The sum of three consecutive ODD integers is ${sum}. What are the three integers?`,
        correct: `${n1}, ${n2}, ${n3}`,
        distractors: [
          `${n1 - 2}, ${n1}, ${n2}`,
          `${n2}, ${n3}, ${n3 + 2}`,
          `${n2 - 1}, ${n2}, ${n2 + 1}`,
        ],
        explanation: `Using the middle odd integer n: (n − 2) + n + (n + 2) = 3n = ${sum} => middle n = ${n2}, giving ${n1}, ${n2}, ${n3}.`,
      });
    },
  },
];

// =====================================================================
// Topic 3: Inequalities (5 sub-skills)
// =====================================================================
const INEQUALITIES_GENERATORS: SubSkillGenerator[] = [
  {
    subSkill: 'ineq_truth_and_values',
    topicId: 'inequalities',
    build: () => {
      if (randInt(0, 1) === 1) {
        const n = randInt(3, 9);
        const a = n + randInt(1, 5);
        return makeExamQuestion({
          topicId: 'inequalities',
          subSkill: 'ineq_truth_and_values',
          topicLabel: 'Inequalities · Negatives & Symbols',
          question: `Which of the following inequality statements is TRUE?`,
          correct: `−${n} ≥ −${a}`,
          distractors: [`−${a} > −${n}`, `0 ≥ ${n}`, `${a} ≤ −${a}`],
          explanation: `On a number line, −${n} lies to the right of −${a} so −${n} > −${a}, which makes −${n} ≥ −${a} TRUE.`,
        });
      }
      const bound = randInt(4, 12);
      const isLess = randInt(0, 1) === 1;
      if (isLess) {
        return makeExamQuestion({
          topicId: 'inequalities',
          subSkill: 'ineq_truth_and_values',
          topicLabel: 'Inequalities · Solution Set',
          question: `Which set shows THREE valid values of x that satisfy the inequality x < ${bound}?`,
          correct: `${bound - 5}, ${bound - 3}, ${bound - 1}`,
          distractors: [
            `${bound - 2}, ${bound}, ${bound + 1}`,
            `${bound}, ${bound + 2}, ${bound + 4}`,
            `${bound + 1}, ${bound + 3}, ${bound + 5}`,
          ],
          explanation: `Strict inequality x < ${bound} requires values strictly less than ${bound} (so ${bound} itself cannot be included).`,
        });
      }
      return makeExamQuestion({
        topicId: 'inequalities',
        subSkill: 'ineq_truth_and_values',
        topicLabel: 'Inequalities · Solution Set',
        question: `Which set shows THREE valid values of x satisfying x ≥ −${bound}?`,
        correct: `−${bound}, −${bound - 2}, 0`,
        distractors: [
          `−${bound + 3}, −${bound + 1}, −${bound}`,
          `−${bound + 4}, −${bound + 2}, −${bound + 1}`,
          `−${bound + 2}, −${bound + 1}, 1`,
        ],
        explanation: `x ≥ −${bound} includes −${bound} and any numbers to its right (−${bound - 2}, 0). Numbers like −${bound + 1} are smaller than −${bound}.`,
      });
    },
  },
  {
    subSkill: 'ineq_number_line_single',
    topicId: 'inequalities',
    build: () => {
      const varChar = pick(['a', 'x', 'n', 'k']);
      const mode = pick<'ray_left' | 'ray_right'>(['ray_left', 'ray_right']);
      const inclusive = randInt(0, 1) === 1;
      const start = randInt(-9, 8);
      const min = start - 5;
      const max = start + 5;
      const sym = mode === 'ray_left' ? (inclusive ? '≤' : '<') : inclusive ? '≥' : '>';
      const flipSym = mode === 'ray_left' ? (inclusive ? '<' : '≤') : inclusive ? '>' : '≥';
      const oppSym = mode === 'ray_left' ? (inclusive ? '≥' : '>') : inclusive ? '≤' : '<';

      return makeExamQuestion({
        topicId: 'inequalities',
        subSkill: 'ineq_number_line_single',
        topicLabel: 'Inequalities · Number Line',
        question: `Write the inequality for variable "${varChar}" shown by the red ray on the number line.`,
        correct: `${varChar} ${sym} ${fmtSigned(start)}`,
        distractors: [
          `${varChar} ${flipSym} ${fmtSigned(start)}`,
          `${varChar} ${oppSym} ${fmtSigned(start)}`,
          `${varChar} ${sym} ${fmtSigned(start + 1)}`,
        ],
        explanation: `The arrow points ${mode === 'ray_left' ? 'left (smaller values)' : 'right (larger values)'} and the endpoint at ${fmtSigned(
          start
        )} is a ${inclusive ? 'solid filled dot ● (included)' : 'hollow open circle ○ (not included)'}, giving ${varChar} ${sym} ${fmtSigned(start)}.`,
        diagram: {
          kind: 'number_line',
          min,
          max,
          step: 1,
          variableLabel: varChar,
          mode,
          start,
          startInclusive: inclusive,
        },
      });
    },
  },
  {
    subSkill: 'ineq_number_line_compound',
    topicId: 'inequalities',
    build: () => {
      const varChar = pick(['v', 'n', 'm', 'q']);
      const start = pick([-4, -2, 0, 10, 21, 30]);
      const span = randInt(3, 8);
      const end = start + span;
      const leftInc = randInt(0, 1) === 1;
      const rightInc = randInt(0, 1) === 1;
      const lSym = leftInc ? '≤' : '<';
      const rSym = rightInc ? '≤' : '<';
      const wrongSymL = leftInc ? '<' : '≤';
      const wrongSymR = rightInc ? '<' : '≤';
      const pad = span <= 4 ? 2 : 1;

      return makeExamQuestion({
        topicId: 'inequalities',
        subSkill: 'ineq_number_line_compound',
        topicLabel: 'Inequalities · Compound Interval',
        question: `Write the compound inequality represented by the red segment for "${varChar}" on the number line.`,
        correct: `${fmtSigned(start)} ${lSym} ${varChar} ${rSym} ${fmtSigned(end)}`,
        distractors: [
          `${fmtSigned(start)} ${wrongSymL} ${varChar} ${wrongSymR} ${fmtSigned(end)}`,
          `${fmtSigned(start)} ${lSym} ${varChar} ${wrongSymR} ${fmtSigned(end)}`,
          `${fmtSigned(start)} ${wrongSymL} ${varChar} ${rSym} ${fmtSigned(end)}`,
        ],
        explanation: `Left circle at ${fmtSigned(start)} is ${leftInc ? 'solid ● (≤)' : 'open ○ (<)'}; right circle at ${fmtSigned(
          end
        )} is ${rightInc ? 'solid ● (≤)' : 'open ○ (<)'}. So ${fmtSigned(start)} ${lSym} ${varChar} ${rSym} ${fmtSigned(end)}.`,
        diagram: {
          kind: 'number_line',
          min: start - pad,
          max: end + pad,
          step: 1,
          variableLabel: varChar,
          mode: 'between',
          start,
          startInclusive: leftInc,
          end,
          endInclusive: rightInc,
        },
      });
    },
  },
  {
    subSkill: 'ineq_verbal_translate',
    topicId: 'inequalities',
    build: () => {
      const a = randInt(3, 9);
      const b = randInt(2, 6);
      const limit = randInt(18, 65);
      const templates = [
        {
          prompt: `Set up an inequality: "${a} times p is greater than the sum of ${b} and q."`,
          correct: `${a}p > ${b} + q`,
          distractors: [`${a}p ≥ ${b} + q`, `${a}p < ${b} + q`, `${a} + p > ${b}q`],
          exp: `"${a} times p" is ${a}p, "is greater than" is strict >, and "sum of ${b} and q" is ${b} + q.`,
        },
        {
          prompt: `Set up an inequality: "Adding ${a} to the product of ${b} and k is not less than ${limit}."`,
          correct: `${b}k + ${a} ≥ ${limit}`,
          distractors: [`${b}k + ${a} > ${limit}`, `${b}k + ${a} ≤ ${limit}`, `${b}(k + ${a}) ≥ ${limit}`],
          exp: `"Not less than" means greater than or equal to (≥), giving ${b}k + ${a} ≥ ${limit}.`,
        },
        {
          prompt: `Set up an inequality: "Adding ${a} to half of y is not greater than ${b} times y."`,
          correct: `y/2 + ${a} ≤ ${b}y`,
          distractors: [`y/2 + ${a} < ${b}y`, `y/2 + ${a} ≥ ${b}y`, `2y + ${a} ≤ ${b}y`],
          exp: `"Half of y" is y/2 and "not greater than" means ≤, giving y/2 + ${a} ≤ ${b}y.`,
        },
        {
          prompt: `Set up an inequality: "The result of adding ${a} to the square of x exceeds ${limit}."`,
          correct: `x² + ${a} > ${limit}`,
          distractors: [`2x + ${a} > ${limit}`, `x² + ${a} ≥ ${limit}`, `x² − ${a} > ${limit}`],
          exp: `"Square of x" is x² (not 2x) and "exceeds" means strictly greater than (>).`,
        },
      ];
      const item = pick(templates);
      return makeExamQuestion({
        topicId: 'inequalities',
        subSkill: 'ineq_verbal_translate',
        topicLabel: 'Inequalities · Algebraic Translation',
        question: item.prompt,
        correct: item.correct,
        distractors: item.distractors,
        explanation: item.exp,
      });
    },
  },
  {
    subSkill: 'ineq_word_boundary',
    topicId: 'inequalities',
    build: () => {
      if (randInt(0, 1) === 1) {
        const coeff = randInt(3, 6);
        const boundary = randInt(8, 15);
        const cap = coeff * boundary;
        const okVal = boundary - randInt(2, 4);
        const highVal = boundary + 3;
        return makeExamQuestion({
          topicId: 'inequalities',
          subSkill: 'ineq_word_boundary',
          topicLabel: 'Inequalities · Boundary Testing',
          question: `The product of ${coeff} and t is less than ${cap} (written ${coeff}t < ${cap}). Which numbers from the list {${okVal}, ${boundary}, ${highVal}} satisfy the inequality?`,
          correct: `Only ${okVal}`,
          distractors: [
            `Both ${okVal} and ${boundary}`,
            `Only ${boundary}`,
            `Only ${highVal}`,
          ],
          explanation: `${coeff}t < ${cap} means t < ${boundary}. Because it is strict <, t = ${boundary} gives ${cap} < ${cap} (False!). Only ${okVal} satisfies it.`,
        });
      }
      const perGroup = randInt(16, 29);
      const minTotal = 2 * perGroup;
      return makeExamQuestion({
        topicId: 'inequalities',
        subSkill: 'ineq_word_boundary',
        topicLabel: 'Inequalities · Word Inequality',
        question: `Marco divides n stamps evenly into 2 equal groups, and there are AT LEAST ${perGroup} stamps in each group. Which statement is completely accurate about n?`,
        correct: `n is an even integer with n ≥ ${minTotal}`,
        distractors: [
          `n is an odd integer with n ≥ ${minTotal}`,
          `n > ${minTotal} (strictly greater)`,
          `n ≥ ${perGroup}`,
        ],
        explanation: `Divided evenly into 2 groups forces n to be even, and n ÷ 2 ≥ ${perGroup} implies n ≥ ${minTotal}.`,
      });
    },
  },
];

// =====================================================================
// Topic 4: Scale Drawing (4 sub-skills)
// =====================================================================
const SCALE_GENERATORS: SubSkillGenerator[] = [
  {
    subSkill: 'scale_verbal_to_ratio',
    topicId: 'scale',
    build: () => {
      const metres = pick([20, 25, 40, 50, 75, 80, 200]);
      const cmRatio = metres * 100;
      const fmtRatio = `1 : ${cmRatio}`;
      return makeExamQuestion({
        topicId: 'scale',
        subSkill: 'scale_verbal_to_ratio',
        topicLabel: 'Scale Drawing · Map Ratio',
        question: `A city map uses the scale "1 cm represents ${metres} metres". Which ratio is equivalent to this scale?`,
        correct: fmtRatio,
        distractors: [`1 : ${metres}`, `1 : ${metres * 10}`, `1 : ${metres * 1000}`],
        explanation: `Convert both to centimetres: ${metres} m = ${metres} × 100 cm = ${cmRatio} cm, so the ratio is ${fmtRatio}.`,
      });
    },
  },
  {
    subSkill: 'scale_map_to_actual',
    topicId: 'scale',
    build: () => {
      const useMiles = randInt(0, 1) === 1;
      if (useMiles) {
        const milesPerCm = pick([3, 4, 5, 6, 8]);
        const cm = randInt(4, 9);
        const actualMiles = cm * milesPerCm;
        return makeExamQuestion({
          topicId: 'scale',
          subSkill: 'scale_map_to_actual',
          topicLabel: 'Scale Drawing · Map to Real',
          question: `A regional map has scale 1 cm : ${milesPerCm} miles. Town A and Town B are ${cm} cm apart on the map. Find the actual distance WITH correct units.`,
          correct: `${actualMiles} miles`,
          distractors: [`${actualMiles} m`, `${actualMiles} km`, `${cm * 10} miles`],
          explanation: `${cm} cm × ${milesPerCm} miles/cm = ${actualMiles} miles. Always match the scale unit ("miles", not metres!).`,
          diagram: {
            kind: 'scale_map',
            scaleText: `Scale: 1 cm = ${milesPerCm} miles`,
            fromLabel: 'Town A',
            toLabel: 'Town B',
            distanceLabel: `${cm} cm`,
            direction: 'east',
          },
        });
      }
      const mPerCm = pick([40, 50, 80, 100, 120]);
      const halfSteps = pick([2.5, 3.5, 4.5, 5.5]);
      const actualM = Math.round(halfSteps * mPerCm);
      return makeExamQuestion({
        topicId: 'scale',
        subSkill: 'scale_map_to_actual',
        topicLabel: 'Scale Drawing · Decimal Scale',
        question: `On a neighbourhood plan with scale 1 cm represents ${mPerCm} m, two shops sit ${halfSteps} cm apart. What is the actual ground distance?`,
        correct: `${actualM} m`,
        distractors: [`${actualM * 10} m`, `${actualM} cm`, `${Math.round(mPerCm * Math.floor(halfSteps))} m`],
        explanation: `Actual distance = ${halfSteps} × ${mPerCm} m = ${actualM} m.`,
        diagram: {
          kind: 'scale_map',
          scaleText: `Scale: 1 cm = ${mPerCm} m`,
          fromLabel: 'School',
          toLabel: 'Shop',
          distanceLabel: `${halfSteps} cm`,
          direction: 'southeast',
        },
        fallbackNumeric: { base: actualM, unit: ' m' },
      });
    },
  },
  {
    subSkill: 'scale_actual_to_map',
    topicId: 'scale',
    build: () => {
      const kmPerCm = pick([3, 4, 5, 6, 8]);
      const mapCm = randInt(7, 16);
      const actualKm = kmPerCm * mapCm;
      return makeExamQuestion({
        topicId: 'scale',
        subSkill: 'scale_actual_to_map',
        topicLabel: 'Scale Drawing · Real to Map',
        question: `A road map has scale 1 cm : ${kmPerCm} km. Two cities are actually ${actualKm} km apart. How far apart are they drawn on the map?`,
        correct: `${mapCm} cm`,
        distractors: [`${actualKm * kmPerCm} cm`, `${mapCm + 4} cm`, `${mapCm} km`],
        explanation: `Divide actual distance by the scale factor: ${actualKm} km ÷ ${kmPerCm} km/cm = ${mapCm} cm.`,
        fallbackNumeric: { base: mapCm, unit: ' cm' },
      });
    },
  },
  {
    subSkill: 'scale_bearing_compass',
    topicId: 'scale',
    build: () => {
      const kmPerCm = pick([50, 100, 150, 200]);
      const cmDrawn = pick([2.5, 3, 3.5, 4, 4.5]);
      const targetDir = pick<'south' | 'east'>(['south', 'east']);
      const targetKm = kmPerCm * randInt(2, 4);
      const targetCm = roundTo(targetKm / kmPerCm, 1);
      const cdKm = Math.round(kmPerCm * cmDrawn);
      if (randInt(0, 1) === 1) {
        return makeExamQuestion({
          topicId: 'scale',
          subSkill: 'scale_bearing_compass',
          topicLabel: 'Scale Drawing · Compass Map',
          question: `On the scale drawing (1 cm represents ${kmPerCm} km), the segment from Point C to Point D measures ${cmDrawn} cm. What is the actual distance from C to D?`,
          correct: `${cdKm} km`,
          distractors: [`${cdKm * 10} km`, `${cmDrawn} km`, `${cdKm + kmPerCm} km`],
          explanation: `${cmDrawn} cm × ${kmPerCm} km/cm = ${cdKm} km.`,
          diagram: {
            kind: 'scale_map',
            scaleText: `Scale: 1 cm = ${kmPerCm} km`,
            fromLabel: 'C',
            toLabel: 'D',
            distanceLabel: `${cmDrawn} cm`,
            direction: 'southeast',
          },
          fallbackNumeric: { base: cdKm, unit: ' km' },
        });
      }
      const dirWord = targetDir === 'south' ? 'due south (straight down)' : 'due east (straight right)';
      const wrongDir = targetDir === 'south' ? 'north (straight up)' : 'west (straight left)';
      return makeExamQuestion({
        topicId: 'scale',
        subSkill: 'scale_bearing_compass',
        topicLabel: 'Scale Drawing · Direction & Length',
        question: `Using a map scale of 1 cm represents ${kmPerCm} km (North points straight up), how should Point E be plotted if it lies ${targetKm} km due ${targetDir} of C?`,
        correct: `${fmtNum(targetCm)} cm straight ${targetDir === 'south' ? 'down (South)' : 'right (East)'} from C`,
        distractors: [
          `${fmtNum(targetCm)} cm straight ${wrongDir} from C`,
          `${fmtNum(targetCm * 10)} cm straight ${targetDir === 'south' ? 'down (South)' : 'right (East)'} from C`,
          `${targetKm} cm ${dirWord} from C`,
        ],
        explanation: `Map length = ${targetKm} ÷ ${kmPerCm} = ${fmtNum(targetCm)} cm; with N pointing up, due ${targetDir} is straight ${
          targetDir === 'south' ? 'down' : 'to the right'
        }.`,
      });
    },
  },
];

// =====================================================================
// Topic 5: Simple Interest (4 sub-skills)
// =====================================================================
const INTEREST_GENERATORS: SubSkillGenerator[] = [
  {
    subSkill: 'si_interest_only_years',
    topicId: 'interest',
    build: () => {
      const years = pick([2, 2.5, 3, 3.5]);
      const p = pick([400, 500, 600, 800, 1200]);
      const r = pick([4, 5, 6, 8]);
      const interest = roundTo((p * r * years) / 100, 2);
      const totalAmt = p + interest;
      return makeExamQuestion({
        topicId: 'interest',
        subSkill: 'si_interest_only_years',
        topicLabel: 'Simple Interest · Interest Earned',
        question: `Find the SIMPLE INTEREST EARNED ONLY when $${p.toLocaleString(
          'en-US'
        )} is invested at ${r}% simple interest per year for ${years} years.`,
        correct: fmtMoney('$', interest),
        distractors: [
          fmtMoney('$', totalAmt),
          fmtMoney('$', (p * r) / 100),
          fmtMoney('$', interest * 2),
        ],
        explanation: `Simple Interest I = (P × R × T) ÷ 100 = (${p} × ${r} × ${years}) ÷ 100 = ${fmtMoney(
          '$',
          interest
        )}. Notice the question asks for Interest ONLY (not ${fmtMoney('$', totalAmt)}).`,
      });
    },
  },
  {
    subSkill: 'si_interest_only_months',
    topicId: 'interest',
    build: () => {
      const months = pick([6, 9, 18]);
      const p = pick([800, 1200, 1600, 2000, 2400]);
      const r = months === 9 ? pick([4, 8, 12]) : pick([5, 6, 8, 9]);
      const yearsFrac = months / 12;
      const interest = roundTo((p * r * yearsFrac) / 100, 2);
      const totalAmt = roundTo(p + interest, 2);
      const forgotDiv12 = roundTo((p * r * months) / 100, 2);
      return makeExamQuestion({
        topicId: 'interest',
        subSkill: 'si_interest_only_months',
        topicLabel: 'Simple Interest · Time in Months',
        question: `Calculate the SIMPLE INTEREST ONLY when £${p.toLocaleString(
          'en-US'
        )} is invested at ${r}% simple interest per annum for ${months} months.`,
        correct: fmtMoney('£', interest),
        distractors: [
          fmtMoney('£', totalAmt),
          fmtMoney('£', forgotDiv12),
          fmtMoney('£', roundTo((p * r) / 100, 2)),
        ],
        explanation: `Convert ${months} months to years: T = ${months}/12 = ${fmtNum(
          yearsFrac
        )} yr. Interest I = (${p} × ${r} × ${months}/12) ÷ 100 = ${fmtMoney('£', interest)} (do NOT add principal P or forget ÷ 12!).`,
      });
    },
  },
  {
    subSkill: 'si_total_amount_years',
    topicId: 'interest',
    build: () => {
      const r = pick([4.5, 6.5, 7.5, 8.5, 9]);
      const years = pick([2, 3, 4]);
      const p = pick([1000, 2000, 3500, 4000]);
      const interest = roundTo((p * r * years) / 100, 2);
      const total = roundTo(p + interest, 2);
      return makeExamQuestion({
        topicId: 'interest',
        subSkill: 'si_total_amount_years',
        topicLabel: 'Simple Interest · Total Amount',
        question: `Find the FINAL TOTAL AMOUNT repaid when £${p.toLocaleString(
          'en-US'
        )} is invested at ${r}% simple interest per annum for ${years} years.`,
        correct: fmtMoney('£', total),
        distractors: [
          fmtMoney('£', interest),
          fmtMoney('£', p + (p * r) / 100),
          fmtMoney('£', total + 100),
        ],
        explanation: `Interest I = (${p} × ${r} × ${years}) ÷ 100 = ${fmtMoney(
          '£',
          interest
        )}. Final total amount A = Principal + Interest = ${fmtMoney('£', p)} + ${fmtMoney(
          '£',
          interest
        )} = ${fmtMoney('£', total)}.`,
      });
    },
  },
  {
    subSkill: 'si_total_amount_months',
    topicId: 'interest',
    build: () => {
      const cfg = pick([
        { p: 34000, r: 7.8, m: 24 },
        { p: 24000, r: 6.5, m: 18 },
        { p: 800000, r: 10, m: 9 },
        { p: 16000, r: 7.5, m: 18 },
        { p: 50000, r: 8.4, m: 9 },
        { p: 12000, r: 9.5, m: 6 },
      ]);
      const years = cfg.m / 12;
      const interest = roundTo((cfg.p * cfg.r * years) / 100, 2);
      const total = roundTo(cfg.p + interest, 2);
      const forgotYearConv = roundTo(cfg.p + (cfg.p * cfg.r) / 100, 2);
      return makeExamQuestion({
        topicId: 'interest',
        subSkill: 'si_total_amount_months',
        topicLabel: 'Simple Interest · Months & Total',
        question: `Calculate the TOTAL FINAL AMOUNT when $${cfg.p.toLocaleString(
          'en-US'
        )} earns ${cfg.r}% simple interest (p.a.) over ${cfg.m} months.`,
        correct: fmtMoney('$', total),
        distractors: [
          fmtMoney('$', interest),
          fmtMoney('$', forgotYearConv === total ? total + 500 : forgotYearConv),
          fmtMoney('$', roundTo(total - cfg.p * 0.01, 2)),
          fmtMoney('$', roundTo(total + cfg.p * 0.01, 2)),
        ],
        explanation: `T = ${cfg.m}/12 = ${fmtNum(years)} years. Interest I = (${cfg.p.toLocaleString(
          'en-US'
        )} × ${cfg.r} × ${fmtNum(years)}) ÷ 100 = ${fmtMoney(
          '$',
          interest
        )}. Total Amount = P + I = ${fmtMoney('$', total)}.`,
      });
    },
  },
];

const TOPIC_GENERATORS: Record<IgMathG6ExamTopicId, readonly SubSkillGenerator[]> = {
  angles: ANGLES_GENERATORS,
  equations: EQUATIONS_GENERATORS,
  inequalities: INEQUALITIES_GENERATORS,
  scale: SCALE_GENERATORS,
  interest: INTEREST_GENERATORS,
};

function generateDistinctFromSpec(
  spec: SubSkillGenerator,
  forbiddenNormStems: Set<string>
): IgMathG6ExamQuestion {
  let latest = spec.build();
  for (let attempt = 0; attempt < 8; attempt++) {
    const norm = latest.question.trim().toLowerCase();
    if (!forbiddenNormStems.has(norm)) {
      forbiddenNormStems.add(norm);
      return latest;
    }
    latest = spec.build();
  }
  forbiddenNormStems.add(latest.question.trim().toLowerCase());
  return latest;
}

/**
 * Generates a balanced 20-question Grade 6 comprehensive practice paper:
 * 4 distinct sub-skills from each of the 5 topics covered in class.
 */
export function generateIgMathG6ExamPaper(
  excludeStems: readonly string[] = []
): IgMathG6ExamQuestion[] {
  const seenStems = new Set<string>(
    excludeStems.map((s) => s.replace(/\s+/g, ' ').trim().toLowerCase()).filter(Boolean)
  );
  const paper: IgMathG6ExamQuestion[] = [];

  for (const topicMeta of IG_MATH_G6_EXAM_TOPICS) {
    const specs = shuffleLocal(TOPIC_GENERATORS[topicMeta.id]);
    const selectedSpecs = specs.slice(0, 4);
    for (const spec of selectedSpecs) {
      paper.push(generateDistinctFromSpec(spec, seenStems));
    }
  }
  return paper;
}

export function analyzeExamPerformance(
  questions: readonly IgMathG6ExamQuestion[],
  results: readonly { questionId: string; isCorrect: boolean }[]
): ExamDiagnosticReport {
  const resultMap = new Map<string, boolean>();
  for (const r of results) {
    resultMap.set(r.questionId, r.isCorrect);
  }

  let score = 0;
  const total = questions.length;

  const statsMap = new Map<
    IgMathG6ExamTopicId,
    { correct: number; total: number; missedSubSkills: Set<string> }
  >();
  for (const meta of IG_MATH_G6_EXAM_TOPICS) {
    statsMap.set(meta.id, { correct: 0, total: 0, missedSubSkills: new Set<string>() });
  }

  for (const q of questions) {
    const bucket = statsMap.get(q.topicId)!;
    bucket.total += 1;
    const isCorrect = resultMap.get(q.id) === true;
    if (isCorrect) {
      score += 1;
      bucket.correct += 1;
    } else {
      bucket.missedSubSkills.add(q.subSkill);
    }
  }

  const topicStats: ExamTopicStat[] = IG_MATH_G6_EXAM_TOPICS.map((meta) => {
    const b = statsMap.get(meta.id)!;
    const wrongCount = b.total - b.correct;
    const accuracyPct = b.total > 0 ? Math.round((b.correct / b.total) * 100) : 100;
    return {
      topicId: meta.id,
      nameEn: meta.nameEn,
      nameZh: meta.nameZh,
      emoji: meta.emoji,
      correct: b.correct,
      total: b.total,
      wrongCount,
      accuracyPct,
      missedSubSkills: Array.from(b.missedSubSkills),
      tipZh: meta.tipZh,
    };
  });

  const accuracyPct = total > 0 ? Math.round((score / total) * 100) : 0;
  const weakTopicNames = [...topicStats]
    .filter((t) => t.wrongCount > 0)
    .sort((a, b) => b.wrongCount - a.wrongCount || a.accuracyPct - b.accuracyPct)
    .map((t) => `${t.nameEn} (${t.nameZh})`);

  return {
    score,
    total,
    accuracyPct,
    passed80: accuracyPct >= IG_MATH_G6_PASS_THRESHOLD_PCT,
    topicStats,
    weakTopicNames,
  };
}

/**
 * Generates an exact 10-question targeted remediation set focused on the
 * topics and exact sub-skills missed in the 20-question comprehensive exam.
 */
export function generateTargetedRemediationPaper(
  questions: readonly IgMathG6ExamQuestion[],
  results: readonly { questionId: string; isCorrect: boolean }[],
  count: number = IG_MATH_G6_REMEDIATION_SIZE
): {
  questions: IgMathG6ExamQuestion[];
  allocation: RemediationAllocationItem[];
} {
  const diagnostic = analyzeExamPerformance(questions, results);
  const weakTopics = diagnostic.topicStats
    .filter((t) => t.wrongCount > 0)
    .sort((a, b) => b.wrongCount - a.wrongCount || a.accuracyPct - b.accuracyPct);

  const allocationMap = new Map<IgMathG6ExamTopicId, number>();

  if (weakTopics.length === 0) {
    // 100% score bonus mixed drill: 2 per topic = 10
    const baseEach = Math.floor(count / IG_MATH_G6_EXAM_TOPICS.length);
    let rem = count - baseEach * IG_MATH_G6_EXAM_TOPICS.length;
    for (const meta of IG_MATH_G6_EXAM_TOPICS) {
      allocationMap.set(meta.id, baseEach + (rem > 0 ? 1 : 0));
      if (rem > 0) rem -= 1;
    }
  } else {
    // Guarantee >= 1 slot per weak topic (capped at count if weakTopics.length <= count),
    // then distribute remaining slots proportionally by wrongCount using largest remainders.
    const totalWrong = weakTopics.reduce((acc, t) => acc + t.wrongCount, 0);
    const selectedWeak = weakTopics.slice(0, count);
    const floors = new Map<IgMathG6ExamTopicId, number>();
    const remainders: Array<{ topicId: IgMathG6ExamTopicId; frac: number; wrongCount: number }> = [];

    let allocated = 0;
    for (const wt of selectedWeak) {
      const exactShare = (wt.wrongCount / totalWrong) * count;
      const base = Math.max(1, Math.floor(exactShare));
      floors.set(wt.topicId, base);
      allocated += base;
      remainders.push({
        topicId: wt.topicId,
        frac: exactShare - Math.floor(exactShare),
        wrongCount: wt.wrongCount,
      });
    }

    // If minimum-1 guarantees pushed allocated slightly above count (not possible with <=5 topics & count=10), trim gracefully
    while (allocated > count) {
      const trimTarget = [...floors.entries()].sort((a, b) => b[1] - a[1])[0];
      if (!trimTarget || trimTarget[1] <= 1) break;
      floors.set(trimTarget[0], trimTarget[1] - 1);
      allocated -= 1;
    }

    let remaining = count - allocated;
    remainders.sort((a, b) => b.frac - a.frac || b.wrongCount - a.wrongCount);
    let idx = 0;
    while (remaining > 0 && remainders.length > 0) {
      const target = remainders[idx % remainders.length].topicId;
      floors.set(target, (floors.get(target) ?? 0) + 1);
      remaining -= 1;
      idx += 1;
    }

    for (const [tid, c] of floors.entries()) {
      allocationMap.set(tid, c);
    }
  }

  const seenStems = new Set<string>(
    questions.map((q) => q.question.replace(/\s+/g, ' ').trim().toLowerCase())
  );

  const remediationQuestions: IgMathG6ExamQuestion[] = [];
  const allocation: RemediationAllocationItem[] = [];

  for (const stat of diagnostic.topicStats) {
    const quota = allocationMap.get(stat.topicId) ?? 0;
    if (quota <= 0) continue;

    const allSpecs = TOPIC_GENERATORS[stat.topicId];
    const missedSet = new Set(stat.missedSubSkills);
    const prioritizedSpecs = shuffleLocal(
      missedSet.size > 0
        ? allSpecs.filter((s) => missedSet.has(s.subSkill))
        : [...allSpecs]
    );
    const fallbackSpecs = shuffleLocal(
      allSpecs.filter((s) => !missedSet.has(s.subSkill))
    );
    const orderedPool = [...prioritizedSpecs, ...fallbackSpecs];

    for (let i = 0; i < quota; i++) {
      // Cycle primarily through missed sub-skills before spreading into extra sub-skills
      const primaryPool = prioritizedSpecs.length > 0 ? prioritizedSpecs : orderedPool;
      const spec = primaryPool[i % primaryPool.length];
      remediationQuestions.push(generateDistinctFromSpec(spec, seenStems));
    }

    allocation.push({
      topicId: stat.topicId,
      count: quota,
      targetSubSkills: stat.missedSubSkills,
    });
  }

  return {
    questions: remediationQuestions,
    allocation,
  };
}
