import { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine, GameHUDState } from './game/GameEngine';
import { TouchControls } from './components/TouchControls';
import { GameHUD } from './components/GameHUD';
import { CharacterAssetModal } from './components/CharacterAssetModal';
import { AndroidProjectModal } from './components/AndroidProjectModal';
import { PhoneInstallModal } from './components/PhoneInstallModal';
import { PauseMenu } from './components/PauseMenu';
import { GameOverModal } from './components/GameOverModal';
import { VictoryModal } from './components/VictoryModal';
import { AlertCircle, RotateCcw } from 'lucide-react';

export default function App() {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const gameEngineRef = useRef<GameEngine | null>(null);

  const [hudState, setHudState] = useState<GameHUDState>({
    health: 3,
    maxHealth: 3,
    coins: 0,
    totalCoins: 10,
    score: 0,
    activeCheckpoint: 0,
    isPaused: false,
    isGameOver: false,
    isVictory: false,
    timeElapsed: 0,
    loading: true,
    loadingPercent: 0,
    loadingMessage: 'Loading 3D character assets...',
    errorMessage: null,
    characterStats: null,
  });

  const [showModelModal, setShowModelModal] = useState(false);
  const [showAndroidModal, setShowAndroidModal] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [isSimulatedDevice, setIsSimulatedDevice] = useState(false);
  const [isSkeletonVisible, setIsSkeletonVisible] = useState(false);

  // Initialize Game Engine once on mount
  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const engine = new GameEngine(canvasContainerRef.current);
    gameEngineRef.current = engine;

    engine.onHUDStateChange = (state) => {
      setHudState(state);
    };

    return () => {
      engine.destroy();
      gameEngineRef.current = null;
    };
  }, []);

  const handleCameraDrag = useCallback((dx: number, dy: number) => {
    gameEngineRef.current?.handleCameraDrag(dx, dy);
  }, []);

  const handlePauseToggle = useCallback(() => {
    gameEngineRef.current?.togglePause();
  }, []);

  const handleRestartLevel = useCallback(() => {
    gameEngineRef.current?.restartLevel();
  }, []);

  const handleRespawnCheckpoint = useCallback(() => {
    gameEngineRef.current?.respawnAtCheckpoint();
  }, []);

  const handleLoadCustomFiles = useCallback(async (objFile: File, mtlFile: File, jpgFile: File) => {
    if (!gameEngineRef.current) return;
    await gameEngineRef.current.loadCustomModelFromFiles(objFile, mtlFile, jpgFile);
  }, []);

  const handleToggleSkeleton = useCallback((visible: boolean) => {
    setIsSkeletonVisible(visible);
    gameEngineRef.current?.setSkeletonVisibility(visible);
  }, []);

  const handleSetTestAnimation = useCallback((anim: string | null) => {
    gameEngineRef.current?.setTestAnimation(anim);
  }, []);

  return (
    <div className="w-screen h-screen bg-slate-950 flex items-center justify-center overflow-hidden font-sans select-none">
      {/* Landscape Android Device Frame Wrapper */}
      <div
        className={`relative transition-all duration-300 overflow-hidden bg-black ${
          isSimulatedDevice
            ? 'w-[96vw] max-w-[920px] aspect-[19.5/9] rounded-[38px] border-[10px] border-slate-800 shadow-[0_0_60px_rgba(0,0,0,0.85)] ring-1 ring-white/10'
            : 'w-full h-full'
        }`}
      >
        {/* Android Punch Hole Camera (Simulated) */}
        {isSimulatedDevice && (
          <div className="absolute top-1/2 left-3 -translate-y-1/2 w-4 h-4 bg-black rounded-full z-30 ring-2 ring-slate-800/80 pointer-events-none" />
        )}

        {/* 3D WebGL Canvas Viewport */}
        <div ref={canvasContainerRef} className="w-full h-full absolute inset-0" />

        {/* Loading Overlay */}
        {hudState.loading && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-white p-6">
            <div className="w-12 h-12 border-4 border-sky-500/20 border-t-sky-400 rounded-full animate-spin mb-4" />
            <h1 className="text-xl font-black tracking-wider text-sky-400 uppercase">3D Platformer</h1>
            <p className="text-xs text-slate-400 mt-2">{hudState.loadingMessage}</p>

            <div className="w-64 h-2 bg-slate-800 rounded-full mt-4 overflow-hidden border border-slate-700">
              <div
                style={{ width: `${hudState.loadingPercent}%` }}
                className="h-full bg-gradient-to-r from-sky-500 to-teal-400 transition-all duration-200"
              />
            </div>
            <span className="text-[11px] text-slate-500 font-mono mt-1.5">{hudState.loadingPercent}%</span>
          </div>
        )}

        {/* Loading Error Screen */}
        {hudState.errorMessage && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/95 text-white p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-950 border border-rose-700 flex items-center justify-center text-rose-400 mb-3 shadow-lg">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-rose-400">Character Model Loading Error</h2>
            <p className="text-xs text-slate-300 max-w-md mt-2 mb-4 bg-slate-900 p-3 rounded-lg border border-slate-800 font-mono">
              {hudState.errorMessage}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => gameEngineRef.current?.loadCharacterModel()}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Retry Loading
              </button>
              <button
                type="button"
                onClick={() => setShowModelModal(true)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                Choose Local Files
              </button>
            </div>
          </div>
        )}

        {/* In-Game HUD */}
        {!hudState.loading && !hudState.errorMessage && (
          <GameHUD
            hudState={hudState}
            onPauseToggle={handlePauseToggle}
            onOpenModelModal={() => setShowModelModal(true)}
            onOpenAndroidModal={() => setShowAndroidModal(true)}
            onOpenInstallModal={() => setShowInstallModal(true)}
            isSimulatedDevice={isSimulatedDevice}
            onToggleSimulatedDevice={() => setIsSimulatedDevice((prev) => !prev)}
          />
        )}

        {/* Touch Controls Overlay */}
        {!hudState.loading && !hudState.errorMessage && gameEngineRef.current && (
          <TouchControls
            input={gameEngineRef.current.input}
            onCameraDrag={handleCameraDrag}
            isPaused={hudState.isPaused || hudState.isGameOver || hudState.isVictory}
          />
        )}

        {/* Pause Menu Modal */}
        {hudState.isPaused && (
          <PauseMenu
            onResume={handlePauseToggle}
            onRestart={() => {
              handleRestartLevel();
              handlePauseToggle();
            }}
            onOpenModelModal={() => setShowModelModal(true)}
            onOpenAndroidModal={() => setShowAndroidModal(true)}
            onOpenInstallModal={() => setShowInstallModal(true)}
          />
        )}

        {/* Game Over Modal */}
        {hudState.isGameOver && (
          <GameOverModal
            score={hudState.score}
            coins={hudState.coins}
            activeCheckpoint={hudState.activeCheckpoint}
            onRespawnCheckpoint={handleRespawnCheckpoint}
            onRestartLevel={handleRestartLevel}
          />
        )}

        {/* Victory Modal */}
        {hudState.isVictory && (
          <VictoryModal
            score={hudState.score}
            coins={hudState.coins}
            totalCoins={hudState.totalCoins}
            timeElapsed={hudState.timeElapsed}
            onPlayAgain={handleRestartLevel}
          />
        )}

        {/* Character Asset Inspector & Auto-Rigging Modal */}
        {showModelModal && (
          <CharacterAssetModal
            stats={hudState.characterStats}
            onClose={() => setShowModelModal(false)}
            onLoadCustomFiles={handleLoadCustomFiles}
            onToggleSkeleton={handleToggleSkeleton}
            onSetTestAnimation={handleSetTestAnimation}
            isSkeletonVisible={isSkeletonVisible}
          />
        )}

        {/* Android Native Project & Code Modal */}
        {showAndroidModal && (
          <AndroidProjectModal onClose={() => setShowAndroidModal(false)} />
        )}

        {/* Phone Installation Modal (Instant QR / PWA / APK) */}
        {showInstallModal && (
          <PhoneInstallModal
            onClose={() => setShowInstallModal(false)}
            onOpenAndroidProject={() => {
              setShowInstallModal(false);
              setShowAndroidModal(true);
            }}
          />
        )}
      </div>
    </div>
  );
}
