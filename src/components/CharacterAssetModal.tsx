import React, { useState } from 'react';
import { ModelStats } from '../game/CharacterLoader';
import {
  X,
  CheckCircle,
  Upload,
  Box,
  Eye,
  EyeOff,
  FileText,
  Image as ImageIcon,
  Bone,
  Hand,
  Footprints,
  Play,
  Sparkles,
} from 'lucide-react';

interface CharacterAssetModalProps {
  stats: ModelStats | null;
  onClose: () => void;
  onLoadCustomFiles: (objFile: File, mtlFile: File, jpgFile: File) => Promise<void>;
  onToggleSkeleton?: (visible: boolean) => void;
  onSetTestAnimation?: (anim: string | null) => void;
  isSkeletonVisible?: boolean;
}

export const CharacterAssetModal: React.FC<CharacterAssetModalProps> = ({
  stats,
  onClose,
  onLoadCustomFiles,
  onToggleSkeleton,
  onSetTestAnimation,
  isSkeletonVisible = false,
}) => {
  const [objFile, setObjFile] = useState<File | null>(null);
  const [mtlFile, setMtlFile] = useState<File | null>(null);
  const [jpgFile, setJpgFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [activeAnim, setActiveAnim] = useState<string>('idle');
  const [showBones, setShowBones] = useState<boolean>(isSkeletonVisible);

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

  const handleToggleBones = () => {
    const next = !showBones;
    setShowBones(next);
    onToggleSkeleton?.(next);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-2xl w-full p-5 md:p-6 shadow-2xl text-slate-100 flex flex-col max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Bone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">3D Character Rigging & Animation Engine</h2>
              <p className="text-xs text-slate-400">Automatic Generic Humanoid Rig Generation for Unrigged Models</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onSetTestAnimation?.(null);
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-5 space-y-4">
          {/* Active Model & Generated Rig Status */}
          <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/60 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400">Active Character Assets</span>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/40">
                  <CheckCircle className="w-3 h-3" /> Auto-Rigged (19 Bones)
                </span>
                <button
                  type="button"
                  onClick={handleToggleBones}
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1 transition-colors cursor-pointer ${
                    showBones
                      ? 'bg-sky-600 border-sky-300 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  {showBones ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  <span>{showBones ? 'Skeleton: ON' : 'Show Skeleton'}</span>
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
                  <span className="font-mono font-bold text-emerald-300">{stats.boneCount || 19} joints</span>
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

          {/* Interactive Animation Tester */}
          <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/60 shadow-lg">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-white">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Test Generated Rig Animations Live</span>
              </div>
              <span className="text-[10px] text-slate-400">Tap to preview on character</span>
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
                onClick={() => handleAnimClick('attack')}
                className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-transform active:scale-95 cursor-pointer border ${
                  activeAnim === 'attack'
                    ? 'bg-rose-600 border-rose-300 text-white shadow-lg shadow-rose-600/30'
                    : 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span>⚔️</span>
                <span>Sword Slash</span>
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
                <span>Reset to Natural Living Idle</span>
              </button>
            </div>
          </div>

          {/* Auto-Rigged Upload Info Banner */}
          <div className="bg-sky-950/40 rounded-2xl p-4 border border-sky-500/30 text-xs space-y-1.5 text-slate-300">
            <div className="flex items-center gap-1.5 font-bold text-sky-300">
              <Bone className="w-4 h-4" />
              <span>How Automatic Rigging Works on Your Uploaded 3D Model</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400">
              When you upload your <code>.obj</code> file below (even if it has zero bones or skeleton), the system automatically:
            </p>
            <ol className="list-decimal list-inside text-[11px] text-slate-300 space-y-1 ml-1">
              <li>Analyzes your character's height and horizontal proportions.</li>
              <li>Constructs a 19-bone humanoid armature (Hips, Spine, Neck, Head, Shoulders, Arms, Forearms, Hands, Legs, Feet).</li>
              <li>Calculates smooth 4-bone influence vertex skinning weights for every vertex in the mesh.</li>
              <li>Binds your geometry into a dynamic <code>SkinnedMesh</code> ready for immediate walking, running, jumping, and hand waving animations in gameplay!</li>
            </ol>
          </div>

          {/* Upload Custom Model Form */}
          <form onSubmit={handleApplyCustomFiles} className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-sky-300">
                <Upload className="w-4 h-4" />
                <span>Upload Your Custom Character Model</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono font-semibold">Auto-Rigging Included</span>
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
              <span>{isUploading ? 'Auto-Rigging & Binding Mesh...' : 'Upload, Auto-Rig & Play Character'}</span>
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={() => {
              onSetTestAnimation?.(null);
              onClose();
            }}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
