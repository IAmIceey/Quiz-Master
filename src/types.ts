export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard' | 'Adaptive';

export type QuestionFormat = 'Multiple Choice (MCQ)' | 'True/False' | 'Short Answer' | 'Mixed';

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  hint: string;
  code_snippet?: string;
  type?: 'MCQ' | 'True/False' | 'Short Answer';
}

export interface QuizPayload {
  quiz_id: string;
  topic: string;
  difficulty: DifficultyLevel;
  questions: QuizQuestion[];
}

export interface QuizConfig {
  topic: string;
  difficulty: DifficultyLevel;
  questionCount: number;
  format: QuestionFormat;
  timerSecondsPerQuestion: number; // 0 = no timer, e.g. 15, 30, 45
}

export interface AnswerRecord {
  questionId: number;
  questionText: string;
  options: string[];
  correctAnswer: string;
  userAnswer: string;
  isCorrect: boolean;
  scorePercentage: number;
  explanation: string;
  hintUsed: boolean;
  timeTakenSeconds: number;
  feedback?: string;
}

export interface EvaluationPayload {
  total_score: number;
  max_score: number;
  grade: string;
  feedback_summary: string;
  key_takeaways: string[];
}

export interface QuizHistoryItem {
  id: string;
  timestamp: string;
  topic: string;
  difficulty: DifficultyLevel;
  format: QuestionFormat;
  score: number;
  maxScore: number;
  grade: string;
  questionCount: number;
}
