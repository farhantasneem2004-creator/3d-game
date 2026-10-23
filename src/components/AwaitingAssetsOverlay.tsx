import React, { useState } from 'react';
import { Upload, FolderCheck, FileText, Image as ImageIcon, Eye, AlertCircle, ArrowRight } from 'lucide-react';
import { CHARACTER_ASSETS } from '../game/AssetConfig';

interface AwaitingAssetsOverlayProps {
  onLoadCustomFiles: (objFile: File, mtlFile: File, jpgFile: File) => Promise<void>;
  onExploreWorld: () => void;
  onOpenAndroidGuide: () => void;
}

export const AwaitingAssetsOverlay: React.FC<AwaitingAssetsOverlayProps> = ({
  onLoadCustomFiles,
  onExploreWorld,
  onOpenAndroidGuide,
}) => {
  const [objFile, setObjFile] = useState<File | null>(null);
  const [mtlFile, setMtlFile] = useState<File | null>(null);
  const [jpgFile, setJpgFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!objFile || !mtlFile || !jpgFile) {
      setErrorMsg('Please select all three character files: 3DModel.obj, 3DModel.mtl, and 3DModel.jpg.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    try {
      await onLoadCustomFiles(objFile, mtlFile, jpgFile);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Failed to load model files');
      setIsProcessing(false);
    }
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-3 md:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-sky-500/30 rounded-3xl max-w-2xl w-full p-5 md:p-7 shadow-2xl text-slate-100 my-auto">
        {/* Title */}
        <div className="flex items-start gap-3.5 mb-4">
          <div className="p-3 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30 shrink-0">
            <Upload className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white tracking-wide">Awaiting Your 3D Character Model</h2>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-sky-950 text-sky-300 px-2.5 py-0.5 rounded-full border border-sky-700/50">
                {CHARACTER_ASSETS.DIRECTORY}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Google AI Studio’s chat interface only supports image uploads. To prevent substituting any placeholder or fake model, the Three.js engine is waiting for your actual <strong>3DModel.obj</strong>, <strong>3DModel.mtl</strong>, and <strong>3DModel.jpg</strong> files.
            </p>
          </div>
        </div>

        {/* Option 1: Load directly in browser now */}
        <form onSubmit={handleSubmit} className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 md:p-5 mb-4 space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>Option 1:</span> Load In Browser Now
            </span>
            <span className="text-[11px] text-slate-400">Select files directly from your computer</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* OBJ input */}
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200 mb-1">
                  <FileText className="w-4 h-4 text-sky-400" />
                  <span>3DModel.obj</span>
                </div>
                <p className="text-[10px] text-slate-400 mb-2">Wavefront Geometry</p>
              </div>
              <input
                type="file"
                accept=".obj"
                onChange={(e) => setObjFile(e.target.files?.[0] || null)}
                className="w-full text-[11px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-bold file:bg-sky-600 file:text-white hover:file:bg-sky-500 cursor-pointer"
              />
            </div>

            {/* MTL input */}
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200 mb-1">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>3DModel.mtl</span>
                </div>
                <p className="text-[10px] text-slate-400 mb-2">Material Definitions</p>
              </div>
              <input
                type="file"
                accept=".mtl"
                onChange={(e) => setMtlFile(e.target.files?.[0] || null)}
                className="w-full text-[11px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-bold file:bg-amber-600 file:text-white hover:file:bg-amber-500 cursor-pointer"
              />
            </div>

            {/* JPG input */}
            <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200 mb-1">
                  <ImageIcon className="w-4 h-4 text-emerald-400" />
                  <span>3DModel.jpg</span>
                </div>
                <p className="text-[10px] text-slate-400 mb-2">Texture Map</p>
              </div>
              <input
                type="file"
                accept=".jpg,.jpeg"
                onChange={(e) => setJpgFile(e.target.files?.[0] || null)}
                className="w-full text-[11px] text-slate-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer"
              />
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 p-2.5 bg-rose-950/60 border border-rose-800/80 rounded-xl text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isProcessing || !objFile || !mtlFile || !jpgFile}
            className="w-full py-2.5 px-4 bg-gradient-to-r from-sky-600 to-teal-500 hover:from-sky-500 hover:to-teal-400 disabled:opacity-50 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-transform active:scale-[0.98] shadow-lg shadow-sky-950/50 cursor-pointer flex items-center justify-center gap-2"
          >
            <span>{isProcessing ? 'Processing Model & Textures...' : 'Load Character & Enter Platformer'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Option 2: Where to copy files in the downloaded project */}
        <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 mb-4 text-xs space-y-2">
          <div className="flex items-center justify-between text-slate-300 font-bold">
            <span className="flex items-center gap-1.5">
              <FolderCheck className="w-4 h-4 text-emerald-400" />
              <span>Option 2: Place in Local Project Directory</span>
            </span>
            <button
              type="button"
              onClick={onOpenAndroidGuide}
              className="text-emerald-400 hover:underline text-[11px] cursor-pointer"
            >
              View Android APK Setup →
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            When building the native APK or running Vite locally, copy the 3 files directly into:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <span className="text-emerald-400 block font-bold">For Android Studio APK:</span>
              <span className="text-slate-300 select-all">android/app/src/main/assets/game/models/</span>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
              <span className="text-sky-400 block font-bold">For Web Preview:</span>
              <span className="text-slate-300 select-all">public/assets/game/models/</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={onExploreWorld}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview 3D Platformer World</span>
          </button>

          <span className="text-[11px] text-slate-500">
            Real OBJ/MTL Pipeline Configured
          </span>
        </div>
      </div>
    </div>
  );
};
