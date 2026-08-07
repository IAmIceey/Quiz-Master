import React, { useState } from 'react';
import { QuizConfig, DifficultyLevel, QuestionFormat } from '../types';
import { Play, Sparkles, Zap, Clock, BookOpen, Layers, HelpCircle, Loader2 } from 'lucide-react';
import { playSelectSound, playStartSound } from '../utils/audio';

interface ConfigScreenProps {
  onStartQuiz: (config: QuizConfig) => void;
  isLoading: boolean;
  error: string | null;
}

const POPULAR_TOPICS = [
  "Anime",
  "Movies",
  "Series",
  "Nigerian Music",
  "International Music",
  "Current Affairs",
  "Space",
  "Marvel & DC"
];

const DIFFICULTY_OPTIONS: { level: DifficultyLevel; desc: string }[] = [
  { level: 'Easy', desc: 'Fundamentals' },
  { level: 'Medium', desc: 'Balanced' },
  { level: 'Hard', desc: 'Expert' },
  { level: 'Adaptive', desc: 'Scales with performance' }
];

const QUESTION_COUNTS = [5, 10, 15];

const FORMAT_OPTIONS: QuestionFormat[] = [
  'Multiple Choice (MCQ)',
  'True/False',
  'Short Answer',
  'Mixed'
];

const TIMER_OPTIONS = [
  { label: 'Off', seconds: 0 },
  { label: '15s', seconds: 15 },
  { label: '30s', seconds: 30 },
  { label: '60s', seconds: 60 }
];

export const ConfigScreen: React.FC<ConfigScreenProps> = ({ onStartQuiz, isLoading, error }) => {
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('Medium');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [format, setFormat] = useState<QuestionFormat>('Multiple Choice (MCQ)');
  const [timerSeconds, setTimerSeconds] = useState<number>(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    playStartSound();
    onStartQuiz({
      topic: topic.trim(),
      difficulty,
      questionCount,
      format,
      timerSecondsPerQuestion: timerSeconds
    });
  };

  const handleSelectTopicShortcut = (selected: string) => {
    playSelectSound();
    setTopic(selected);
  };

  return (
    <div className="w-full max-w-[620px] mx-auto px-4 py-8 sm:py-12">
      {/* Setup Card Container */}
      <div 
        className="bg-[#0a0a0c] border-2 border-white/12 p-6 sm:p-10 transition-all duration-300 relative overflow-hidden"
      >
        {/* Decorative corner accent */}
        <div className="absolute top-0 right-0 w-16 h-16 bg-[#00ff88]/10 border-b-2 border-l-2 border-[#00ff88] pointer-events-none flex items-center justify-center text-[#00ff88] text-[10px] font-black tracking-widest">
          v3.6
        </div>

        {/* Title Header */}
        <div className="mb-8">
          <div className="stat-label mb-2 text-[#00ff88]">
            // AI QUIZ CONFIGURATION ENGINE
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white italic tracking-tighter uppercase leading-none mb-3">
            SELECT TOPIC & PARAMETERS
          </h2>
          <p className="text-xs text-white/50 tracking-wider uppercase font-semibold">
            Choose a popular theme or enter custom keywords to generate a high-intensity quiz.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 border-2 border-[#ff3366] bg-[#ff3366]/10 text-white text-xs font-mono flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-[#ff3366] shrink-0 mt-0.5" />
            <div>
              <p className="font-black text-[#ff3366] uppercase tracking-wider">GENERATION ERROR</p>
              <p className="text-white/80 mt-1">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Topic Input */}
          <div>
            <label className="stat-label mb-2 flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5 text-[#00ff88]" />
              QUIZ TOPIC / SUBJECT
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. 'Anime', 'Movies', 'Nigerian Music', 'Space'..."
              required
              disabled={isLoading}
              className="w-full h-[52px] px-4 bg-[#12141a] border-2 border-white/15 text-white placeholder-white/30 text-sm font-bold tracking-wide focus:outline-none focus:border-[#00ff88] transition-all duration-150 disabled:opacity-50 uppercase"
            />

            {/* Popular Topics Shortcuts */}
            <div className="mt-4">
              <p className="stat-label mb-2">POPULAR CATEGORIES:</p>
              <div className="flex flex-wrap gap-2">
                {POPULAR_TOPICS.map((item) => {
                  const isSelected = topic === item;
                  return (
                    <button
                      key={item}
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleSelectTopicShortcut(item)}
                      className={`text-[11px] font-black uppercase tracking-wider px-3 py-1.5 border-2 transition-all duration-150 ${
                        isSelected
                          ? 'bg-[#00ff88] text-black border-[#00ff88]'
                          : 'bg-transparent text-white/70 border-white/12 hover:text-white hover:border-[#00ff88]/50'
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Difficulty Chips */}
          <div>
            <label className="stat-label mb-2 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-[#ffb703]" />
              DIFFICULTY LEVEL
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DIFFICULTY_OPTIONS.map(({ level, desc }) => {
                const isActive = difficulty === level;
                return (
                  <button
                    key={level}
                    type="button"
                    disabled={isLoading}
                    onClick={() => {
                      playSelectSound();
                      setDifficulty(level);
                    }}
                    className={`p-3 border-2 text-left transition-all duration-150 focus:outline-none ${
                      isActive
                        ? 'bg-[#00ff88] text-black border-[#00ff88]'
                        : 'bg-[#12141a] text-white/60 border-white/12 hover:text-white hover:border-[#00ff88]/50'
                    }`}
                  >
                    <div className="text-xs font-black uppercase tracking-wider">{level}</div>
                    <div className={`text-[10px] mt-0.5 font-bold uppercase ${isActive ? 'text-black/70' : 'text-white/40'}`}>
                      {desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Question Count & Timer Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Question Count */}
            <div>
              <label className="stat-label mb-2 flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-[#00ff88]" />
                QUESTIONS
              </label>
              <div className="grid grid-cols-3 gap-2">
                {QUESTION_COUNTS.map((count) => {
                  const isActive = questionCount === count;
                  return (
                    <button
                      key={count}
                      type="button"
                      disabled={isLoading}
                      onClick={() => {
                        playSelectSound();
                        setQuestionCount(count);
                      }}
                      className={`h-[44px] border-2 font-black text-xs uppercase tracking-wider transition-all duration-150 ${
                        isActive
                          ? 'bg-[#00ff88] text-black border-[#00ff88]'
                          : 'bg-[#12141a] text-white/60 border-white/12 hover:text-white hover:border-[#00ff88]/50'
                      }`}
                    >
                      {count} Qs
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Per Question Timer */}
            <div>
              <label className="stat-label mb-2 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-[#ffb703]" />
                TIMER SPEED
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {TIMER_OPTIONS.map((t) => {
                  const isActive = timerSeconds === t.seconds;
                  return (
                    <button
                      key={t.label}
                      type="button"
                      disabled={isLoading}
                      onClick={() => {
                        playSelectSound();
                        setTimerSeconds(t.seconds);
                      }}
                      className={`h-[44px] border-2 text-xs font-black uppercase tracking-wider transition-all duration-150 ${
                        isActive
                          ? 'bg-[#00ff88] text-black border-[#00ff88]'
                          : 'bg-[#12141a] text-white/60 border-white/12 hover:text-white hover:border-[#00ff88]/50'
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Question Format */}
          <div>
            <label className="stat-label mb-2 flex items-center gap-2">
              <HelpCircle className="w-3.5 h-3.5 text-[#00ff88]" />
              QUESTION FORMAT
            </label>
            <div className="grid grid-cols-2 gap-2">
              {FORMAT_OPTIONS.map((fmt) => {
                const isActive = format === fmt;
                return (
                  <button
                    key={fmt}
                    type="button"
                    disabled={isLoading}
                    onClick={() => {
                      playSelectSound();
                      setFormat(fmt);
                    }}
                    className={`p-3 border-2 text-left transition-all duration-150 ${
                      isActive
                        ? 'bg-[#00ff88] text-black border-[#00ff88] font-black'
                        : 'bg-[#12141a] text-white/60 border-white/12 hover:text-white hover:border-[#00ff88]/50'
                    }`}
                  >
                    <div className="text-xs font-black uppercase tracking-wider">{fmt}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Start CTA Button */}
          <button
            type="submit"
            disabled={isLoading || !topic.trim()}
            className="w-full h-[56px] bg-white text-black hover:bg-[#00ff88] font-black text-sm uppercase tracking-[0.25em] flex items-center justify-center gap-3 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-6 border-none"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-black" />
                <span>GENERATING QUIZ WITH GEMINI...</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                <span>GENERATE & START QUIZ</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

