"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface BarcodeScannerProps {
  onScan: (code: string) => void;
  placeholder?: string;
  /** Show camera scanner button */
  showCamera?: boolean;
}

/**
 * Barcode/QR Scanner Component
 *
 * Supports two modes:
 * 1. USB barcode scanner — auto-focused input field, scanner types code + Enter
 * 2. Camera scanner — uses device camera via html5-qrcode library
 *
 * Matches scanned value against SKU, manufacturerCode, or barcode.
 */
export default function BarcodeScanner({ onScan, placeholder = "Scan barcode or type SKU...", showCamera = true }: BarcodeScannerProps) {
  const [inputValue, setInputValue] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const html5QrCodeRef = useRef<any>(null);

  // Auto-focus input on mount
  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  // Handle keyboard input (USB barcode scanners send keystrokes + Enter)
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      onScan(inputValue.trim());
      setInputValue("");
    }
  }, [inputValue, onScan]);

  // Start camera scanner
  const startCamera = useCallback(async () => {
    setCameraError(null);
    setCameraActive(true);

    try {
      const { Html5Qrcode } = await import("html5-qrcode");

      // Wait for DOM element
      await new Promise(resolve => setTimeout(resolve, 100));

      if (!scannerRef.current) return;

      const scannerId = "barcode-scanner-region";
      scannerRef.current.id = scannerId;

      const scanner = new Html5Qrcode(scannerId);
      html5QrCodeRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1.5,
        },
        (decodedText) => {
          onScan(decodedText);
          // Brief vibration feedback on mobile
          if (navigator.vibrate) navigator.vibrate(100);
          // Stop after successful scan
          scanner.stop().then(() => {
            setCameraActive(false);
            html5QrCodeRef.current = null;
          }).catch(() => {});
        },
        () => {
          // QR scan failure — ignore, keep scanning
        }
      );
    } catch (err) {
      // Camera access failed
      setCameraError("Camera not available. Use a USB barcode scanner or type the code manually.");
      setCameraActive(false);
    }
  }, [onScan]);

  // Stop camera scanner
  const stopCamera = useCallback(async () => {
    try {
      if (html5QrCodeRef.current) {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current = null;
      }
    } catch {
      // ignore
    }
    setCameraActive(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div>
      {/* Input field for USB scanner / manual entry */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: "var(--grey-400)" }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full pl-10 pr-4 py-2.5 text-[15px]"
            style={{
              border: "2px solid var(--blue-500)",
              borderRadius: "var(--radius-sm)",
              color: "var(--grey-900)",
              background: "var(--white)",
              outline: "none",
            }}
            autoComplete="off"
            data-scanner-input
          />
        </div>
        {showCamera && (
          <button
            onClick={cameraActive ? stopCamera : startCamera}
            className="px-4 py-2.5 text-[14px] font-semibold inline-flex items-center gap-2 transition-colors"
            style={{
              borderRadius: "var(--radius-sm)",
              background: cameraActive ? "var(--red)" : "var(--blue-500)",
              color: "white",
              border: "none",
            }}
          >
            {cameraActive ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Stop
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Scan
              </>
            )}
          </button>
        )}
      </div>

      {/* Camera error */}
      {cameraError && (
        <p className="mt-2 text-[13px] font-medium" style={{ color: "var(--red)" }}>{cameraError}</p>
      )}

      {/* Camera preview */}
      {cameraActive && (
        <div className="mt-3 overflow-hidden" style={{ borderRadius: "var(--radius)", border: "2px solid var(--blue-500)" }}>
          <div ref={scannerRef} style={{ width: "100%", minHeight: 250 }} />
          <p className="text-center py-2 text-[13px] font-medium" style={{ background: "var(--grey-50)", color: "var(--grey-600)" }}>
            Point camera at barcode or QR code
          </p>
        </div>
      )}

      {/* Help text */}
      <p className="mt-1.5 text-[12px]" style={{ color: "var(--grey-500)" }}>
        Use a USB barcode scanner, phone camera, or type SKU / manufacturer code and press Enter
      </p>
    </div>
  );
}
