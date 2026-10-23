import React from 'react';
import { Trophy, Star, RotateCcw, Clock, Coins } from 'lucide-react';

interface VictoryModalProps {
  score: number;
  coins: number;
  totalCoins: number;
  timeElapsed: number;
  onPlayAgain: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  score,
  coins,
  totalCoins,
  timeElapsed,
  onPlayAgain,
}) => {
  // Determine star rating (1 star = cleared, 2 stars = 50%+ coins, 3 stars = all coins)
  const coinRatio = totalCoins > 0 ? coins / totalCoins : 1;
  const stars = coinRatio >= 0.9 ? 3 : coinRatio >= 0.5 ? 2 : 1;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
      <div className="bg-slate-900 border border-amber-500/50 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center text-slate-100 flex flex-col items-center">
        {/* Trophy Icon */}
        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-400 mb-3 shadow-xl shadow-amber-500/20">
          <Trophy className="w-9 h-9 fill-amber-400" />
        </div>

        <h2 className="text-2xl font-black text-amber-400 tracking-wider uppercase mb-1">Victory!</h2>
        <p className="text-xs text-slate-400 mb-4">You navigated all platforms & reached the portal!</p>

        {/* 3-Star Rating */}
        <div className="flex items-center gap-2 mb-5">
          {[1, 2, 3].map((starIdx) => (
            <Star
              key={starIdx}
              className={`w-7 h-7 transition-all ${
                starIdx <= stars
                  ? 'text-amber-400 fill-amber-400 scale-110 drop-shadow-[0_0_8px_rgba(245,158,11,0.7)]'
                  : 'text-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Stats Grid */}
        <div className="w-full bg-slate-950/60 border border-slate-800 rounded-2xl p-4 mb-6 grid grid-cols-3 gap-2 text-xs">
          <div>
            <div className="flex items-center justify-center gap-1 text-slate-400 text-[10px] mb-0.5">
              <Coins className="w-3 h-3 text-amber-400" /> Coins
            </div>
            <span className="font-extrabold text-amber-300 text-sm">{coins}/{totalCoins}</span>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1 text-slate-400 text-[10px] mb-0.5">
              <Clock className="w-3 h-3 text-sky-400" /> Time
            </div>
            <span className="font-extrabold text-sky-300 text-sm">{formatTime(timeElapsed)}</span>
          </div>
          <div>
            <div className="text-slate-400 text-[10px] mb-0.5">Total Score</div>
            <span className="font-extrabold text-emerald-300 text-sm">{score}</span>
          </div>
        </div>

        {/* Play Again Button */}
        <button
          type="button"
          onClick={onPlayAgain}
          className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl shadow-xl shadow-amber-500/30 flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer text-sm"
        >
          <RotateCcw className="w-4 h-4 stroke-[2.5]" />
          <span>Play Again</span>
        </button>
      </div>
    </div>
  );
};
