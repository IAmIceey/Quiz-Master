import { useState } from 'react';
import { QuizConfig, QuizPayload, AnswerRecord } from './types';
import { Header } from './components/Header';
import { ConfigScreen } from './components/ConfigScreen';
import { QuizScreen } from './components/QuizScreen';
import { ResultScreen } from './components/ResultScreen';
import { HistoryModal } from './components/HistoryModal';

export default function App() {
  const [step, setStep] = useState<'config' | 'quiz' | 'result'>('config');
  const [config, setConfig] = useState<QuizConfig | null>(null);
  const [quizPayload, setQuizPayload] = useState<QuizPayload | null>(null);
  const [userAnswers, setUserAnswers] = useState<AnswerRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const handleStartQuiz = async (newConfig: QuizConfig) => {
    setConfig(newConfig);
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: newConfig.topic,
          difficulty: newConfig.difficulty,
          questionCount: newConfig.questionCount,
          format: newConfig.format
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to generate quiz (Status ${response.status})`);
      }

      const data: QuizPayload = await response.json();
      if (!data.questions || data.questions.length === 0) {
        throw new Error("AI engine returned an empty question set. Please try a different topic.");
      }

      setQuizPayload(data);
      setUserAnswers([]);
      setStep('quiz');
    } catch (err: unknown) {
      console.error("Failed to generate quiz:", err);
      const msg = err instanceof Error ? err.message : "An unexpected error occurred while generating the quiz.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinishQuiz = (answers: AnswerRecord[]) => {
    setUserAnswers(answers);
    setStep('result');
  };

  const handlePlayAgain = () => {
    if (config) {
      handleStartQuiz(config);
    } else {
      setStep('config');
    }
  };

  const handleResetQuiz = () => {
    setStep('config');
    setQuizPayload(null);
    setConfig(null);
    setUserAnswers([]);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#0d0f17] text-[#f9fafb] flex flex-col font-sans selection:bg-[#6366f1] selection:text-white">
      {/* Header Bar */}
      <Header 
        onOpenHistory={() => setIsHistoryOpen(true)} 
        onResetQuiz={handleResetQuiz}
        isQuizActive={step === 'quiz' || step === 'result'}
      />

      {/* Main Container */}
      <main className="flex-1 flex flex-col justify-center py-6">
        {step === 'config' && (
          <ConfigScreen 
            onStartQuiz={handleStartQuiz} 
            isLoading={isLoading} 
            error={error} 
          />
        )}

        {step === 'quiz' && quizPayload && config && (
          <QuizScreen 
            quizPayload={quizPayload} 
            config={config} 
            onFinishQuiz={handleFinishQuiz} 
          />
        )}

        {step === 'result' && quizPayload && config && (
          <ResultScreen 
            quizPayload={quizPayload} 
            config={config} 
            answers={userAnswers} 
            onPlayAgain={handlePlayAgain} 
            onNewQuiz={handleResetQuiz} 
          />
        )}
      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center text-xs text-[#9ca3af] border-t border-[#24283e]/50 mt-auto">
        <p>AI Quiz Master • Powered by Google AI Studio & Gemini 3.6 Flash</p>
      </footer>

      {/* History Modal */}
      <HistoryModal 
        isOpen={isHistoryOpen} 
        onClose={() => setIsHistoryOpen(false)} 
      />
    </div>
  );
}
