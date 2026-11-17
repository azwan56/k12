import { httpsCallable } from "firebase/functions";
import { functions } from "../../../lib/firebase";
import { IG_MATH_QUESTIONS } from "../../../data/questionBanks/igMathQuestions";
import { SHANGHAI_MATH_QUESTIONS } from "../../../data/questionBanks/shanghaiMathQuestions";
import {
  drawUnseenFromStorage,
  rememberRecentMathStems,
  shuffleOptionsWithAnswer,
} from "../../../k12/questionDedupe";
import { Question, UserAnswer, DifficultyLevel } from "../types";

function buildLocalFallbackMathQuestions(
  language: 'en' | 'zh',
  uid?: string
): Question[] {
  const sourcePool =
    language === 'zh'
      ? SHANGHAI_MATH_QUESTIONS.filter((item) => item.grade === 'G6')
      : IG_MATH_QUESTIONS.filter((item) => item.grade === 'G6');
  const { selected } = drawUnseenFromStorage(
    `mg_fallback_${uid || 'guest'}_${language}`,
    sourcePool,
    (item) => item.id,
    10
  );
  const stamp = Date.now();
  const converted: Question[] = selected.map((item, idx) => {
    const shuffled = shuffleOptionsWithAnswer(item.options, item.answer);
    return {
      id: `mg_local_${stamp}_${idx + 1}`,
      question: item.question,
      options: shuffled.options,
      correctAnswer: shuffled.options[shuffled.answer],
      hint:
        language === 'zh'
          ? '先列出已知条件与数量关系，分步计算并仔细验算。'
          : 'Identify the known values and write down each step carefully before calculating.',
      explanation: item.explanation,
      category: language === 'zh' ? '六年级数学精选' : 'Grade 6 Math Practice',
    };
  });
  rememberRecentMathStems(
    uid,
    converted.map((q) => q.question)
  );
  return converted;
}

export const generateMathQuestions = async (
  language: 'en' | 'zh' = 'en',
  category: string = 'all',
  difficulty: DifficultyLevel = 'standard',
  weakPoints: string[] = [],
  recentQuestions: string[] = [],
  uid?: string
): Promise<Question[]> => {
  try {
    const generateQuestionsCallable = httpsCallable<
      {
        language: string;
        category: string;
        difficulty: string;
        weakPoints: string[];
        recentQuestions: string[];
      },
      { questions: Question[] }
    >(functions, 'generateMathQuestions');

    const result = await generateQuestionsCallable({
      language,
      category,
      difficulty,
      weakPoints,
      recentQuestions,
    });
    if (result.data && Array.isArray(result.data.questions) && result.data.questions.length > 0) {
      const stamp = Date.now();
      const normalized = result.data.questions.map((item, idx) => ({
        ...item,
        id: `mg_${stamp}_${idx + 1}`,
      }));
      rememberRecentMathStems(
        uid,
        normalized.map((q) => q.question)
      );
      return normalized;
    }
    throw new Error("Empty questions returned from backend.");
  } catch (error) {
    console.warn("Cloud Function unavailable for MathGenius, falling back to local unseen bank:", error);
    return buildLocalFallbackMathQuestions(language, uid);
  }
};

export async function* getFinalFeedbackStream(
  score: number,
  answers: UserAnswer[],
  questions: Question[],
  language: 'en' | 'zh' = 'en',
  category: string = 'all',
  difficulty: DifficultyLevel = 'standard'
): AsyncGenerator<string, void, unknown> {
  try {
    const getFeedbackCallable = httpsCallable<
      { score: number; answers: UserAnswer[]; questions: Question[]; language: string; category: string; difficulty: string },
      { feedback: string }
    >(functions, 'getFinalFeedback');

    const result = await getFeedbackCallable({
      score,
      answers,
      questions,
      language,
      category,
      difficulty
    });

    const fullFeedback = result.data?.feedback || (
      language === 'zh'
        ? "太棒了！你已经完成了本次六年级数学挑战。"
        : "Excellent effort! You've completed the Grade 6 challenge."
    );

    // Simulate smooth streaming effect for the UI
    const words = fullFeedback.split(/(\s+|，|。|！|!|\?|？)/);
    for (const chunk of words) {
      if (chunk) {
        yield chunk;
        await new Promise(resolve => setTimeout(resolve, 30));
      }
    }
  } catch (err) {
    console.error("Failed to fetch feedback via Cloud Function:", err);
    yield language === 'zh'
      ? "非常棒的尝试！继续保持对数学的探索与练习。"
      : "Excellent effort! You've completed the Grade 6 challenge.";
  }
}
