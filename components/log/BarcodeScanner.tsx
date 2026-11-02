"use client";
import { useEffect, useRef, useState } from 'react';
import { cleanBarcode, isValidGtin } from '../../lib/barcode';

type Props = {
  /** Called once with the digits of the first barcode read (or typed). */
  onCode: (code: string) => void;
  onCancel: () => void;
  /** Shown instead of the camera, e.g. while a lookup is running. */
  busy?: boolean;
};

type Detector = { detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]> };
type DetectorCtor = { new (options?: { formats?: string[] }): Detector };

/**
 * Camera barcode scanner. Uses the phone's built-in BarcodeDetector where it exists (Chrome on Android), and the
 * ZXing decoder everywhere else (iPhone). The decoder is only downloaded when the scanner opens. A typed-number
 * box is always there for damaged labels or a blocked camera.
 */
export default function BarcodeScanner({ onCode, onCancel, busy = false }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const doneRef = useRef(false);
  const onCodeRef = useRef(onCode);
  const [status, setStatus] = useState<'starting' | 'scanning' | 'blocked' | 'nocamera'>('starting');
  const [typed, setTyped] = useState('');
  const [typedError, setTypedError] = useState<string | null>(null);
  const [holding, setHolding] = useState(false);

  useEffect(() => {
    onCodeRef.current = onCode;
  }, [onCode]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let stopZxing: (() => void) | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const video = videoRef.current;
    // A single frame can misread a barcode into a different, valid-looking number (short 8-digit codes are the
    // worst for this), so a code only counts after several frames in a row agree on it.
    let lastCode = '';
    let streak = 0;
    let lastAt = 0;
    const readsNeeded = (code: string) => (code.length <= 8 ? 4 : 2);

    const found = (value: string) => {
      const code = cleanBarcode(value);
      if (!code || doneRef.current || !isValidGtin(code)) return;
      const now = Date.now();
      streak = code === lastCode && now - lastAt < 1500 ? streak + 1 : 1;
      lastCode = code;
      lastAt = now;
      if (streak < readsNeeded(code)) {
        setHolding(true);
        return;
      }
      doneRef.current = true;
      navigator.vibrate?.(60);
      onCodeRef.current(code);
    };

    async function start() {
      if (!video) return;
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('nocamera');
        return;
      }

      const constraints: MediaStreamConstraints = {
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      };

      try {
        const NativeDetector = (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
        if (NativeDetector) {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          if (cancelled) return;
          video.srcObject = stream;
          await video.play();
          const detector = new NativeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
          setStatus('scanning');
          timer = setInterval(async () => {
            if (doneRef.current || video.readyState < 2) return;
            try {
              const codes = await detector.detect(video);
              if (codes[0]) found(codes[0].rawValue);
            } catch {
              // A frame that can't be read is fine; the next one will do.
            }
          }, 150);
          return;
        }

        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        const { BarcodeFormat, DecodeHintType } = await import('@zxing/library');
        if (cancelled) return;
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E]);
        hints.set(DecodeHintType.TRY_HARDER, true);
        const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 120 });
        const controls = await reader.decodeFromConstraints(constraints, video, (result) => {
          if (result) found(result.getText());
        });
        if (cancelled) {
          controls.stop();
          return;
        }
        stopZxing = () => controls.stop();
        setStatus('scanning');
      } catch (e) {
        if (cancelled) return;
        const name = e instanceof DOMException ? e.name : '';
        setStatus(name === 'NotAllowedError' || name === 'SecurityError' ? 'blocked' : 'nocamera');
      }
    }

    start();

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      stopZxing?.();
      stream?.getTracks().forEach((track) => track.stop());
      if (video?.srcObject) {
        (video.srcObject as MediaStream).getTracks().forEach((track) => track.stop());
        video.srcObject = null;
      }
    };
  }, []);

  function submitTyped() {
    const code = cleanBarcode(typed);
    if (!code) {
      setTypedError('Barcodes have 8 to 14 digits. Check the number under the bars.');
      return;
    }
    if (!isValidGtin(code)) {
      setTypedError('That number doesn’t pass the barcode check, so a digit is probably wrong. Check it against the package.');
      return;
    }
    setTypedError(null);
    doneRef.current = true;
    onCode(code);
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl bg-slate-900" style={{ aspectRatio: '4 / 3' }}>
        <video ref={videoRef} playsInline muted autoPlay className="h-full w-full object-cover" />
        {status === 'scanning' && !busy && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-1/2 w-4/5 rounded-xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(2,6,23,0.35)]" />
          </div>
        )}
        {(status === 'starting' || busy) && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/70 px-6 text-center text-sm font-bold text-white">
            {busy ? 'Looking it up…' : 'Starting the camera…'}
          </div>
        )}
        {(status === 'blocked' || status === 'nocamera') && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900 px-6 text-center text-sm font-bold text-white">
            {status === 'blocked'
              ? 'The camera is blocked. Allow it in your browser or phone settings, or type the number below.'
              : 'No camera available. Type the number from under the bars instead.'}
          </div>
        )}
      </div>
      {status === 'scanning' && !busy && (
        <p className="mt-3 text-center text-sm font-bold text-slate-500">{holding ? 'Got a read. Hold steady…' : 'Point the camera at the barcode'}</p>
      )}

      <p className="mt-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Or type the number</p>
      <div className="mt-2 flex gap-2">
        <input
          inputMode="numeric"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submitTyped()}
          placeholder="e.g. 722252100900"
          aria-label="Barcode number"
          className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-bold text-slate-900 outline-none focus:border-[#004225]"
        />
        <button onClick={submitTyped} disabled={busy} className="shrink-0 rounded-xl bg-[#004225] px-5 text-xs font-black uppercase tracking-widest text-white disabled:opacity-40 active:scale-95">
          Look up
        </button>
      </div>
      {typedError && <p className="mt-2 text-xs font-bold text-red-600">{typedError}</p>}

      <button onClick={onCancel} className="mt-5 w-full rounded-2xl border border-slate-200 py-4 text-xs font-black uppercase tracking-widest text-slate-500 active:bg-slate-50">
        Back
      </button>
    </div>
  );
}
