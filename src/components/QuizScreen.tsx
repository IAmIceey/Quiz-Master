import React, { useState, useEffect, useCallback, useRef } from 'react';
import { QuizPayload, QuizConfig, AnswerRecord } from '../types';
import { Lightbulb, CheckCircle2, XCircle, ArrowRight, Clock, Award, HelpCircle, Loader2, Sparkles, MapPin } from 'lucide-react';
import { playCorrectSound, playIncorrectSound, playHintSound, playSelectSound } from '../utils/audio';

interface QuizScreenProps {
  quizPayload: QuizPayload;
  config: QuizConfig;
  onFinishQuiz: (answers: AnswerRecord[]) => void;
}

export const QuizScreen: React.FC<QuizScreenProps> = ({ quizPayload, config, onFinishQuiz }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [shortAnswerText, setShortAnswerText] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isEvaluatingShortAnswer, setIsEvaluatingShortAnswer] = useState(false);
  const [shortAnswerResult, setShortAnswerResult] = useState<{ isCorrect: boolean; scorePercentage: number; feedback: string } | null>(null);
  
  const [hintExpanded, setHintExpanded] = useState(false);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);

  // Ref to always access latest answers in callbacks
  const answersRef = useRef<AnswerRecord[]>(answers);
  answersRef.current = answers;

  const autoAdvanceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Per question timer state
  const timerMax = config.timerSecondsPerQuestion;
  const [timeLeft, setTimeLeft] = useState(timerMax);
  const questionStartTime = useRef(Date.now());

  const currentQuestion = quizPayload.questions[currentIndex];
  const isShortAnswer = currentQuestion?.options?.length === 0 || config.format === 'Short Answer';

  const handleNextQuestion = useCallback(() => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    playSelectSound();
    if (currentIndex < quizPayload.questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setShortAnswerText('');
      setShortAnswerResult(null);
      setIsSubmitted(false);
      setHintExpanded(false);
    } else {
      onFinishQuiz(answersRef.current);
    }
  }, [currentIndex, quizPayload.questions.length, onFinishQuiz]);

  // Auto-advance 2 seconds after question is submitted
  useEffect(() => {
    if (!isSubmitted) return;

    autoAdvanceTimerRef.current = setTimeout(() => {
      handleNextQuestion();
    }, 2000);

    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
        autoAdvanceTimerRef.current = null;
      }
    };
  }, [isSubmitted, handleNextQuestion]);

  // Timer Countdown Effect
  useEffect(() => {
    if (timerMax <= 0 || isSubmitted) return;

    setTimeLeft(timerMax);
    questionStartTime.current = Date.now();

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleTimeExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentIndex, timerMax, isSubmitted]);

  const recordAnswer = useCallback((
    userAns: string,
    isCorrect: boolean,
    scorePercentage: number,
    feedback?: string
  ) => {
    const timeTaken = Math.round((Date.now() - questionStartTime.current) / 1000);
    const newRecord: AnswerRecord = {
      questionId: currentQuestion.id,
      questionText: currentQuestion.question,
      options: currentQuestion.options,
      correctAnswer: currentQuestion.correct_answer,
      userAnswer: userAns,
      isCorrect,
      scorePercentage,
      explanation: currentQuestion.explanation,
      hintUsed: hintExpanded,
      timeTakenSeconds: timeTaken,
      feedback
    };

    setAnswers((prev) => [...prev, newRecord]);
    setIsSubmitted(true);
  }, [currentQuestion, hintExpanded]);

  const handleTimeExpired = useCallback(() => {
    if (isSubmitted) return;
    playIncorrectSound();
    recordAnswer("[Time Expired]", false, 0, "Time ran out before an answer was submitted.");
  }, [isSubmitted, recordAnswer]);

  const handleSelectOption = (option: string) => {
    if (isSubmitted) return;
    playSelectSound();
    setSelectedOption(option);

    const isCorrect = option.trim().toLowerCase() === currentQuestion.correct_answer.trim().toLowerCase();
    
    if (isCorrect) {
      playCorrectSound();
    } else {
      playIncorrectSound();
    }

    recordAnswer(option, isCorrect, isCorrect ? 100 : 0);
  };

  const handleSubmitShortAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitted || !shortAnswerText.trim()) return;

    setIsEvaluatingShortAnswer(true);
    playSelectSound();

    try {
      const res = await fetch("/api/quiz/evaluate-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: currentQuestion.question,
          correctAnswer: currentQuestion.correct_answer,
          userAnswer: shortAnswerText.trim()
        })
      });

      const data = await res.json();
      setShortAnswerResult(data);

      if (data.isCorrect) {
        playCorrectSound();
      } else {
        playIncorrectSound();
      }

      recordAnswer(shortAnswerText.trim(), data.isCorrect, data.scorePercentage || (data.isCorrect ? 100 : 0), data.feedback);
    } catch {
      // Fallback local comparison
      const isCorrect = shortAnswerText.trim().toLowerCase() === currentQuestion.correct_answer.trim().toLowerCase();
      if (isCorrect) playCorrectSound(); else playIncorrectSound();
      recordAnswer(shortAnswerText.trim(), isCorrect, isCorrect ? 100 : 0);
    } finally {
      setIsEvaluatingShortAnswer(false);
    }
  };

  const handleToggleHint = () => {
    if (!hintExpanded) {
      playHintSound();
    }
    setHintExpanded((prev) => !prev);
  };

  // Current Running Score
  const currentCorrectCount = answers.filter((a) => a.isCorrect).length;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-6">
      {/* Quiz Screen Layout: Main Content + Navigation Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Main Quiz Area (3 cols on desktop) */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Header Bar */}
          <div className="bg-[#0a0a0c] border-2 border-white/12 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              
              {/* Question Index Badge */}
              <div className="stat-label flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-[#00ff88] animate-ping" />
                QUESTION <span className="text-[#00ff88] font-black text-sm">{currentIndex + 1}</span> OF {quizPayload.questions.length}
              </div>

              {/* Score Counter Badge */}
              <div className="bg-[#12141a] border-2 border-white/12 px-3 py-1 flex items-center gap-2 text-xs font-black uppercase text-[#ffb703] tracking-widest">
                <Award className="w-4 h-4 text-[#ffb703]" />
                <span>SCORE: {currentCorrectCount} / {answers.length}</span>
              </div>

              {/* Per Question Timer Badge if active */}
              {timerMax > 0 && (
                <div className={`flex items-center gap-1.5 px-3 py-1 border-2 text-xs font-mono font-black ${
                  timeLeft <= 5 
                    ? 'bg-[#ff3366]/20 border-[#ff3366] text-[#ff3366] animate-bounce' 
                    : 'bg-[#12141a] border-white/12 text-[#00ff88]'
                }`}>
                  <Clock className="w-3.5 h-3.5" />
                  <span>{timeLeft}S</span>
                </div>
              )}
            </div>

            {/* Real-time Timer / Progress Bar */}
            <div className="w-full h-[6px] bg-[#12141a] overflow-hidden">
              <div 
                className="h-full bg-[#00ff88] transition-all duration-300 ease-out"
                style={{ width: `${((currentIndex + (isSubmitted ? 1 : 0.5)) / quizPayload.questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question Card */}
          <div className="bg-[#0a0a0c] border-2 border-white/12 p-6 sm:p-10 relative overflow-hidden transition-all duration-200">
            
            {/* Giant faint question index watermark */}
            <div className="absolute right-4 bottom-2 text-[140px] sm:text-[180px] font-black italic text-white/[0.03] select-none pointer-events-none leading-none">
              {String(currentIndex + 1).padStart(2, '0')}
            </div>

            {/* Topic & Format meta badge */}
            <div className="flex items-center gap-2 text-xs mb-6">
              <span className="stat-label px-3 py-1 bg-[#12141a] text-[#00ff88] border border-[#00ff88]/30">
                {quizPayload.topic}
              </span>
              <span className="text-white/30">•</span>
              <span className="stat-label text-white/50">{currentQuestion.type || config.format}</span>
            </div>

            {/* Question Text */}
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black italic text-white leading-tight tracking-tight mb-8 uppercase">
              {currentQuestion.question}
            </h2>

            {/* Multiple Choice / True-False Option Buttons */}
            {!isShortAnswer && (
              <div className="grid grid-cols-1 gap-3.5 relative z-10">
                {currentQuestion.options.map((option, idx) => {
                  const isOptionSelected = selectedOption === option;
                  const isCorrect = option.trim().toLowerCase() === currentQuestion.correct_answer.trim().toLowerCase();

                  let buttonStyle = "bg-[#12141a] border-2 border-white/12 text-white hover:border-[#00ff88] hover:text-[#00ff88]";
                  
                  if (isSubmitted) {
                    if (isCorrect) {
                      buttonStyle = "bg-[#00ff88] border-2 border-[#00ff88] text-black font-black";
                    } else if (isOptionSelected) {
                      buttonStyle = "bg-[#ff3366] border-2 border-[#ff3366] text-white font-black";
                    } else {
                      buttonStyle = "bg-[#12141a]/40 border-white/5 text-white/30";
                    }
                  }

                  return (
                    <button
                      key={idx}
                      disabled={isSubmitted}
                      onClick={() => handleSelectOption(option)}
                      className={`w-full p-4 sm:p-5 border-2 text-left text-sm sm:text-base font-bold tracking-wide uppercase transition-all duration-150 flex items-center justify-between group focus:outline-none ${buttonStyle}`}
                    >
                      <div className="flex items-center gap-4">
                        <span className={`w-8 h-8 border-2 flex items-center justify-center text-xs font-black shrink-0 ${
                          isSubmitted && isCorrect 
                            ? 'bg-black text-[#00ff88] border-black' 
                            : isSubmitted && isOptionSelected && !isCorrect
                            ? 'bg-black text-[#ff3366] border-black'
                            : 'border-white/20 text-white/60 group-hover:border-[#00ff88] group-hover:text-[#00ff88]'
                        }`}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span>{option}</span>
                      </div>

                      {/* Icon Indicator Post Submission */}
                      {isSubmitted && (
                        <div>
                          {isCorrect && <CheckCircle2 className="w-6 h-6 text-black" />}
                          {isOptionSelected && !isCorrect && <XCircle className="w-6 h-6 text-white" />}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Short Answer Input */}
            {isShortAnswer && (
              <form onSubmit={handleSubmitShortAnswer} className="space-y-4 relative z-10">
                <textarea
                  value={shortAnswerText}
                  onChange={(e) => setShortAnswerText(e.target.value)}
                  placeholder="TYPE YOUR RESPONSE HERE..."
                  disabled={isSubmitted || isEvaluatingShortAnswer}
                  rows={3}
                  className="w-full p-4 bg-[#12141a] border-2 border-white/15 text-white placeholder-white/30 text-sm font-bold uppercase tracking-wide focus:outline-none focus:border-[#00ff88] disabled:opacity-50"
                />

                {!isSubmitted && (
                  <button
                    type="submit"
                    disabled={!shortAnswerText.trim() || isEvaluatingShortAnswer}
                    className="px-8 h-[48px] bg-[#00ff88] text-black font-black text-xs uppercase tracking-[0.25em] flex items-center gap-2 hover:bg-[#00e077] transition-all disabled:opacity-50 border-none"
                  >
                    {isEvaluatingShortAnswer ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-black" />
                        <span>EVALUATING RESPONSE...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-black" />
                        <span>SUBMIT RESPONSE</span>
                      </>
                    )}
                  </button>
                )}

                {/* Short Answer Result Banner */}
                {shortAnswerResult && (
                  <div className={`p-4 border-2 ${
                    shortAnswerResult.isCorrect 
                      ? 'bg-[#00ff88]/15 border-[#00ff88] text-[#00ff88]' 
                      : 'bg-[#ff3366]/15 border-[#ff3366] text-[#ff3366]'
                  }`}>
                    <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider mb-1">
                      {shortAnswerResult.isCorrect ? <CheckCircle2 className="w-5 h-5 text-[#00ff88]" /> : <XCircle className="w-5 h-5 text-[#ff3366]" />}
                      <span>{shortAnswerResult.isCorrect ? 'ACCURATE ANSWER' : 'NEEDS IMPROVEMENT'}</span>
                      <span className="text-xs ml-auto px-2 py-0.5 bg-black/40 border border-current">
                        {shortAnswerResult.scorePercentage}% PTS
                      </span>
                    </div>
                    {shortAnswerResult.feedback && (
                      <p className="text-xs text-white/80 mt-1 uppercase font-semibold">{shortAnswerResult.feedback}</p>
                    )}
                  </div>
                )}
              </form>
            )}

            {/* Hint Toggle */}
            <div className="mt-8 pt-4 border-t-2 border-white/10 relative z-10">
              <button
                type="button"
                onClick={handleToggleHint}
                className="stat-label text-[#ffb703] hover:text-[#ffb703]/80 flex items-center gap-2 focus:outline-none transition-colors"
              >
                <Lightbulb className="w-4 h-4 text-[#ffb703]" />
                <span>{hintExpanded ? "HIDE HINT CLUE" : "NEED A HINT?"}</span>
              </button>

              {hintExpanded && (
                <div className="mt-3 p-4 bg-[#12141a] border-2 border-[#ffb703] text-xs text-white animate-fadeIn flex items-start gap-3">
                  <Sparkles className="w-4 h-4 text-[#ffb703] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-black text-[#ffb703] uppercase tracking-wider">HINT CLUE: </span>
                    <span className="text-white/90 font-medium">{currentQuestion.hint}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Auto-advancing Indicator (Appears Post-Submission) */}
            {isSubmitted && (
              <div className="mt-6 p-4 bg-[#12141a] border-2 border-[#00ff88] flex flex-col sm:flex-row items-center justify-between gap-3 animate-fadeIn relative z-10">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00ff88] animate-ping shrink-0" />
                  <span className="stat-label text-[#00ff88] tracking-widest">
                    {currentIndex < quizPayload.questions.length - 1 
                      ? "NEXT QUESTION IN 2S..." 
                      : "CALCULATING FINAL PERFORMANCE..."}
                  </span>
                </div>

                <button
                  onClick={handleNextQuestion}
                  className="px-5 py-2 bg-[#00ff88] text-black font-black text-xs uppercase tracking-[0.2em] flex items-center gap-2 hover:bg-[#00e077] transition-all border-none shrink-0"
                >
                  <span>SKIP NOW</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Side Panel: Question Navigation Map */}
        <div className="bg-[#0a0a0c] border-2 border-white/12 p-5">
          <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-white/10">
            <h3 className="stat-label flex items-center gap-1.5 text-[#00ff88]">
              <MapPin className="w-3.5 h-3.5 text-[#00ff88]" />
              QUESTION MAP
            </h3>
            <span className="text-xs text-[#00ff88] font-black font-mono">
              {answers.length}/{quizPayload.questions.length}
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {quizPayload.questions.map((q, idx) => {
              const answer = answers.find((a) => a.questionId === q.id);
              const isCurrent = idx === currentIndex;

              let bgStyle = "bg-[#12141a] text-white/50 border-white/12";
              if (answer) {
                if (answer.isCorrect) {
                  bgStyle = "bg-[#00ff88] text-black border-[#00ff88] font-black";
                } else {
                  bgStyle = "bg-[#ff3366] text-white border-[#ff3366] font-black";
                }
              }

              return (
                <div
                  key={idx}
                  className={`h-10 border-2 flex items-center justify-center text-xs font-black transition-all ${bgStyle} ${
                    isCurrent ? 'border-[#00ff88] ring-2 ring-[#00ff88]/50 scale-105' : ''
                  }`}
                >
                  {idx + 1}
                </div>
              );
            })}
          </div>

          {/* Map Legend */}
          <div className="mt-6 space-y-2 text-[10px] font-black uppercase tracking-wider text-white/50">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-[#00ff88]" />
              <span>Correct Answer</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-[#ff3366]" />
              <span>Incorrect Answer</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-[#12141a] border border-white/20" />
              <span>Unanswered</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
