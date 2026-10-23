import React, { useRef, useState, useEffect } from 'react';
import { PlayerInput } from '../game/GameEngine';
import { sound } from '../game/SoundEffects';

interface TouchControlsProps {
  input: PlayerInput;
  onCameraDrag: (dx: number, dy: number) => void;
  isPaused: boolean;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  input,
  onCameraDrag,
  isPaused,
}) => {
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [activeTouchId, setActiveTouchId] = useState<number | null>(null);
  const [cameraTouchId, setCameraTouchId] = useState<number | null>(null);
  const lastCameraPos = useRef({ x: 0, y: 0 });

  // Joystick touch handlers
  const handleJoystickStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (activeTouchId !== null || isPaused) return;

    const touch = e.changedTouches[0];
    setActiveTouchId(touch.identifier);
    updateJoystick(touch.clientX, touch.clientY);
  };

  const updateJoystick = (clientX: number, clientY: number) => {
    if (!joystickBaseRef.current) return;
    const rect = joystickBaseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const maxRadius = rect.width / 2 - 10;
    const dist = Math.hypot(dx, dy);

    if (dist < 5) {
      input.joystickX = 0;
      input.joystickY = 0;
      setKnobPos({ x: 0, y: 0 });
      return;
    }

    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);
    const normX = (Math.cos(angle) * clampedDist) / maxRadius;
    const normY = (Math.sin(angle) * clampedDist) / maxRadius;

    input.joystickX = normX;
    input.joystickY = normY;
    setKnobPos({ x: normX * maxRadius, y: normY * maxRadius });
  };

  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === activeTouchId) {
          updateJoystick(touch.clientX, touch.clientY);
        } else if (touch.identifier === cameraTouchId) {
          const dx = touch.clientX - lastCameraPos.current.x;
          const dy = touch.clientY - lastCameraPos.current.y;
          lastCameraPos.current = { x: touch.clientX, y: touch.clientY };
          onCameraDrag(dx, dy);
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === activeTouchId) {
          setActiveTouchId(null);
          input.joystickX = 0;
          input.joystickY = 0;
          setKnobPos({ x: 0, y: 0 });
        } else if (touch.identifier === cameraTouchId) {
          setCameraTouchId(null);
        }
      }
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [activeTouchId, cameraTouchId, onCameraDrag]);

  // Camera swipe zone
  const handleCameraTouchStart = (e: React.TouchEvent) => {
    if (cameraTouchId !== null || isPaused) return;
    const touch = e.changedTouches[0];
    setCameraTouchId(touch.identifier);
    lastCameraPos.current = { x: touch.clientX, y: touch.clientY };
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-10 overflow-hidden">
      {/* Upper screen camera drag zone */}
      <div
        className="absolute top-16 left-0 right-0 h-[48%] pointer-events-auto cursor-grab active:cursor-grabbing"
        onTouchStart={handleCameraTouchStart}
        onMouseDown={(e) => {
          let prevX = e.clientX;
          let prevY = e.clientY;
          const onMouseMove = (ev: MouseEvent) => {
            onCameraDrag(ev.clientX - prevX, ev.clientY - prevY);
            prevX = ev.clientX;
            prevY = ev.clientY;
          };
          const onMouseUp = () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
          };
          window.addEventListener('mousemove', onMouseMove);
          window.addEventListener('mouseup', onMouseUp);
        }}
      />

      {/* Virtual Joystick (Lower-Left) */}
      <div className="absolute bottom-6 left-6 pointer-events-auto flex flex-col items-center">
        <div
          ref={joystickBaseRef}
          onTouchStart={handleJoystickStart}
          className="relative w-36 h-36 rounded-full bg-slate-900/60 backdrop-blur-md border-2 border-sky-400/30 shadow-2xl flex items-center justify-center touch-none"
        >
          {/* Inner ring */}
          <div className="absolute w-20 h-20 rounded-full border border-sky-400/20" />
          {/* Moving Knob */}
          <div
            style={{
              transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
              transition: activeTouchId === null ? 'transform 0.15s cubic-bezier(0.2, 0.9, 0.3, 1)' : 'none',
            }}
            className="w-14 h-14 rounded-full bg-sky-500 border-2 border-sky-200 shadow-lg shadow-sky-500/50 flex items-center justify-center"
          >
            <div className="w-4 h-4 rounded-full bg-white/70" />
          </div>
        </div>
        <span className="text-[11px] font-bold text-sky-300/80 mt-1 uppercase tracking-wider">Move</span>
      </div>

      {/* Action Buttons (Lower-Right) */}
      <div className="absolute bottom-6 right-6 pointer-events-auto flex items-end gap-3.5">
        {/* Run / Sprint Toggle Button */}
        <button
          type="button"
          onTouchStart={(e) => {
            e.preventDefault();
            input.runPressed = !input.runPressed;
            sound.playFootstep();
          }}
          onMouseDown={() => {
            input.runPressed = !input.runPressed;
            sound.playFootstep();
          }}
          className={`w-16 h-16 rounded-full font-black text-xs uppercase flex flex-col items-center justify-center transition-all duration-150 shadow-xl border-2 active:scale-90 ${
            input.runPressed
              ? 'bg-amber-500 border-amber-200 text-white shadow-amber-500/50 scale-105'
              : 'bg-slate-900/70 border-amber-500/40 text-amber-300'
          }`}
        >
          <span>⚡</span>
          <span className="text-[10px] tracking-tight">{input.runPressed ? 'Sprint' : 'Run'}</span>
        </button>

        {/* Attack / Strike Button */}
        <button
          type="button"
          onTouchStart={(e) => {
            e.preventDefault();
            input.attackPressed = true;
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            input.attackPressed = false;
          }}
          onMouseDown={() => (input.attackPressed = true)}
          onMouseUp={() => (input.attackPressed = false)}
          className="w-16 h-16 rounded-full bg-gradient-to-tr from-rose-600 to-red-500 border-2 border-rose-300 text-white font-black text-xs uppercase flex flex-col items-center justify-center transition-transform active:scale-90 shadow-xl shadow-red-600/40"
        >
          <span className="text-sm">⚔️</span>
          <span className="text-[10px] tracking-tight">Attack</span>
        </button>

        {/* Jump Button (Largest) */}
        <button
          type="button"
          onTouchStart={(e) => {
            e.preventDefault();
            input.jumpPressed = true;
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            input.jumpPressed = false;
          }}
          onMouseDown={() => (input.jumpPressed = true)}
          onMouseUp={() => (input.jumpPressed = false)}
          className="w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 border-2 border-emerald-200 text-white font-black text-sm uppercase flex flex-col items-center justify-center transition-transform active:scale-90 shadow-2xl shadow-emerald-500/50"
        >
          <span className="text-lg">⬆️</span>
          <span className="text-xs font-bold tracking-wider">Jump</span>
        </button>
      </div>

      {/* Keyboard Controls Tip (Desktop) */}
      <div className="hidden md:flex absolute bottom-2 left-1/2 -translate-x-1/2 bg-slate-900/60 backdrop-blur-md px-3.5 py-1 rounded-full border border-white/10 text-[11px] text-slate-300 items-center gap-3">
        <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-white font-mono">WASD</kbd> Move</span>
        <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-white font-mono">Space</kbd> Jump</span>
        <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-white font-mono">Shift</kbd> Sprint</span>
        <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-white font-mono">J / Enter</kbd> Strike</span>
        <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-white font-mono">P / Esc</kbd> Pause</span>
      </div>
    </div>
  );
};
