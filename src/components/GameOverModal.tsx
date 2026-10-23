import React from 'react';
import { RotateCcw, Flag, Skull } from 'lucide-react';

interface GameOverModalProps {
  score: number;
  coins: number;
  activeCheckpoint: number;
  onRespawnCheckpoint: () => void;
  onRestartLevel: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  score,
  coins,
  activeCheckpoint,
  onRespawnCheckpoint,
  onRestartLevel,
}) => {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
      <div className="bg-slate-900 border border-rose-900/60 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center text-slate-100 flex flex-col items-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-950/80 border border-rose-700/60 flex items-center justify-center text-rose-500 mb-3 shadow-lg shadow-rose-950/50">
          <Skull className="w-7 h-7" />
        </div>

        <h2 className="text-2xl font-black text-rose-500 tracking-wider uppercase mb-1">Defeated</h2>
        <p className="text-xs text-slate-400 mb-5">You ran out of energy or fell into the void!</p>

        {/* Stats */}
        <div className="w-full bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5 mb-5 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Coins Kept</span>
            <span className="font-extrabold text-amber-300 text-sm">🪙 {coins}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Score</span>
            <span className="font-extrabold text-sky-300 text-sm">{score}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="w-full space-y-2.5">
          <button
            type="button"
            onClick={onRespawnCheckpoint}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer text-sm"
          >
            <Flag className="w-4 h-4 fill-white" />
            <span>Continue from Checkpoint {activeCheckpoint}</span>
          </button>

          <button
            type="button"
            onClick={onRestartLevel}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restart from Beginning</span>
          </button>
        </div>
      </div>
    </div>
  );
};
