import OpenAI from 'openai';
import type { ServerConfig } from '../config.js';
import type { DbClient } from '../db/database.js';
import {
  buildPracticeCurriculumContext,
  getPromptsForCategory,
  parseLLMArrayJSON,
  parseLLMObjectJSON,
  pickDistinctThemes,
} from './prompts.js';

export interface OpenAICompatClient {
  chat: {
    completions: {
      create(body: Record<string, unknown>): Promise<{
        choices?: Array<{ message?: { content?: string | null } }>;
      }>;
    };
  };
}

export interface MathQuestionItem {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  hint: string;
  explanation: string;
  category: string;
}

export interface PracticeQuestionItem {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  topic: string;
  difficulty: 'foundation' | 'standard' | 'challenge';
}

export interface WordsmithDictItem {
  word: string;
  partOfSpeech: string;
  definition: string;
  synonyms: string[];
}

export interface WordsmithEvalResult {
  score: number;
  feedback: string;
  correction?: string;
  betterExamples: string[];
}

export class QwenService {
  private readonly config: ServerConfig;
  private readonly db: DbClient;
  private readonly clientOverride?: OpenAICompatClient;
  private cachedClient: OpenAI | null = null;

  constructor(db: DbClient, config: ServerConfig, clientOverride?: OpenAICompatClient) {
    this.db = db;
    this.config = config;
    this.clientOverride = clientOverride;
  }

  private getClient(): OpenAICompatClient {
    if (this.clientOverride) return this.clientOverride;
    if (!this.config.dashscopeApiKey) {
      throw new Error('DASHSCOPE_API_KEY is not configured');
    }
    if (!this.cachedClient) {
      this.cachedClient = new OpenAI({
        apiKey: this.config.dashscopeApiKey,
        baseURL: this.config.dashscopeBaseUrl,
      });
    }
    return this.cachedClient as unknown as OpenAICompatClient;
  }

  private async callChatWithFallback(params: {
    models: string[];
    messages: Array<{ role: 'system' | 'user'; content: string }>;
    temperature?: number;
    jsonMode?: boolean;
    label: string;
  }): Promise<string> {
    const client = this.getClient();
    let lastError: unknown;

    for (const model of Array.from(new Set(params.models.filter(Boolean)))) {
      try {
        const body: Record<string, unknown> = {
          model,
          messages: params.messages,
          temperature: params.temperature ?? 0.7,
          enable_thinking: false,
        };
        if (params.jsonMode) {
          body.response_format = { type: 'json_object' };
        }
        const completion = await client.chat.completions.create(body);
        const content = completion?.choices?.[0]?.message?.content;
        if (typeof content === 'string' && content.trim()) {
          return content;
        }
      } catch (err) {
        console.warn(`[QwenService:${params.label}] model ${model} failed:`, err instanceof Error ? err.message : err);
        lastError = err;
      }
    }

    throw lastError instanceof Error ? lastError : new Error('All Qwen models failed');
  }

  async generateMathQuestions(params: {
    language?: string;
    category?: string;
    difficulty?: string;
    weakPoints?: string[];
    recentQuestions?: string[];
  }): Promise<MathQuestionItem[]> {
    const language = params.language === 'zh' ? 'zh' : 'en';
    const category = params.category || 'all';
    const difficulty = params.difficulty || 'standard';
    const weakPoints = Array.isArray(params.weakPoints) ? params.weakPoints : [];
    const recentQuestions = Array.isArray(params.recentQuestions) ? params.recentQuestions : [];

    const [prompt1, prompt2] = getPromptsForCategory(
      category,
      language,
      difficulty,
      weakPoints,
      recentQuestions
    );

    const models =
      difficulty === 'challenge'
        ? [this.config.qwenModelMathChallenge, this.config.qwenModelPractice, this.config.qwenModelFast]
        : [this.config.qwenModelPractice, this.config.qwenModelFast];

    const [res1, res2] = await Promise.all([
      this.callChatWithFallback({
        models,
        messages: [
          {
            role: 'system',
            content: 'You are a meticulous Grade 6 math assessment author. Always verify arithmetic and return valid JSON.',
          },
          { role: 'user', content: prompt1 },
        ],
        temperature: 0.85,
        jsonMode: true,
        label: 'MathGenius-1',
      }),
      this.callChatWithFallback({
        models,
        messages: [
          {
            role: 'system',
            content: 'You are a meticulous Grade 6 math assessment author. Always verify arithmetic and return valid JSON.',
          },
          { role: 'user', content: prompt2 },
        ],
        temperature: 0.85,
        jsonMode: true,
        label: 'MathGenius-2',
      }),
    ]);

    const q1 = parseLLMArrayJSON<Record<string, unknown>>(res1);
    const q2 = parseLLMArrayJSON<Record<string, unknown>>(res2);
    const seenStems = new Set<string>();
    const merged: MathQuestionItem[] = [];

    for (const item of [...q1, ...q2]) {
      if (!item || typeof item.question !== 'string') continue;
      const question = item.question.replace(/\s+/g, ' ').trim();
      const norm = question.toLowerCase();
      if (!norm || seenStems.has(norm)) continue;

      if (!Array.isArray(item.options) || item.options.length !== 4) continue;
      const options = item.options.map((o) => String(o ?? '').trim()).filter(Boolean);
      if (options.length !== 4 || new Set(options).size !== 4) continue;

      const correctAnswer = typeof item.correctAnswer === 'string' ? item.correctAnswer.trim() : '';
      if (!options.includes(correctAnswer)) continue;

      seenStems.add(norm);
      merged.push({
        id: `q_${merged.length + 1}`,
        question,
        options,
        correctAnswer,
        hint: typeof item.hint === 'string' ? item.hint.trim() : '',
        explanation: typeof item.explanation === 'string' ? item.explanation.trim() : '',
        category: typeof item.category === 'string' ? item.category.trim() : 'Math',
      });
    }

    return merged;
  }

  async getFinalFeedback(params: {
    score: number;
    answers: Array<{ questionId: string; answer: string; isCorrect: boolean }>;
    questions: Array<{ id: string; question: string; correctAnswer: string; category?: string }>;
    language?: string;
    category?: string;
    difficulty?: string;
  }): Promise<string> {
    const language = params.language === 'zh' ? 'zh' : 'en';
    const category = params.category || 'all';
    const difficulty = params.difficulty || 'standard';
    const questions = Array.isArray(params.questions) ? params.questions : [];
    const answers = Array.isArray(params.answers) ? params.answers : [];

    const details = answers
      .map((ans, idx) => {
        const q = questions.find((item) => item.id === ans.questionId);
        return `Q${idx + 1} [${q?.category || 'Math'}]: ${q ? q.question : ''} | Result: ${ans.isCorrect ? 'Correct' : 'Incorrect'} | User Answer: ${ans.answer} | Correct Answer: ${q ? q.correctAnswer : ''}`;
      })
      .join('\n');

    const prompt = `A Grade 6 student (11-12 years old) just finished a math quiz on category: ${category}.
Difficulty Tier: ${String(difficulty).toUpperCase()}.
Score: ${params.score}/${questions.length || 10}.
Performance details:
${details}

Provide an encouraging, constructive summary feedback in ${language === 'zh' ? 'Simplified Chinese' : 'English'} (2-3 sentences).
Specifically mention which Grade 6 topics/knowledge points they demonstrated strong mastery in, recognize their effort relative to the "${difficulty}" difficulty level, and give concrete advice on where they might review further (based on missed questions). Be supportive, warm, and inspiring like a veteran math teacher.`;

    return this.callChatWithFallback({
      models: [this.config.qwenModelFast, this.config.qwenModelPractice],
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      jsonMode: false,
      label: 'MathFeedback',
    });
  }

  async generateWordsmithBatch(words: string[]): Promise<WordsmithDictItem[]> {
    const cleanWords = Array.from(
      new Set(words.map((w) => String(w || '').trim()).filter((w) => w.length > 0 && w.length < 40))
    ).slice(0, 50);
    if (cleanWords.length === 0) return [];

    const cachedByLower = new Map<string, WordsmithDictItem>();
    for (const w of cleanWords) {
      const row = await this.db.queryOne<{
        word_lower: string;
        word: string;
        part_of_speech: string;
        definition: string;
        synonyms_json: string;
      }>(
        `SELECT word_lower, word, part_of_speech, definition, synonyms_json
         FROM wordsmith_dictionary_cache WHERE word_lower = $1`,
        [w.toLowerCase()]
      );
      if (row) {
        let syns: string[] = [];
        try {
          const parsed = JSON.parse(row.synonyms_json);
          if (Array.isArray(parsed)) syns = parsed.map(String);
        } catch {
          syns = [];
        }
        cachedByLower.set(row.word_lower, {
          word: row.word,
          partOfSpeech: row.part_of_speech,
          definition: row.definition,
          synonyms: syns,
        });
      }
    }

    const missingWords = cleanWords.filter((w) => !cachedByLower.has(w.toLowerCase()));
    if (missingWords.length > 0) {
      const content = await this.callChatWithFallback({
        models: [this.config.qwenModelFast, this.config.qwenModelPractice],
        messages: [
          {
            role: 'system',
            content:
              'You are a friendly junior dictionary for 10-12 year olds. Always provide simple definitions and helpful synonyms. Output strictly valid JSON object of the form {"items": [{"word": string, "partOfSpeech": string, "definition": string, "synonyms": string[]}]}.',
          },
          {
            role: 'user',
            content: `Provide dictionary JSON data for these words: ${JSON.stringify(missingWords)}`,
          },
        ],
        temperature: 0.4,
        jsonMode: true,
        label: 'WordsmithBatch',
      });

      const items = parseLLMArrayJSON<Record<string, unknown>>(content);
      const now = Date.now();
      for (const raw of items) {
        if (!raw || typeof raw.word !== 'string') continue;
        const word = raw.word.trim().slice(0, 40);
        if (!word) continue;
        const entry: WordsmithDictItem = {
          word,
          partOfSpeech: typeof raw.partOfSpeech === 'string' ? raw.partOfSpeech.trim().slice(0, 32) : 'word',
          definition: typeof raw.definition === 'string' ? raw.definition.trim().slice(0, 300) : '',
          synonyms: Array.isArray(raw.synonyms)
            ? raw.synonyms.map((s) => String(s).trim()).filter(Boolean).slice(0, 5)
            : [],
        };
        const lower = word.toLowerCase();
        cachedByLower.set(lower, entry);
        await this.db.execute(
          `INSERT INTO wordsmith_dictionary_cache (word_lower, word, part_of_speech, definition, synonyms_json, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (word_lower) DO NOTHING`,
          [lower, entry.word, entry.partOfSpeech, entry.definition, JSON.stringify(entry.synonyms), now]
        );
      }
    }

    return cleanWords
      .map((w) => cachedByLower.get(w.toLowerCase()))
      .filter((item): item is WordsmithDictItem => Boolean(item));
  }

  async evaluateWordsmithSentence(word: string, sentence: string): Promise<WordsmithEvalResult> {
    const cleanWord = word.trim();
    const cleanSentence = sentence.trim();

    const content = await this.callChatWithFallback({
      models: [this.config.qwenModelPractice, this.config.qwenModelFast],
      messages: [
        {
          role: 'system',
          content: `You are a supportive and professional English writing coach for students aged 10-12.
Your goal is to provide constructive feedback on their use of vocabulary and grammar.
RULES:
1. Always be encouraging.
2. Score from 1 to 5 (5 is perfect).
3. If the student only repeats the target word or writes fewer than 3 words instead of a complete sentence, give score 1 and gently encourage them to write a full sentence.
4. ALWAYS provide exactly two 'betterExamples' showing natural, grammatical use of the target word for a 10-12 year old.
5. If there is a grammatical error or missing sentence structure, provide a 'correction'.
6. If the sentence is perfect, celebrate their creativity in 'feedback'.
7. Do not refuse to answer. If the sentence is confusing, give score 1 and explain why nicely.

OUTPUT FORMAT: Strict JSON object with keys: 'score' (integer 1-5), 'feedback' (string), optional 'correction' (string), and 'betterExamples' (array of exactly two strings).`,
        },
        {
          role: 'user',
          content: `Word: "${cleanWord}"\nStudent's Sentence: "${cleanSentence}"`,
        },
      ],
      temperature: 0.5,
      jsonMode: true,
      label: 'WordsmithEval',
    });

    const parsed = parseLLMObjectJSON<Record<string, unknown>>(content);
    const score = Math.max(1, Math.min(5, Math.round(Number(parsed.score) || 1)));
    const betterExamples =
      Array.isArray(parsed.betterExamples) && parsed.betterExamples.length > 0
        ? parsed.betterExamples.map((s) => String(s).trim()).filter(Boolean).slice(0, 2)
        : [
            `Try writing a full sentence that shows the meaning of "${cleanWord}".`,
            `The students practiced using "${cleanWord}" in their own stories.`,
          ];

    return {
      score,
      feedback: typeof parsed.feedback === 'string' && parsed.feedback.trim() ? parsed.feedback.trim() : 'Keep practicing!',
      ...(typeof parsed.correction === 'string' && parsed.correction.trim()
        ? { correction: parsed.correction.trim() }
        : {}),
      betterExamples,
    };
  }

  async generatePracticeQuestions(params: {
    subjectId: string;
    grade: string;
    difficulty: string;
    trackId?: string;
    trackName?: string;
    topics?: string[];
    count?: number;
    recentStems?: string[];
  }): Promise<PracticeQuestionItem[]> {
    const count = Math.min(8, Math.max(1, Math.round(Number(params.count) || 5)));
    const cleanRecent = Array.isArray(params.recentStems)
      ? params.recentStems
          .filter((s) => typeof s === 'string')
          .map((s) => s.replace(/\s+/g, ' ').trim().slice(0, 140))
          .filter(Boolean)
          .slice(0, 24)
      : [];
    const topics = Array.isArray(params.topics)
      ? params.topics.map((t) => String(t).replace(/\s+/g, ' ').trim().slice(0, 80)).filter(Boolean).slice(0, 8)
      : [];

    const { langRule, curriculum, guard } = buildPracticeCurriculumContext(
      params.subjectId,
      params.grade,
      params.trackId || '',
      params.trackName || '',
      topics
    );
    const [theme1, theme2] = pickDistinctThemes();

    const diffInstruction =
      params.difficulty === 'all'
        ? `- Mix difficulty levels across the ${count} questions (roughly equal balance of "foundation", "standard", and "challenge").`
        : `- Every question MUST match the "${params.difficulty}" difficulty tier ("foundation" = core concepts/single-step, "standard" = multi-step curriculum application, "challenge" = deeper inquiry/synthesis/Olympiad).`;

    const antiRepeat =
      cleanRecent.length > 0
        ? `- NEVER repeat, paraphrase, or merely swap numbers from these recently seen stems:\n  ${cleanRecent
            .map((s, idx) => `${idx + 1}. ${s}`)
            .join('\n  ')}`
        : '- Make every question fresh and non-repetitive.';

    const prompt = `You are an expert international-school curriculum assessment author.
Generate exactly ${count} fresh multiple-choice questions for:
${curriculum}

Creative context inspiration: "${theme1}" and "${theme2}".
Requirements:
${langRule}
${diffInstruction}
${guard}
${antiRepeat}
- Each question MUST have:
  - "question": clear prompt (max 520 characters)
  - "options": array of EXACTLY 4 distinct options (each max 240 characters, no "A./B." prefixes inside option text)
  - "answerIndex": integer 0, 1, 2, or 3 indicating the single unambiguously correct option
  - "explanation": concise, accurate step-by-step explanation (max 380 characters)
  - "topic": specific short sub-topic label (max 65 characters)
  - "difficulty": one of "foundation", "standard", "challenge"
- Verify every fact, formula, and calculation carefully before outputting JSON.
- Output strictly a valid JSON object of the form {"items": [...]}.`;

    const content = await this.callChatWithFallback({
      models: [this.config.qwenModelPractice, this.config.qwenModelFast],
      messages: [
        {
          role: 'system',
          content: 'You are an expert curriculum assessment author. Output strictly valid JSON with key "items".',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.9,
      jsonMode: true,
      label: 'PracticeDynamic',
    });

    const rawList = parseLLMArrayJSON<Record<string, unknown>>(content);
    const recentNormSet = new Set(cleanRecent.map((s) => s.replace(/\s+/g, ' ').trim().toLowerCase()));
    const batchNormSet = new Set<string>();
    const validated: PracticeQuestionItem[] = [];

    for (const item of rawList) {
      if (!item || typeof item !== 'object') continue;
      const qText =
        typeof item.question === 'string'
          ? item.question.replace(/\s+/g, ' ').trim().slice(0, 550)
          : '';
      if (!qText) continue;
      const normQ = qText.toLowerCase();
      if (recentNormSet.has(normQ) || batchNormSet.has(normQ)) continue;

      if (!Array.isArray(item.options) || item.options.length !== 4) continue;
      const cleanOpts = item.options.map((opt) =>
        typeof opt === 'string' ? opt.replace(/\s+/g, ' ').trim().slice(0, 280) : ''
      );
      if (cleanOpts.some((opt) => !opt) || new Set(cleanOpts).size !== 4) continue;

      const ansIdx = Number(item.answerIndex);
      if (!Number.isInteger(ansIdx) || ansIdx < 0 || ansIdx > 3) continue;

      const expText =
        typeof item.explanation === 'string'
          ? item.explanation.replace(/\s+/g, ' ').trim().slice(0, 400)
          : '';
      if (!expText) continue;

      const topicText =
        typeof item.topic === 'string'
          ? item.topic.replace(/\s+/g, ' ').trim().slice(0, 70)
          : params.trackName || params.subjectId;
      const itemDiff =
        item.difficulty === 'foundation' ||
        item.difficulty === 'standard' ||
        item.difficulty === 'challenge'
          ? item.difficulty
          : params.difficulty === 'all'
            ? 'standard'
            : (params.difficulty as 'foundation' | 'standard' | 'challenge');

      batchNormSet.add(normQ);
      validated.push({
        question: qText,
        options: cleanOpts,
        answerIndex: ansIdx,
        explanation: expText,
        topic: topicText,
        difficulty: itemDiff,
      });
      if (validated.length >= count) break;
    }

    return validated;
  }
}
