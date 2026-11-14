const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });
const { GoogleGenAI, Type } = require("@google/genai");

if (!admin.apps.length) {
  admin.initializeApp();
}

const geminiApiKeySecret = defineSecret("GEMINI_API_KEY");

const CANDIDATE_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.8-flash",
  "gemini-4-hydrogen",
  "gemini-3.5-flash",
  "gemini-3-flash-preview"
];

function getGeminiApiKey() {
  return (
    process.env.GEMINI_API_KEY ||
    (typeof geminiApiKeySecret.value === "function" ? geminiApiKeySecret.value() : "")
  );
}

function stripJsonTicks(text) {
  let textToParse = (text || "").trim();
  if (textToParse.startsWith("```json")) {
    textToParse = textToParse.substring(7);
  } else if (textToParse.startsWith("```")) {
    textToParse = textToParse.substring(3);
  }
  if (textToParse.endsWith("```")) {
    textToParse = textToParse.substring(0, textToParse.length - 3);
  }
  return textToParse.trim();
}

function parseLLMJSON(jsonString) {
  return JSON.parse(stripJsonTicks(jsonString));
}

async function generateWithFallback(ai, options, label = "K12") {
  let lastError;
  for (const model of CANDIDATE_MODELS) {
    try {
      const res = await ai.models.generateContent({
        ...options,
        model
      });
      if (res && res.text) {
        console.log(`[${label}] succeeded with model: ${model}`);
        return res;
      }
    } catch (err) {
      console.warn(`[${label}] Model ${model} failed, trying next candidate:`, err?.message || err);
      lastError = err;
    }
  }
  throw lastError || new Error("All Gemini models failed");
}

function getPromptsForCategory(category, language, difficulty = "standard", weakPoints = []) {
  const isZh = language === "zh";
  const langReq = isZh
    ? "- All text (questions, options, explanations, category names) MUST be strictly written in Simplified Chinese."
    : "- All text (questions, options, explanations, category names) MUST be in English.";

  let difficultyDirective = "";
  if (difficulty === "foundation") {
    difficultyDirective = isZh
      ? "- 难度档位：【基础巩固】。聚焦核心定义、基本运算法则与基础单步计算，题目表述通俗易懂直截了当，不设多重弯绕，着重夯实基本功并建立数学信心。"
      : "- Difficulty Tier: [FOUNDATION & BASICS]. Focus on core definitions, fundamental operations, and direct single-step calculations. Straightforward wording without convoluted traps to build strong core fundamentals and student confidence.";
  } else if (difficulty === "challenge") {
    difficultyDirective = isZh
      ? "- 难度档位：【挑战与奥数】。高阶思维拓展、奥数竞赛题型与跨知识点综合推理，多步复杂情境，要求严密数理逻辑与创新解题视角。"
      : "- Difficulty Tier: [OLYMPIAD & ADVANCED CHALLENGE]. Advanced mathematical reasoning, Olympiad competition-style problems, multi-step problem solving, and cross-topic integration requiring deep analytical thinking.";
  } else {
    difficultyDirective = isZh
      ? "- 难度档位：【进阶拓展】。严格贴合六年级（11~12岁）标准课标，包含两步及以上应用题、现实生活建模与综合概念应用。"
      : "- Difficulty Tier: [STANDARD CURRICULUM]. Standard curriculum for 11-12 year old Grade 6 students. Multi-step word problems, practical modeling, and solid conceptual application.";
  }

  let weakPointsDirective = "";
  if (Array.isArray(weakPoints) && weakPoints.length > 0) {
    const listStr = weakPoints.join(", ");
    weakPointsDirective = isZh
      ? `\n- 【错题弱项靶向强化】：学生近期在以下知识模块存在错题或薄弱点：[${listStr}]。请务必将出题重点向这些薄弱知识点定向倾斜（至少分配 60% 题目针对相关概念出题），从不同角度与情境进行专项巩固！`
      : `\n- [TARGETED WEAK-POINT DRILL]: The student recently made errors in these topics: [${listStr}]. Please allocate at least 60% of questions specifically to reinforce and remediate these weak points from varied angles.`;
  }

  switch (category) {
    case "ratios_percentages":
      return [
        `You are a professional Grade 6 Math teacher. Generate exactly 5 high-quality math practice questions on Ratios, Rates & Proportions.
Topics to cover:
1. Understanding ratio concepts and using ratio language.
2. Calculating unit rates (e.g., speed, unit price).
3. Solving real-world ratio and rate problems using tables or equations.
4. Scale drawings and scale factor.
Requirements:
${langReq}
${difficultyDirective}${weakPointsDirective}
- Each question must have 4 distinct options with exactly one correct answer.
- Provide a concise "hint" (解题思路与思考方向) that guides the student's problem-solving thinking without revealing the actual correct answer or option.
- Provide a detailed step-by-step explanation.
- Category attribute must clearly state the specific knowledge point name (e.g., "${isZh ? "比和比率" : "Ratios & Rates"}").
- Return as a JSON array.`,

        `You are a professional Grade 6 Math teacher. Generate exactly 5 high-quality math practice questions on Percentages & Applications.
Topics to cover:
1. Finding a percent of a quantity as a rate per 100.
2. Solving problems involving finding the whole, given a part and the percent.
3. Real-world percentage applications: discounts, sales tax, markups, tips.
4. Percent of increase and decrease.
Requirements:
${langReq}
${difficultyDirective}${weakPointsDirective}
- Each question must have 4 distinct options with exactly one correct answer.
- Provide a concise "hint" (解题思路与思考方向) that guides the student's problem-solving thinking without revealing the actual correct answer or option.
- Provide a detailed step-by-step explanation.
- Category attribute must clearly state the specific knowledge point name (e.g., "${isZh ? "百分数应用" : "Percentages & Applications"}").
- Return as a JSON array.`
      ];

    case "fractions_decimals":
      return [
        `You are a professional Grade 6 Math teacher. Generate exactly 5 high-quality math practice questions on Fractions Operations.
Topics to cover:
1. Interpreting and computing quotients of fractions (dividing fractions by fractions).
2. Solving word problems involving fraction division using visual models and equations.
3. Multi-step operations with fractions and mixed numbers.
Requirements:
${langReq}
${difficultyDirective}${weakPointsDirective}
- Each question must have 4 distinct options with exactly one correct answer.
- Provide a concise "hint" (解题思路与思考方向) that guides the student's problem-solving thinking without revealing the actual correct answer or option.
- Provide a detailed step-by-step explanation.
- Category attribute must clearly state the specific knowledge point name (e.g., "${isZh ? "分数乘除法与混合运算" : "Fraction Operations"}").
- Return as a JSON array.`,

        `You are a professional Grade 6 Math teacher. Generate exactly 5 high-quality math practice questions on Decimals & Mixed Operations.
Topics to cover:
1. Fluently adding, subtracting, multiplying, and dividing multi-digit decimals using standard algorithms.
2. Converting between fractions, decimals, and mixed numbers.
3. Multi-step real-world problem solving with fractions and decimals.
Requirements:
${langReq}
${difficultyDirective}${weakPointsDirective}
- Each question must have 4 distinct options with exactly one correct answer.
- Provide a concise "hint" (解题思路与思考方向) that guides the student's problem-solving thinking without revealing the actual correct answer or option.
- Provide a detailed step-by-step explanation.
- Category attribute must clearly state the specific knowledge point name (e.g., "${isZh ? "小数运算与综合应用" : "Decimals & Mixed Operations"}").
- Return as a JSON array.`
      ];

    case "algebra_equations":
      return [
        `You are a professional Grade 6 Math teacher. Generate exactly 5 high-quality math practice questions on Algebraic Expressions.
Topics to cover:
1. Writing, reading, and evaluating algebraic expressions in which letters stand for numbers.
2. Evaluating expressions with whole-number exponents.
3. Applying properties of operations to generate equivalent expressions (distributive property, combining like terms).
Requirements:
${langReq}
${difficultyDirective}${weakPointsDirective}
- Each question must have 4 distinct options with exactly one correct answer.
- Provide a concise "hint" (解题思路与思考方向) that guides the student's problem-solving thinking without revealing the actual correct answer or option.
- Provide a detailed step-by-step explanation.
- Category attribute must clearly state the specific knowledge point name (e.g., "${isZh ? "代数式与化简" : "Algebraic Expressions"}").
- Return as a JSON array.`,

        `You are a professional Grade 6 Math teacher. Generate exactly 5 high-quality math practice questions on One-Step Equations & Inequalities.
Topics to cover:
1. Solving equations of the form x + p = q and px = q for cases in which p, q, and x are all non-negative rational numbers.
2. Using variables to represent numbers and write equations when solving a real-world or mathematical problem.
3. Writing and interpreting simple inequalities (x > c, x <= c) to represent conditions in real-world problems.
Requirements:
${langReq}
${difficultyDirective}${weakPointsDirective}
- Each question must have 4 distinct options with exactly one correct answer.
- Provide a concise "hint" (解题思路与思考方向) that guides the student's problem-solving thinking without revealing the actual correct answer or option.
- Provide a detailed step-by-step explanation.
- Category attribute must clearly state the specific knowledge point name (e.g., "${isZh ? "一元一次方程与不等式" : "Equations & Inequalities"}").
- Return as a JSON array.`
      ];

    case "circles_geometry":
      return [
        `You are a professional Grade 6 Math teacher. Generate exactly 5 high-quality math practice questions on Circles & Circumference/Area.
Topics to cover:
1. Understanding the relationship between diameter, radius, and circumference of a circle (pi).
2. Calculating circumference of a circle given radius or diameter.
3. Calculating the area of a circle (A = pi * r^2).
4. Finding area or perimeter of semicircles and composite circle shapes.
Requirements:
${langReq}
${difficultyDirective}${weakPointsDirective}
- Use 3.14 or 22/7 for pi when needed.
- Each question must have 4 distinct options with exactly one correct answer.
- Provide a concise "hint" (解题思路与思考方向) that guides the student's problem-solving thinking without revealing the actual correct answer or option.
- Provide a detailed step-by-step explanation.
- Category attribute must clearly state the specific knowledge point name (e.g., "${isZh ? "圆的周长与面积" : "Circles & Area"}").
- Return as a JSON array.`,

        `You are a professional Grade 6 Math teacher. Generate exactly 5 high-quality math practice questions on 3D Geometry (Surface Area & Volume).
Topics to cover:
1. Finding the volume of a right rectangular prism with fractional edge lengths.
2. Finding the surface area of rectangular prisms, cubes, and cylinders.
3. Using nets made up of rectangles and triangles to find the surface area of 3D figures.
Requirements:
${langReq}
${difficultyDirective}${weakPointsDirective}
- Each question must have 4 distinct options with exactly one correct answer.
- Provide a concise "hint" (解题思路与思考方向) that guides the student's problem-solving thinking without revealing the actual correct answer or option.
- Provide a detailed step-by-step explanation.
- Category attribute must clearly state the specific knowledge point name (e.g., "${isZh ? "立体图形表面积与体积" : "Surface Area & Volume"}").
- Return as a JSON array.`
      ];

    case "integers_coordinates":
      return [
        `You are a professional Grade 6 Math teacher. Generate exactly 5 high-quality math practice questions on Negative Numbers & Absolute Value.
Topics to cover:
1. Using positive and negative numbers to represent quantities in real-world contexts (temperature, debt, elevation).
2. Recognizing opposite signs of numbers and locating integers on a number line.
3. Understanding absolute value of a rational number as its distance from 0 on the number line.
4. Comparing and ordering rational numbers, including negative numbers.
Requirements:
${langReq}
${difficultyDirective}${weakPointsDirective}
- Each question must have 4 distinct options with exactly one correct answer.
- Provide a concise "hint" (解题思路与思考方向) that guides the student's problem-solving thinking without revealing the actual correct answer or option.
- Provide a detailed step-by-step explanation.
- Category attribute must clearly state the specific knowledge point name (e.g., "${isZh ? "正负数与绝对值" : "Integers & Absolute Value"}").
- Return as a JSON array.`,

        `You are a professional Grade 6 Math teacher. Generate exactly 5 high-quality math practice questions on The Coordinate Plane.
Topics to cover:
1. Finding and positioning pairs of integers and other rational numbers on a four-quadrant coordinate plane.
2. Identifying which quadrant a point (x, y) lies in.
3. Finding horizontal and vertical distances between points with the same first coordinate or second coordinate.
4. Reflecting points across the x-axis or y-axis.
Requirements:
${langReq}
${difficultyDirective}${weakPointsDirective}
- Each question must have 4 distinct options with exactly one correct answer.
- Provide a concise "hint" (解题思路与思考方向) that guides the student's problem-solving thinking without revealing the actual correct answer or option.
- Provide a detailed step-by-step explanation.
- Category attribute must clearly state the specific knowledge point name (e.g., "${isZh ? "平面直角坐标系" : "Coordinate Plane"}").
- Return as a JSON array.`
      ];

    case "all":
    default:
      return [
        `You are a professional Grade 6 Math teacher. Generate exactly 5 high-quality Grade 6 math practice questions covering:
1. Unit rates, ratios, and percentages in real world problems.
2. Dividing fractions by fractions and multi-step fraction operations.
3. Writing and evaluating algebraic expressions with variables and exponents.
Requirements:
${langReq}
${difficultyDirective}${weakPointsDirective}
- Each question must have 4 distinct options with exactly one correct answer.
- Provide a concise "hint" (解题思路与思考方向) that guides the student's problem-solving thinking without revealing the actual correct answer or option.
- Provide a detailed step-by-step explanation.
- Category attribute must identify the specific knowledge point for each question (e.g., "${isZh ? "比与比例" : "Ratios"}", "${isZh ? "分数运算" : "Fractions"}", "${isZh ? "代数式" : "Algebra"}").
- Return as a JSON array.`,

        `You are a professional Grade 6 Math teacher. Generate exactly 5 high-quality Grade 6 math practice questions covering:
1. Solving one-step/two-step linear equations.
2. Circumference and area of circles, or volume/surface area of 3D prisms.
3. Negative integers, absolute value, and the four-quadrant coordinate plane.
Requirements:
${langReq}
${difficultyDirective}${weakPointsDirective}
- Each question must have 4 distinct options with exactly one correct answer.
- Provide a concise "hint" (解题思路与思考方向) that guides the student's problem-solving thinking without revealing the actual correct answer or option.
- Provide a detailed step-by-step explanation.
- Category attribute must identify the specific knowledge point for each question (e.g., "${isZh ? "一元一次方程" : "Equations"}", "${isZh ? "圆与立体几何" : "Geometry"}", "${isZh ? "负数与坐标系" : "Integers & Coordinates"}").
- Return as a JSON array.`
      ];
  }
}

exports.generateMathQuestions = onCall(
  {
    secrets: [geminiApiKeySecret],
    cors: true,
    timeoutSeconds: 90,
    memory: "512MiB"
  },
  async (request) => {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      throw new HttpsError("failed-precondition", "GEMINI_API_KEY is not configured.");
    }

    const {
      language = "en",
      category = "all",
      difficulty = "standard",
      weakPoints = []
    } = request.data || {};
    const ai = new GoogleGenAI({ apiKey });

    const [prompt1, prompt2] = getPromptsForCategory(category, language, difficulty, weakPoints);

    const config = {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswer: { type: Type.STRING },
            hint: { type: Type.STRING },
            explanation: { type: Type.STRING },
            category: { type: Type.STRING }
          },
          required: ["id", "question", "options", "correctAnswer", "hint", "explanation", "category"]
        }
      }
    };

    try {
      const [response1, response2] = await Promise.all([
        generateWithFallback(ai, { contents: prompt1, config }, "MathGenius"),
        generateWithFallback(ai, { contents: prompt2, config }, "MathGenius")
      ]);

      const questions1 = parseLLMJSON(response1.text || "[]");
      const questions2 = parseLLMJSON(response2.text || "[]");
      return { questions: [...questions1, ...questions2] };
    } catch (error) {
      console.error("Failed to generate Grade 6 math questions:", error);
      throw new HttpsError("internal", "Failed to generate math questions.");
    }
  }
);

exports.getFinalFeedback = onCall(
  {
    secrets: [geminiApiKeySecret],
    cors: true,
    timeoutSeconds: 60,
    memory: "512MiB"
  },
  async (request) => {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      throw new HttpsError("failed-precondition", "GEMINI_API_KEY is not configured.");
    }

    const {
      score,
      answers,
      questions,
      language = "en",
      category = "all",
      difficulty = "standard"
    } = request.data || {};
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `A Grade 6 student (11-12 years old) just finished a math quiz on category: ${category}. 
Difficulty Tier: ${String(difficulty).toUpperCase()}.
Score: ${score}/${questions ? questions.length : 10}. 
Performance details:
${(answers || [])
  .map((ans, idx) => {
    const q = (questions || []).find((item) => item.id === ans.questionId);
    return `Q${idx + 1} [${q?.category || "Math"}]: ${q ? q.question : ""} | Result: ${ans.isCorrect ? "Correct" : "Incorrect"} | User Answer: ${ans.answer} | Correct Answer: ${q ? q.correctAnswer : ""}`;
  })
  .join("\n")}

Provide an encouraging, constructive summary feedback in ${language === "zh" ? "Simplified Chinese" : "English"} (2-3 sentences). 
Specifically mention which Grade 6 topics/knowledge points they demonstrated strong mastery in, recognize their effort relative to the "${difficulty}" difficulty level, and give concrete advice on where they might review further (based on missed questions). Be supportive, warm, and inspiring like a veteran math teacher.`;

    try {
      const response = await generateWithFallback(
        ai,
        { contents: prompt },
        "MathGeniusFeedback"
      );

      return { feedback: response.text || "" };
    } catch (error) {
      console.error("Failed to generate feedback:", error);
      throw new HttpsError("internal", "Failed to generate feedback.");
    }
  }
);

exports.generateWordsmithBatch = onRequest(
  {
    secrets: [geminiApiKeySecret],
    maxInstances: 50,
    timeoutSeconds: 60,
    memory: "512MiB",
    cors: true,
    invoker: "public"
  },
  async (req, res) => {
    cors(req, res, async () => {
      if (req.method !== "POST") return res.status(405).send("Method Not Allowed");
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).send("Unauthorized");
      }
      try {
        const idToken = authHeader.split("Bearer ")[1];
        await admin.auth().verifyIdToken(idToken);
      } catch (error) {
        return res.status(401).send("Unauthorized: Invalid token.");
      }
      const { words } = (req.body && (req.body.data || req.body)) || {};
      if (!words || !Array.isArray(words) || words.length === 0) {
        return res.status(400).send("Bad Request: Missing words.");
      }

      const apiKey = getGeminiApiKey();
      if (!apiKey) {
        return res.status(500).send("GEMINI_API_KEY is not configured.");
      }
      const ai = new GoogleGenAI({ apiKey });

      try {
        const response = await generateWithFallback(
          ai,
          {
            contents: `Provide dictionary data for these words: ${JSON.stringify(words)}`,
            config: {
              systemInstruction:
                "You are a friendly junior dictionary for 10-12 year olds. Always provide simple definitions and helpful synonyms. Output strictly valid JSON. The JSON should be an array of objects, where each object has the keys: 'word' (string), 'partOfSpeech' (string), 'definition' (string), and 'synonyms' (array of strings). Do not use markdown backticks.",
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    word: { type: Type.STRING },
                    partOfSpeech: { type: Type.STRING },
                    definition: { type: Type.STRING },
                    synonyms: { type: Type.ARRAY, items: { type: Type.STRING } }
                  },
                  required: ["word", "partOfSpeech", "definition", "synonyms"]
                }
              }
            }
          },
          "WordsmithBatch"
        );
        const parsed = parseLLMJSON(response.text);
        res.status(200).json({ data: parsed });
      } catch (error) {
        console.error("Custom batch generation failed", error);
        res.status(500).send("Internal Server Error generating batch.");
      }
    });
  }
);

exports.evaluateWordsmithSentence = onRequest(
  {
    secrets: [geminiApiKeySecret],
    maxInstances: 50,
    timeoutSeconds: 60,
    memory: "512MiB",
    cors: true,
    invoker: "public"
  },
  async (req, res) => {
    cors(req, res, async () => {
      if (req.method !== "POST") return res.status(405).send("Method Not Allowed");
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).send("Unauthorized");
      }
      try {
        const idToken = authHeader.split("Bearer ")[1];
        await admin.auth().verifyIdToken(idToken);
      } catch (error) {
        return res.status(401).send("Unauthorized: Invalid token.");
      }
      const { word, sentence } = (req.body && (req.body.data || req.body)) || {};
      const cleanWord = typeof word === "string" ? word.trim() : "";
      const cleanSentence = typeof sentence === "string" ? sentence.trim() : "";
      if (!cleanWord || !cleanSentence) {
        return res.status(400).send("Bad Request: Missing word or sentence.");
      }

      const apiKey = getGeminiApiKey();
      if (!apiKey) {
        return res.status(500).send("GEMINI_API_KEY is not configured.");
      }
      const ai = new GoogleGenAI({ apiKey });

      try {
        const response = await generateWithFallback(
          ai,
          {
            contents: `Word: "${cleanWord}"\nStudent's Sentence: "${cleanSentence}"`,
            config: {
              systemInstruction: `You are a supportive and professional English writing coach for students aged 10-12. 
        Your goal is to provide constructive feedback on their use of vocabulary and grammar.
        RULES:
        1. Always be encouraging.
        2. Score from 1 to 5 (5 is perfect).
        3. If the student only repeats the target word or writes fewer than 3 words instead of a complete sentence, give score 1 and gently encourage them to write a full sentence.
        4. ALWAYS provide exactly two 'betterExamples' showing natural, grammatical use of the target word for a 10-12 year old.
        5. If there is a grammatical error or missing sentence structure, provide a 'correction'.
        6. If the sentence is perfect, celebrate their creativity in 'feedback'.
        7. Do not refuse to answer. If the sentence is confusing, give score 1 and explain why nicely.
        
        OUTPUT FORMAT: Strict JSON object with keys: 'score' (integer 1-5), 'feedback' (string), optional 'correction' (string), and 'betterExamples' (array of exactly two strings). Do not use markdown backticks.`,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  score: { type: Type.INTEGER },
                  feedback: { type: Type.STRING },
                  correction: { type: Type.STRING },
                  betterExamples: { type: Type.ARRAY, items: { type: Type.STRING } }
                },
                required: ["score", "feedback", "betterExamples"]
              }
            }
          },
          "WordsmithEval"
        );
        const parsed = parseLLMJSON(response.text);
        parsed.score = Math.max(1, Math.min(5, Math.round(Number(parsed.score) || 1)));
        if (!Array.isArray(parsed.betterExamples) || parsed.betterExamples.length === 0) {
          parsed.betterExamples = [
            `Try writing a full sentence that shows the meaning of "${cleanWord}".`,
            `The students practiced using "${cleanWord}" in their own stories.`
          ];
        }
        res.status(200).json({ data: parsed });
      } catch (error) {
        console.error("Evaluation error:", error);
        res.status(500).send("Internal Server Error evaluating sentence.");
      }
    });
  }
);
