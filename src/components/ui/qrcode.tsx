import QRCode from 'qrcode';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface QRCodeCanvasProps {
  value: string;
  /**
   * Intrinsic canvas size in pixels (the raster resolution). This is
   * NOT the rendered size on screen — that's driven by the parent's
   * layout and the canvas's `max-width: 100%`. Keep this high for a
   * crisp image on high-DPI displays and when scaled up.
   */
  size?: number;
  level?: 'L' | 'M' | 'Q' | 'H';
  className?: string;
}

export function QRCodeCanvas({ value, size = 512, level = 'M', className }: QRCodeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    QRCode.toCanvas(
      canvasRef.current,
      value,
      {
        width: size,
        margin: 1,
        errorCorrectionLevel: level,
      },
      (error) => {
        if (error) console.error('QR Code generation error:', error);
      }
    );
  }, [value, size, level]);

  // `block max-w-full h-auto` lets the canvas shrink to fit its parent
  // on narrow viewports while preserving its aspect ratio. Callers can
  // further constrain via `className` (e.g. a fixed CSS size).
  return (
    <canvas
      ref={canvasRef}
      className={cn('block max-w-full h-auto', className)}
    />
  );
}
