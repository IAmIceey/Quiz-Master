import React from 'react';
import { Sparkles, Volume2, VolumeX, History, PlusCircle } from 'lucide-react';
import { getMuted, setMuted, playSelectSound } from '../utils/audio';

interface HeaderProps {
  onOpenHistory: () => void;
  onResetQuiz: () => void;
  isQuizActive: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onOpenHistory, onResetQuiz, isQuizActive }) => {
  const [muted, setMutedState] = React.useState(getMuted());

  const toggleSound = () => {
    playSelectSound();
    const next = !muted;
    setMuted(next);
    setMutedState(next);
  };

  const handleOpenHistory = () => {
    playSelectSound();
    onOpenHistory();
  };

  const handleReset = () => {
    playSelectSound();
    onResetQuiz();
  };

  return (
    <header className="w-full bg-[#050505] border-b border-white/10 sticky top-0 z-40 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo / Brand Header */}
        <button 
          onClick={handleReset}
          className="flex items-center gap-3 text-left group focus:outline-none"
        >
          <div className="w-9 h-9 border-2 border-[#00ff88] bg-[#00ff88]/10 flex items-center justify-center text-[#00ff88] group-hover:bg-[#00ff88] group-hover:text-black transition-all duration-200">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="stat-label text-[10px] tracking-[0.3em] mb-0 text-[#00ff88]">
              GEMINI 3.6 ENGINE
            </div>
            <h1 className="text-xl font-black tracking-tighter text-white uppercase italic leading-none flex items-center gap-2">
              AI QUIZ MASTER
            </h1>
          </div>
        </button>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          {/* History Button */}
          <button
            onClick={handleOpenHistory}
            className="flex items-center gap-2 px-3.5 py-2 bg-transparent text-white/80 hover:text-white text-[11px] font-black uppercase tracking-[0.2em] border-2 border-white/15 hover:border-[#00ff88] hover:text-[#00ff88] transition-all duration-150"
            title="Past Quiz History"
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">HISTORY</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className="p-2 bg-transparent text-white/80 hover:text-white border-2 border-white/15 hover:border-[#00ff88] transition-all duration-150"
            title={muted ? "Unmute Sound Effects" : "Mute Sound Effects"}
          >
            {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-[#00ff88]" />}
          </button>

          {/* New Quiz Button if quiz in progress */}
          {isQuizActive && (
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-[#00ff88] hover:bg-[#00e077] text-black text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-150"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>NEW QUIZ</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

