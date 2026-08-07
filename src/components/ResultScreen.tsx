import React, { useEffect, useState } from 'react';
import { QuizPayload, QuizConfig, AnswerRecord, EvaluationPayload, QuizHistoryItem } from '../types';
import { Trophy, Award, CheckCircle2, XCircle, RotateCcw, PlusCircle, Share2, Sparkles, Check, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { playFanfareSound, playSelectSound } from '../utils/audio';

interface ResultScreenProps {
  quizPayload: QuizPayload;
  config: QuizConfig;
  answers: AnswerRecord[];
  onPlayAgain: () => void;
  onNewQuiz: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({
  quizPayload,
  config,
  answers,
  onPlayAgain,
  onNewQuiz
}) => {
  const [evaluation, setEvaluation] = useState<EvaluationPayload | null>(null);
  const [isLoadingEvaluation, setIsLoadingEvaluation] = useState(true);
  const [copied, setCopied] = useState(false);
  const [expandedQuestions, setExpandedQuestions] = useState<Record<number, boolean>>({});

  const correctCount = answers.filter((a) => a.isCorrect).length;
  const totalQuestions = quizPayload.questions.length;
  const percentage = Math.round((correctCount / Math.max(1, totalQuestions)) * 100);

  useEffect(() => {
    playFanfareSound();

    // Fetch comprehensive evaluation from Gemini API
    async function evaluate() {
      setIsLoadingEvaluation(true);
      try {
        const res = await fetch("/api/quiz/evaluate-performance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: quizPayload.topic,
            difficulty: config.difficulty,
            score: correctCount * 10,
            maxScore: totalQuestions * 10,
            questionCount: totalQuestions,
            answers: answers.map((a) => ({
              question: a.questionText,
              userAnswer: a.userAnswer,
              correctAnswer: a.correctAnswer,
              isCorrect: a.isCorrect,
              timeTakenSeconds: a.timeTakenSeconds
            }))
          })
        });

        const data = await res.json();
        setEvaluation(data);

        // Save result to LocalStorage History
        const historyItem: QuizHistoryItem = {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
          topic: quizPayload.topic,
          difficulty: config.difficulty,
          format: config.format,
          score: correctCount * 10,
          maxScore: totalQuestions * 10,
          grade: data.grade || (percentage >= 90 ? 'A+' : percentage >= 75 ? 'B' : 'C'),
          questionCount: totalQuestions
        };

        const existing = JSON.parse(localStorage.getItem('ai_quiz_history') || '[]');
        localStorage.setItem('ai_quiz_history', JSON.stringify([historyItem, ...existing.slice(0, 19)]));
      } catch (err) {
        console.error("Evaluation error:", err);
        let fallbackGrade = "C";
        if (percentage >= 90) fallbackGrade = "S Rank";
        else if (percentage >= 80) fallbackGrade = "A+";
        else if (percentage >= 70) fallbackGrade = "B";

        setEvaluation({
          total_score: correctCount * 10,
          max_score: totalQuestions * 10,
          grade: fallbackGrade,
          feedback_summary: `Great effort on ${quizPayload.topic}! You answered ${correctCount} out of ${totalQuestions} questions correctly (${percentage}%).`,
          key_takeaways: [
            "Review the answer key below to examine any missed questions.",
            "Try adjusting difficulty settings to further challenge your mastery."
          ]
        });
      } finally {
        setIsLoadingEvaluation(false);
      }
    }

    evaluate();
  }, [quizPayload, config, answers, correctCount, totalQuestions, percentage]);

  const handleShare = () => {
    playSelectSound();
    const text = `🏆 AI Quiz Master Result!
Topic: ${quizPayload.topic}
Score: ${correctCount}/${totalQuestions} (${percentage}%)
Grade: ${evaluation?.grade || 'A'}
Challenge yourself on AI Quiz Master!`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const toggleQuestionDetail = (id: number) => {
    playSelectSound();
    setExpandedQuestions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      <div className="bg-[#0a0a0c] border-2 border-white/12 p-6 sm:p-10 space-y-8 relative overflow-hidden">
        
        {/* Header Hero Banner */}
        <div className="text-center relative">
          <div className="w-20 h-20 mx-auto border-2 border-[#00ff88] bg-[#00ff88]/10 mb-4 flex items-center justify-center text-[#00ff88]">
            <Trophy className="w-10 h-10 animate-bounce" style={{ animationIterationCount: 3 }} />
          </div>

          <div className="stat-label text-[#00ff88] mb-1">
            // CHALLENGE COMPLETED
          </div>
          <h2 className="text-3xl sm:text-4xl font-black italic uppercase text-white tracking-tighter">
            QUIZ PERFORMANCE SUMMARY
          </h2>
          <p className="text-xs text-white/50 tracking-wider font-bold uppercase mt-2">
            TOPIC: <span className="text-[#00ff88]">{quizPayload.topic}</span> ({config.difficulty})
          </p>
        </div>

        {/* Score & Grade Display Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* Total Score */}
          <div className="bg-[#12141a] border-2 border-white/12 p-5 text-center">
            <span className="stat-label">TOTAL SCORE</span>
            <div className="stat-value text-white mt-1">
              {evaluation ? evaluation.total_score : correctCount * 10} <span className="text-xs text-white/40 font-normal">/ {evaluation ? evaluation.max_score : totalQuestions * 10}</span>
            </div>
            <p className="text-xs text-[#00ff88] font-bold uppercase tracking-wider mt-1">{correctCount} OF {totalQuestions} CORRECT</p>
          </div>

          {/* Score Percentage */}
          <div className="bg-[#12141a] border-2 border-white/12 p-5 text-center">
            <span className="stat-label">ACCURACY RATE</span>
            <div className="stat-value text-[#00ff88] mt-1">
              {percentage}%
            </div>
            <p className="text-xs text-white/40 font-bold uppercase tracking-wider mt-1">COMPLETION STATUS</p>
          </div>

          {/* Performance Grade Badge */}
          <div className="bg-[#12141a] border-2 border-white/12 p-5 text-center flex flex-col items-center justify-center">
            <span className="stat-label">AI EVALUATION GRADE</span>
            <div className="stat-value text-[#ffb703] mt-1 flex items-center gap-1">
              <Award className="w-6 h-6 text-[#ffb703]" />
              <span>{isLoadingEvaluation ? "..." : evaluation?.grade || "A+"}</span>
            </div>
            <p className="text-xs text-white/40 font-bold uppercase tracking-wider mt-1">GEMINI 3.6 JUDGMENT</p>
          </div>
        </div>

        {/* AI Performance Analysis & Feedback Summary */}
        <div className="bg-[#12141a] border-l-4 border-[#00ff88] p-6 space-y-3">
          <div className="flex items-center gap-2 stat-label text-[#00ff88]">
            <Sparkles className="w-4 h-4 text-[#00ff88]" />
            <span>GEMINI PERFORMANCE FEEDBACK</span>
            {isLoadingEvaluation && <Loader2 className="w-3 h-3 text-[#00ff88] animate-spin ml-auto" />}
          </div>

          <p className="text-sm text-white/90 font-medium leading-relaxed">
            {isLoadingEvaluation ? "Analyzing answer parameters and generating performance insights..." : evaluation?.feedback_summary}
          </p>

          {/* Key Takeaways */}
          {evaluation?.key_takeaways && evaluation.key_takeaways.length > 0 && (
            <div className="pt-3 border-t border-white/10 space-y-2">
              <span className="stat-label text-white/80">KEY INSIGHTS & RECOMMENDATIONS:</span>
              <ul className="space-y-1.5">
                {evaluation.key_takeaways.map((takeaway, idx) => (
                  <li key={idx} className="text-xs text-white/70 font-medium flex items-start gap-2 uppercase tracking-wide">
                    <span className="w-1.5 h-1.5 bg-[#00ff88] mt-1.5 shrink-0" />
                    <span>{takeaway}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Question-by-Question Review Accordion */}
        <div className="space-y-4">
          <h3 className="stat-label flex items-center justify-between text-white">
            <span>DETAILED QUESTION BREAKDOWN</span>
            <span className="text-white/40 font-normal">CLICK TO TOGGLE EXPLANATION</span>
          </h3>

          <div className="space-y-3">
            {quizPayload.questions.map((q, idx) => {
              const record = answers.find((a) => a.questionId === q.id);
              const isCorrect = record?.isCorrect ?? false;
              const isExpanded = expandedQuestions[q.id];

              return (
                <div
                  key={q.id}
                  className="bg-[#12141a] border-2 border-white/12 transition-all duration-150"
                >
                  <button
                    type="button"
                    onClick={() => toggleQuestionDetail(q.id)}
                    className="w-full p-4 flex items-center justify-between text-left focus:outline-none hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-start gap-3 pr-2">
                      {isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-[#00ff88] shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-[#ff3366] shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="text-sm font-black italic uppercase text-white">
                          {idx + 1}. {q.question}
                        </p>
                        <p className="text-xs font-bold uppercase tracking-wider text-white/50 mt-1">
                          YOUR ANSWER: <span className={isCorrect ? "text-[#00ff88]" : "text-[#ff3366]"}>{record?.userAnswer || "[NO ANSWER]"}</span>
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 text-white/50">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  {/* Expanded Explanation */}
                  {isExpanded && (
                    <div className="px-5 pb-4 pt-2 border-t-2 border-white/10 bg-[#0a0a0c] text-xs space-y-2">
                      <div>
                        <span className="font-black text-[#00ff88] uppercase tracking-wider">CORRECT ANSWER: </span>
                        <span className="text-white font-bold">{q.correct_answer}</span>
                      </div>
                      <div>
                        <span className="font-black text-white/50 uppercase tracking-wider">EXPLANATION: </span>
                        <span className="text-white/80 font-medium leading-relaxed">{q.explanation}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t-2 border-white/12">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => { playSelectSound(); onPlayAgain(); }}
              className="flex-1 sm:flex-initial px-6 h-[48px] bg-transparent hover:bg-white/10 border-2 border-white/20 text-white font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all"
            >
              <RotateCcw className="w-4 h-4 text-[#00ff88]" />
              <span>RETRY SAME QUIZ</span>
            </button>

            <button
              onClick={() => { playSelectSound(); onNewQuiz(); }}
              className="flex-1 sm:flex-initial px-6 h-[48px] bg-[#00ff88] hover:bg-[#00e077] text-black font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all border-none"
            >
              <PlusCircle className="w-4 h-4" />
              <span>NEW TOPIC</span>
            </button>
          </div>

          <button
            onClick={handleShare}
            className="w-full sm:w-auto px-6 h-[48px] bg-transparent hover:bg-white/10 border-2 border-[#ffb703] text-[#ffb703] font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all"
          >
            {copied ? <Check className="w-4 h-4 text-[#00ff88]" /> : <Share2 className="w-4 h-4" />}
            <span>{copied ? "COPIED RESULTS!" : "SHARE RESULTS"}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
