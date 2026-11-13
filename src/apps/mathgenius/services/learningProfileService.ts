import {
  DifficultyLevel,
  StudentLearningProfile,
  CategoryStat,
  LevelRecommendation,
  UserAnswer,
  Question,
  GRADE_6_CATEGORIES
} from '../types';
import { db } from '../../../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

const STORAGE_PREFIX = 'mathgenius_learning_profile_';

export const getDefaultLearningProfile = (studentId: string = 'guest'): StudentLearningProfile => ({
  studentId,
  currentDifficulty: 'standard',
  adaptiveMode: true,
  categoryStats: {},
  recentQuizScores: [],
  totalQuizzesTaken: 0,
  weakCategories: []
});

export const getLearningProfile = (studentId: string = 'guest'): StudentLearningProfile => {
  const key = `${STORAGE_PREFIX}${studentId}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...getDefaultLearningProfile(studentId),
        ...parsed,
        studentId
      };
    }
  } catch (err) {
    console.warn('[LearningProfile] Failed to load from localStorage:', err);
  }
  return getDefaultLearningProfile(studentId);
};

export const saveLearningProfile = (profile: StudentLearningProfile): void => {
  const key = `${STORAGE_PREFIX}${profile.studentId}`;
  try {
    localStorage.setItem(key, JSON.stringify(profile));
  } catch (err) {
    console.error('[LearningProfile] Failed to save to localStorage:', err);
  }

  // Asynchronously sync to Firestore if user is authenticated
  if (profile.studentId && profile.studentId !== 'guest') {
    try {
      const ref = doc(db, 'users', profile.studentId);
      setDoc(
        ref,
        {
          mathgeniusProfile: {
            currentDifficulty: profile.currentDifficulty,
            adaptiveMode: profile.adaptiveMode,
            weakCategories: profile.weakCategories,
            totalQuizzesTaken: profile.totalQuizzesTaken,
            updatedAt: Date.now()
          }
        },
        { merge: true }
      ).catch(e => console.warn('[LearningProfile] Firestore sync warning:', e));
    } catch (e) {
      // Non-blocking
    }
  }
};

export const computeWeakCategories = (categoryStats: Record<string, CategoryStat>): string[] => {
  const candidates: { id: string; errorWeight: number }[] = [];

  for (const [catId, stat] of Object.entries(categoryStats)) {
    if (stat.totalAttempted >= 2) {
      // Lower accuracy or higher recent errors increases weight
      const errorRate = 1 - stat.accuracy / 100;
      const errorWeight = errorRate * 10 + stat.recentErrors * 2;
      if (stat.accuracy < 75 || stat.recentErrors > 0) {
        candidates.push({ id: catId, errorWeight });
      }
    } else if (stat.recentErrors > 0) {
      candidates.push({ id: catId, errorWeight: stat.recentErrors * 3 });
    }
  }

  // Sort by highest error weight first, pick top 3
  candidates.sort((a, b) => b.errorWeight - a.errorWeight);
  return candidates.slice(0, 3).map(c => c.id);
};

export const recordQuizCompletion = (
  currentProfile: StudentLearningProfile,
  data: {
    score: number;
    totalQuestions: number;
    answers: UserAnswer[];
    questions: Question[];
    difficulty: DifficultyLevel;
    selectedCategory: string;
  }
): {
  updatedProfile: StudentLearningProfile;
  levelRecommendation: LevelRecommendation;
  weakPointsIdentified: string[];
} => {
  const { score, totalQuestions, answers, questions, difficulty, selectedCategory } = data;
  const now = Date.now();

  // Clone categoryStats
  const updatedStats: Record<string, CategoryStat> = { ...currentProfile.categoryStats };
  const currentQuizWeakPoints: Set<string> = new Set();

  answers.forEach(ans => {
    const q = questions.find(item => item.id === ans.questionId);
    // Find matching category ID
    let categoryKey = selectedCategory !== 'all' ? selectedCategory : 'all';
    if (q && q.category) {
      const matched = GRADE_6_CATEGORIES.find(
        c =>
          c.id === q.category ||
          c.labelZh === q.category ||
          c.labelEn === q.category ||
          q.category.includes(c.labelZh) ||
          q.category.includes(c.labelEn)
      );
      if (matched) {
        categoryKey = matched.id;
      }
    }

    if (!updatedStats[categoryKey]) {
      updatedStats[categoryKey] = {
        totalAttempted: 0,
        totalCorrect: 0,
        accuracy: 100,
        recentErrors: 0,
        lastPracticedAt: now
      };
    }

    const stat = updatedStats[categoryKey];
    stat.totalAttempted += 1;
    if (ans.isCorrect) {
      stat.totalCorrect += 1;
      // Decay recent errors on correct answer
      stat.recentErrors = Math.max(0, stat.recentErrors - 1);
    } else {
      stat.recentErrors += 1;
      currentQuizWeakPoints.add(categoryKey);
    }
    stat.accuracy = Math.round((stat.totalCorrect / stat.totalAttempted) * 100);
    stat.lastPracticedAt = now;
  });

  const weakCategories = computeWeakCategories(updatedStats);

  // Evaluate Adaptive Difficulty Progression
  const ratio = totalQuestions > 0 ? score / totalQuestions : 0;
  let recommendation: LevelRecommendation = {
    previousLevel: difficulty,
    newLevel: difficulty,
    action: 'maintained',
    reasonZh: '当前难度掌握良好，建议保持练习节奏。',
    reasonEn: 'Solid performance at this tier. Keep up the consistent practice.'
  };

  if (currentProfile.adaptiveMode) {
    if (ratio >= 0.85) {
      // Eligible for promotion
      if (difficulty === 'foundation') {
        recommendation = {
          previousLevel: 'foundation',
          newLevel: 'standard',
          action: 'promoted',
          reasonZh: '🎯 基础知识已完全掌握！已自动为你晋级到【进阶拓展】难度挑战！',
          reasonEn: '🎯 Core foundation mastered! Automatically promoted to Standard Curriculum.'
        };
      } else if (difficulty === 'standard') {
        recommendation = {
          previousLevel: 'standard',
          newLevel: 'challenge',
          action: 'promoted',
          reasonZh: '🔥 课标知识点表现优异！已为你解锁更高思维维度的【挑战与奥数】难度！',
          reasonEn: '🔥 Exceptional performance! Unlocked Olympiad & Advanced Challenge.'
        };
      } else {
        recommendation = {
          previousLevel: 'challenge',
          newLevel: 'challenge',
          action: 'maintained',
          reasonZh: '🌟 太强了！你在高难度【挑战与奥数】中依然名列前茅，已达顶尖水平！',
          reasonEn: '🌟 Outstanding! You excelled even at the highest Olympiad challenge level!'
        };
      }
    } else if (ratio <= 0.5) {
      // Needs reinforcement
      if (difficulty === 'challenge') {
        recommendation = {
          previousLevel: 'challenge',
          newLevel: 'standard',
          action: 'demoted',
          reasonZh: '💡 本次挑战难度偏高，已为你自适应平移回【进阶拓展】强化巩固！',
          reasonEn: '💡 That was challenging! Shifted back to Standard Curriculum for reinforcement.'
        };
      } else if (difficulty === 'standard') {
        recommendation = {
          previousLevel: 'standard',
          newLevel: 'foundation',
          action: 'demoted',
          reasonZh: '🌱 检测到部分核心概念存在卡点，已为你智能调整至【基础巩固】扫除盲区！',
          reasonEn: '🌱 Detected some concept hurdles. Shifted to Foundation & Basics to fill gaps.'
        };
      } else {
        recommendation = {
          previousLevel: 'foundation',
          newLevel: 'foundation',
          action: 'maintained',
          reasonZh: '💪 基础概念正在搭建中，建议针对错题解析多做两轮专项巩固。',
          reasonEn: '💪 Building foundations takes time. Review the explanations and retry.'
        };
      }
    }
  }

  const updatedProfile: StudentLearningProfile = {
    ...currentProfile,
    currentDifficulty: currentProfile.adaptiveMode ? recommendation.newLevel : currentProfile.currentDifficulty,
    categoryStats: updatedStats,
    recentQuizScores: [
      {
        score,
        total: totalQuestions,
        difficulty,
        date: new Date().toISOString()
      },
      ...currentProfile.recentQuizScores
    ].slice(0, 10),
    totalQuizzesTaken: currentProfile.totalQuizzesTaken + 1,
    weakCategories
  };

  saveLearningProfile(updatedProfile);

  return {
    updatedProfile,
    levelRecommendation: recommendation,
    weakPointsIdentified: Array.from(currentQuizWeakPoints)
  };
};
