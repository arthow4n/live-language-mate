import { Download, X, ZoomIn, ZoomOut } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils.js';

import type { ImageAttachment } from '../schemas/imageAttachment.js';

import { formatFileSize } from '../services/imageUtils.js';
import { Button } from './ui/button.js';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog.js';

/**
 *
 */
export interface ImageModalProps {
  attachment: ImageAttachment | null;
  imageUrl: null | string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 *
 * @param root0
 * @param root0.attachment
 * @param root0.imageUrl
 * @param root0.isOpen
 * @param root0.onClose
 */
export function ImageModal({
  attachment,
  imageUrl,
  isOpen,
  onClose,
}: ImageModalProps): React.JSX.Element {
  const [zoomLevel, setZoomLevel] = React.useState(1);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragPosition, setDragPosition] = React.useState({ x: 0, y: 0 });
  const [lastMousePosition, setLastMousePosition] = React.useState({
    x: 0,
    y: 0,
  });
  const imageRef = React.useRef<HTMLImageElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Reset zoom and position when modal opens/closes or attachment changes
  React.useEffect(() => {
    if (isOpen) {
      setZoomLevel(1);
      setDragPosition({ x: 0, y: 0 });
      setIsDragging(false);
    }
  }, [isOpen, attachment?.id]);

  // Handle zoom
  const handleZoomIn = (): void => {
    setZoomLevel((prev) => Math.min(prev * 1.5, 5));
  };

  const handleZoomOut = (): void => {
    setZoomLevel((prev) => Math.max(prev / 1.5, 0.5));
  };

  // Handle download
  const handleDownload = (): void => {
    if (!imageUrl || !attachment) return;

    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = attachment.filename;
    link.click();
  };

  // Handle mouse drag for panning
  const handleMouseDown = (e: React.MouseEvent): void => {
    if (zoomLevel <= 1) return;

    setIsDragging(true);
    setLastMousePosition({ x: e.clientX, y: e.clientY });
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent): void => {
    if (!isDragging || zoomLevel <= 1) return;

    const deltaX = e.clientX - lastMousePosition.x;
    const deltaY = e.clientY - lastMousePosition.y;

    setDragPosition((prev) => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY,
    }));

    setLastMousePosition({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = (): void => {
    setIsDragging(false);
  };

  // Handle wheel zoom
  const handleWheel = (e: React.WheelEvent): void => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoomLevel((prev) => Math.max(0.5, Math.min(5, prev * delta)));
  };

  // Keyboard handlers
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (!isOpen) return;

      switch (e.key) {
        case '0': {
          e.preventDefault();
          setZoomLevel(1);
          setDragPosition({ x: 0, y: 0 });
          break;
        }
        case '+':
        case '=': {
          e.preventDefault();
          handleZoomIn();
          break;
        }
        case '-': {
          e.preventDefault();
          handleZoomOut();
          break;
        }
        case 'Escape': {
          onClose();
          break;
        }
        default: {
          break;
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return (): void => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!attachment || !imageUrl) {
    return <></>;
  }

  return (
    <Dialog onOpenChange={onClose} open={isOpen}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/95 border-0">
        <DialogTitle className="sr-only">{attachment.filename}</DialogTitle>

        {/* Header with controls */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-black/50 backdrop-blur-sm p-4 flex items-center justify-between">
          <div className="text-white">
            <div className="font-medium text-sm">{attachment.filename}</div>
            <div className="text-xs text-white/70">
              {formatFileSize(attachment.size)} • {Math.round(zoomLevel * 100)}%
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              className="h-8 w-8 bg-white/10 hover:bg-white/20 text-white border-0"
              onClick={handleZoomOut}
              size="icon"
              title="Zoom out (-)"
              variant="ghost"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>

            <Button
              className="h-8 w-8 bg-white/10 hover:bg-white/20 text-white border-0"
              onClick={handleZoomIn}
              size="icon"
              title="Zoom in (+)"
              variant="ghost"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>

            <Button
              className="h-8 w-8 bg-white/10 hover:bg-white/20 text-white border-0"
              onClick={handleDownload}
              size="icon"
              title="Download image"
              variant="ghost"
            >
              <Download className="h-4 w-4" />
            </Button>

            <Button
              className="h-8 w-8 bg-white/10 hover:bg-white/20 text-white border-0"
              onClick={onClose}
              size="icon"
              title="Close (Esc)"
              variant="ghost"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Image container */}
        <div
          className="flex items-center justify-center h-full w-full overflow-hidden"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
          ref={containerRef}
          style={{
            cursor:
              zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
          }}
        >
          <img
            alt={attachment.filename}
            className={cn(
              'max-w-full max-h-full object-contain transition-transform duration-200',
              isDragging && 'select-none'
            )}
            draggable={false}
            ref={imageRef}
            src={imageUrl}
            style={{
              transform: `scale(${String(zoomLevel)}) translate(${String(dragPosition.x / zoomLevel)}px, ${String(dragPosition.y / zoomLevel)}px)`,
            }}
          />
        </div>

        {/* Instructions overlay */}
        {zoomLevel === 1 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 backdrop-blur-sm text-white text-xs px-3 py-2 rounded-md">
            Use mouse wheel or +/- to zoom • Drag to pan when zoomed • Press 0
            to reset
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
