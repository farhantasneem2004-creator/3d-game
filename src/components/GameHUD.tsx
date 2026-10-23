import React from 'react';
import { GameHUDState } from '../game/GameEngine';
import { sound } from '../game/SoundEffects';
import {
  Heart,
  Coins,
  Trophy,
  Flag,
  Pause,
  Volume2,
  VolumeX,
  Smartphone,
  Maximize2,
  User,
  FileCode2,
} from 'lucide-react';

interface GameHUDProps {
  hudState: GameHUDState;
  onPauseToggle: () => void;
  onOpenModelModal: () => void;
  onOpenAndroidModal: () => void;
  onOpenInstallModal: () => void;
  isSimulatedDevice: boolean;
  onToggleSimulatedDevice: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  hudState,
  onPauseToggle,
  onOpenModelModal,
  onOpenAndroidModal,
  onOpenInstallModal,
  isSimulatedDevice,
  onToggleSimulatedDevice,
}) => {
  const [isMuted, setIsMuted] = React.useState(!sound.enabled);

  const toggleSound = () => {
    sound.enabled = !sound.enabled;
    setIsMuted(!sound.enabled);
  };

  return (
    <div className="absolute top-0 left-0 right-0 p-3 md:p-5 pointer-events-none z-20 flex justify-between items-start select-none">
      {/* Left: Player Vital Stats */}
      <div className="flex flex-wrap items-center gap-2 md:gap-3 pointer-events-auto">
        {/* Health Hearts */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/80 px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
          {Array.from({ length: hudState.maxHealth }).map((_, i) => (
            <Heart
              key={i}
              className={`w-5 h-5 transition-transform duration-200 ${
                i < hudState.health
                  ? 'text-rose-500 fill-rose-500 scale-100'
                  : 'text-slate-600 scale-90'
              }`}
            />
          ))}
        </div>

        {/* Coin Counter */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-amber-500/40 px-3.5 py-1.5 rounded-full flex items-center gap-1.5 text-amber-300 font-extrabold text-sm shadow-lg shadow-amber-950/20">
          <Coins className="w-4 h-4 text-amber-400 fill-amber-400" />
          <span>{hudState.coins} / {hudState.totalCoins}</span>
        </div>

        {/* Score Badge */}
        <div className="hidden sm:flex bg-slate-900/80 backdrop-blur-md border border-sky-500/40 px-3.5 py-1.5 rounded-full items-center gap-1.5 text-sky-300 font-extrabold text-sm shadow-lg">
          <Trophy className="w-4 h-4 text-sky-400" />
          <span>{hudState.score}</span>
        </div>

        {/* Checkpoint Status */}
        {hudState.activeCheckpoint > 0 && (
          <div className="bg-emerald-950/80 backdrop-blur-md border border-emerald-500/50 px-3 py-1.5 rounded-full flex items-center gap-1.5 text-emerald-300 font-bold text-xs shadow-lg">
            <Flag className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
            <span>Checkpoint {hudState.activeCheckpoint}</span>
          </div>
        )}
      </div>

      {/* Right: Utility & Navigation Controls */}
      <div className="flex items-center gap-2 pointer-events-auto">
        {/* Character Model Inspector Button */}
        <button
          type="button"
          onClick={onOpenModelModal}
          title="Inspect 3D Character Model (OBJ/MTL/JPG)"
          className="bg-slate-900/80 hover:bg-slate-800 backdrop-blur-md border border-sky-500/40 text-sky-300 hover:text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg transition-colors cursor-pointer"
        >
          <User className="w-3.5 h-3.5" />
          <span className="hidden md:inline">3D Character</span>
        </button>

        {/* Android APK & Code Project Button */}
        <button
          type="button"
          onClick={onOpenAndroidModal}
          title="Native Android Project & APK Build Guide"
          className="bg-emerald-900/80 hover:bg-emerald-800 backdrop-blur-md border border-emerald-500/50 text-emerald-200 hover:text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-lg transition-colors cursor-pointer"
        >
          <FileCode2 className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Android APK</span>
        </button>

        {/* Install on Phone Button */}
        <button
          type="button"
          onClick={onOpenInstallModal}
          title="Install 3D Platformer on Your Phone (Instant PWA or Native APK)"
          className="bg-gradient-to-r from-sky-500 to-teal-400 hover:from-sky-400 hover:to-teal-300 text-slate-950 px-3 py-1.5 rounded-full text-xs font-black flex items-center gap-1.5 shadow-lg shadow-sky-500/20 transition-transform active:scale-95 cursor-pointer"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Install on Phone</span>
        </button>

        {/* Audio Mute/Unmute */}
        <button
          type="button"
          onClick={toggleSound}
          title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          className="bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white p-2 rounded-full border border-slate-700/80 shadow-lg transition-colors cursor-pointer"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>

        {/* Device Frame Toggle (Desktop) */}
        <button
          type="button"
          onClick={onToggleSimulatedDevice}
          title={isSimulatedDevice ? 'Switch to Fullscreen View' : 'Simulate Android Landscape Phone Frame'}
          className="hidden sm:flex bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white p-2 rounded-full border border-slate-700/80 shadow-lg transition-colors cursor-pointer"
        >
          {isSimulatedDevice ? <Maximize2 className="w-4 h-4" /> : <Smartphone className="w-4 h-4 text-sky-400" />}
        </button>

        {/* Pause Button */}
        <button
          type="button"
          onClick={onPauseToggle}
          title="Pause Game (P / Esc)"
          className="bg-slate-900/80 hover:bg-slate-800 text-white p-2 rounded-full border border-slate-700/80 shadow-lg transition-colors cursor-pointer"
        >
          <Pause className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
