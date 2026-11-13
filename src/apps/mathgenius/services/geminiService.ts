import { httpsCallable } from "firebase/functions";
import { functions } from "../../../lib/firebase";
import { Question, UserAnswer, DifficultyLevel } from "../types";

export const generateMathQuestions = async (
  language: 'en' | 'zh' = 'en',
  category: string = 'all',
  difficulty: DifficultyLevel = 'standard',
  weakPoints: string[] = []
): Promise<Question[]> => {
  try {
    const generateQuestionsCallable = httpsCallable<
      { language: string; category: string; difficulty: string; weakPoints: string[] },
      { questions: Question[] }
    >(functions, 'generateMathQuestions');

    const result = await generateQuestionsCallable({
      language,
      category,
      difficulty,
      weakPoints
    });
    if (result.data && Array.isArray(result.data.questions) && result.data.questions.length > 0) {
      return result.data.questions;
    }
    throw new Error("Empty questions returned from backend.");
  } catch (error) {
    console.error("Failed to generate questions via Cloud Function:", error);
    throw new Error("Failed to generate questions. Please try again.");
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
