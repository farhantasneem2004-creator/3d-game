import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { X, Smartphone, QrCode, Download, ExternalLink, Check, Copy, Sparkles, ArrowRight } from 'lucide-react';

interface PhoneInstallModalProps {
  onClose: () => void;
  onOpenAndroidProject: () => void;
}

export const PhoneInstallModal: React.FC<PhoneInstallModalProps> = ({
  onClose,
  onOpenAndroidProject,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  useEffect(() => {
    // Generate QR code for instant phone camera scanning
    if (currentUrl) {
      QRCode.toDataURL(currentUrl, {
        width: 240,
        margin: 2,
        color: {
          dark: '#0284c7',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Failed to generate QR code', err));
    }

    // Capture PWA install event if supported
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [currentUrl]);

  const handleInstallClick = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setInstallPrompt(null);
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-2xl w-full p-5 md:p-6 shadow-2xl text-slate-100 flex flex-col max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Install 3D Platformer on Your Phone</h2>
              <p className="text-xs text-slate-400">Two Easy Methods: Instant Web App or Native Android APK</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-5 space-y-5">
          {/* METHOD 1: Instant Install on Phone (PWA) */}
          <div className="bg-slate-800/60 border border-sky-500/30 rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-sky-500 text-slate-950 font-black text-xs">1</span>
                <h3 className="font-extrabold text-white text-sm">Instant Install via Phone Camera (Recommended)</h3>
              </div>
              <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/40 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> No PC or Cable Needed
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              {/* QR Code */}
              <div className="flex flex-col items-center justify-center p-3 bg-white rounded-xl shadow-md">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="Scan QR Code to open game on your phone" className="w-40 h-40 object-contain rounded-lg" />
                ) : (
                  <div className="w-40 h-40 flex items-center justify-center text-slate-400">
                    <QrCode className="w-12 h-12" />
                  </div>
                )}
                <span className="text-[11px] font-bold text-slate-700 mt-1 flex items-center gap-1">
                  📸 Scan with your Phone Camera
                </span>
              </div>

              {/* Steps */}
              <div className="space-y-3 text-xs text-slate-300">
                <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-700/60">
                  <span className="font-bold text-sky-300 block mb-0.5">Android (Chrome / Edge / Samsung Internet):</span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    1. Scan the QR code with your phone camera.<br />
                    2. In Chrome, tap the <strong>3 dots (⋮)</strong> menu top right.<br />
                    3. Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.<br />
                    4. The game icon appears on your home screen and launches in full landscape mode!
                  </p>
                </div>

                <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-700/60">
                  <span className="font-bold text-sky-300 block mb-0.5">iPhone / iPad (Safari):</span>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    1. Open in Safari, tap the <strong>Share</strong> button (box with upward arrow).<br />
                    2. Scroll down and tap <strong>"Add to Home Screen"</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* Direct In-Browser Install Button if available */}
            {installPrompt && (
              <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between">
                <span className="text-xs text-sky-200">Ready to install on this device:</span>
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="px-4 py-2 bg-gradient-to-r from-sky-500 to-teal-400 hover:from-sky-400 hover:to-teal-300 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-transform active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Install App to Home Screen</span>
                </button>
              </div>
            )}

            {/* Copy Link Row */}
            <div className="mt-3 flex items-center justify-between bg-slate-900/60 p-2.5 rounded-xl border border-slate-700/50 text-xs">
              <span className="truncate text-slate-400 max-w-[340px] font-mono text-[11px]">{currentUrl}</span>
              <button
                type="button"
                onClick={copyUrl}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied Link!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>

          {/* METHOD 2: Build & Install Native Android APK */}
          <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500 text-slate-950 font-black text-xs">2</span>
                <h3 className="font-extrabold text-white text-sm">Build & Sideload Native APK (Android Studio)</h3>
              </div>
              <span className="text-[10px] font-bold text-slate-400">Offline Standalone APK</span>
            </div>

            <p className="text-xs text-slate-400 mb-3.5 leading-relaxed">
              If you want an independent <code>.apk</code> file packaged with AndroidX WebKit WebViewAssetLoader that runs completely offline with no network connection:
            </p>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-xs text-emerald-400 space-y-1 mb-3.5">
              <p className="text-slate-500 text-[10px]"># 1. Inside the android/ folder, build the APK:</p>
              <p>./gradlew assembleDebug</p>
              <p className="text-slate-500 text-[10px] mt-1.5"># 2. Connect your phone with USB Debugging enabled & install:</p>
              <p>adb install -r app/build/outputs/apk/debug/app-debug.apk</p>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAndroidProject();
                }}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950/40"
              >
                <span>View Android Studio Project & Download ZIP</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
