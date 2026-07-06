'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Maximize2, Minimize2, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';

type PdfViewerProps = {
  url: string | null;
  filename?: string | null;
  error?: string | null;
  onRetry?: () => void;
};

export function PdfViewer({ url, filename, error, onRetry }: PdfViewerProps) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  if (error || !url) {
    return (
      <div className="flex min-h-[480px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <p className="text-sm font-medium text-slate-700">Couldn&apos;t load this document</p>
        {error && <p className="mt-2 text-xs text-slate-500">{error}</p>}
        {onRetry && (
          <Button type="button" variant="outline" className="mt-4" onClick={onRetry}>
            Retry
          </Button>
        )}
      </div>
    );
  }

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-3 py-2">
      <Button type="button" variant="outline" size="sm" onClick={() => setZoom((z) => Math.max(50, z - 25))}>
        <ZoomOut className="h-4 w-4" />
      </Button>
      <span className="min-w-[3rem] text-center text-xs text-slate-600">{zoom}%</span>
      <Button type="button" variant="outline" size="sm" onClick={() => setZoom((z) => Math.min(200, z + 25))}>
        <ZoomIn className="h-4 w-4" />
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => setZoom(100)}>
        Fit
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => setRotation((r) => (r + 90) % 360)}>
        <RotateCw className="h-4 w-4" />
      </Button>
      <a
        href={url}
        download={filename || 'transcript.pdf'}
        target="_blank"
        rel="noreferrer"
        className="inline-flex"
      >
        <Button type="button" variant="outline" size="sm">
          <Download className="h-4 w-4" />
        </Button>
      </a>
      <Button type="button" variant="outline" size="sm" onClick={() => setFullscreen((f) => !f)}>
        {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </Button>
    </div>
  );

  const canvas = (
    <div className="overflow-auto bg-slate-100 p-4" style={{ minHeight: fullscreen ? 'calc(100vh - 56px)' : 480 }}>
      <div
        className="mx-auto origin-top transition-transform"
        style={{
          transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
          width: `${10000 / zoom}%`,
        }}
      >
        <iframe
          src={`${url}#toolbar=0&navpanes=0`}
          title="Transcript PDF"
          className="h-[700px] w-full rounded border border-slate-200 bg-white shadow-sm"
        />
      </div>
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-white">
        {toolbar}
        {canvas}
        <p className="border-t border-slate-200 px-4 py-2 text-center text-xs text-slate-500">
          Press the minimize button or Esc to return to split view
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      {toolbar}
      {canvas}
    </div>
  );
}
