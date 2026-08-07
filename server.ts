import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Gemini API client lazily / safely on server side
  const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing.");
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  };

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // 1. Quiz Generation Endpoint
  app.post("/api/quiz/generate", async (req, res) => {
    try {
      const { topic, difficulty = "Medium", questionCount = 5, format = "Multiple Choice (MCQ)" } = req.body;

      if (!topic || typeof topic !== "string") {
        res.status(400).json({ error: "Topic is required" });
        return;
      }

      const ai = getGeminiClient();

      const formatInstructions = 
        format === "True/False" 
          ? "All questions MUST be True/False format, with exactly 2 options: ['True', 'False']." 
          : format === "Short Answer"
          ? "All questions MUST be Short Answer format. Provide an empty options array []. 'correct_answer' should be a concise, accurate benchmark answer."
          : format === "Mixed"
          ? "Mix formats across questions: include standard 4-option MCQs, True/False questions, and Short Answer questions (empty options array)."
          : "All questions MUST be Multiple Choice (MCQ) format with exactly 4 plausible, well-crafted options.";

      const nonce = Math.random().toString(36).substring(2, 9);
      const prompt = `Generate a fresh, unique, high-quality, and highly engaging quiz on the topic: "${topic}".
Difficulty level: ${difficulty}.
Total questions required: ${questionCount}.
Format rules: ${formatInstructions}
Session Nonce: ${nonce}-${Date.now()}

Requirements:
1. CREATIVITY & DIVERSITY: Avoid repetitive or generic surface-level questions. Explore diverse sub-topics, iconic lore, surprising facts, deep knowledge, and distinct angles within "${topic}". Every question in this set must be completely distinct.
2. RANDOMIZED OPTION PLACEMENT: For multiple-choice questions, ensure options are thoroughly plausible and NEVER always place the correct answer as the first option (Option A). Mix up correct answer positions randomly across options A, B, C, and D.
3. If difficulty is "Adaptive", structure questions in ascending difficulty order (from fundamental to advanced mastery).
4. Each question must include a clear 'explanation' explaining WHY the correct answer is right.
5. Each question must include a helpful 'hint' that provides a subtle clue without revealing the exact answer directly.
6. If relevant to code or programming topics, you may format code snippets inside the question string using markdown codeblocks (e.g. \`\`\`js ... \`\`\`).`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          temperature: 0.9,
          systemInstruction:
            "You are AI Quiz Master, an engaging, precise, and brilliant quiz author. You create accurate, highly varied, non-repetitive quizzes following strict JSON Schema.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              quiz_id: { type: Type.STRING, description: "Unique identifier for this quiz session" },
              topic: { type: Type.STRING, description: "Topic of the quiz" },
              difficulty: { type: Type.STRING, description: "Configured difficulty" },
              questions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.INTEGER, description: "1-indexed question ID" },
                    question: { type: Type.STRING, description: "The question statement" },
                    options: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "List of options (4 options for MCQ, 2 for T/F, empty array [] for Short Answer)",
                    },
                    correct_answer: { type: Type.STRING, description: "The correct answer text matching one of the options or reference string" },
                    explanation: { type: Type.STRING, description: "In-depth explanation of the solution" },
                    hint: { type: Type.STRING, description: "A subtle, clever clue" },
                  },
                  required: ["id", "question", "options", "correct_answer", "explanation", "hint"],
                },
              },
            },
            required: ["quiz_id", "topic", "difficulty", "questions"],
          },
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Empty response received from AI model.");
      }

      const parsedData = JSON.parse(responseText);

      // Shuffle options for each question to guarantee randomized answer positions (A, B, C, D)
      if (parsedData && Array.isArray(parsedData.questions)) {
        parsedData.questions.forEach((q: { options?: string[] }) => {
          if (Array.isArray(q.options) && q.options.length > 1) {
            for (let i = q.options.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [q.options[i], q.options[j]] = [q.options[j], q.options[i]];
            }
          }
        });
      }

      res.json(parsedData);
    } catch (err: unknown) {
      console.error("Quiz generation error:", err);
      const message = err instanceof Error ? err.message : "Failed to generate quiz.";
      res.status(500).json({ error: message });
    }
  });

  // 2. Hint Generation Endpoint (Optional live clue generator)
  app.post("/api/quiz/hint", async (req, res) => {
    try {
      const { question, options, correctAnswer } = req.body;
      const ai = getGeminiClient();

      const prompt = `Give a short, encouraging 1-sentence hint for the following question without giving away the exact answer.
Question: "${question}"
Options: ${JSON.stringify(options || [])}
Target Answer: "${correctAnswer}"`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          temperature: 0.7,
          systemInstruction: "You are AI Quiz Master. Give a brief, clever clue.",
        },
      });

      res.json({ hint: response.text?.trim() || "Think carefully about the core concept involved." });
    } catch (err: unknown) {
      console.error("Hint generation error:", err);
      res.json({ hint: "Consider the key terms in the question prompt." });
    }
  });

  // 3. Short Answer / Open Text Semantic Answer Evaluation
  app.post("/api/quiz/evaluate-answer", async (req, res) => {
    try {
      const { question, correctAnswer, userAnswer } = req.body;
      const ai = getGeminiClient();

      const prompt = `Evaluate the player's short answer response for correctness against the expected reference answer.

Question: "${question}"
Reference Correct Answer: "${correctAnswer}"
Player's Submitted Answer: "${userAnswer}"

Grade the player response. Be reasonably lenient with minor typos or slight phrasing variations, but ensure key factual concepts are correct.
Return JSON with:
- isCorrect: boolean (true if answer earns at least 70% accuracy)
- scorePercentage: integer between 0 and 100
- feedback: 1-2 sentence constructive explanation for the player`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isCorrect: { type: Type.BOOLEAN },
              scorePercentage: { type: Type.INTEGER },
              feedback: { type: Type.STRING },
            },
            required: ["isCorrect", "scorePercentage", "feedback"],
          },
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      res.json(parsed);
    } catch (err: unknown) {
      console.error("Answer evaluation error:", err);
      res.status(500).json({ error: "Failed to evaluate answer" });
    }
  });

  // 4. Overall Quiz Performance Evaluation & Detailed Breakdown
  app.post("/api/quiz/evaluate-performance", async (req, res) => {
    const { topic = "Quiz", difficulty = "Normal", score = 0, maxScore = 100, answers = [] } = req.body || {};
    try {
      const ai = getGeminiClient();

      const prompt = `Analyze the player's quiz performance and provide a comprehensive performance report.

Topic: "${topic}"
Difficulty: "${difficulty}"
Score Achieved: ${score} / ${maxScore}
Question Breakdown:
${JSON.stringify(answers, null, 2)}

Provide structured JSON with:
1. total_score: integer (${score})
2. max_score: integer (${maxScore})
3. grade: Letter grade (e.g., "S Rank", "A+", "A", "B+", "C", or "Needs Review")
4. feedback_summary: A 2-3 sentence personalized summary of strengths and areas for improvement.
5. key_takeaways: Array of 2 to 4 bullet points highlighting specific knowledge gains or topics to review.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          temperature: 0.2,
          systemInstruction: "You are AI Quiz Master providing friendly, insightful post-quiz feedback.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              total_score: { type: Type.INTEGER },
              max_score: { type: Type.INTEGER },
              grade: { type: Type.STRING },
              feedback_summary: { type: Type.STRING },
              key_takeaways: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ["total_score", "max_score", "grade", "feedback_summary", "key_takeaways"],
          },
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      res.json(parsed);
    } catch (err: unknown) {
      console.error("Performance evaluation error:", err);
      // Fallback calculation if model API fails
      const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
      let grade = "C";
      if (pct >= 95) grade = "S Rank";
      else if (pct >= 85) grade = "A+";
      else if (pct >= 75) grade = "A";
      else if (pct >= 65) grade = "B";

      res.json({
        total_score: score,
        max_score: maxScore,
        grade,
        feedback_summary: `You scored ${score} out of ${maxScore} (${Math.round(pct)}%) in ${topic}.`,
        key_takeaways: ["Review the explanation notes for any missed questions.", "Try playing on Adaptive difficulty to sharpen your skills!"],
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
