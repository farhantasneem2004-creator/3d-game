import React, { useState, useEffect } from 'react';
import * as THREE from 'three';
import { ModelStats } from '../game/CharacterLoader';
import {
  MARKER_DEFINITIONS,
  MarkerId,
  MarkerPositions,
  RiggingSystem,
} from '../game/RiggingSystem';
import { RiggingEditorCanvas } from './RiggingEditorCanvas';
import {
  X,
  CheckCircle,
  Upload,
  Eye,
  EyeOff,
  FileText,
  Image as ImageIcon,
  Bone,
  Hand,
  Footprints,
  Play,
  Sparkles,
  RotateCcw,
  Sliders,
  Download,
  Layers,
  ChevronRight,
  Move,
  Maximize2,
  Minimize2,
} from 'lucide-react';

interface CharacterAssetModalProps {
  stats: ModelStats | null;
  modelGroup?: THREE.Group | null;
  initialMarkers?: MarkerPositions | null;
  onClose: () => void;
  onLoadCustomFiles: (objFile: File, mtlFile: File, jpgFile: File) => Promise<void>;
  onResetToDefault?: () => Promise<void>;
  onToggleSkeleton?: (visible: boolean) => void;
  onSetTestAnimation?: (anim: string | null) => void;
  onApplyCustomMarkers?: (markers: MarkerPositions) => void;
  onExportGLB?: () => void;
  isSkeletonVisible?: boolean;
}

export const CharacterAssetModal: React.FC<CharacterAssetModalProps> = ({
  stats,
  modelGroup,
  initialMarkers,
  onClose,
  onLoadCustomFiles,
  onResetToDefault,
  onToggleSkeleton,
  onSetTestAnimation,
  onApplyCustomMarkers,
  onExportGLB,
  isSkeletonVisible = false,
}) => {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'rigger' | 'anims' | 'upload'>('rigger');

  // Fullscreen studio state (fullscreen by default as requested in Priority 1)
  const [isFullscreen, setIsFullscreen] = useState<boolean>(true);

  // Prevent background scrolling while studio is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Rigging markers state
  const [markers, setMarkers] = useState<MarkerPositions>(() => {
    if (initialMarkers && Object.keys(initialMarkers).length > 0) {
      const copy: MarkerPositions = {} as MarkerPositions;
      for (const k in initialMarkers) {
        copy[k as MarkerId] = initialMarkers[k as MarkerId].clone();
      }
      return copy;
    }
    return RiggingSystem.getInitialMarkers();
  });

  const [selectedMarkerId, setSelectedMarkerId] = useState<MarkerId | null>('chest');
  const [useSymmetry, setUseSymmetry] = useState<boolean>(true);
  const [showMarkers, setShowMarkers] = useState<boolean>(true);
  const [showBones, setShowBones] = useState<boolean>(true);
  const [ghostMode, setGhostMode] = useState<boolean>(false);
  const [cameraPreset, setCameraPreset] = useState<'front' | 'side' | 'back' | 'perspective'>('perspective');

  // Notification / Feedback banner
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Upload state
  const [objFile, setObjFile] = useState<File | null>(null);
  const [mtlFile, setMtlFile] = useState<File | null>(null);
  const [jpgFile, setJpgFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Animation test state
  const [activeAnim, setActiveAnim] = useState<string>('idle');
  const [showInGameBones, setShowInGameBones] = useState<boolean>(isSkeletonVisible);

  // Sync initial markers when passed in
  useEffect(() => {
    if (initialMarkers && Object.keys(initialMarkers).length > 0) {
      const copy: MarkerPositions = {} as MarkerPositions;
      for (const k in initialMarkers) {
        copy[k as MarkerId] = initialMarkers[k as MarkerId].clone();
      }
      setMarkers(copy);
    }
  }, [initialMarkers]);

  // Handle markers change from 3D canvas
  const handleMarkersChange = (newMarkers: MarkerPositions) => {
    setMarkers(newMarkers);
  };

  // Nudge selected marker along an axis
  const handleNudge = (axis: 'x' | 'y' | 'z', delta: number) => {
    if (!selectedMarkerId) return;
    const current = markers[selectedMarkerId];
    if (!current) return;

    const next = current.clone();
    next[axis] += delta;

    const updated: MarkerPositions = {} as MarkerPositions;
    for (const k in markers) {
      updated[k as MarkerId] = markers[k as MarkerId].clone();
    }

    RiggingSystem.applySymmetry(updated, selectedMarkerId, next, useSymmetry);
    setMarkers(updated);
  };

  // Reset markers to model dimensions
  const handleResetMarkers = () => {
    const fresh = RiggingSystem.getInitialMarkers();
    setMarkers(fresh);
    setStatusMessage('Joint markers reset to default humanoid proportions.');
    setTimeout(() => setStatusMessage(null), 3500);
  };

  // Apply custom markers to in-game character
  const handleApplyToGame = () => {
    if (onApplyCustomMarkers) {
      onApplyCustomMarkers(markers);
      setStatusMessage('🎉 Custom skeleton & skin weights successfully applied to game character!');
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  // Export rigged GLB file
  const handleExportGLB = () => {
    if (onExportGLB) {
      onExportGLB();
      setStatusMessage('📦 Generating GLB file with embedded skeleton and textures...');
      setTimeout(() => setStatusMessage(null), 3500);
    }
  };

  // File upload handler
  const handleApplyCustomFiles = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!objFile || !mtlFile || !jpgFile) {
      setUploadError('Please select all three files: .obj, .mtl, and .jpg');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    try {
      await onLoadCustomFiles(objFile, mtlFile, jpgFile);
      setObjFile(null);
      setMtlFile(null);
      setJpgFile(null);
      setStatusMessage('Custom model loaded and auto-rigged! You can now adjust markers.');
      setActiveTab('rigger');
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: unknown) {
      setUploadError((err as Error).message || 'Failed to apply custom character model');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAnimClick = (anim: string) => {
    const nextAnim = activeAnim === anim ? 'idle' : anim;
    setActiveAnim(nextAnim);
    onSetTestAnimation?.(nextAnim === 'idle' ? null : nextAnim);
  };

  const handleToggleInGameBones = () => {
    const next = !showInGameBones;
    setShowInGameBones(next);
    onToggleSkeleton?.(next);
  };

  const selectedDef = selectedMarkerId
    ? MARKER_DEFINITIONS.find((m) => m.id === selectedMarkerId)
    : null;

  // Categories for joint navigator
  const categories = ['Head & Neck', 'Torso', 'Left Arm', 'Right Arm', 'Left Leg', 'Right Leg'] as const;

  return (
    <div
      className={`fixed inset-0 z-50 flex ${
        isFullscreen
          ? 'w-screen h-screen p-2 sm:p-3 bg-slate-950'
          : 'items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md'
      } animate-in fade-in duration-150 overflow-hidden select-none`}
    >
      <div
        className={`bg-slate-900 border border-slate-700/80 ${
          isFullscreen
            ? 'w-full h-full rounded-2xl p-3 sm:p-4'
            : 'rounded-3xl max-w-6xl w-full p-4 sm:p-6 max-h-[94vh]'
        } shadow-2xl text-slate-100 flex flex-col overflow-hidden`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Bone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                <span>Mixamo 3D Auto-Rigging Studio</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-300">
                  {isFullscreen ? 'Fullscreen Workspace' : 'Studio'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 hidden sm:block">
                Drag and snap joint handles directly on your 3D character to fit custom anatomy
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {/* Fullscreen Toggle Button */}
            <button
              type="button"
              onClick={() => setIsFullscreen((prev) => !prev)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
            <button
              type="button"
              onClick={() => {
                onSetTestAnimation?.(null);
                onClose();
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close Studio"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-3 pb-2 border-b border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('rigger')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'rigger'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30 border border-sky-400'
                : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Mixamo Joint Auto-Rigger</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('anims')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'anims'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30 border border-sky-400'
                : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Test Rig Animations</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30 border border-sky-400'
                : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload New Character (.OBJ)</span>
          </button>
        </div>

        {/* Global Feedback Banner */}
        {statusMessage && (
          <div className="mt-2.5 p-2 px-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-xs text-emerald-200 flex items-center gap-2 animate-in fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Content Area */}
        <div className={`mt-2 flex-1 min-h-0 ${activeTab === 'rigger' ? 'flex flex-col overflow-hidden' : 'overflow-y-auto pr-1'}`}>
          {/* TAB 1: MIXAMO RIGGER WORKSPACE */}
          {activeTab === 'rigger' && (
            <div className="flex-1 min-h-0 flex flex-col space-y-2.5 h-full">
              {/* Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-800/70 border border-slate-700/60 rounded-2xl text-xs shrink-0">
                {/* View Controls & Toggles */}
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 font-bold text-slate-200 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={useSymmetry}
                      onChange={(e) => setUseSymmetry(e.target.checked)}
                      className="rounded accent-sky-500 w-3.5 h-3.5"
                    />
                    <span>Bilateral Symmetry</span>
                  </label>

                  <label className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={ghostMode}
                      onChange={(e) => setGhostMode(e.target.checked)}
                      className="rounded accent-sky-500 w-3.5 h-3.5"
                    />
                    <Layers className="w-3.5 h-3.5 text-purple-400" />
                    <span>X-Ray Mesh</span>
                  </label>

                  <label className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showBones}
                      onChange={(e) => setShowBones(e.target.checked)}
                      className="rounded accent-sky-500 w-3.5 h-3.5"
                    />
                    <Bone className="w-3.5 h-3.5 text-sky-400" />
                    <span>Bone Lines</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleResetMarkers}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-700/60 hover:bg-slate-700 border border-slate-600 text-slate-200 hover:text-white transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Auto-Fit Defaults</span>
                  </button>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex items-center gap-2">
                  {onExportGLB && (
                    <button
                      type="button"
                      onClick={handleExportGLB}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-sky-400" />
                      <span>Export GLB</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleApplyToGame}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black flex items-center gap-1.5 shadow-lg shadow-emerald-950/50 transition-all cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Apply Rig to Game</span>
                  </button>
                </div>
              </div>

              {/* Main 3D Canvas + Side Joint Inspector Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-0 h-full">
                {/* 3D Interactive Viewport: Expands to fill available viewport */}
                <div className="lg:col-span-8 xl:col-span-9 h-full min-h-[350px]">
                  <RiggingEditorCanvas
                    modelGroup={modelGroup || null}
                    currentMarkers={markers}
                    onChangeMarkers={handleMarkersChange}
                    selectedMarkerId={selectedMarkerId}
                    onSelectMarker={setSelectedMarkerId}
                    useSymmetry={useSymmetry}
                    showMarkers={showMarkers}
                    showBones={showBones}
                    ghostMode={ghostMode}
                    cameraPreset={cameraPreset}
                  />
                </div>

                {/* Side Joint Inspector & Nudge Tools */}
                <div className="lg:col-span-4 xl:col-span-3 h-full bg-slate-800/60 rounded-2xl p-3 border border-slate-700/60 flex flex-col gap-2.5 overflow-hidden">
                  {/* Selected Marker Control Panel */}
                  <div className="bg-slate-900/90 rounded-xl p-2.5 border border-slate-700/80 shadow-md">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 block mb-1">
                      Active Joint Inspector
                    </span>
                    {selectedDef ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3.5 h-3.5 rounded-full ring-2 ring-white/40"
                              style={{ backgroundColor: selectedDef.color }}
                            />
                            <span className="font-bold text-xs text-white">{selectedDef.label}</span>
                          </div>
                          <span className="text-[10px] text-slate-400">{selectedDef.category}</span>
                        </div>

                        {/* Nudge Buttons */}
                        <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] pt-1">
                          <div className="bg-slate-800/80 p-1 rounded-lg border border-slate-700">
                            <span className="text-rose-400 font-bold block mb-0.5">X Axis</span>
                            <div className="flex gap-1 justify-center">
                              <button
                                type="button"
                                onClick={() => handleNudge('x', -0.02)}
                                className="px-1.5 py-0.5 bg-slate-700 hover:bg-slate-600 rounded font-bold cursor-pointer"
                              >
                                -
                              </button>
                              <button
                                type="button"
                                onClick={() => handleNudge('x', 0.02)}
                                className="px-1.5 py-0.5 bg-slate-700 hover:bg-slate-600 rounded font-bold cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                            <span className="text-[9px] text-slate-400 font-mono mt-0.5 block">
                              {markers[selectedDef.id]?.x.toFixed(2)}
                            </span>
                          </div>

                          <div className="bg-slate-800/80 p-1 rounded-lg border border-slate-700">
                            <span className="text-emerald-400 font-bold block mb-0.5">Y (Height)</span>
                            <div className="flex gap-1 justify-center">
                              <button
                                type="button"
                                onClick={() => handleNudge('y', -0.02)}
                                className="px-1.5 py-0.5 bg-slate-700 hover:bg-slate-600 rounded font-bold cursor-pointer"
                              >
                                -
                              </button>
                              <button
                                type="button"
                                onClick={() => handleNudge('y', 0.02)}
                                className="px-1.5 py-0.5 bg-slate-700 hover:bg-slate-600 rounded font-bold cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                            <span className="text-[9px] text-slate-400 font-mono mt-0.5 block">
                              {markers[selectedDef.id]?.y.toFixed(2)}
                            </span>
                          </div>

                          <div className="bg-slate-800/80 p-1 rounded-lg border border-slate-700">
                            <span className="text-sky-400 font-bold block mb-0.5">Z (Depth)</span>
                            <div className="flex gap-1 justify-center">
                              <button
                                type="button"
                                onClick={() => handleNudge('z', -0.02)}
                                className="px-1.5 py-0.5 bg-slate-700 hover:bg-slate-600 rounded font-bold cursor-pointer"
                              >
                                -
                              </button>
                              <button
                                type="button"
                                onClick={() => handleNudge('z', 0.02)}
                                className="px-1.5 py-0.5 bg-slate-700 hover:bg-slate-600 rounded font-bold cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                            <span className="text-[9px] text-slate-400 font-mono mt-0.5 block">
                              {markers[selectedDef.id]?.z.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400">Select any joint to adjust</p>
                    )}
                  </div>

                  {/* Joint Picker Hierarchy */}
                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-1">
                      Joint Hierarchy (22 Nodes)
                    </span>
                    {categories.map((cat) => {
                      const groupMarkers = MARKER_DEFINITIONS.filter((m) => m.category === cat);
                      return (
                        <div key={cat} className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 block px-1">
                            {cat}
                          </span>
                          <div className="grid grid-cols-2 gap-1">
                            {groupMarkers.map((m) => {
                              const isSelected = selectedMarkerId === m.id;
                              return (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => setSelectedMarkerId(m.id)}
                                  className={`px-2 py-1 rounded-lg text-[10px] font-semibold text-left truncate flex items-center gap-1.5 transition-colors cursor-pointer border ${
                                    isSelected
                                      ? 'bg-sky-600/30 border-sky-400 text-white font-bold'
                                      : 'bg-slate-900/80 border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-800'
                                  }`}
                                >
                                  <span
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ backgroundColor: m.color }}
                                  />
                                  <span className="truncate">{m.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ANIMATIONS & DIAGNOSTICS */}
          {activeTab === 'anims' && (
            <div className="space-y-4">
              {/* Active Model Status */}
              <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/60 shadow-lg">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
                    Active Character Rig Status
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/40">
                      <CheckCircle className="w-3 h-3" /> Ready for Live Gameplay
                    </span>
                    <button
                      type="button"
                      onClick={handleToggleInGameBones}
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 transition-colors cursor-pointer ${
                        showInGameBones
                          ? 'bg-sky-600 border-sky-300 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                      }`}
                    >
                      {showInGameBones ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      <span>{showInGameBones ? 'Skeleton: ON' : 'Show In-Game Skeleton'}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-700/50">
                    <FileText className="w-4 h-4 mx-auto mb-1 text-sky-400" />
                    <span className="font-bold text-slate-200 block truncate">3DModel.obj</span>
                    <span className="text-[10px] text-slate-400">Polygonal Mesh</span>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-700/50">
                    <FileText className="w-4 h-4 mx-auto mb-1 text-amber-400" />
                    <span className="font-bold text-slate-200 block truncate">3DModel.mtl</span>
                    <span className="text-[10px] text-slate-400">Material Shader</span>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-700/50">
                    <ImageIcon className="w-4 h-4 mx-auto mb-1 text-emerald-400" />
                    <span className="font-bold text-slate-200 block truncate">3DModel.jpg</span>
                    <span className="text-[10px] text-slate-400">512×512 Texture</span>
                  </div>
                </div>

                {stats && (
                  <div className="mt-3.5 pt-3 border-t border-slate-700/50 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 block">Rigged Bones:</span>
                      <span className="font-mono font-bold text-emerald-300">{stats.boneCount || 20} joints</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Vertices:</span>
                      <span className="font-mono font-bold text-white">{stats.vertexCount}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Height:</span>
                      <span className="font-mono font-bold text-sky-300">{stats.normalizedHeight.toFixed(2)}m</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Ground Aligned:</span>
                      <span className="font-bold text-emerald-400">Feet at y = 0</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Interactive Animation Buttons */}
              <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/60 shadow-lg">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-white">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Test Generated Humanoid Animations Live</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Preview poses on character</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => handleAnimClick('walk')}
                    className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-transform active:scale-95 cursor-pointer border ${
                      activeAnim === 'walk'
                        ? 'bg-sky-600 border-sky-300 text-white shadow-lg shadow-sky-600/30'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Footprints className="w-3.5 h-3.5" />
                    <span>Walk Stride</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAnimClick('run')}
                    className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-transform active:scale-95 cursor-pointer border ${
                      activeAnim === 'run'
                        ? 'bg-amber-600 border-amber-300 text-white shadow-lg shadow-amber-600/30'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <span>⚡</span>
                    <span>Sprint Run</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAnimClick('punch')}
                    className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-transform active:scale-95 cursor-pointer border ${
                      activeAnim === 'punch' || activeAnim === 'attack'
                        ? 'bg-rose-600 border-rose-300 text-white shadow-lg shadow-rose-600/30'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <span>🥊</span>
                    <span>Punch Strike</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAnimClick('jump')}
                    className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-transform active:scale-95 cursor-pointer border ${
                      activeAnim === 'jump'
                        ? 'bg-purple-600 border-purple-300 text-white shadow-lg shadow-purple-600/30'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <span>⬆️</span>
                    <span>Jump & Air</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAnimClick('wave')}
                    className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-transform active:scale-95 cursor-pointer border ${
                      activeAnim === 'wave'
                        ? 'bg-emerald-600 border-emerald-300 text-white shadow-lg shadow-emerald-600/30'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Hand className="w-3.5 h-3.5" />
                    <span>Hand Wave</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAnimClick('victory')}
                    className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-transform active:scale-95 cursor-pointer border ${
                      activeAnim === 'victory'
                        ? 'bg-yellow-500 border-yellow-200 text-slate-950 shadow-lg shadow-yellow-500/30'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <span>🏆</span>
                    <span>Victory Dance</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAnimClick('idle')}
                    className={`col-span-2 py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-transform active:scale-95 cursor-pointer border ${
                      activeAnim === 'idle'
                        ? 'bg-slate-700 border-slate-500 text-white'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Natural Idle Pose</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: UPLOAD NEW MODEL */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div className="bg-sky-950/40 rounded-2xl p-4 border border-sky-500/30 text-xs space-y-1.5 text-slate-300">
                <div className="flex items-center gap-1.5 font-bold text-sky-300">
                  <Bone className="w-4 h-4" />
                  <span>How Custom Model Auto-Rigging Works</span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-400">
                  Upload your character's <code>.obj</code> mesh, <code>.mtl</code> material, and <code>.jpg</code> texture. Even if your 3D model is completely unrigged with no bones:
                </p>
                <ol className="list-decimal list-inside text-[11px] text-slate-300 space-y-1 ml-1">
                  <li>The engine normalizes height and centers the model at ground level (Y = 0).</li>
                  <li>Initial Mixamo humanoid markers are placed proportionally.</li>
                  <li>You can switch directly to the <b>Mixamo Joint Auto-Rigger</b> tab to drag and fit markers to your character's limbs.</li>
                  <li>Clicking "Apply Rig to Game" binds your character with smooth inverse-distance skin weights!</li>
                </ol>
              </div>

              <form onSubmit={handleApplyCustomFiles} className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-sky-300">
                    <Upload className="w-4 h-4" />
                    <span>Select Character Assets</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono font-semibold">
                    Saved to IndexedDB
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1 font-semibold">Mesh (.obj):</label>
                    <input
                      type="file"
                      accept=".obj"
                      onChange={(e) => setObjFile(e.target.files?.[0] || null)}
                      className="w-full text-[11px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-bold file:bg-sky-600 file:text-white hover:file:bg-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1 font-semibold">Material (.mtl):</label>
                    <input
                      type="file"
                      accept=".mtl"
                      onChange={(e) => setMtlFile(e.target.files?.[0] || null)}
                      className="w-full text-[11px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-bold file:bg-amber-600 file:text-white hover:file:bg-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1 font-semibold">Texture (.jpg):</label>
                    <input
                      type="file"
                      accept=".jpg,.jpeg"
                      onChange={(e) => setJpgFile(e.target.files?.[0] || null)}
                      className="w-full text-[11px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500"
                    />
                  </div>
                </div>

                {uploadError && (
                  <p className="text-xs text-rose-400 bg-rose-950/50 p-2.5 rounded-xl border border-rose-800">
                    {uploadError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isUploading || !objFile || !mtlFile || !jpgFile}
                  className="w-full py-2.5 bg-gradient-to-r from-sky-500 to-teal-400 hover:from-sky-400 hover:to-teal-300 disabled:opacity-50 text-slate-950 font-black text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-sky-950/40"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isUploading ? 'Auto-Rigging & Binding Mesh...' : 'Upload, Auto-Rig & Open Editor'}</span>
                </button>
              </form>

              {onResetToDefault && (
                <div className="pt-2 flex justify-between items-center text-xs text-slate-400">
                  <span>Want to revert back to original 3D asset?</span>
                  <button
                    type="button"
                    onClick={async () => {
                      await onResetToDefault();
                      setStatusMessage('Restored default character model.');
                      setTimeout(() => setStatusMessage(null), 3000);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer text-xs font-bold flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Restore Original Model
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
          <div className="text-[11px] text-slate-400 hidden sm:block">
            Bones bound via <code>SkinnedMesh</code> detached mode to eliminate skeleton displacement
          </div>
          <button
            type="button"
            onClick={() => {
              onSetTestAnimation?.(null);
              onClose();
            }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Close Studio
          </button>
        </div>
      </div>
    </div>
  );
};
