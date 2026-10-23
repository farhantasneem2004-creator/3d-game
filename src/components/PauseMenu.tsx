import React from 'react';
import { Play, RotateCcw, Volume2, VolumeX, User, FileCode2, Smartphone } from 'lucide-react';
import { sound } from '../game/SoundEffects';

interface PauseMenuProps {
  onResume: () => void;
  onRestart: () => void;
  onOpenModelModal: () => void;
  onOpenAndroidModal: () => void;
  onOpenInstallModal: () => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  onResume,
  onRestart,
  onOpenModelModal,
  onOpenAndroidModal,
  onOpenInstallModal,
}) => {
  const [muted, setMuted] = React.useState(!sound.enabled);

  const toggleSound = () => {
    sound.enabled = !sound.enabled;
    setMuted(!sound.enabled);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-slate-900/90 border border-slate-700 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center text-slate-100 flex flex-col items-center">
        <h2 className="text-2xl font-black text-white tracking-wider uppercase mb-1">Paused</h2>
        <p className="text-xs text-slate-400 mb-6">Take a breather or adjust game settings</p>

        <div className="w-full space-y-3">
          {/* Resume Button */}
          <button
            type="button"
            onClick={onResume}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold rounded-xl shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer text-sm"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>Resume Game</span>
          </button>

          {/* Restart Level Button */}
          <button
            type="button"
            onClick={onRestart}
            className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer text-sm"
          >
            <RotateCcw className="w-4 h-4 text-sky-400" />
            <span>Restart Level</span>
          </button>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={toggleSound}
            className="w-full py-2.5 px-4 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold rounded-xl flex items-center justify-between transition-colors cursor-pointer text-xs"
          >
            <span className="flex items-center gap-2">
              {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
              <span>Audio Sound Effects</span>
            </span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${muted ? 'bg-rose-950 text-rose-300' : 'bg-emerald-950 text-emerald-300'}`}>
              {muted ? 'OFF' : 'ON'}
            </span>
          </button>

          {/* 3D Character Inspector */}
          <button
            type="button"
            onClick={onOpenModelModal}
            className="w-full py-2.5 px-4 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold rounded-xl flex items-center justify-between transition-colors cursor-pointer text-xs"
          >
            <span className="flex items-center gap-2">
              <User className="w-4 h-4 text-sky-400" />
              <span>3D Character Model Specs</span>
            </span>
            <span className="text-[10px] text-slate-400">OBJ/MTL</span>
          </button>

          {/* Install on Phone */}
          <button
            type="button"
            onClick={onOpenInstallModal}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-sky-600 to-teal-500 hover:from-sky-500 hover:to-teal-400 text-white font-bold rounded-xl flex items-center justify-between transition-transform active:scale-95 cursor-pointer text-xs shadow-lg shadow-sky-950/40"
          >
            <span className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-white" />
              <span>Install Game on Phone</span>
            </span>
            <span className="text-[10px] bg-slate-950/40 px-2 py-0.5 rounded text-white font-mono">Instant PWA/APK</span>
          </button>

          {/* Android Project & APK */}
          <button
            type="button"
            onClick={onOpenAndroidModal}
            className="w-full py-2.5 px-4 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold rounded-xl flex items-center justify-between transition-colors cursor-pointer text-xs"
          >
            <span className="flex items-center gap-2">
              <FileCode2 className="w-4 h-4 text-emerald-400" />
              <span>Native Android APK Files</span>
            </span>
            <span className="text-[10px] text-slate-400">Compose</span>
          </button>
        </div>
      </div>
    </div>
  );
};
