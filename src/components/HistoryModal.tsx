import React, { useState, useEffect } from 'react';
import { QuizHistoryItem } from '../types';
import { History, X, Trash2, Award, Calendar, BookOpen } from 'lucide-react';
import { playSelectSound } from '../utils/audio';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose }) => {
  const [history, setHistory] = useState<QuizHistoryItem[]>([]);

  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem('ai_quiz_history');
      if (stored) {
        try {
          setHistory(JSON.parse(stored));
        } catch {
          setHistory([]);
        }
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClear = () => {
    playSelectSound();
    localStorage.removeItem('ai_quiz_history');
    setHistory([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#0a0a0c] border-2 border-white/12 w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-5 border-b-2 border-white/10 flex items-center justify-between bg-[#12141a]">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[#00ff88]" />
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-white">PAST QUIZ HISTORY</h3>
          </div>

          <button
            onClick={() => { playSelectSound(); onClose(); }}
            className="p-1.5 text-white/50 hover:text-white hover:bg-white/10 transition-colors border border-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* History List Content */}
        <div className="p-5 overflow-y-auto flex-1 space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-12 text-white/40 space-y-2">
              <BookOpen className="w-10 h-10 text-white/20 mx-auto mb-2" />
              <p className="font-bold text-xs uppercase tracking-wider text-white/60">NO QUIZ ATTEMPTS RECORDED YET</p>
              <p className="text-[11px] text-white/40 uppercase tracking-wide">Complete a quiz challenge to save your performance statistics here!</p>
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className="p-4 bg-[#12141a] border-2 border-white/12 flex flex-wrap items-center justify-between gap-3 hover:border-[#00ff88] transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm uppercase text-white tracking-wide">{item.topic}</span>
                    <span className="stat-label px-2 py-0.5 bg-[#0a0a0c] text-[#00ff88] border border-[#00ff88]/30">
                      {item.difficulty}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-white/40 font-bold uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-white/40" />
                      {item.timestamp}
                    </span>
                    <span>•</span>
                    <span>{item.questionCount} Qs ({item.format})</span>
                  </div>
                </div>

                {/* Score & Grade */}
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm font-black text-[#00ff88]">
                      {item.score} / {item.maxScore}
                    </div>
                    <div className="stat-label text-[9px]">PTS</div>
                  </div>

                  <div className="px-3 py-1.5 bg-[#0a0a0c] border border-[#ffb703] text-[#ffb703] font-black text-xs flex items-center gap-1">
                    <Award className="w-3.5 h-3.5" />
                    <span>{item.grade}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal Footer */}
        {history.length > 0 && (
          <div className="p-4 border-t-2 border-white/10 bg-[#12141a] flex justify-between items-center">
            <button
              onClick={handleClear}
              className="px-3 py-1.5 text-xs text-[#ff3366] hover:text-white hover:bg-[#ff3366]/20 flex items-center gap-1.5 transition-colors font-black uppercase tracking-wider border border-[#ff3366]/30"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>CLEAR HISTORY</span>
            </button>

            <button
              onClick={() => { playSelectSound(); onClose(); }}
              className="px-5 py-2 bg-[#00ff88] hover:bg-[#00e077] text-black text-xs font-black uppercase tracking-[0.2em] border-none"
            >
              CLOSE
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
