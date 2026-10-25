import React, { useRef, useState, useEffect } from 'react';
import { PlayerInput } from '../game/GameEngine';
import { sound } from '../game/SoundEffects';
import { Crosshair, RotateCw, Flame, ArrowUp, Zap, ChevronsRight } from 'lucide-react';

interface TouchControlsProps {
  input: PlayerInput;
  onCameraDrag: (dx: number, dy: number) => void;
  isPaused: boolean;
  onSwitchWeapon?: (dir: 'next' | 'prev' | number) => void;
  onReload?: () => void;
  currentWeaponName?: string;
  ammoInMag?: number;
  reserveAmmo?: number;
  isReloading?: boolean;
  isAiming?: boolean;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  input,
  onCameraDrag,
  isPaused,
  onSwitchWeapon,
  onReload,
  currentWeaponName,
  ammoInMag,
  reserveAmmo,
  isReloading,
  isAiming,
}) => {
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [activeTouchId, setActiveTouchId] = useState<number | null>(null);
  const [cameraTouchId, setCameraTouchId] = useState<number | null>(null);
  const lastCameraPos = useRef({ x: 0, y: 0 });

  const [isMouseDownJoystick, setIsMouseDownJoystick] = useState(false);

  // Joystick touch & pointer handlers
  const handleJoystickStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (activeTouchId !== null || isPaused) return;

    const touch = e.changedTouches[0];
    setActiveTouchId(touch.identifier);
    updateJoystick(touch.clientX, touch.clientY);
  };

  const handleJoystickPointerDown = (e: React.PointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (isPaused) return;
    setIsMouseDownJoystick(true);
    updateJoystick(e.clientX, e.clientY);
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

    const handlePointerMove = (e: PointerEvent) => {
      if (isMouseDownJoystick) {
        updateJoystick(e.clientX, e.clientY);
      }
    };

    const handlePointerUp = () => {
      if (isMouseDownJoystick) {
        setIsMouseDownJoystick(false);
        input.joystickX = 0;
        input.joystickY = 0;
        setKnobPos({ x: 0, y: 0 });
      }
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [activeTouchId, cameraTouchId, isMouseDownJoystick, onCameraDrag]);

  // Camera swipe zone across upper screen
  const handleCameraTouchStart = (e: React.TouchEvent) => {
    if (cameraTouchId !== null || isPaused) return;
    const touch = e.changedTouches[0];
    setCameraTouchId(touch.identifier);
    lastCameraPos.current = { x: touch.clientX, y: touch.clientY };
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-10 overflow-hidden">
      {/* Upper/Center screen camera drag zone */}
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
      <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-6 pointer-events-auto flex flex-col items-center">
        <div
          ref={joystickBaseRef}
          onTouchStart={handleJoystickStart}
          onPointerDown={handleJoystickPointerDown}
          onMouseDown={handleJoystickPointerDown}
          className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-slate-900/60 backdrop-blur-md border-2 border-cyan-400/30 shadow-2xl flex items-center justify-center touch-none cursor-pointer"
        >
          {/* Inner ring */}
          <div className="absolute w-16 h-16 sm:w-20 sm:h-20 rounded-full border border-cyan-400/20" />
          {/* Moving Knob */}
          <div
            style={{
              transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
              transition: activeTouchId === null ? 'transform 0.15s cubic-bezier(0.2, 0.9, 0.3, 1)' : 'none',
            }}
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-cyan-500 border-2 border-cyan-200 shadow-lg shadow-cyan-500/50 flex items-center justify-center"
          >
            <div className="w-3.5 h-3.5 rounded-full bg-white/70" />
          </div>
        </div>
        <span className="text-[10px] sm:text-[11px] font-bold text-cyan-300/80 mt-1 uppercase tracking-wider font-mono">Move</span>
      </div>

      {/* Action Buttons Cluster (Lower-Right) */}
      <div className="absolute bottom-4 sm:bottom-6 right-4 sm:right-6 pointer-events-auto flex flex-col items-end gap-2.5">
        {/* Top row of action cluster: Switch Gun & Reload */}
        <div className="flex items-center gap-2">
          {/* Weapon Switch Button */}
          <button
            type="button"
            onTouchStart={(e) => {
              e.preventDefault();
              onSwitchWeapon && onSwitchWeapon('next');
            }}
            onMouseDown={() => onSwitchWeapon && onSwitchWeapon('next')}
            className="h-10 px-3 rounded-full bg-slate-900/80 backdrop-blur-md border border-purple-500/40 text-purple-300 font-mono text-[11px] font-bold flex items-center gap-1 shadow-lg active:scale-95 transition-transform"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
            <span>Gun</span>
          </button>

          {/* Reload Button */}
          <button
            type="button"
            onTouchStart={(e) => {
              e.preventDefault();
              onReload && onReload();
            }}
            onMouseDown={() => onReload && onReload()}
            className="w-10 h-10 rounded-full bg-slate-900/80 backdrop-blur-md border border-amber-500/40 text-amber-300 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          >
            <RotateCw className={`w-4 h-4 ${isReloading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Middle row: Aim Down Sights & Sprint */}
        <div className="flex items-center gap-2.5">
          {/* Sprint Toggle */}
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
            className={`w-12 h-12 rounded-full font-black text-xs uppercase flex items-center justify-center transition-all duration-150 shadow-xl border-2 active:scale-90 ${
              input.runPressed
                ? 'bg-amber-500 border-amber-200 text-white shadow-amber-500/50 scale-105'
                : 'bg-slate-900/70 border-amber-500/40 text-amber-300'
            }`}
          >
            <Zap className="w-5 h-5" />
          </button>

          {/* GTA Over-The-Shoulder Aim Toggle */}
          <button
            type="button"
            onTouchStart={(e) => {
              e.preventDefault();
              input.aimPressed = !input.aimPressed;
            }}
            onMouseDown={() => {
              input.aimPressed = !input.aimPressed;
            }}
            className={`w-14 h-14 rounded-full font-black text-xs uppercase flex flex-col items-center justify-center transition-all duration-150 shadow-xl border-2 active:scale-90 ${
              input.aimPressed || isAiming
                ? 'bg-cyan-500 border-cyan-100 text-slate-950 shadow-cyan-500/50 scale-105'
                : 'bg-slate-900/80 border-cyan-400/50 text-cyan-300'
            }`}
          >
            <Crosshair className="w-5 h-5" />
            <span className="text-[9px] font-mono leading-none mt-0.5 font-bold">Aim</span>
          </button>
        </div>

        {/* Bottom row: Primary Fire & Jump */}
        <div className="flex items-center gap-3">
          {/* GTA Primary Fire Weapon Button */}
          <button
            type="button"
            onTouchStart={(e) => {
              e.preventDefault();
              input.firePressed = true;
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              input.firePressed = false;
            }}
            onMouseDown={() => (input.firePressed = true)}
            onMouseUp={() => (input.firePressed = false)}
            className="w-16 h-16 rounded-full bg-gradient-to-tr from-rose-600 to-red-500 border-2 border-rose-300 text-white font-black text-xs uppercase flex flex-col items-center justify-center transition-transform active:scale-90 shadow-2xl shadow-rose-600/50"
          >
            <Flame className="w-6 h-6 text-white" />
            <span className="text-[10px] font-mono tracking-tight font-extrabold">FIRE</span>
          </button>

          {/* Jump Button (Largest for reliable platformer traversal) */}
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
            className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 border-2 border-emerald-200 text-white font-black text-sm uppercase flex flex-col items-center justify-center transition-transform active:scale-90 shadow-2xl shadow-emerald-500/50"
          >
            <ArrowUp className="w-7 h-7" />
            <span className="text-[11px] font-mono font-bold tracking-wider">JUMP</span>
          </button>
        </div>
      </div>
    </div>
  );
};
