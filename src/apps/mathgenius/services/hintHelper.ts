import { Question } from '../types';

/**
 * Extracts or synthesizes a high-quality problem-solving hint (解题思路)
 * ensuring that the correct answer and direct choice letters are strictly hidden.
 */
export function getQuestionHint(question: Question, language: 'en' | 'zh' = 'zh'): string {
  // 1. If question already has a dedicated hint from backend, return it
  if (question.hint && question.hint.trim().length > 0) {
    return question.hint.trim();
  }

  // 2. Try to derive heuristic thinking steps from explanation without leaking the answer
  if (question.explanation && question.explanation.trim().length > 0) {
    const sanitized = extractHintFromExplanation(question.explanation, question.correctAnswer, language);
    if (sanitized && sanitized.length >= 15) {
      return sanitized;
    }
  }

  // 3. Fallback to topic-specific pedagogical heuristic hints
  return getTopicHeuristicHint(question, language);
}

/**
 * Strips the final answer, option letters, and concluding solution sentences
 * from an explanation string so only the reasoning approach remains.
 */
function extractHintFromExplanation(
  explanation: string,
  correctAnswer: string,
  language: 'en' | 'zh'
): string | null {
  try {
    let text = explanation.trim();

    // Remove common prefixes
    text = text.replace(/^(解析|详细解析|解答|解|解题思路)[：:\s]+/i, '');

    // Split into sentences
    const sentences = text.split(/(?<=[。！？!?\n])/).map(s => s.trim()).filter(Boolean);
    if (sentences.length === 0) return null;

    // Filter out sentences that reveal the final answer
    const answerKeywords = [
      '故选', '因此选', '所以选', '正确答案', '答案是', '答案为', '选得', '应选',
      'therefore', 'hence', 'the correct answer', 'so the answer', 'correct choice', 'option'
    ];

    const safeSentences: string[] = [];
    for (const sentence of sentences) {
      const lower = sentence.toLowerCase();
      const containsAnswerKeyword = answerKeywords.some(kw => lower.includes(kw));
      const containsCorrectAnswer = correctAnswer && sentence.includes(correctAnswer);

      if (containsAnswerKeyword || containsCorrectAnswer) {
        break; // Stop at the first sentence that starts concluding or revealing the answer
      }
      safeSentences.push(sentence);
      if (safeSentences.length >= 2) break; // First 1-2 reasoning sentences are ideal for a hint
    }

    if (safeSentences.length > 0) {
      return safeSentences.join(' ');
    }
  } catch {
    // ignore parsing errors
  }
  return null;
}

/**
 * Returns pedagogical problem-solving heuristics according to math topic.
 */
function getTopicHeuristicHint(question: Question, language: 'en' | 'zh'): string {
  const cat = (question.category || '').toLowerCase();
  const qText = (question.question || '').toLowerCase();

  const isZh = language === 'zh';

  if (cat.includes('比') || cat.includes('率') || cat.includes('ratio') || cat.includes('percent') || cat.includes('百分')) {
    return isZh
      ? '【解题思路】先理清比与比例的关系：找出总量共分为多少份，计算出每份的具体数值，或明确单位“1”对应哪个量。'
      : '【Hint】Identify the ratio relationship: find the total number of parts, calculate the value of each single unit, or locate the base reference quantity.';
  }

  if (cat.includes('分') || cat.includes('小') || cat.includes('fraction') || cat.includes('decimal') || qText.includes('÷') || qText.includes('/')) {
    return isZh
      ? '【解题思路】分数除法遵循“除以一个不为零的数，等于乘这个数的倒数”；异分母加减运算前记得先通分。'
      : '【Hint】Recall fraction operations: dividing by a fraction is the same as multiplying by its reciprocal. Find a common denominator for additions.';
  }

  if (cat.includes('方程') || cat.includes('代数') || cat.includes('algebra') || cat.includes('equation') || qText.includes('x') || qText.includes('=')) {
    return isZh
      ? '【解题思路】抓住题干中的等量关系，根据等式的性质在方程两边同时做相同运算，逐步移项化简求出未知数。'
      : '【Hint】Identify the equality relation. Apply inverse operations to both sides of the equation step-by-step to isolate the variable.';
  }

  if (cat.includes('圆') || cat.includes('几何') || cat.includes('面积') || cat.includes('体积') || cat.includes('geometry') || cat.includes('circle')) {
    return isZh
      ? '【解题思路】回顾几何核心公式：圆周长 C = 2πr = πd，圆面积 S = πr²；求立体图形体积时注意“底面积 × 高”。'
      : '【Hint】Recall standard formulas: Circle circumference C = 2πr, area A = πr². For 3D prisms, calculate base area and multiply by height.';
  }

  if (cat.includes('负') || cat.includes('坐标') || cat.includes('integer') || cat.includes('coordinate')) {
    return isZh
      ? '【解题思路】数轴上原点左侧为负、右侧为正；绝对值表示距原点的距离；平面坐标系中注意 (x, y) 的横纵正负方向。'
      : '【Hint】Visualize the number line: negative values lie to the left. Absolute value is distance from zero. Check quadrant signs (x, y).';
  }

  return isZh
    ? '【解题思路】仔细审题，圈出已知条件与最终问题，理清各步骤的计算法则与数量关系，排除明显不符的选项再试一次！'
    : '【Hint】Re-read the question carefully, identify the given data and target goal, check the calculation steps, and eliminate unreasonable choices.';
}
