import type {
  GradeLevel,
  PracticeDifficulty,
  PracticeQuestion,
  SubjectId,
} from './k12Subjects';

let dynCounter = 0;

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

function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y !== 0) {
    const t = x % y;
    x = y;
    y = t;
  }
  return x || 1;
}

function lcm(a: number, b: number): number {
  return Math.abs(Math.round((a / gcd(a, b)) * b));
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

function buildUniqueOptions(
  correctRaw: string,
  distractorsRaw: readonly string[],
  fallbackNumeric?: { base: number; unit?: string; allowNegative?: boolean }
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
    const offset = step % 2 === 1 ? Math.ceil(step / 2) : -Math.ceil(step / 2);
    let candidate: string;
    if (fallbackNumeric) {
      const val = fallbackNumeric.base + offset * (Math.abs(fallbackNumeric.base) >= 20 ? 2 : 1);
      const safeVal = !fallbackNumeric.allowNegative && val <= 0 ? fallbackNumeric.base + step * 3 : val;
      candidate = `${fmtNum(safeVal)}${fallbackNumeric.unit ?? ''}`;
    } else {
      candidate = `${cleanCorrect} (${step})`;
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

function makeDynQuestion(params: {
  subjectId: SubjectId;
  grade: GradeLevel;
  track?: string;
  difficulty: PracticeDifficulty;
  topic: string;
  slug: string;
  question: string;
  correct: string;
  distractors: readonly string[];
  explanation: string;
  fallbackNumeric?: { base: number; unit?: string; allowNegative?: boolean };
}): PracticeQuestion {
  dynCounter += 1;
  const built = buildUniqueOptions(params.correct, params.distractors, params.fallbackNumeric);
  return {
    id: `dyn_${params.subjectId}_${params.grade}_${params.slug}_${dynCounter}_${Math.random()
      .toString(36)
      .slice(2, 6)}`,
    grade: params.grade,
    ...(params.track ? { track: params.track } : {}),
    difficulty: params.difficulty,
    topic: params.topic.slice(0, 80),
    question: params.question.trim().slice(0, 580),
    options: built.options,
    answer: built.answer,
    explanation: params.explanation.trim(),
    dynamicSource: 'procedural',
  };
}

type GeneratorSpec = {
  slug: string;
  difficulty: PracticeDifficulty;
  build: () => PracticeQuestion;
};

// =====================================================================
// IG Math — Grade 6 (Cambridge Stage 7 / UKMT)
// =====================================================================
const IG_G6_SPECS: GeneratorSpec[] = [
  // Foundation (6)
  {
    slug: 'discount',
    difficulty: 'foundation',
    build: () => {
      const pct = pick([10, 15, 20, 25, 30, 40]);
      const baseUnit =
        pct === 10 || pct === 30 ? 10 : pct === 15 ? 20 : pct === 25 ? 4 : 5;
      const original = baseUnit * randInt(3, 12);
      const off = (original * pct) / 100;
      const sale = original - off;
      const item = pick(['winter jacket', 'backpack', 'graphic novel set', 'scientific calculator', 'tennis racket']);
      return makeDynQuestion({
        subjectId: 'ig-math',
        grade: 'G6',
        difficulty: 'foundation',
        topic: 'Percentages',
        slug: 'discount',
        question: `A $${original} ${item} is marked ${pct}% off during a sale. What is its sale price?`,
        correct: `$${sale}`,
        distractors: [`$${off}`, `$${original - pct}`, `$${sale + 10}`],
        explanation: `${pct}% of $${original} is $${off}, so the sale price is $${original} − $${off} = $${sale}.`,
      });
    },
  },
  {
    slug: 'ratio_simplify',
    difficulty: 'foundation',
    build: () => {
      const pairs: [number, number][] = [[2, 3], [3, 4], [3, 5], [4, 5], [5, 7], [2, 5], [4, 7], [5, 6]];
      const [r1, r2] = pick(pairs);
      const k = randInt(3, 9);
      const a = r1 * k;
      const b = r2 * k;
      return makeDynQuestion({
        subjectId: 'ig-math',
        grade: 'G6',
        difficulty: 'foundation',
        topic: 'Ratios',
        slug: 'ratio_simplify',
        question: `Write the ratio ${a} : ${b} in its simplest integer form.`,
        correct: `${r1} : ${r2}`,
        distractors: [`${r2} : ${r1}`, `${r1 * 2} : ${r2 * 2}`, `${r1 + 1} : ${r2 + 1}`],
        explanation: `The HCF of ${a} and ${b} is ${k}. Dividing both terms by ${k} gives ${r1} : ${r2}.`,
      });
    },
  },
  {
    slug: 'sub_expr',
    difficulty: 'foundation',
    build: () => {
      const m = randInt(2, 6);
      const x = randInt(3, 9);
      const c = randInt(2, 12);
      const isAdd = randInt(0, 1) === 1;
      const ans = isAdd ? m * x + c : m * x - c;
      const sign = isAdd ? '+' : '−';
      return makeDynQuestion({
        subjectId: 'ig-math',
        grade: 'G6',
        difficulty: 'foundation',
        topic: 'Substitution',
        slug: 'sub_expr',
        question: `When n = ${x}, evaluate the algebraic expression ${m}n ${sign} ${c}.`,
        correct: String(ans),
        distractors: [String(m + x + c), String(isAdd ? m * x - c : m * x + c), String((m * 10 + x) + (isAdd ? c : -c))],
        explanation: `Substitute n = ${x}: ${m} × ${x} ${sign} ${c} = ${m * x} ${sign} ${c} = ${ans}.`,
        fallbackNumeric: { base: ans, allowNegative: true },
      });
    },
  },
  {
    slug: 'speed_basic',
    difficulty: 'foundation',
    build: () => {
      const speed = pick([45, 55, 60, 65, 70, 75, 80, 90]);
      const hours = randInt(2, 5);
      const dist = speed * hours;
      return makeDynQuestion({
        subjectId: 'ig-math',
        grade: 'G6',
        difficulty: 'foundation',
        topic: 'Rates',
        slug: 'speed_basic',
        question: `A train travels ${dist} km at a constant speed in ${hours} hours. What is its speed?`,
        correct: `${speed} km/h`,
        distractors: [`${dist * hours} km/h`, `${speed + 10} km/h`, `${Math.max(10, speed - 15)} km/h`],
        explanation: `Speed = Distance ÷ Time = ${dist} ÷ ${hours} = ${speed} km/h.`,
        fallbackNumeric: { base: speed, unit: ' km/h' },
      });
    },
  },
  {
    slug: 'triangle_area',
    difficulty: 'foundation',
    build: () => {
      const b = randInt(3, 10) * 2;
      const h = randInt(4, 15);
      const area = (b * h) / 2;
      return makeDynQuestion({
        subjectId: 'ig-math',
        grade: 'G6',
        difficulty: 'foundation',
        topic: '2D Area',
        slug: 'triangle_area',
        question: `A triangle has base ${b} cm and perpendicular height ${h} cm. Calculate its area.`,
        correct: `${area} cm²`,
        distractors: [`${b * h} cm²`, `${2 * (b + h)} cm²`, `${area + b} cm²`],
        explanation: `Triangle area = (1/2) × base × height = 0.5 × ${b} × ${h} = ${area} cm².`,
        fallbackNumeric: { base: area, unit: ' cm²' },
      });
    },
  },
  {
    slug: 'hcf_lcm_f',
    difficulty: 'foundation',
    build: () => {
      const k = randInt(3, 8);
      const pairs: [number, number][] = [[2, 3], [3, 4], [3, 5], [4, 5], [2, 5]];
      const [p, q] = pick(pairs);
      const a = k * p;
      const b = k * q;
      const askLcm = randInt(0, 1) === 1;
      if (askLcm) {
        const val = lcm(a, b);
        return makeDynQuestion({
          subjectId: 'ig-math',
          grade: 'G6',
          difficulty: 'foundation',
          topic: 'HCF & LCM',
          slug: 'hcf_lcm_f',
          question: `Find the Lowest Common Multiple (LCM) of ${a} and ${b}.`,
          correct: String(val),
          distractors: [String(k), String(a * b), String(val + k)],
          explanation: `Since ${a} = ${k} × ${p} and ${b} = ${k} × ${q}, LCM = ${k} × ${p} × ${q} = ${val}.`,
          fallbackNumeric: { base: val },
        });
      }
      return makeDynQuestion({
        subjectId: 'ig-math',
        grade: 'G6',
        difficulty: 'foundation',
        topic: 'HCF & LCM',
        slug: 'hcf_lcm_f',
        question: `Find the Highest Common Factor (HCF) of ${a} and ${b}.`,
        correct: String(k),
        distractors: [String(lcm(a, b)), String(k * 2), String(Math.max(1, k - 1))],
        explanation: `${a} = ${k} × ${p} and ${b} = ${k} × ${q} with ${p} and ${q} coprime, so HCF = ${k}.`,
        fallbackNumeric: { base: k },
      });
    },
  },
  // Standard (6)
  {
    slug: 'reverse_pct',
    difficulty: 'standard',
    build: () => {
      const pct = pick([10, 20, 25, 30]);
      const original = randInt(4, 15) * 20;
      const sale = (original * (100 - pct)) / 100;
      return makeDynQuestion({
        subjectId: 'ig-math',
        grade: 'G6',
        difficulty: 'standard',
        topic: 'Reverse Percentages',
        slug: 'reverse_pct',
        question: `After a ${pct}% discount, a tablet costs $${sale}. What was its original price before the discount?`,
        correct: `$${original}`,
        distractors: [
          `$${Math.round(sale * (1 + pct / 100))}`,
          `$${sale + pct}`,
          `$${original + 20}`,
        ],
        explanation: `The sale price is ${100 - pct}% of original, so Original = $${sale} ÷ ${((100 - pct) / 100).toFixed(2)} = $${original}.`,
        fallbackNumeric: { base: original },
      });
    },
  },
  {
    slug: 'ratio_diff',
    difficulty: 'standard',
    build: () => {
      const ratios: [number, number][] = [[3, 5], [2, 7], [3, 8], [4, 7], [5, 8]];
      const [r1, r2] = pick(ratios);
      const unit = randInt(4, 15);
      const total = (r1 + r2) * unit;
      const diff = (r2 - r1) * unit;
      return makeDynQuestion({
        subjectId: 'ig-math',
        grade: 'G6',
        difficulty: 'standard',
        topic: 'Ratio Sharing',
        slug: 'ratio_diff',
        question: `${total} stickers are shared between Leo and Maya in the ratio ${r1} : ${r2}. How many MORE stickers does Maya get than Leo?`,
        correct: String(diff),
        distractors: [String(r2 * unit), String(r1 * unit), String(diff + unit)],
        explanation: `Total parts = ${r1} + ${r2} = ${r1 + r2}, so 1 part = ${total} ÷ ${r1 + r2} = ${unit}. Difference = (${r2} − ${r1}) × ${unit} = ${diff}.`,
        fallbackNumeric: { base: diff },
      });
    },
  },
  {
    slug: 'two_side_eq',
    difficulty: 'standard',
    build: () => {
      const a = randInt(4, 8);
      const c = randInt(1, a - 1);
      const x = randInt(2, 9);
      const b = randInt(1, 15);
      const d = (a - c) * x + b;
      return makeDynQuestion({
        subjectId: 'ig-math',
        grade: 'G6',
        difficulty: 'standard',
        topic: 'Linear Equations',
        slug: 'two_side_eq',
        question: `Solve for x: ${a}x + ${b} = ${c}x + ${d}.`,
        correct: `x = ${x}`,
        distractors: [`x = ${x + 2}`, `x = ${Math.max(1, x - 1)}`, `x = ${Math.round((d + b) / (a + c))}`],
        explanation: `Subtract ${c}x and ${b} from both sides: ${a - c}x = ${d - b}, so x = ${d - b} ÷ ${a - c} = ${x}.`,
      });
    },
  },
  {
    slug: 'circle_exact',
    difficulty: 'standard',
    build: () => {
      const r = randInt(3, 12);
      const askArea = randInt(0, 1) === 1;
      if (askArea) {
        const areaCoeff = r * r;
        return makeDynQuestion({
          subjectId: 'ig-math',
          grade: 'G6',
          difficulty: 'standard',
          topic: 'Circles',
          slug: 'circle_exact',
          question: `A circular garden pond has radius ${r} m. Express its exact area in terms of π.`,
          correct: `${areaCoeff}π m²`,
          distractors: [`${2 * r}π m²`, `${r}π m²`, `${2 * areaCoeff}π m²`],
          explanation: `Area = πr² = π × ${r}² = ${areaCoeff}π m².`,
        });
      }
      const circCoeff = 2 * r;
      return makeDynQuestion({
        subjectId: 'ig-math',
        grade: 'G6',
        difficulty: 'standard',
        topic: 'Circles',
        slug: 'circle_exact',
        question: `A circular track has diameter ${circCoeff} m. Express its exact circumference in terms of π.`,
        correct: `${circCoeff}π m`,
        distractors: [`${r * r}π m`, `${r}π m`, `${4 * r}π m`],
        explanation: `Circumference C = πd = ${circCoeff}π m.`,
      });
    },
  },
  {
    slug: 'cuboid_vol_sa',
    difficulty: 'standard',
    build: () => {
      const l = randInt(4, 10);
      const w = randInt(3, 7);
      const h = randInt(2, 6);
      const askSA = randInt(0, 1) === 1;
      const sa = 2 * (l * w + l * h + w * h);
      const vol = l * w * h;
      if (askSA) {
        return makeDynQuestion({
          subjectId: 'ig-math',
          grade: 'G6',
          difficulty: 'standard',
          topic: '3D Prisms',
          slug: 'cuboid_vol_sa',
          question: `A closed rectangular box measures ${l} cm × ${w} cm × ${h} cm. Calculate its total surface area.`,
          correct: `${sa} cm²`,
          distractors: [`${vol} cm²`, `${sa / 2} cm²`, `${sa + 2 * l} cm²`],
          explanation: `Surface area = 2(${l}×${w} + ${l}×${h} + ${w}×${h}) = 2(${l * w} + ${l * h} + ${w * h}) = ${sa} cm².`,
          fallbackNumeric: { base: sa, unit: ' cm²' },
        });
      }
      return makeDynQuestion({
        subjectId: 'ig-math',
        grade: 'G6',
        difficulty: 'standard',
        topic: '3D Prisms',
        slug: 'cuboid_vol_sa',
        question: `A rectangular prism tank has length ${l} cm, width ${w} cm, and height ${h} cm. Find its volume.`,
        correct: `${vol} cm³`,
        distractors: [`${sa} cm³`, `${l + w + h} cm³`, `${vol + w * h} cm³`],
        explanation: `Volume = ${l} × ${w} × ${h} = ${vol} cm³.`,
        fallbackNumeric: { base: vol, unit: ' cm³' },
      });
    },
  },
  {
    slug: 'missing_mean',
    difficulty: 'standard',
    build: () => {
      const a = randInt(10, 20);
      const b = randInt(12, 24);
      const c = randInt(14, 26);
      const x = randInt(11, 29);
      const sum = a + b + c + x;
      const rem = sum % 4;
      const adjX = x + (rem === 0 ? 0 : 4 - rem);
      const mean = (a + b + c + adjX) / 4;
      return makeDynQuestion({
        subjectId: 'ig-math',
        grade: 'G6',
        difficulty: 'standard',
        topic: 'Mean & Statistics',
        slug: 'missing_mean',
        question: `Four quiz scores are ${a}, ${b}, ${c}, and x. Their mean is ${mean}. Find the value of x.`,
        correct: String(adjX),
        distractors: [String(mean), String(Math.max(1, adjX - 4)), String(adjX + 4)],
        explanation: `Total sum of 4 scores = 4 × ${mean} = ${4 * mean}. So x = ${4 * mean} − (${a} + ${b} + ${c}) = ${adjX}.`,
        fallbackNumeric: { base: adjX },
      });
    },
  },
  // Challenge (6)
  {
    slug: 'successive_pct',
    difficulty: 'challenge',
    build: () => {
      const p = pick([10, 20, 25]);
      const q = pick([10, 20, 30]);
      const net = roundTo((1 + p / 100) * (1 - q / 100) * 100 - 100, 2);
      const ansStr = net === 0 ? '0% (no overall change)' : `${net > 0 ? '+' : ''}${fmtNum(net)}%`;
      const naive = p - q;
      const naiveStr = naive === 0 ? '0% (no overall change)' : `${naive > 0 ? '+' : ''}${naive}%`;
      return makeDynQuestion({
        subjectId: 'ig-math',
        grade: 'G6',
        difficulty: 'challenge',
        topic: 'Compound Percentages',
        slug: 'successive_pct',
        question: `A backpack's price is raised by ${p}%, then lowered by ${q}% from the new price. What is the net percentage change from the original price?`,
        correct: ansStr,
        distractors: [
          naiveStr,
          `${fmtNum(roundTo(net - 2, 2))}%`,
          `${net > 0 ? '-' : '+'}${Math.abs(net) || 5}%`,
        ],
        explanation: `Multiplier = ${(1 + p / 100).toFixed(2)} × ${(1 - q / 100).toFixed(2)} = ${roundTo(
          (1 + p / 100) * (1 - q / 100),
          4
        )}, which gives a net change of ${fmtNum(net)}%.`,
      });
    },
  },
  {
    slug: 'nth_term',
    difficulty: 'challenge',
    build: () => {
      const d = randInt(3, 8);
      const b = randInt(-3, 9);
      const t1 = d + b;
      const t2 = 2 * d + b;
      const t3 = 3 * d + b;
      const t4 = 4 * d + b;
      const k = pick([15, 20, 25, 30]);
      const tk = d * k + b;
      return makeDynQuestion({
        subjectId: 'ig-math',
        grade: 'G6',
        difficulty: 'challenge',
        topic: 'Sequences',
        slug: 'nth_term',
        question: `Find the ${k}th term of the arithmetic sequence ${t1}, ${t2}, ${t3}, ${t4}, ...`,
        correct: String(tk),
        distractors: [String(tk + d), String(tk - d), String(t1 * k)],
        explanation: `Common difference = ${d}, so nth term = ${d}n ${b >= 0 ? `+ ${b}` : `− ${Math.abs(b)}`}. At n = ${k}: ${d}×${k} ${b >= 0 ? `+ ${b}` : `− ${Math.abs(b)}`} = ${tk}.`,
        fallbackNumeric: { base: tk },
      });
    },
  },
  {
    slug: 'shaded_frame',
    difficulty: 'challenge',
    build: () => {
      const outerL = randInt(10, 18);
      const outerW = randInt(8, 14);
      const cutL = randInt(3, outerL - 4);
      const cutW = randInt(2, outerW - 4);
      const area = outerL * outerW - cutL * cutW;
      return makeDynQuestion({
        subjectId: 'ig-math',
        grade: 'G6',
        difficulty: 'challenge',
        topic: 'Composite Area',
        slug: 'shaded_frame',
        question: `A rectangular metal sheet measures ${outerL} cm by ${outerW} cm. A smaller ${cutL} cm by ${cutW} cm rectangle is punched out of its center. What area remains?`,
        correct: `${area} cm²`,
        distractors: [
          `${outerL * outerW + cutL * cutW} cm²`,
          `${outerL * outerW} cm²`,
          `${area - cutL} cm²`,
        ],
        explanation: `Remaining area = ${outerL}×${outerW} − ${cutL}×${cutW} = ${outerL * outerW} − ${cutL * cutW} = ${area} cm².`,
        fallbackNumeric: { base: area, unit: ' cm²' },
      });
    },
  },
  {
    slug: 'rect_alg_area',
    difficulty: 'challenge',
    build: () => {
      const w = randInt(5, 13);
      const extra = randInt(3, 9);
      const l = w + extra;
      const perim = 2 * (l + w);
      const area = l * w;
      return makeDynQuestion({
        subjectId: 'ig-math',
        grade: 'G6',
        difficulty: 'challenge',
        topic: 'Algebra & Geometry',
        slug: 'rect_alg_area',
        question: `A rectangle is ${extra} cm longer than it is wide, and its perimeter is ${perim} cm. Find its area.`,
        correct: `${area} cm²`,
        distractors: [`${area + perim} cm²`, `${(perim / 4) * (perim / 4)} cm²`, `${w * extra} cm²`],
        explanation: `Half-perimeter = ${perim / 2} = w + (w + ${extra}), giving w = ${w} cm and length = ${l} cm. Area = ${l} × ${w} = ${area} cm².`,
        fallbackNumeric: { base: area, unit: ' cm²' },
      });
    },
  },
  {
    slug: 'ratio_transfer',
    difficulty: 'challenge',
    build: () => {
      // A starts with 3k, B starts with 2k; A gives g to B -> ratio becomes 1 : 1 (3k-g = 2k+g -> k=2g)
      const g = randInt(4, 14);
      const k = 2 * g;
      const startA = 3 * k;
      const startB = 2 * k;
      const total = startA + startB;
      return makeDynQuestion({
        subjectId: 'ig-math',
        grade: 'G6',
        difficulty: 'challenge',
        topic: 'UKMT Ratio Logic',
        slug: 'ratio_transfer',
        question: `Ava and Ben have marbles in the ratio 3 : 2. After Ava gives ${g} marbles to Ben, they both have the exact same number of marbles. How many marbles do they have IN TOTAL?`,
        correct: String(total),
        distractors: [String(startA), String(total / 2), String(total + k)],
        explanation: `Initially Ava has 3/5 and Ben has 2/5. Transferring ${g} marbles equals 1/10 of the total (from 3/5 to 5/10), so total = 10 × ${g} = ${total}.`,
        fallbackNumeric: { base: total },
      });
    },
  },
  {
    slug: 'hcf_lcm_id',
    difficulty: 'challenge',
    build: () => {
      const k = randInt(4, 9);
      const [p, q] = pick<[number, number]>([[3, 4], [3, 5], [4, 5], [5, 7], [2, 5]]);
      const a = k * p;
      const b = k * q;
      const l = lcm(a, b);
      return makeDynQuestion({
        subjectId: 'ig-math',
        grade: 'G6',
        difficulty: 'challenge',
        topic: 'HCF × LCM Identity',
        slug: 'hcf_lcm_id',
        question: `Two positive integers have HCF = ${k} and LCM = ${l}. If one of the integers is ${a}, what is the other integer?`,
        correct: String(b),
        distractors: [String(l / p), String(k * q + k), String(a + k)],
        explanation: `Using Product = HCF × LCM: ${a} × b = ${k} × ${l}, so b = (${k} × ${l}) ÷ ${a} = ${b}.`,
        fallbackNumeric: { base: b },
      });
    },
  },
];

// =====================================================================
// IG Math — Grade 7 (Cambridge Stage 8 / AMC 8)
// =====================================================================
const IG_G7_SPECS: GeneratorSpec[] = [
  // Foundation (5)
  {
    slug: 'indices_law',
    difficulty: 'foundation',
    build: () => {
      const p1 = randInt(4, 9);
      const p2 = randInt(2, 6);
      const p3 = randInt(2, p1 + p2 - 2);
      const ansExp = p1 + p2 - p3;
      return makeDynQuestion({
        subjectId: 'ig-math',
        grade: 'G7',
        difficulty: 'foundation',
        topic: 'Laws of Indices',
        slug: 'indices_law',
        question: `Simplify (x^${p1} × x^${p2}) ÷ x^${p3} into a single power of x.`,
        correct: `x^${ansExp}`,
        distractors: [
          `x^${p1 + p2 + p3}`,
          `x^${p1 * p2 - p3}`,
          `x^${Math.max(1, ansExp + 2)}`,
        ],
        explanation: `Add exponents when multiplying and subtract when dividing: ${p1} + ${p2} − ${p3} = ${ansExp}, giving x^${ansExp}.`,
      });
    },
  },
  {
    slug: 'expand_linear',
    difficulty: 'foundation',
    build: () => {
      const a = randInt(2, 5);
      const b = randInt(1, 4);
      const c = randInt(2, 6);
      const d = randInt(2, 4);
      const e = randInt(1, 3);
      const f = randInt(1, 5);
      const xCoeff = a * b + d * e;
      const constTerm = a * c - d * f;
      const correct =
        constTerm === 0
          ? `${xCoeff}x`
          : constTerm > 0
            ? `${xCoeff}x + ${constTerm}`
            : `${xCoeff}x − ${Math.abs(constTerm)}`;
      return makeDynQuestion({
        subjectId: 'ig-math',
        grade: 'G7',
        difficulty: 'foundation',
        topic: 'Expanding Brackets',
        slug: 'expand_linear',
        question: `Expand and simplify ${a}(${b === 1 ? '' : b}x + ${c}) + ${d}(${e === 1 ? '' : e}x − ${f}).`,
        correct,
        distractors: [
          `${xCoeff}x + ${a * c + d * f}`,
          `${a * b + d * e}x ${c - f >= 0 ? `+ ${c - f}` : `− ${Math.abs(c - f)}`}`,
          `${xCoeff + 2}x + ${Math.abs(constTerm) + 1}`,
        ],
        explanation: `Expand both brackets: ${a * b}x + ${a * c} + ${d * e}x − ${d * f} = ${correct}.`,
      });
    },
  },
  {
    slug: 'gradient_2pts',
    difficulty: 'foundation',
    build: () => {
      const m = pick([-3, -2, 2, 3, 4, 5]);
      const x1 = randInt(1, 4);
      const dx = randInt(2, 5);
      const x2 = x1 + dx;
      const y1 = randInt(-3, 5);
      const y2 = y1 + m * dx;
      return makeDynQuestion({
        subjectId: 'ig-math',
        grade: 'G7',
        difficulty: 'foundation',
        topic: 'Linear Gradient',
        slug: 'gradient_2pts',
        question: `Find the gradient (slope) of the straight line passing through A(${x1}, ${fmtSigned(
          y1
        )}) and B(${x2}, ${fmtSigned(y2)}).`,
        correct: fmtSigned(m),
        distractors: [fmtSigned(-m), fmtSigned(dx), `1/${Math.abs(m)}`],
        explanation: `Gradient m = (y₂ − y₁) ÷ (x₂ − x₁) = (${y2} − (${y1})) ÷ (${x2} − ${x1}) = ${y2 - y1} ÷ ${dx} = ${fmtSigned(m)}.`,
        fallbackNumeric: { base: m, allowNegative: true },
      });
    },
  },
  {
    slug: 'polygon_sum',
    difficulty: 'foundation',
    build: () => {
      const n = randInt(5, 10);
      const names: Record<number, string> = {
        5: 'pentagon',
        6: 'hexagon',
        7: 'heptagon',
        8: 'octagon',
        9: 'nonagon',
        10: 'decagon',
      };
      const sum = (n - 2) * 180;
      return makeDynQuestion({
        subjectId: 'ig-math',
        grade: 'G7',
        difficulty: 'foundation',
        topic: 'Polygon Angles',
        slug: 'polygon_sum',
        question: `Calculate the sum of all interior angles of a ${n}-sided polygon (${names[n]}).`,
        correct: `${sum}°`,
        distractors: [`${n * 180}°`, `${(n - 1) * 180}°`, `360°`],
        explanation: `Interior angle sum = (n − 2) × 180° = (${n} − 2) × 180° = ${sum}°.`,
        fallbackNumeric: { base: sum, unit: '°' },
      });
    },
  },
  {
    slug: 'std_form',
    difficulty: 'foundation',
    build: () => {
      const a = randInt(2, 9);
      const b = randInt(1, 9);
      const exp = randInt(4, 7);
      const num = Number(`${a}.${b}`) * Math.pow(10, exp);
      const formatted = Math.round(num).toLocaleString('en-US');
      return makeDynQuestion({
        subjectId: 'ig-math',
        grade: 'G7',
        difficulty: 'foundation',
        topic: 'Standard Form',
        slug: 'std_form',
        question: `Express ${formatted} in standard form (scientific notation) a × 10^n with 1 ≤ a < 10.`,
        correct: `${a}.${b} × 10^${exp}`,
        distractors: [
          `${a}.${b} × 10^${exp - 1}`,
          `${a}${b} × 10^${exp - 1}`,
          `${a}.${b} × 10^${exp + 1}`,
        ],
        explanation: `Moving the decimal point ${exp} places left gives ${a}.${b} × 10^${exp}.`,
      });
    },
  },
  // Standard (5)
  {
    slug: 'simul_eq',
    difficulty: 'standard',
    build: () => {
      const x = randInt(2, 8);
      const y = randInt(1, 7);
      const k = randInt(2, 4);
      const s = x + y;
      const d = k * x - y;
      const askX = randInt(0, 1) === 1;
      const ans = askX ? x : y;
      const targetVar = askX ? 'x' : 'y';
      return makeDynQuestion({
        subjectId: 'ig-math',
        grade: 'G7',
        difficulty: 'standard',
        topic: 'Simultaneous Equations',
        slug: 'simul_eq',
        question: `Solve the simultaneous equations: x + y = ${s} and ${k}x − y = ${d}. What is the value of ${targetVar}?`,
        correct: String(ans),
        distractors: [String(askX ? y : x), String(ans + 2), String(Math.max(0, ans - 1))],
        explanation: `Add both equations: (${k + 1})x = ${s + d}, giving x = ${x} and y = ${s} − ${x} = ${y}.`,
        fallbackNumeric: { base: ans, allowNegative: true },
      });
    },
  },
  {
    slug: 'pythagoras_triple',
    difficulty: 'standard',
    build: () => {
      const triples: [number, number, number][] = [[3, 4, 5], [5, 12, 13], [8, 15, 17]];
      const [ta, tb, tc] = pick(triples);
      const k = randInt(1, 4);
      const a = ta * k;
      const b = tb * k;
      const c = tc * k;
      const findHyp = randInt(0, 1) === 1;
      if (findHyp) {
        return makeDynQuestion({
          subjectId: 'ig-math',
          grade: 'G7',
          difficulty: 'standard',
          topic: 'Pythagoras Theorem',
          slug: 'pythagoras_triple',
          question: `A right-angled triangle has two shorter perpendicular legs measuring ${a} cm and ${b} cm. Find its hypotenuse.`,
          correct: `${c} cm`,
          distractors: [`${a + b} cm`, `${c + 2} cm`, `${Math.max(1, c - 2)} cm`],
          explanation: `By Pythagoras' theorem, c² = ${a}² + ${b}² = ${a * a + b * b}, so c = √${c * c} = ${c} cm.`,
          fallbackNumeric: { base: c, unit: ' cm' },
        });
      }
      return makeDynQuestion({
        subjectId: 'ig-math',
        grade: 'G7',
        difficulty: 'standard',
        topic: 'Pythagoras Theorem',
        slug: 'pythagoras_triple',
        question: `A right-angled triangle has hypotenuse ${c} cm and one shorter leg ${a} cm. Find the missing leg length.`,
        correct: `${b} cm`,
        distractors: [`${c - a} cm`, `${c + a} cm`, `${b + 3} cm`],
        explanation: `b² = ${c}² − ${a}² = ${c * c} − ${a * a} = ${b * b}, so b = ${b} cm.`,
        fallbackNumeric: { base: b, unit: ' cm' },
      });
    },
  },
  {
    slug: 'linear_graph',
    difficulty: 'standard',
    build: () => {
      const m = pick([-3, -2, 2, 3, 4]);
      const c = randInt(-6, 8);
      const x = randInt(2, 6);
      const y = m * x + c;
      const cStr = c === 0 ? '' : c > 0 ? ` + ${c}` : ` − ${Math.abs(c)}`;
      return makeDynQuestion({
        subjectId: 'ig-math',
        grade: 'G7',
        difficulty: 'standard',
        topic: 'Linear Graphs y=mx+c',
        slug: 'linear_graph',
        question: `Point P(${x}, k) lies on the line y = ${m}x${cStr}. Find the value of k.`,
        correct: fmtSigned(y),
        distractors: [fmtSigned(m * x - c), fmtSigned(y + m), fmtSigned(x + c)],
        explanation: `Substitute x = ${x} into y = ${m}x${cStr}: y = ${m}(${x})${cStr} = ${fmtSigned(y)}.`,
        fallbackNumeric: { base: y, allowNegative: true },
      });
    },
  },
  {
    slug: 'compound_growth',
    difficulty: 'standard',
    build: () => {
      const p = pick([5, 10, 20]);
      const principal = p === 5 ? randInt(1, 5) * 400 : randInt(2, 8) * 100;
      const finalVal = roundTo(principal * Math.pow(1 + p / 100, 2), 2);
      const simpleVal = principal + (2 * principal * p) / 100;
      return makeDynQuestion({
        subjectId: 'ig-math',
        grade: 'G7',
        difficulty: 'standard',
        topic: 'Compound Percentages',
        slug: 'compound_growth',
        question: `A wildlife population starts at ${principal} birds and grows by ${p}% compound each year for 2 years. How many birds are there after 2 years?`,
        correct: fmtNum(finalVal),
        distractors: [fmtNum(simpleVal), fmtNum(principal * (1 + p / 100)), fmtNum(finalVal + p)],
        explanation: `After 2 years: ${principal} × (${(1 + p / 100).toFixed(2)})² = ${fmtNum(finalVal)}.`,
        fallbackNumeric: { base: Math.round(finalVal) },
      });
    },
  },
  {
    slug: 'map_scale',
    difficulty: 'standard',
    build: () => {
      const kmPerCm = pick([2, 3, 4, 5, 8]);
      const scaleDenominator = kmPerCm * 100_000;
      const cm = randInt(4, 15);
      const km = cm * kmPerCm;
      return makeDynQuestion({
        subjectId: 'ig-math',
        grade: 'G7',
        difficulty: 'standard',
        topic: 'Scale & Proportion',
        slug: 'map_scale',
        question: `A trail map uses the scale 1 : ${scaleDenominator.toLocaleString('en-US')}. Two viewpoints are ${cm} cm apart on the map. What is the real distance in km?`,
        correct: `${km} km`,
        distractors: [`${km * 10} km`, `${fmtNum(cm / kmPerCm)} km`, `${km + kmPerCm} km`],
        explanation: `1 cm = ${scaleDenominator / 100_000} km = ${kmPerCm} km, so ${cm} cm represents ${cm} × ${kmPerCm} = ${km} km.`,
        fallbackNumeric: { base: km, unit: ' km' },
      });
    },
  },
  // Challenge (5)
  {
    slug: 'diff_squares_trick',
    difficulty: 'challenge',
    build: () => {
      const a = randInt(25, 65);
      const b = randInt(5, 19);
      const ans = a * a - b * b;
      return makeDynQuestion({
        subjectId: 'ig-math',
        grade: 'G7',
        difficulty: 'challenge',
        topic: 'Algebraic Identities',
        slug: 'diff_squares_trick',
        question: `Without long multiplication, compute ${a + b} × ${a - b} using a² − b².`,
        correct: String(ans),
        distractors: [String(a * a + b * b), String(ans - b), String(ans + a)],
        explanation: `(${a} + ${b})(${a} − ${b}) = ${a}² − ${b}² = ${a * a} − ${b * b} = ${ans}.`,
        fallbackNumeric: { base: ans },
      });
    },
  },
  {
    slug: 'pyth_area',
    difficulty: 'challenge',
    build: () => {
      const k = randInt(1, 3);
      const halfD1 = 3 * k;
      const halfD2 = 4 * k;
      const side = 5 * k;
      const area = 2 * halfD1 * halfD2; // (d1*d2)/2 = (2*halfD1 * 2*halfD2)/2
      return makeDynQuestion({
        subjectId: 'ig-math',
        grade: 'G7',
        difficulty: 'challenge',
        topic: 'AMC 8 Geometry',
        slug: 'pyth_area',
        question: `A rhombus has diagonals of length ${2 * halfD1} cm and ${2 * halfD2} cm. What is its perimeter?`,
        correct: `${4 * side} cm`,
        distractors: [`${area} cm`, `${4 * (halfD1 + halfD2)} cm`, `${4 * side + 8} cm`],
        explanation: `Diagonals bisect perpendicularly into half-diagonals ${halfD1} cm and ${halfD2} cm. Each side = √(${halfD1}² + ${halfD2}²) = ${side} cm, so perimeter = 4 × ${side} = ${4 * side} cm.`,
        fallbackNumeric: { base: 4 * side, unit: ' cm' },
      });
    },
  },
  {
    slug: 'simul_word',
    difficulty: 'challenge',
    build: () => {
      const adultPrice = randInt(12, 20);
      const childPrice = randInt(6, adultPrice - 3);
      const adults = randInt(3, 8);
      const children = randInt(4, 9);
      const totalTickets = adults + children;
      const totalCost = adults * adultPrice + children * childPrice;
      return makeDynQuestion({
        subjectId: 'ig-math',
        grade: 'G7',
        difficulty: 'challenge',
        topic: 'Systems Modeling',
        slug: 'simul_word',
        question: `Museum tickets cost $${adultPrice} for adults and $${childPrice} for children. A group bought ${totalTickets} tickets and paid $${totalCost} in total. How many ADULT tickets did they buy?`,
        correct: String(adults),
        distractors: [String(children), String(adults + 2), String(Math.max(1, adults - 1))],
        explanation: `If all ${totalTickets} were child tickets, cost = $${totalTickets * childPrice}. Extra paid = $${totalCost - totalTickets * childPrice}, divided by ($${adultPrice} − $${childPrice}) gives ${adults} adult tickets.`,
        fallbackNumeric: { base: adults },
      });
    },
  },
  {
    slug: 'inequality_int',
    difficulty: 'challenge',
    build: () => {
      const a = randInt(3, 6);
      const xMax = randInt(3, 9);
      const b = randInt(2, 8);
      // Inequality: a*x - b < a*(xMax + 1) - b - 1 -> x < xMax + (a-1)/a => largest integer is xMax
      const rhs = a * (xMax + 1) - b - 1;
      return makeDynQuestion({
        subjectId: 'ig-math',
        grade: 'G7',
        difficulty: 'challenge',
        topic: 'Linear Inequalities',
        slug: 'inequality_int',
        question: `What is the LARGEST integer x that satisfies the inequality ${a}x − ${b} < ${rhs}?`,
        correct: String(xMax),
        distractors: [String(xMax + 1), String(xMax - 1), String(xMax + 2)],
        explanation: `${a}x < ${rhs + b}, so x < ${(rhs + b) / a}. Since ${xMax} < ${roundTo((rhs + b) / a, 2)} < ${xMax + 1}, the largest integer is ${xMax}.`,
        fallbackNumeric: { base: xMax },
      });
    },
  },
  {
    slug: 'tree_prob',
    difficulty: 'challenge',
    build: () => {
      const r = randInt(3, 6);
      const b = randInt(3, 6);
      const n = r + b;
      const num = r * (r - 1);
      const den = n * (n - 1);
      const g = gcd(num, den);
      const simpNum = num / g;
      const simpDen = den / g;
      const withRepG = gcd(r * r, n * n);
      return makeDynQuestion({
        subjectId: 'ig-math',
        grade: 'G7',
        difficulty: 'challenge',
        topic: 'Tree Probability',
        slug: 'tree_prob',
        question: `A pouch holds ${r} red tokens and ${b} blue tokens. Two tokens are drawn at random WITHOUT replacement. What is the probability BOTH are red?`,
        correct: `${simpNum}/${simpDen}`,
        distractors: [
          `${(r * r) / withRepG}/${(n * n) / withRepG}`,
          `${r}/${n}`,
          `${Math.min(simpDen - 1, simpNum + 1)}/${simpDen}`,
        ],
        explanation: `First draw P(Red) = ${r}/${n}; second draw without replacement P(Red) = ${r - 1}/${n - 1}. Multiply: (${r}×${r - 1})/(${n}×${n - 1}) = ${simpNum}/${simpDen}.`,
      });
    },
  },
];

// =====================================================================
// Shanghai Math — Grade 6 (沪教版五四制)
// =====================================================================
const SH_G6_SPECS: GeneratorSpec[] = [
  // Foundation (6)
  {
    slug: 'sh6_gcd_lcm',
    difficulty: 'foundation',
    build: () => {
      const k = randInt(3, 9);
      const [p, q] = pick<[number, number]>([[2, 3], [3, 4], [3, 5], [4, 5], [2, 5]]);
      const a = k * p;
      const b = k * q;
      const g = gcd(a, b);
      const l = lcm(a, b);
      return makeDynQuestion({
        subjectId: 'shanghai-math',
        grade: 'G6',
        difficulty: 'foundation',
        topic: '公因数与公倍数',
        slug: 'sh6_gcd_lcm',
        question: `求正整数 ${a} 和 ${b} 的最大公因数与最小公倍数，正确的组合是哪一项？`,
        correct: `最大公因数 ${g}，最小公倍数 ${l}`,
        distractors: [
          `最大公因数 ${g * 2}，最小公倍数 ${l}`,
          `最大公因数 ${g}，最小公倍数 ${a * b}`,
          `最大公因数 ${p}，最小公倍数 ${l / 2}`,
        ],
        explanation: `${a} = ${g} × ${p}，${b} = ${g} × ${q}，两数最大公因数为 ${g}，最小公倍数为 ${g} × ${p} × ${q} = ${l}。`,
      });
    },
  },
  {
    slug: 'sh6_frac_rem',
    difficulty: 'foundation',
    build: () => {
      const parts: [number, number][] = [[2, 5], [3, 5], [3, 8], [5, 8], [2, 7], [3, 7]];
      const [num, den] = pick(parts);
      const total = den * randInt(3, 8);
      const used = (total / den) * num;
      const left = total - used;
      return makeDynQuestion({
        subjectId: 'shanghai-math',
        grade: 'G6',
        difficulty: 'foundation',
        topic: '分数应用',
        slug: 'sh6_frac_rem',
        question: `一卷电线长 ${total} 米，先用去了全长的 ${num}/${den}，这卷电线还剩下多少米？`,
        correct: `${left} 米`,
        distractors: [`${used} 米`, `${total - num} 米`, `${left + den} 米`],
        explanation: `剩余占比为 1 − ${num}/${den} = ${den - num}/${den}，因此还剩 ${total} × ${den - num}/${den} = ${left} 米。`,
        fallbackNumeric: { base: left, unit: ' 米' },
      });
    },
  },
  {
    slug: 'sh6_proportion',
    difficulty: 'foundation',
    build: () => {
      const a = randInt(2, 7);
      const x = randInt(3, 12);
      const k = randInt(2, 5);
      const b = a * k;
      const c = x * k;
      return makeDynQuestion({
        subjectId: 'shanghai-math',
        grade: 'G6',
        difficulty: 'foundation',
        topic: '解比例',
        slug: 'sh6_proportion',
        question: `如果比例式 ${a} : x = ${b} : ${c} 成立，那么未知数 x 的值是多少？`,
        correct: String(x),
        distractors: [String(x * k), String(x + 2), String(Math.max(1, x - 1))],
        explanation: `根据比例基本性质“外项积等于内项积”：${b}x = ${a} × ${c} = ${a * c}，解得 x = ${x}。`,
        fallbackNumeric: { base: x },
      });
    },
  },
  {
    slug: 'sh6_unit_ratio',
    difficulty: 'foundation',
    build: () => {
      const mins = pick([15, 20, 24, 30, 40, 45]);
      const hours = randInt(1, 3);
      const totalMin = hours * 60;
      const g = gcd(mins, totalMin);
      const s1 = mins / g;
      const s2 = totalMin / g;
      return makeDynQuestion({
        subjectId: 'shanghai-math',
        grade: 'G6',
        difficulty: 'foundation',
        topic: '比与单位换算',
        slug: 'sh6_unit_ratio',
        question: `把“${mins} 分钟 : ${hours} 小时”化成最简整数比是？`,
        correct: `${s1} : ${s2}`,
        distractors: [`${s2} : ${s1}`, `${mins} : ${hours}`, `${s1} : ${s2 + 1}`],
        explanation: `先统一单位：${hours} 小时 = ${totalMin} 分钟，因此 ${mins} : ${totalMin} 两项同除以 ${g} 得 ${s1} : ${s2}。`,
      });
    },
  },
  {
    slug: 'sh6_circle_pi',
    difficulty: 'foundation',
    build: () => {
      const r = randInt(2, 8);
      const area = roundTo(3.14 * r * r, 2);
      const circ = roundTo(2 * 3.14 * r, 2);
      return makeDynQuestion({
        subjectId: 'shanghai-math',
        grade: 'G6',
        difficulty: 'foundation',
        topic: '圆的面积',
        slug: 'sh6_circle_pi',
        question: `一个圆形花坛的半径是 ${r} 米，取 π ≈ 3.14，这个圆形花坛的面积约是多少平方米？`,
        correct: `${fmtNum(area)} 平方米`,
        distractors: [
          `${fmtNum(circ)} 平方米`,
          `${fmtNum(roundTo(3.14 * r, 2))} 平方米`,
          `${fmtNum(roundTo(area + 3.14, 2))} 平方米`,
        ],
        explanation: `圆的面积 S = πr² ≈ 3.14 × ${r}² = 3.14 × ${r * r} = ${fmtNum(area)} 平方米。`,
      });
    },
  },
  {
    slug: 'sh6_rational_mix',
    difficulty: 'foundation',
    build: () => {
      const a = -randInt(4, 14);
      const b = randInt(3, 12);
      const c = -randInt(2, 10);
      const ans = a + b - c;
      return makeDynQuestion({
        subjectId: 'shanghai-math',
        grade: 'G6',
        difficulty: 'foundation',
        topic: '有理数混合运算',
        slug: 'sh6_rational_mix',
        question: `计算：(${a}) + ${b} − (${c}) = ？`,
        correct: String(ans),
        distractors: [String(a + b + c), String(a - b - c), String(-ans === ans ? ans + 4 : -ans)],
        explanation: `先去掉括号转化为加法：${a} + ${b} + ${Math.abs(c)} = ${ans}。`,
        fallbackNumeric: { base: ans, allowNegative: true },
      });
    },
  },
  // Standard (6)
  {
    slug: 'sh6_salt_conc',
    difficulty: 'standard',
    build: () => {
      const conc = pick([10, 15, 20, 25]);
      const waterMul = (100 - conc) / gcd(conc, 100 - conc);
      const saltUnit = conc / gcd(conc, 100 - conc);
      const k = randInt(2, 6);
      const salt = saltUnit * k;
      const water = waterMul * k;
      return makeDynQuestion({
        subjectId: 'shanghai-math',
        grade: 'G6',
        difficulty: 'standard',
        topic: '百分比与浓度',
        slug: 'sh6_salt_conc',
        question: `把 ${salt} 克食盐完全溶解在 ${water} 克清水中，所得盐水的含盐率（浓度）是多少？`,
        correct: `${conc}%`,
        distractors: [`${roundTo((salt / water) * 100, 1)}%`, `${conc + 5}%`, `${100 - conc}%`],
        explanation: `盐水总质量 = ${salt} + ${water} = ${salt + water} 克，含盐率 = ${salt} ÷ ${salt + water} × 100% = ${conc}%。`,
      });
    },
  },
  {
    slug: 'sh6_work_coop',
    difficulty: 'standard',
    build: () => {
      const pairs: [number, number, number][] = [
        [6, 12, 4],
        [10, 15, 6],
        [12, 24, 8],
        [15, 30, 10],
        [12, 6, 4],
        [20, 30, 12],
      ];
      const [d1, d2, together] = pick(pairs);
      return makeDynQuestion({
        subjectId: 'shanghai-math',
        grade: 'G6',
        difficulty: 'standard',
        topic: '工程问题',
        slug: 'sh6_work_coop',
        question: `一项校园绿化工程，甲队单独做需要 ${d1} 天完成，乙队单独做需要 ${d2} 天完成。如果两队合作，多少天可以完成全部工程？`,
        correct: `${together} 天`,
        distractors: [`${Math.round((d1 + d2) / 2)} 天`, `${d1 + d2} 天`, `${together + 2} 天`],
        explanation: `合作工作效率为 1/${d1} + 1/${d2} = 1/${together}，因此合作需要 1 ÷ (1/${together}) = ${together} 天。`,
        fallbackNumeric: { base: together, unit: ' 天' },
      });
    },
  },
  {
    slug: 'sh6_sector_area',
    difficulty: 'standard',
    build: () => {
      const angles: [number, number][] = [[60, 6], [90, 4], [120, 6], [45, 8], [72, 5], [150, 6]];
      const [deg, r] = pick(angles);
      const coeff = (deg * r * r) / 360;
      const arcCoeff = roundTo((deg * 2 * r) / 360, 2);
      return makeDynQuestion({
        subjectId: 'shanghai-math',
        grade: 'G6',
        difficulty: 'standard',
        topic: '圆与扇形',
        slug: 'sh6_sector_area',
        question: `一个扇形的圆心角为 ${deg}°，半径为 ${r} 厘米，则这个扇形的面积是多少平方厘米？（结果保留 π）`,
        correct: `${coeff}π 平方厘米`,
        distractors: [
          `${fmtNum(arcCoeff)}π 平方厘米`,
          `${r * r}π 平方厘米`,
          `${coeff * 2}π 平方厘米`,
        ],
        explanation: `扇形面积 S = (n/360) × πr² = (${deg}/360) × π × ${r}² = ${coeff}π 平方厘米。`,
      });
    },
  },
  {
    slug: 'sh6_bracket_eq',
    difficulty: 'standard',
    build: () => {
      const a = randInt(2, 5);
      const b = randInt(1, 6);
      const c = randInt(2, 4);
      const x = randInt(3, 10);
      const rhs = a * (x - b) + c * x;
      return makeDynQuestion({
        subjectId: 'shanghai-math',
        grade: 'G6',
        difficulty: 'standard',
        topic: '一元一次方程',
        slug: 'sh6_bracket_eq',
        question: `解关于 x 的一元一次方程：${a}(x − ${b}) + ${c}x = ${rhs}，求 x = ？`,
        correct: `x = ${x}`,
        distractors: [`x = ${x + 2}`, `x = ${Math.max(1, x - 2)}`, `x = ${x + 1}`],
        explanation: `去括号得 ${a}x − ${a * b} + ${c}x = ${rhs}，合并同类项得 ${a + c}x = ${rhs + a * b}，解得 x = ${x}。`,
      });
    },
  },
  {
    slug: 'sh6_ratio_alloc',
    difficulty: 'standard',
    build: () => {
      const [r1, r2, r3] = pick<[number, number, number]>([[2, 3, 5], [3, 4, 5], [2, 4, 5], [1, 3, 4]]);
      const unit = randInt(4, 12);
      const total = (r1 + r2 + r3) * unit;
      const diff = (r3 - r1) * unit;
      return makeDynQuestion({
        subjectId: 'shanghai-math',
        grade: 'G6',
        difficulty: 'standard',
        topic: '按比例分配',
        slug: 'sh6_ratio_alloc',
        question: `图书馆新进 ${total} 本科普书，按 ${r1} : ${r2} : ${r3} 分配给一、二、三组。第三组比第一组多分到多少本？`,
        correct: `${diff} 本`,
        distractors: [`${r3 * unit} 本`, `${r2 * unit} 本`, `${diff + unit} 本`],
        explanation: `总份数 = ${r1}+${r2}+${r3} = ${r1 + r2 + r3}，每份 ${total} ÷ ${r1 + r2 + r3} = ${unit} 本，相差 (${r3} − ${r1}) × ${unit} = ${diff} 本。`,
        fallbackNumeric: { base: diff, unit: ' 本' },
      });
    },
  },
  {
    slug: 'sh6_find_whole',
    difficulty: 'standard',
    build: () => {
      const [num, den] = pick<[number, number]>([[3, 5], [3, 8], [4, 7], [5, 8], [2, 9]]);
      const whole = den * randInt(4, 15);
      const part = (whole / den) * num;
      return makeDynQuestion({
        subjectId: 'shanghai-math',
        grade: 'G6',
        difficulty: 'standard',
        topic: '分数除法应用',
        slug: 'sh6_find_whole',
        question: `修一条公路，已经修了 ${part} 千米，刚好占全长的 ${num}/${den}。这条公路全长多少千米？`,
        correct: `${whole} 千米`,
        distractors: [
          `${fmtNum(roundTo((part * num) / den, 1))} 千米`,
          `${whole + part} 千米`,
          `${whole - den} 千米`,
        ],
        explanation: `已知部分求单位“1”用除法：${part} ÷ (${num}/${den}) = ${part} × ${den}/${num} = ${whole} 千米。`,
        fallbackNumeric: { base: whole, unit: ' 千米' },
      });
    },
  },
  // Challenge (6)
  {
    slug: 'sh6_chase_speed',
    difficulty: 'challenge',
    build: () => {
      const vSlow = randInt(40, 60);
      const vDiff = pick([10, 12, 15, 20]);
      const vFast = vSlow + vDiff;
      const headStartHours = randInt(1, 3);
      const catchHours = randInt(2, 5);
      // Adjust vSlow so vSlow * headStartHours is divisible by catchHours
      const safeVSlow = catchHours * randInt(8, 15);
      const leadDist = safeVSlow * headStartHours;
      const safeVDiff = leadDist / catchHours;
      const safeVFast = safeVSlow + safeVDiff;
      return makeDynQuestion({
        subjectId: 'shanghai-math',
        grade: 'G6',
        difficulty: 'challenge',
        topic: '追及行程问题',
        slug: 'sh6_chase_speed',
        question: `甲车以每小时 ${safeVSlow} 千米的速度从 A 城出发，${headStartHours} 小时后，乙车以每小时 ${safeVFast} 千米的速度从同一地点出发追赶甲车。乙车出发多少小时后追上甲车？`,
        correct: `${catchHours} 小时`,
        distractors: [
          `${catchHours + headStartHours} 小时`,
          `${Math.max(1, catchHours - 1)} 小时`,
          `${catchHours + 2} 小时`,
        ],
        explanation: `乙车出发时相距 ${safeVSlow} × ${headStartHours} = ${leadDist} 千米，速度差为 ${safeVFast} − ${safeVSlow} = ${safeVDiff} 千米/时，追及时间 = ${leadDist} ÷ ${safeVDiff} = ${catchHours} 小时。`,
        fallbackNumeric: { base: catchHours, unit: ' 小时' },
      });
    },
  },
  {
    slug: 'sh6_profit_discount',
    difficulty: 'challenge',
    build: () => {
      const cost = randInt(2, 8) * 50;
      const markup = pick([20, 40, 50]);
      const marked = (cost * (100 + markup)) / 100;
      const disc = pick([8, 9]); // 8折 or 9折
      const sale = (marked * disc) / 10;
      const profit = sale - cost;
      return makeDynQuestion({
        subjectId: 'shanghai-math',
        grade: 'G6',
        difficulty: 'challenge',
        topic: '利润与折扣',
        slug: 'sh6_profit_discount',
        question: `一件进价 ${cost} 元的书包先按加价 ${markup}% 定出标价，促销时再按标价的 ${disc} 折出售。最终每件赚了（或亏了）多少元？`,
        correct: profit >= 0 ? `盈利 ${profit} 元` : `亏损 ${Math.abs(profit)} 元`,
        distractors: [
          `盈利 ${marked - cost} 元`,
          `盈利 ${profit + 15} 元`,
          `不赚不亏 (0 元)`,
        ],
        explanation: `标价 = ${cost} × (1 + ${markup}%) = ${marked} 元，${disc}折售价 = ${marked} × 0.${disc} = ${sale} 元，利润 = ${sale} − ${cost} = ${profit} 元。`,
      });
    },
  },
  {
    slug: 'sh6_annulus_pi',
    difficulty: 'challenge',
    build: () => {
      const rIn = randInt(3, 7);
      const width = randInt(2, 5);
      const rOut = rIn + width;
      const diff = rOut * rOut - rIn * rIn;
      return makeDynQuestion({
        subjectId: 'shanghai-math',
        grade: 'G6',
        difficulty: 'challenge',
        topic: '圆环阴影面积',
        slug: 'sh6_annulus_pi',
        question: `一个圆形喷水池内半径为 ${rIn} 米，外围铺设一条宽 ${width} 米的环形石子路。这条环形石子路的面积是多少平方米？（保留 π）`,
        correct: `${diff}π 平方米`,
        distractors: [`${width * width}π 平方米`, `${rOut * rOut}π 平方米`, `${diff + rIn}π 平方米`],
        explanation: `外半径 R = ${rIn} + ${width} = ${rOut} 米，圆环面积 = π(R² − r²) = π(${rOut * rOut} − ${rIn * rIn}) = ${diff}π 平方米。`,
      });
    },
  },
  {
    slug: 'sh6_sys_sum',
    difficulty: 'challenge',
    build: () => {
      const x = randInt(3, 9);
      const y = randInt(2, 8);
      const a = randInt(2, 4);
      const b = randInt(2, 4);
      const e1 = a * x + b * y;
      const e2 = b * x + a * y;
      const sum = x + y;
      return makeDynQuestion({
        subjectId: 'shanghai-math',
        grade: 'G6',
        difficulty: 'challenge',
        topic: '二元一次方程组巧算',
        slug: 'sh6_sys_sum',
        question: `已知方程组 ${a}x + ${b}y = ${e1}，${b}x + ${a}y = ${e2}，巧算 x + y 的值是多少？`,
        correct: String(sum),
        distractors: [String(sum + 2), String(Math.max(1, sum - 2)), String(e1 + e2)],
        explanation: `两式相加得 (${a + b})(x + y) = ${e1 + e2}，因此 x + y = ${e1 + e2} ÷ ${a + b} = ${sum}。`,
        fallbackNumeric: { base: sum },
      });
    },
  },
  {
    slug: 'sh6_work_leave',
    difficulty: 'challenge',
    build: () => {
      // 甲单独 dA 天，乙单独 dB 天。合作 tCoop 天后甲调走，求乙再做几天完成？
      const pairs: [number, number][] = [[12, 18], [15, 20], [10, 15], [12, 24], [18, 36]];
      const [dA, dB] = pick(pairs);
      // pick tCoop cleanly: total work = dB * m? Let remaining fraction be multiple of 1/dB -> tCoop = integer such that (1 - tCoop*(1/dA + 1/dB)) * dB is positive integer
      const validT: number[] = [];
      for (let t = 2; t <= 8; t++) {
        const remNum = (dA * dB) - t * (dA + dB);
        if (remNum > 0 && remNum % dA === 0) {
          validT.push(t);
        }
      }
      const tCoop = pick(validT.length ? validT : [2]);
      const remDaysB = ((dA * dB) - tCoop * (dA + dB)) / dA;
      return makeDynQuestion({
        subjectId: 'shanghai-math',
        grade: 'G6',
        difficulty: 'challenge',
        topic: '一课一练★工程拓展',
        slug: 'sh6_work_leave',
        question: `完成一项任务，甲独做要 ${dA} 天，乙独做要 ${dB} 天。两人先合作 ${tCoop} 天后甲队因故撤离，剩下的工作由乙队独自做完，乙队还需要再做多少天？`,
        correct: `${remDaysB} 天`,
        distractors: [`${remDaysB + tCoop} 天`, `${Math.max(1, remDaysB - 2)} 天`, `${dB - tCoop} 天`],
        explanation: `合作 ${tCoop} 天完成 ${tCoop}×(1/${dA}+1/${dB})，剩余工作量除以乙的效率 1/${dB}，得乙还需 ${remDaysB} 天。`,
        fallbackNumeric: { base: remDaysB, unit: ' 天' },
      });
    },
  },
  {
    slug: 'sh6_abs_nonneg',
    difficulty: 'challenge',
    build: () => {
      const a = randInt(2, 8);
      const b = randInt(2, 7);
      const ans = a - b;
      return makeDynQuestion({
        subjectId: 'shanghai-math',
        grade: 'G6',
        difficulty: 'challenge',
        topic: '绝对值非负性',
        slug: 'sh6_abs_nonneg',
        question: `若 |x − ${a}| + |y + ${b}| = 0，那么 x + y 的值等于多少？`,
        correct: String(ans),
        distractors: [String(a + b), String(-ans === ans ? ans + 3 : -ans), String(ans + 2)],
        explanation: `因为绝对值具有非负性，所以 x − ${a} = 0 且 y + ${b} = 0，得 x = ${a}，y = −${b}，故 x + y = ${ans}。`,
        fallbackNumeric: { base: ans, allowNegative: true },
      });
    },
  },
];

// =====================================================================
// Shanghai Math — Grade 7 (沪教版五四制)
// =====================================================================
const SH_G7_SPECS: GeneratorSpec[] = [
  // Foundation (5)
  {
    slug: 'sh7_pow_ops',
    difficulty: 'foundation',
    build: () => {
      const p1 = randInt(3, 6);
      const p2 = randInt(2, 5);
      const p3 = randInt(1, 3);
      const k = randInt(2, 4); // (a^p3)^k
      const exp = p1 + p2 - p3 * k;
      // ensure positive
      const safeP1 = exp <= 0 ? p1 + Math.abs(exp) + 2 : p1;
      const safeExp = safeP1 + p2 - p3 * k;
      return makeDynQuestion({
        subjectId: 'shanghai-math',
        grade: 'G7',
        difficulty: 'foundation',
        topic: '整式幂的运算',
        slug: 'sh7_pow_ops',
        question: `化简整式 a^${safeP1} · a^${p2} ÷ (a^${p3})^${k}，结果正确的是？`,
        correct: `a^${safeExp}`,
        distractors: [
          `a^${safeP1 + p2 - (p3 + k)}`,
          `a^${safeP1 * p2 - p3 * k}`,
          `a^${safeExp + 2}`,
        ],
        explanation: `先算幂的乘方 (a^${p3})^${k} = a^${p3 * k}，再同底数幂相乘除：${safeP1} + ${p2} − ${p3 * k} = ${safeExp}，得 a^${safeExp}。`,
      });
    },
  },
  {
    slug: 'sh7_diff_sq_calc',
    difficulty: 'foundation',
    build: () => {
      const base = pick([50, 60, 80, 100, 120]);
      const d = randInt(1, 4);
      const ans = base * base - d * d;
      return makeDynQuestion({
        subjectId: 'shanghai-math',
        grade: 'G7',
        difficulty: 'foundation',
        topic: '平方差公式',
        slug: 'sh7_diff_sq_calc',
        question: `运用乘法公式巧算 ${base - d} × ${base + d}，结果是多少？`,
        correct: String(ans),
        distractors: [String(base * base + d * d), String(ans - 10), String(base * base - d)],
        explanation: `(${base} − ${d})(${base} + ${d}) = ${base}² − ${d}² = ${base * base} − ${d * d} = ${ans}。`,
        fallbackNumeric: { base: ans },
      });
    },
  },
  {
    slug: 'sh7_parallel_angles',
    difficulty: 'foundation',
    build: () => {
      const a1 = randInt(35, 85);
      const supp = 180 - a1;
      return makeDynQuestion({
        subjectId: 'shanghai-math',
        grade: 'G7',
        difficulty: 'foundation',
        topic: '平行线性质',
        slug: 'sh7_parallel_angles',
        question: `两条平行线被第三条直线所截，若其中一对同旁内角里的较小角是 ${a1}°，则另一个同旁内角是多少度？`,
        correct: `${supp}°`,
        distractors: [`${a1}°`, `${90 - Math.min(89, a1)}°`, `${supp - 10}°`],
        explanation: `两直线平行，同旁内角互补，故所求角 = 180° − ${a1}° = ${supp}°。`,
        fallbackNumeric: { base: supp, unit: '°' },
      });
    },
  },
  {
    slug: 'sh7_poly_eval',
    difficulty: 'foundation',
    build: () => {
      const a = randInt(2, 5);
      const b = randInt(2, 4);
      const c = randInt(1, 3);
      const x = pick([-2, -1, 2, 3]);
      const xCoeff = 2 * a - c;
      const val = b * x * x + xCoeff * x - 4;
      return makeDynQuestion({
        subjectId: 'shanghai-math',
        grade: 'G7',
        difficulty: 'foundation',
        topic: '整式化简求值',
        slug: 'sh7_poly_eval',
        question: `先化简再求值：当 x = ${fmtSigned(x)} 时，整式 (${b}x² + ${2 * a}x) − (${c}x + 4) 的值是？`,
        correct: fmtSigned(val),
        distractors: [
          fmtSigned(val + 8),
          fmtSigned(b * x * x - xCoeff * x - 4),
          fmtSigned(val - 4),
        ],
        explanation: `化简得 ${b}x² + ${xCoeff}x − 4；代入 x = ${fmtSigned(x)} 得 ${b * x * x} + (${xCoeff * x}) − 4 = ${fmtSigned(val)}。`,
        fallbackNumeric: { base: val, allowNegative: true },
      });
    },
  },
  {
    slug: 'sh7_ineq_basic',
    difficulty: 'foundation',
    build: () => {
      const a = randInt(2, 5);
      const bound = randInt(-3, 7);
      const c = randInt(2, 10);
      // 3 - a*x >= 3 - a*bound => -a*x >= -a*bound => x <= bound
      const rhs = c - a * bound;
      return makeDynQuestion({
        subjectId: 'shanghai-math',
        grade: 'G7',
        difficulty: 'foundation',
        topic: '一元一次不等式',
        slug: 'sh7_ineq_basic',
        question: `解不等式 ${c} − ${a}x ≥ ${rhs}，它的正确解集是？`,
        correct: `x ≤ ${fmtSigned(bound)}`,
        distractors: [
          `x ≥ ${fmtSigned(bound)}`,
          `x < ${fmtSigned(bound)}`,
          `x ≤ ${fmtSigned(bound + 2)}`,
        ],
        explanation: `移项得 −${a}x ≥ ${rhs - c}，两边同除以负数 −${a} 须改变不等号方向，得 x ≤ ${fmtSigned(bound)}。`,
      });
    },
  },
  // Standard (5)
  {
    slug: 'sh7_perf_square',
    difficulty: 'standard',
    build: () => {
      const s = randInt(5, 11);
      const prod = randInt(3, 12);
      const ans = s * s - 2 * prod;
      return makeDynQuestion({
        subjectId: 'shanghai-math',
        grade: 'G7',
        difficulty: 'standard',
        topic: '完全平方变形',
        slug: 'sh7_perf_square',
        question: `已知 a + b = ${s}，ab = ${prod}，那么 a² + b² 的值等于多少？`,
        correct: String(ans),
        distractors: [String(s * s), String(s * s + 2 * prod), String(s * s - prod)],
        explanation: `利用公式 a² + b² = (a + b)² − 2ab = ${s}² − 2×${prod} = ${s * s} − ${2 * prod} = ${ans}。`,
        fallbackNumeric: { base: ans, allowNegative: true },
      });
    },
  },
  {
    slug: 'sh7_zig_parallel',
    difficulty: 'standard',
    build: () => {
      const alpha = randInt(25, 58);
      const beta = randInt(28, 62);
      const mid = alpha + beta;
      return makeDynQuestion({
        subjectId: 'shanghai-math',
        grade: 'G7',
        difficulty: 'standard',
        topic: '平行线拐点模型',
        slug: 'sh7_zig_parallel',
        question: `如图形模型：AB ∥ CD，点 E 位于两平行线之间且向左侧弯折（“猪蹄模型”），若 ∠BAE = ${alpha}°，∠DCE = ${beta}°，则夹角 ∠AEC 的度数是多少？`,
        correct: `${mid}°`,
        distractors: [`${180 - mid}°`, `${Math.abs(alpha - beta) || 15}°`, `${mid + 15}°`],
        explanation: `过拐点 E 作平行于 AB 和 CD 的辅助线，利用内错角相等得 ∠AEC = ∠BAE + ∠DCE = ${alpha}° + ${beta}° = ${mid}°。`,
        fallbackNumeric: { base: mid, unit: '°' },
      });
    },
  },
  {
    slug: 'sh7_isosceles_angle',
    difficulty: 'standard',
    build: () => {
      const baseAngle = randInt(32, 74);
      const vertexAngle = 180 - 2 * baseAngle;
      return makeDynQuestion({
        subjectId: 'shanghai-math',
        grade: 'G7',
        difficulty: 'standard',
        topic: '等腰三角形',
        slug: 'sh7_isosceles_angle',
        question: `在一个等腰三角形中，若一个底角的度数为 ${baseAngle}°，则它的顶角是多少度？`,
        correct: `${vertexAngle}°`,
        distractors: [`${baseAngle}°`, `${180 - baseAngle}°`, `${(180 - baseAngle) / 2}°`],
        explanation: `等腰三角形两个底角相等均为 ${baseAngle}°，故顶角 = 180° − 2 × ${baseAngle}° = ${vertexAngle}°。`,
        fallbackNumeric: { base: vertexAngle, unit: '°' },
      });
    },
  },
  {
    slug: 'sh7_frac_eq',
    difficulty: 'standard',
    build: () => {
      // Simple exact proportion: s1 / (x - k) = s2 / x
      const x = randInt(4, 10);
      const k = randInt(2, x - 2);
      const a = x - k;
      const b = x;
      const p = randInt(2, 4);
      const num1 = p * a;
      const num2 = p * b;
      const g = gcd(num1, num2);
      const s1 = num1 / g;
      const s2 = num2 / g;
      return makeDynQuestion({
        subjectId: 'shanghai-math',
        grade: 'G7',
        difficulty: 'standard',
        topic: '分式方程求解',
        slug: 'sh7_frac_eq',
        question: `解分式方程：${s1} / (x − ${k}) = ${s2} / x，经检验后的正确解是？`,
        correct: `x = ${x}`,
        distractors: [`x = ${k}`, `x = ${x + k}`, `无解（增根）`],
        explanation: `去分母交叉相乘得 ${s1}x = ${s2}(x − ${k})，解得 (${s2 - s1})x = ${s2 * k}，x = ${x}；代入分母 x(x−${k}) ≠ 0，是原方程的根。`,
      });
    },
  },
  {
    slug: 'sh7_ineq_min_int',
    difficulty: 'standard',
    build: () => {
      const k = randInt(2, 5);
      const m = randInt(3, 8);
      // k*x + 2 > k*(m - 1) + 2 + 1 => x > m - 1 + 1/k => smallest integer is m
      const rhs = k * (m - 1) + 3;
      return makeDynQuestion({
        subjectId: 'shanghai-math',
        grade: 'G7',
        difficulty: 'standard',
        topic: '不等式整数解',
        slug: 'sh7_ineq_min_int',
        question: `满足不等式 ${k}x + 2 > ${rhs} 的最小整数解 x 是多少？`,
        correct: String(m),
        distractors: [String(m - 1), String(m + 1), String(m + 2)],
        explanation: `${k}x > ${rhs - 2}，即 x > ${roundTo((rhs - 2) / k, 2)}，因此满足条件且大于该边界的最小整数是 ${m}。`,
        fallbackNumeric: { base: m },
      });
    },
  },
  // Challenge (5)
  {
    slug: 'sh7_complete_sq_min',
    difficulty: 'challenge',
    build: () => {
      const h = randInt(2, 6);
      const minVal = randInt(-5, 9);
      const c = h * h + minVal;
      const signH = randInt(0, 1) === 1 ? '+' : '−';
      return makeDynQuestion({
        subjectId: 'shanghai-math',
        grade: 'G7',
        difficulty: 'challenge',
        topic: '配方法求最值',
        slug: 'sh7_complete_sq_min',
        question: `代数式 x² ${signH} ${2 * h}x + ${c} 对任意实数 x 所能取到的最小值是多少？`,
        correct: fmtSigned(minVal),
        distractors: [fmtSigned(c), fmtSigned(-h), fmtSigned(minVal + 2 * h)],
        explanation: `配方得 (x ${signH} ${h})² ${minVal >= 0 ? `+ ${minVal}` : `− ${Math.abs(minVal)}`}。由于平方项 ≥ 0，因此最小值为 ${fmtSigned(minVal)}。`,
        fallbackNumeric: { base: minVal, allowNegative: true },
      });
    },
  },
  {
    slug: 'sh7_isosceles_cases',
    difficulty: 'challenge',
    build: () => {
      // Pick side pairs (a, b) with 2a <= b so ONLY (a, b, b) satisfies triangle inequality!
      const a = randInt(3, 6);
      const b = 2 * a + randInt(1, 4);
      const onlyPerim = a + 2 * b;
      const invalidPerim = 2 * a + b;
      return makeDynQuestion({
        subjectId: 'shanghai-math',
        grade: 'G7',
        difficulty: 'challenge',
        topic: '市北资优·分类讨论',
        slug: 'sh7_isosceles_cases',
        question: `一个等腰三角形有两条边的长度分别为 ${a} cm 和 ${b} cm，那么这个等腰三角形的周长是多少厘米？`,
        correct: `${onlyPerim} cm`,
        distractors: [
          `${invalidPerim} cm`,
          `${onlyPerim} cm 或 ${invalidPerim} cm`,
          `${2 * (a + b)} cm`,
        ],
        explanation: `分类讨论：① 若腰长为 ${a} cm，则 ${a} + ${a} = ${2 * a} < ${b}，不满足三角形三边关系须舍去；② 若腰长为 ${b} cm，周长为 ${b} + ${b} + ${a} = ${onlyPerim} cm。`,
      });
    },
  },
  {
    slug: 'sh7_param_ineq',
    difficulty: 'challenge',
    build: () => {
      // Inequality x < m has exact N positive integer solutions (1..N) -> m must be > N and <= N+1
      const count = randInt(3, 6);
      const askA = randInt(0, 1) === 1;
      if (askA) {
        return makeDynQuestion({
          subjectId: 'shanghai-math',
          grade: 'G7',
          difficulty: 'challenge',
          topic: '含参不等式整数解',
          slug: 'sh7_param_ineq',
          question: `关于 x 的不等式 x < a 恰好只有 ${count} 个正整数解，那么参数 a 的取值范围是？`,
          correct: `${count} < a ≤ ${count + 1}`,
          distractors: [
            `${count} ≤ a < ${count + 1}`,
            `${count - 1} < a ≤ ${count}`,
            `a ≤ ${count + 1}`,
          ],
          explanation: `这 ${count} 个正整数解只能是 1 到 ${count}。要包含 ${count}（strict <）则 a > ${count}；不包含 ${count + 1} 则 a ≤ ${count + 1}。`,
        });
      }
      const n = count;
      return makeDynQuestion({
        subjectId: 'shanghai-math',
        grade: 'G7',
        difficulty: 'challenge',
        topic: '含参不等式整数解',
        slug: 'sh7_param_ineq',
        question: `如果不等式 x ≤ a 恰好只有 ${n} 个正整数解，则参数 a 的取值范围应为？`,
        correct: `${n} ≤ a < ${n + 1}`,
        distractors: [`${n} < a ≤ ${n + 1}`, `${n - 1} ≤ a < ${n}`, `a = ${n}`],
        explanation: `由于含等号 x ≤ a，要包含 ${n} 且不包含 ${n + 1}，必有 ${n} ≤ a < ${n + 1}。`,
      });
    },
  },
  {
    slug: 'sh7_recip_square',
    difficulty: 'challenge',
    build: () => {
      const k = randInt(3, 8);
      const ans = k * k - 2;
      return makeDynQuestion({
        subjectId: 'shanghai-math',
        grade: 'G7',
        difficulty: 'challenge',
        topic: '倒数完全平方求值',
        slug: 'sh7_recip_square',
        question: `已知 x + 1/x = ${k}，求代数式 x² + 1/x² 的值。`,
        correct: String(ans),
        distractors: [String(k * k), String(k * k + 2), String(k * k - 1)],
        explanation: `将已知等式两边平方：(x + 1/x)² = x² + 2 + 1/x² = ${k * k}，所以 x² + 1/x² = ${k * k} − 2 = ${ans}。`,
        fallbackNumeric: { base: ans },
      });
    },
  },
  {
    slug: 'sh7_speed_frac_word',
    difficulty: 'challenge',
    build: () => {
      // S km trip; train is k times faster (or v+d), saving dt hours. Construct exact numbers:
      // v1 * (t2 + dt) = S, v2 = v1 + dv, v2 * t2 = S
      const t2 = randInt(2, 4);
      const dt = 1;
      const v1 = t2 * randInt(4, 10) * 5; // divisible cleanly
      const dist = v1 * (t2 + dt);
      const v2 = dist / t2;
      return makeDynQuestion({
        subjectId: 'shanghai-math',
        grade: 'G7',
        difficulty: 'challenge',
        topic: '分式方程行程应用',
        slug: 'sh7_speed_frac_word',
        question: `甲、乙两地相距 ${dist} 千米，高铁提速后每小时比原列车快 ${v2 - v1} 千米，行驶全程可少用 ${dt} 小时。提速后的高铁速度是每小时多少千米？`,
        correct: `${v2} 千米/时`,
        distractors: [`${v1} 千米/时`, `${v2 + 10} 千米/时`, `${v2 - 5} 千米/时`],
        explanation: `设原速为 v，提速后为 ${v2}：${dist}/${v1} − ${dist}/${v2} = ${t2 + dt} − ${t2} = ${dt} 小时，符合题意。`,
        fallbackNumeric: { base: v2, unit: ' 千米/时' },
      });
    },
  },
];

// =====================================================================
// Science — Grade 6 & 7 (Cambridge Stage 7 / 8)
// =====================================================================
function makeScienceSpecs(grade: GradeLevel, track: string): GeneratorSpec[] {
  if (track === 'physics') {
    const specs: GeneratorSpec[] = [
      {
        slug: 'weight_mg',
        difficulty: 'foundation',
        build: () => {
          const mass = randInt(4, 25);
          const onMoon = randInt(0, 1) === 1;
          const g = onMoon ? 1.6 : 10;
          const w = roundTo(mass * g, 1);
          const env = onMoon ? 'on the Moon (g = 1.6 N/kg)' : 'on Earth (g = 10 N/kg)';
          return makeDynQuestion({
            subjectId: 'science',
            grade,
            track: 'physics',
            difficulty: 'foundation',
            topic: 'U3 Gravity & Weight',
            slug: 'weight_mg',
            question: `A scientific probe has a mass of ${mass} kg. Using W = m × g, what is its weight ${env}?`,
            correct: `${fmtNum(w)} N`,
            distractors: [
              `${mass} N`,
              `${fmtNum(roundTo(mass * (onMoon ? 10 : 1.6), 1))} N`,
              `${fmtNum(roundTo(w + g, 1))} N`,
            ],
            explanation: `Weight W = mass × gravitational field strength = ${mass} kg × ${g} N/kg = ${fmtNum(w)} N.`,
          });
        },
      },
      {
        slug: 'avg_speed_sci',
        difficulty: 'foundation',
        build: () => {
          const v = randInt(4, 16);
          const t = randInt(5, 18);
          const d = v * t;
          return makeDynQuestion({
            subjectId: 'science',
            grade,
            track: 'physics',
            difficulty: 'foundation',
            topic: 'Forces & Motion',
            slug: 'avg_speed_sci',
            question: `A lab trolley travels ${d} m along a straight track in ${t} s. Calculate its average speed.`,
            correct: `${v} m/s`,
            distractors: [`${d * t} m/s`, `${v + 3} m/s`, `${Math.max(1, v - 2)} m/s`],
            explanation: `Average speed = distance ÷ time = ${d} m ÷ ${t} s = ${v} m/s.`,
            fallbackNumeric: { base: v, unit: ' m/s' },
          });
        },
      },
      {
        slug: 'net_force',
        difficulty: 'standard',
        build: () => {
          const push = randInt(45, 95);
          const drag = randInt(15, push - 10);
          const net = push - drag;
          return makeDynQuestion({
            subjectId: 'science',
            grade,
            track: 'physics',
            difficulty: 'standard',
            topic: 'U3 Balanced & Net Forces',
            slug: 'net_force',
            question: `A rocket sled produces ${push} N of forward thrust while air drag and friction push backward with ${drag} N. What is the resultant (net) force?`,
            correct: `${net} N forward`,
            distractors: [`${push + drag} N forward`, `${net} N backward`, `${push} N forward`],
            explanation: `Opposite forces subtract: ${push} N − ${drag} N = ${net} N in the direction of the stronger forward force.`,
          });
        },
      },
      {
        slug: 'parallel_current',
        difficulty: 'standard',
        build: () => {
          const i1 = roundTo(randInt(12, 35) / 10, 1);
          const i2 = roundTo(randInt(10, 28) / 10, 1);
          const total = roundTo(i1 + i2, 1);
          return makeDynQuestion({
            subjectId: 'science',
            grade,
            track: 'physics',
            difficulty: 'standard',
            topic: 'U9 Parallel Circuits',
            slug: 'parallel_current',
            question: `In a two-branch parallel circuit, the ammeter in branch 1 reads ${fmtNum(
              i1
            )} A and branch 2 reads ${fmtNum(i2)} A. What current leaves the main battery?`,
            correct: `${fmtNum(total)} A`,
            distractors: [
              `${fmtNum(i1)} A`,
              `${fmtNum(roundTo(Math.abs(i1 - i2) || 0.5, 1))} A`,
              `${fmtNum(roundTo(total + 0.5, 1))} A`,
            ],
            explanation: `Total current in a parallel circuit splits across branches, so I_total = ${fmtNum(
              i1
            )} + ${fmtNum(i2)} = ${fmtNum(total)} A.`,
          });
        },
      },
      {
        slug: 'echo_sonar',
        difficulty: 'challenge',
        build: () => {
          const t = pick([2, 3, 4, 5, 6]);
          const depth = (1500 * t) / 2;
          return makeDynQuestion({
            subjectId: 'science',
            grade,
            track: 'physics',
            difficulty: 'challenge',
            topic: 'U6 Sound Waves & Echoes',
            slug: 'echo_sonar',
            question: `A research ship sends a sonar pulse down into seawater (sound speed = 1500 m/s) and detects the seabed echo ${t} s later. How deep is the ocean here?`,
            correct: `${depth} m`,
            distractors: [`${1500 * t} m`, `${depth / 2} m`, `${1500 / t} m`],
            explanation: `The pulse travels down and back (2× depth) in ${t} s. One-way depth = (1500 × ${t}) ÷ 2 = ${depth} m.`,
            fallbackNumeric: { base: depth, unit: ' m' },
          });
        },
      },
      {
        slug: 'energy_eff',
        difficulty: 'challenge',
        build: () => {
          const inputJ = randInt(2, 8) * 100;
          const pct = pick([25, 35, 40, 60, 75, 80]);
          const useful = (inputJ * pct) / 100;
          const wasted = inputJ - useful;
          return makeDynQuestion({
            subjectId: 'science',
            grade,
            track: 'physics',
            difficulty: 'challenge',
            topic: 'U3 Energy Transfers',
            slug: 'energy_eff',
            question: `An electric motor takes in ${inputJ} J of electrical energy and transfers ${useful} J to useful kinetic energy while ${wasted} J dissipates as heat. What is its efficiency?`,
            correct: `${pct}%`,
            distractors: [
              `${100 - pct}%`,
              `${Math.min(99, pct + 10)}%`,
              `${Math.max(5, pct - 15)}%`,
            ],
            explanation: `Efficiency = (Useful output ÷ Total input) × 100% = (${useful} ÷ ${inputJ}) × 100% = ${pct}%.`,
          });
        },
      },
    ];
    if (grade === 'G7') {
      specs.push({
        slug: 'ohms_law',
        difficulty: 'standard',
        build: () => {
          const i = randInt(2, 6);
          const r = randInt(3, 12);
          const v = i * r;
          return makeDynQuestion({
            subjectId: 'science',
            grade,
            track: 'physics',
            difficulty: 'standard',
            topic: 'Circuits & Resistance',
            slug: 'ohms_law',
            question: `A current of ${i} A flows through a ${r} Ω resistor. Calculate the voltage (potential difference) across the resistor using V = I × R.`,
            correct: `${v} V`,
            distractors: [`${i + r} V`, `${fmtNum(roundTo(r / i, 2))} V`, `${v + r} V`],
            explanation: `V = I × R = ${i} A × ${r} Ω = ${v} V.`,
            fallbackNumeric: { base: v, unit: ' V' },
          });
        },
      });
    }
    return specs;
  }

  if (track === 'biology') {
    return [
      {
        slug: 'microscope_mag',
        difficulty: 'foundation',
        build: () => {
          const eye = pick([5, 10, 15]);
          const obj = pick([4, 10, 40, 100]);
          const total = eye * obj;
          return makeDynQuestion({
            subjectId: 'science',
            grade,
            track: 'biology',
            difficulty: 'foundation',
            topic: 'U1 Microscopy',
            slug: 'microscope_mag',
            question: `A compound light microscope uses a ×${eye} eyepiece lens together with a ×${obj} objective lens. What is its total magnification?`,
            correct: `×${total}`,
            distractors: [`×${eye + obj}`, `×${Math.round(obj / eye) || 2}`, `×${total * 10}`],
            explanation: `Total magnification = eyepiece × objective = ${eye} × ${obj} = ×${total}.`,
          });
        },
      },
      {
        slug: 'cell_actual_size',
        difficulty: 'standard',
        build: () => {
          const actualUm = randInt(15, 60);
          const mag = pick([100, 200, 400, 500]);
          const imageUm = actualUm * mag;
          const imageMm = roundTo(imageUm / 1000, 2);
          return makeDynQuestion({
            subjectId: 'science',
            grade,
            track: 'biology',
            difficulty: 'standard',
            topic: 'U1 Cell Measurements',
            slug: 'cell_actual_size',
            question: `Under ×${mag} magnification, a plant cell's image measures ${fmtNum(
              imageMm
            )} mm (${imageUm.toLocaleString('en-US')} μm) long. What is the cell's actual length?`,
            correct: `${actualUm} μm`,
            distractors: [
              `${actualUm * 10} μm`,
              `${mag} μm`,
              `${Math.max(2, Math.round(actualUm / 2))} μm`,
            ],
            explanation: `Actual size = Image size ÷ Magnification = ${imageUm} μm ÷ ${mag} = ${actualUm} μm.`,
            fallbackNumeric: { base: actualUm, unit: ' μm' },
          });
        },
      },
      {
        slug: 'trophic_10pct',
        difficulty: 'challenge',
        build: () => {
          const producerJ = randInt(2, 9) * 10_000;
          const secondaryJ = producerJ / 100;
          return makeDynQuestion({
            subjectId: 'science',
            grade,
            track: 'biology',
            difficulty: 'challenge',
            topic: 'U7 Food Web Energy Flow',
            slug: 'trophic_10pct',
            question: `Grass producers in a meadow capture ${producerJ.toLocaleString(
              'en-US'
            )} kJ of energy. Assuming only 10% transfers between each trophic level (Grass → Grasshopper → Frog), how much energy reaches the frogs?`,
            correct: `${secondaryJ.toLocaleString('en-US')} kJ`,
            distractors: [
              `${(producerJ / 10).toLocaleString('en-US')} kJ`,
              `${(producerJ / 1000).toLocaleString('en-US')} kJ`,
              `${producerJ.toLocaleString('en-US')} kJ`,
            ],
            explanation: `10% passes to grasshoppers (${(producerJ / 10).toLocaleString(
              'en-US'
            )} kJ), and 10% of that reaches frogs: ${secondaryJ.toLocaleString('en-US')} kJ.`,
          });
        },
      },
    ];
  }

  // Chemistry
  const chemSpecs: GeneratorSpec[] = [
    {
      slug: 'ph_scale',
      difficulty: 'foundation',
      build: () => {
        const acidPh = randInt(1, 5);
        const alkPh = randInt(9, 13);
        const askAcid = randInt(0, 1) === 1;
        if (askAcid) {
          return makeDynQuestion({
            subjectId: 'science',
            grade,
            track: 'chemistry',
            difficulty: 'foundation',
            topic: 'U5 Acids, Alkalis & pH',
            slug: 'ph_scale',
            question: `A clear solution has a pH of ${acidPh} and turns Universal Indicator orange-red. How should it be classified?`,
            correct: 'An acidic solution',
            distractors: ['A strong alkali (base)', 'Pure neutral water (pH 7)', 'An inert gas'],
            explanation: `Solutions with pH < 7 are acidic (pH ${acidPh} < 7), turning Universal Indicator red/orange/yellow.`,
          });
        }
        return makeDynQuestion({
          subjectId: 'science',
          grade,
          track: 'chemistry',
          difficulty: 'foundation',
          topic: 'U5 Acids, Alkalis & pH',
          slug: 'ph_scale',
          question: `Soap water has a pH of ${alkPh} and turns Universal Indicator blue-violet. What kind of solution is it?`,
          correct: 'An alkaline solution',
          distractors: ['A strong acid', 'Neutral distilled water', 'A pure solid metal'],
          explanation: `Solutions with pH > 7 are alkaline (pH ${alkPh} > 7).`,
        });
      },
    },
    {
      slug: 'mass_conserve',
      difficulty: 'standard',
      build: () => {
        const m1 = randInt(18, 45);
        const m2 = randInt(12, 35);
        const solidLeft = m1 + m2 - randInt(5, 14);
        const gasEscaped = m1 + m2 - solidLeft;
        return makeDynQuestion({
          subjectId: 'science',
          grade,
          track: 'chemistry',
          difficulty: 'standard',
          topic: 'U8 Conservation of Mass',
          slug: 'mass_conserve',
          question: `In a reaction flask, ${m1} g of limestone reacts completely with ${m2} g of acid. Afterward, the remaining mixture in the open flask weighs ${solidLeft} g. What mass of carbon dioxide gas escaped?`,
          correct: `${gasEscaped} g`,
          distractors: [`${m1 + m2} g`, `${solidLeft} g`, `${gasEscaped + 5} g`],
          explanation: `Total reactant mass = ${m1} + ${m2} = ${m1 + m2} g. By conservation of mass, escaped CO₂ = ${m1 + m2} − ${solidLeft} = ${gasEscaped} g.`,
          fallbackNumeric: { base: gasEscaped, unit: ' g' },
        });
      },
    },
    {
      slug: 'neutralize_shift',
      difficulty: 'challenge',
      build: () => {
        const startPh = randInt(1, 3);
        const dropNeeded = randInt(4, 9);
        return makeDynQuestion({
          subjectId: 'science',
          grade,
          track: 'chemistry',
          difficulty: 'challenge',
          topic: 'U5 Neutralization',
          slug: 'neutralize_shift',
          question: `A student starts with ${dropNeeded * 5} cm³ of hydrochloric acid at pH ${startPh} and slowly adds alkali drop by drop until complete neutralization occurs. Which pH reading marks the neutral endpoint?`,
          correct: 'pH 7 (green on Universal Indicator)',
          distractors: [`pH ${startPh} (red)`, 'pH 14 (dark purple)', 'pH 0 (deep crimson)'],
          explanation: `Adding alkali raises an acid's pH upward until neutral salt + water is formed at pH 7 (green).`,
        });
      },
    },
  ];
  if (grade === 'G7') {
    chemSpecs.push({
      slug: 'density_mv',
      difficulty: 'standard',
      build: () => {
        const dens = randInt(2, 9);
        const vol = randInt(5, 16);
        const mass = dens * vol;
        return makeDynQuestion({
          subjectId: 'science',
          grade,
          track: 'chemistry',
          difficulty: 'standard',
          topic: 'Density & Matter',
          slug: 'density_mv',
          question: `A solid metal block has a mass of ${mass} g and occupies a volume of ${vol} cm³. Calculate its density.`,
          correct: `${dens} g/cm³`,
          distractors: [`${mass * vol} g/cm³`, `${dens + 2} g/cm³`, `${fmtNum(roundTo(vol / mass, 2))} g/cm³`],
          explanation: `Density ρ = mass ÷ volume = ${mass} g ÷ ${vol} cm³ = ${dens} g/cm³.`,
          fallbackNumeric: { base: dens, unit: ' g/cm³' },
        });
      },
    });
  }
  return chemSpecs;
}

// =====================================================================
// Humanity — Geography quantitative skills (G6 geography-skills & G7 geography)
// =====================================================================
function makeHumanityGeoSpecs(grade: GradeLevel, track: string): GeneratorSpec[] {
  return [
    {
      slug: 'hum_map_scale',
      difficulty: 'foundation',
      build: () => {
        const kmPerCm = pick([2, 5, 10, 25]);
        const scale = kmPerCm * 100_000;
        const cm = randInt(3, 9);
        const km = cm * kmPerCm;
        return makeDynQuestion({
          subjectId: 'humanity',
          grade,
          track,
          difficulty: 'foundation',
          topic: grade === 'G6' ? 'Map Scale & Distance' : 'Cartography & Scale',
          slug: 'hum_map_scale',
          question: `On a topographic map with scale 1 : ${scale.toLocaleString(
            'en-US'
          )} (where 1 cm equals ${kmPerCm} km), two river towns sit ${cm} cm apart. What is the true ground distance?`,
          correct: `${km} km`,
          distractors: [`${km * 10} km`, `${km + kmPerCm} km`, `${cm} km`],
          explanation: `${cm} cm × ${kmPerCm} km/cm = ${km} km.`,
          fallbackNumeric: { base: km, unit: ' km' },
        });
      },
    },
    {
      slug: 'hum_timezone',
      difficulty: 'standard',
      build: () => {
        const hrsEast = randInt(2, 6);
        const lon = hrsEast * 15;
        const utcHour = randInt(8, 15);
        const localHour = utcHour + hrsEast;
        const fmtHr = (h: number) => `${String(h).padStart(2, '0')}:00`;
        return makeDynQuestion({
          subjectId: 'humanity',
          grade,
          track,
          difficulty: 'standard',
          topic: 'Longitude & Time Zones',
          slug: 'hum_timezone',
          question: `Earth rotates 15° of longitude every hour (east is ahead). When it is ${fmtHr(
            utcHour
          )} in London (0° Prime Meridian), what is the solar time at ${lon}° E?`,
          correct: `${fmtHr(localHour)} (ahead by ${hrsEast} hours)`,
          distractors: [
            `${fmtHr(utcHour - hrsEast)} (behind by ${hrsEast} hours)`,
            `${fmtHr(localHour + 2)} (ahead by ${hrsEast + 2} hours)`,
            `${fmtHr(utcHour)} (same time zone)`,
          ],
          explanation: `${lon}° ÷ 15°/hr = ${hrsEast} hours East, so add ${hrsEast} hours: ${fmtHr(
            utcHour
          )} + ${hrsEast} h = ${fmtHr(localHour)}.`,
        });
      },
    },
    {
      slug: 'hum_contour',
      difficulty: 'challenge',
      build: () => {
        const baseElev = randInt(2, 6) * 50;
        const interval = pick([20, 25, 40, 50]);
        const steps = randInt(4, 7);
        const peakElev = baseElev + interval * steps;
        return makeDynQuestion({
          subjectId: 'humanity',
          grade,
          track,
          difficulty: 'challenge',
          topic: 'Contour & Elevation',
          slug: 'hum_contour',
          question: `A hiker starts at a valley contour line marked ${baseElev} m and crosses ${steps} upward contour intervals (contour interval = ${interval} m) to reach a ridge camp. What is the camp's elevation?`,
          correct: `${peakElev} m`,
          distractors: [
            `${baseElev + interval} m`,
            `${peakElev + interval} m`,
            `${Math.max(50, peakElev - 2 * interval)} m`,
          ],
          explanation: `Total elevation climb = ${steps} × ${interval} m = ${steps * interval} m; camp elevation = ${baseElev} + ${
            steps * interval
          } = ${peakElev} m.`,
          fallbackNumeric: { base: peakElev, unit: ' m' },
        });
      },
    },
  ];
}

function getGeneratorPool(
  subjectId: SubjectId,
  grade: GradeLevel,
  trackId?: string | null
): GeneratorSpec[] {
  if (subjectId === 'ig-math') {
    return grade === 'G6' ? IG_G6_SPECS : IG_G7_SPECS;
  }
  if (subjectId === 'shanghai-math') {
    return grade === 'G6' ? SH_G6_SPECS : SH_G7_SPECS;
  }
  if (subjectId === 'science') {
    return makeScienceSpecs(grade, trackId || 'physics');
  }
  if (subjectId === 'humanity' && (trackId === 'geography-skills' || trackId === 'geography')) {
    return makeHumanityGeoSpecs(grade, trackId);
  }
  return [];
}

function pickFromSpecs(specs: readonly GeneratorSpec[], count: number): PracticeQuestion[] {
  if (specs.length === 0 || count <= 0) return [];
  const result: PracticeQuestion[] = [];
  let bag = shuffleLocal(specs);
  for (let i = 0; i < count; i++) {
    if (bag.length === 0) {
      bag = shuffleLocal(specs);
    }
    const spec = bag.shift()!;
    result.push(spec.build());
  }
  return result;
}

export function generateDynamicQuestions(params: {
  subjectId: SubjectId;
  grade: GradeLevel;
  trackId?: string | null;
  difficulty: 'all' | PracticeDifficulty;
  count: number;
}): PracticeQuestion[] {
  const { subjectId, grade, trackId, difficulty, count } = params;
  if (count <= 0) return [];
  const pool = getGeneratorPool(subjectId, grade, trackId);
  if (pool.length === 0) return [];

  if (difficulty !== 'all') {
    const matching = pool.filter((s) => s.difficulty === difficulty);
    return pickFromSpecs(matching.length > 0 ? matching : pool, count);
  }

  const fSpecs = pool.filter((s) => s.difficulty === 'foundation');
  const sSpecs = pool.filter((s) => s.difficulty === 'standard');
  const cSpecs = pool.filter((s) => s.difficulty === 'challenge');

  if (fSpecs.length > 0 && sSpecs.length > 0 && cSpecs.length > 0 && count >= 3) {
    const fCount = Math.max(1, Math.round(count * 0.35));
    const sCount = Math.max(1, Math.round(count * 0.35));
    const cCount = Math.max(1, count - fCount - sCount);
    return [
      ...pickFromSpecs(fSpecs, fCount),
      ...pickFromSpecs(sSpecs, sCount),
      ...pickFromSpecs(cSpecs, cCount),
    ].slice(0, count);
  }

  return pickFromSpecs(pool, count);
}
