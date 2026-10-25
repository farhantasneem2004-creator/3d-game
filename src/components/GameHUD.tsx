import React from 'react';
import { GameHUDState } from '../game/GameEngine';
import { sound } from '../game/SoundEffects';
import { WeaponId } from '../game/Weapons';
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
  CheckCircle2,
  RotateCw,
  Crosshair,
} from 'lucide-react';

interface GameHUDProps {
  hudState: GameHUDState;
  onPauseToggle: () => void;
  onOpenModelModal: () => void;
  onOpenAndroidModal: () => void;
  onOpenInstallModal: () => void;
  isSimulatedDevice: boolean;
  onToggleSimulatedDevice: () => void;
  onSwitchWeapon?: (idx: number | 'next' | 'prev') => void;
  onReload?: () => void;
}

const WEAPONS_LIST: { id: WeaponId; name: string; key: number; label: string }[] = [
  { id: 'pistol', name: 'Pistol', key: 1, label: 'Handgun' },
  { id: 'smg', name: 'SMG', key: 2, label: 'Micro SMG' },
  { id: 'rifle', name: 'Rifle', key: 3, label: 'Carbine' },
  { id: 'shotgun', name: 'Shotgun', key: 4, label: 'Heavy SG' },
  { id: 'sniper', name: 'Sniper', key: 5, label: 'Marksman' },
];

export const GameHUD: React.FC<GameHUDProps> = ({
  hudState,
  onPauseToggle,
  onOpenModelModal,
  onOpenAndroidModal,
  onOpenInstallModal,
  isSimulatedDevice,
  onToggleSimulatedDevice,
  onSwitchWeapon,
  onReload,
}) => {
  const [isMuted, setIsMuted] = React.useState(!sound.enabled);

  const toggleSound = () => {
    sound.enabled = !sound.enabled;
    setIsMuted(!sound.enabled);
  };

  const isSavedCustom = hudState.characterStats?.isSavedCustom;
  const isLowAmmo = hudState.ammoInMag <= 3 && hudState.ammoInMag > 0;
  const isOutOfAmmo = hudState.ammoInMag === 0;

  return (
    <>
      {/* Top Header Bar */}
      <header className="absolute top-0 left-0 right-0 p-2 sm:p-3 md:p-4 pointer-events-none z-20 flex justify-between items-start select-none pt-[max(0.5rem,env(safe-area-inset-top))] px-[max(0.6rem,env(safe-area-inset-left))]">
        {/* Left: Vital Stats Capsule */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 pointer-events-auto flex-wrap max-w-[55%] sm:max-w-none">
          <div className="bg-slate-900/85 backdrop-blur-md border border-slate-700/80 px-2.5 sm:px-3.5 py-1.5 rounded-full flex items-center gap-1.5 sm:gap-2.5 shadow-lg shadow-black/40">
            {/* Health Hearts */}
            <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
              {Array.from({ length: hudState.maxHealth }).map((_, i) => (
                <Heart
                  key={i}
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 transition-transform duration-200 ${
                    i < hudState.health
                      ? 'text-rose-500 fill-rose-500 scale-100'
                      : 'text-slate-600 scale-90'
                  }`}
                />
              ))}
            </div>

            <div className="w-[1px] h-3.5 bg-slate-700 shrink-0" />

            {/* Coin Counter */}
            <div className="flex items-center gap-1 text-amber-300 font-extrabold text-xs sm:text-sm shrink-0">
              <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 fill-amber-400 shrink-0" />
              <span>{hudState.coins}/{hudState.totalCoins}</span>
            </div>

            {/* Score Badge */}
            <div className="hidden sm:flex items-center gap-1 text-sky-300 font-extrabold text-xs shrink-0 pl-1 border-l border-slate-700">
              <Trophy className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>{hudState.score}</span>
            </div>
          </div>

          {/* Saved Character Indicator */}
          {isSavedCustom && (
            <div className="bg-emerald-950/80 backdrop-blur-md border border-emerald-500/50 px-2 sm:px-2.5 py-1 rounded-full flex items-center gap-1 text-emerald-300 font-bold text-[10px] sm:text-xs shadow-md shrink-0">
              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="hidden sm:inline">Character Saved</span>
              <span className="sm:hidden">Saved</span>
            </div>
          )}

          {/* Checkpoint Status Badge */}
          {hudState.activeCheckpoint > 0 && (
            <div className="hidden sm:flex bg-emerald-950/80 backdrop-blur-md border border-emerald-500/50 px-2.5 py-1 rounded-full items-center gap-1 text-emerald-300 font-bold text-xs shadow-md shrink-0">
              <Flag className="w-3 h-3 text-emerald-400 fill-emerald-400 shrink-0" />
              <span>CP {hudState.activeCheckpoint}</span>
            </div>
          )}
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-1 sm:gap-2 pointer-events-auto shrink-0 pr-[max(0.2rem,env(safe-area-inset-right))]">
          {/* Character Model Inspector Button */}
          <button
            type="button"
            onClick={onOpenModelModal}
            title="Inspect 3D Character Model (OBJ/MTL/JPG)"
            className="bg-slate-900/85 hover:bg-slate-800 text-sky-300 hover:text-white px-2 sm:px-3 py-1.5 rounded-full border border-sky-500/40 text-xs font-bold flex items-center gap-1 shadow-md transition-colors cursor-pointer shrink-0"
          >
            <User className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline">3D Character</span>
            <span className="md:hidden text-[11px]">3D</span>
          </button>

          {/* Android APK & Code Project Button */}
          <button
            type="button"
            onClick={onOpenAndroidModal}
            title="Native Android Project & APK Build Guide"
            className="bg-emerald-900/85 hover:bg-emerald-800 text-emerald-200 hover:text-white px-2 sm:px-3 py-1.5 rounded-full border border-emerald-500/50 text-xs font-bold flex items-center gap-1 shadow-md transition-colors cursor-pointer shrink-0"
          >
            <FileCode2 className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden md:inline">Android APK</span>
            <span className="md:hidden text-[11px]">APK</span>
          </button>

          {/* Install on Phone Button */}
          <button
            type="button"
            onClick={onOpenInstallModal}
            title="Install 3D Platformer on Your Phone (Instant PWA or Native APK)"
            className="bg-gradient-to-r from-sky-500 to-teal-400 hover:from-sky-400 hover:to-teal-300 text-slate-950 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-black flex items-center gap-1 shadow-md shadow-sky-500/20 transition-transform active:scale-95 cursor-pointer shrink-0"
          >
            <Smartphone className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Install on Phone</span>
            <span className="sm:hidden text-[11px]">Install</span>
          </button>

          {/* Audio Mute/Unmute */}
          <button
            type="button"
            onClick={toggleSound}
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
            className="bg-slate-900/85 hover:bg-slate-800 text-slate-300 hover:text-white p-1.5 sm:p-2 rounded-full border border-slate-700/80 shadow-md transition-colors cursor-pointer shrink-0"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400 shrink-0" /> : <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />}
          </button>

          {/* Device Frame Toggle (Desktop) */}
          <button
            type="button"
            onClick={onToggleSimulatedDevice}
            title={isSimulatedDevice ? 'Switch to Fullscreen View' : 'Simulate Android Landscape Phone Frame'}
            className="hidden lg:flex bg-slate-900/85 hover:bg-slate-800 text-slate-300 hover:text-white p-2 rounded-full border border-slate-700/80 shadow-md transition-colors cursor-pointer shrink-0"
          >
            {isSimulatedDevice ? <Maximize2 className="w-4 h-4 shrink-0" /> : <Smartphone className="w-4 h-4 text-sky-400 shrink-0" />}
          </button>

          {/* Pause Button */}
          <button
            type="button"
            onClick={onPauseToggle}
            title="Pause Game (P / Esc)"
            className="bg-slate-900/85 hover:bg-slate-800 text-white p-1.5 sm:p-2 rounded-full border border-slate-700/80 shadow-md transition-colors cursor-pointer shrink-0"
          >
            <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          </button>
        </div>
      </header>

      {/* GTA-Style Cyberpunk Weapon HUD (Top-Right under header) */}
      <div className="absolute top-14 sm:top-16 right-2 sm:right-4 z-20 pointer-events-auto flex flex-col items-end gap-1.5 select-none">
        <div className="bg-slate-950/85 backdrop-blur-md border border-cyan-500/40 rounded-xl p-2.5 sm:p-3 shadow-2xl shadow-cyan-950/50 flex flex-col items-end min-w-[170px] sm:min-w-[210px]">
          {/* Category & Weapon Name */}
          <div className="flex items-center justify-between w-full mb-1">
            <span className="text-[9px] uppercase tracking-wider font-mono text-cyan-400 font-bold bg-cyan-950/70 px-1.5 py-0.5 rounded border border-cyan-500/30">
              {hudState.weaponCategory || 'Firearm'}
            </span>
            <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">[1-5 / Q / E]</span>
          </div>

          <div className="text-sm sm:text-base font-black text-white tracking-wide uppercase drop-shadow flex items-center gap-1.5">
            <Crosshair className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>{hudState.weaponName || 'Combat Pistol'}</span>
          </div>

          {/* Ammo Readout */}
          <div className="flex items-baseline gap-1 mt-1">
            <span
              className={`font-black font-mono tracking-tight transition-colors ${
                hudState.isReloading
                  ? 'text-amber-400 text-lg'
                  : isOutOfAmmo
                  ? 'text-rose-500 text-2xl animate-pulse'
                  : isLowAmmo
                  ? 'text-amber-400 text-2xl'
                  : 'text-white text-2xl'
              }`}
            >
              {hudState.isReloading ? 'RELOADING' : hudState.ammoInMag}
            </span>
            {!hudState.isReloading && (
              <span className="text-xs font-mono font-bold text-slate-400">
                / {hudState.reserveAmmo}
              </span>
            )}
          </div>

          {/* Reload Progress or Quick Reload Button */}
          <div className="flex items-center gap-2 mt-2 w-full justify-between pt-1.5 border-t border-slate-800">
            <button
              type="button"
              onClick={() => onReload && onReload()}
              disabled={hudState.isReloading || hudState.ammoInMag === hudState.magSize || hudState.reserveAmmo <= 0}
              title="Reload Weapon (R)"
              className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-cyan-300 hover:text-white rounded border border-cyan-500/30 text-[10px] font-bold font-mono flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RotateCw className={`w-2.5 h-2.5 ${hudState.isReloading ? 'animate-spin text-amber-400' : ''}`} />
              <span>Reload [R]</span>
            </button>

            {/* Aim status badge */}
            <span
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                hudState.isAiming
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50'
                  : 'bg-slate-900 text-slate-500 border border-slate-800'
              }`}
            >
              {hudState.isAiming ? 'AIMING' : 'HIP'}
            </span>
          </div>
        </div>

        {/* 5-Slot Weapon Quick Bar */}
        <div className="flex items-center gap-1 bg-slate-950/80 backdrop-blur-md p-1 rounded-lg border border-slate-800">
          {WEAPONS_LIST.map((w, idx) => {
            const isActive = hudState.weaponId === w.id;
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => onSwitchWeapon && onSwitchWeapon(idx)}
                title={`${w.name} (${w.key})`}
                className={`px-2 py-1 rounded text-[10px] font-mono font-black transition-all cursor-pointer ${
                  isActive
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/50 scale-105'
                    : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span className="opacity-70 text-[8px] mr-0.5">{w.key}:</span>
                {w.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Center Crosshair & Hit Marker */}
      {!hudState.isPaused && !hudState.isGameOver && !hudState.isVictory && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
          {/* Over-the-shoulder GTA Aim Reticle */}
          <div
            className={`relative transition-all duration-150 flex items-center justify-center ${
              hudState.isAiming ? 'scale-100 opacity-95' : 'scale-90 opacity-65'
            }`}
          >
            {/* Center Pip */}
            <div
              className={`rounded-full transition-all duration-150 ${
                hudState.isAiming
                  ? 'w-1.5 h-1.5 bg-cyan-300 shadow-[0_0_8px_rgba(56,189,248,0.9)]'
                  : 'w-1 h-1 bg-white/80'
              }`}
            />

            {/* Tactical Brackets (Expands when hip-firing, tightens when aiming) */}
            <div
              className={`absolute border-t-2 border-cyan-400 transition-all duration-150 ${
                hudState.isAiming ? '-top-3 w-3' : '-top-4 w-4 border-white/60'
              }`}
            />
            <div
              className={`absolute border-b-2 border-cyan-400 transition-all duration-150 ${
                hudState.isAiming ? '-bottom-3 w-3' : '-bottom-4 w-4 border-white/60'
              }`}
            />
            <div
              className={`absolute border-l-2 border-cyan-400 transition-all duration-150 ${
                hudState.isAiming ? '-left-3 h-3' : '-left-4 h-4 border-white/60'
              }`}
            />
            <div
              className={`absolute border-r-2 border-cyan-400 transition-all duration-150 ${
                hudState.isAiming ? '-right-3 h-3' : '-right-4 h-4 border-white/60'
              }`}
            />

            {/* Visceral Red Hit-Marker Feedback X */}
            {hudState.hitMarkerTimer > 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-ping">
                <div className="w-6 h-6 relative">
                  <div className="absolute inset-0 rotate-45 border-t-2 border-b-2 border-rose-500 shadow-[0_0_10px_rgba(244,63,94,1)]" />
                  <div className="absolute inset-0 -rotate-45 border-t-2 border-b-2 border-rose-500 shadow-[0_0_10px_rgba(244,63,94,1)]" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Desktop Keybinds Footer Hint */}
      <div className="hidden lg:flex absolute bottom-2 left-1/2 -translate-x-1/2 bg-slate-950/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-slate-800 text-[11px] text-slate-300 items-center gap-3 z-10 pointer-events-none font-mono">
        <span><kbd className="px-1.5 py-0.5 bg-slate-900 rounded border border-slate-700 text-white">WASD</kbd> Move</span>
        <span><kbd className="px-1.5 py-0.5 bg-slate-900 rounded border border-slate-700 text-white">Space</kbd> Jump</span>
        <span><kbd className="px-1.5 py-0.5 bg-slate-900 rounded border border-slate-700 text-cyan-400">RMB</kbd> Aim</span>
        <span><kbd className="px-1.5 py-0.5 bg-slate-900 rounded border border-slate-700 text-rose-400">LMB</kbd> Fire</span>
        <span><kbd className="px-1.5 py-0.5 bg-slate-900 rounded border border-slate-700 text-amber-400">R</kbd> Reload</span>
        <span><kbd className="px-1.5 py-0.5 bg-slate-900 rounded border border-slate-700 text-purple-400">1-5 / Q / E</kbd> Guns</span>
      </div>
    </>
  );
};
