import { Image as ImageIcon, Upload } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils.js';

import type { ImageValidationOptions } from '../schemas/imageAttachment.js';

import {
  getImageFilesFromDataTransfer,
  validateImageFile,
} from '../services/imageUtils.js';

/**
 *
 */
export interface ImageDropZoneProps {
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onError?: (error: string) => void;
  onFilesDropped: (files: File[]) => void;
  showOverlay?: boolean;
  validationOptions?: ImageValidationOptions;
}

/**
 *
 * @param root0
 * @param root0.children
 * @param root0.className
 * @param root0.disabled
 * @param root0.onError
 * @param root0.onFilesDropped
 * @param root0.showOverlay
 * @param root0.validationOptions
 */
export function ImageDropZone({
  children,
  className,
  disabled = false,
  onError,
  onFilesDropped,
  showOverlay = true,
  validationOptions,
}: ImageDropZoneProps): React.JSX.Element {
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [dragCounter, setDragCounter] = React.useState(0);
  const dropZoneRef = React.useRef<HTMLDivElement>(null);

  const handleDragEnter = React.useCallback(
    (event: React.DragEvent): void => {
      event.preventDefault();
      event.stopPropagation();

      if (disabled) return;

      setDragCounter((prev) => prev + 1);

      // Check if the dragged items contain files
      if (event.dataTransfer.types.includes('Files')) {
        setIsDragOver(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = React.useCallback(
    (event: React.DragEvent): void => {
      event.preventDefault();
      event.stopPropagation();

      if (disabled) return;

      setDragCounter((prev) => {
        const newCounter = prev - 1;
        if (newCounter === 0) {
          setIsDragOver(false);
        }
        return newCounter;
      });
    },
    [disabled]
  );

  const handleDragOver = React.useCallback(
    (event: React.DragEvent): void => {
      event.preventDefault();
      event.stopPropagation();

      if (disabled) return;

      // Set the appropriate drop effect
      if (event.dataTransfer.types.includes('Files')) {
        event.dataTransfer.dropEffect = 'copy';
      } else {
        event.dataTransfer.dropEffect = 'none';
      }
    },
    [disabled]
  );

  const handleDrop = React.useCallback(
    (event: React.DragEvent): void => {
      event.preventDefault();
      event.stopPropagation();

      if (disabled) return;

      setIsDragOver(false);
      setDragCounter(0);

      const files = getImageFilesFromDataTransfer(event.dataTransfer);

      if (files.length === 0) {
        if (onError) {
          onError('No image files found in the dropped items');
        }
        return;
      }

      // Validate files
      const validFiles: File[] = [];
      const errors: string[] = [];

      for (const file of files) {
        const validation = validateImageFile(file, validationOptions);
        if (validation.isValid) {
          validFiles.push(file);
        } else {
          errors.push(`${file.name}: ${validation.error ?? 'Unknown error'}`);
        }
      }

      // Report errors if any
      if (errors.length > 0 && onError) {
        onError(`Invalid files:\n${errors.join('\n')}`);
      }

      // Pass valid files to handler
      if (validFiles.length > 0) {
        onFilesDropped(validFiles);
      }
    },
    [disabled, onFilesDropped, onError, validationOptions]
  );

  // Reset drag state when disabled changes
  React.useEffect(() => {
    if (disabled) {
      setIsDragOver(false);
      setDragCounter(0);
    }
  }, [disabled]);

  // Ensure dragCounter is recognized as used
  React.useEffect(() => {
    // This ensures TypeScript sees dragCounter as used
    if (dragCounter < 0) {
      setDragCounter(0);
    }
  }, [dragCounter]);

  return (
    <div
      className={cn('relative', 'h-full', className)}
      data-testid="image-drop-zone"
      onDragEnter={disabled ? undefined : handleDragEnter}
      onDragLeave={disabled ? undefined : handleDragLeave}
      onDragOver={disabled ? undefined : handleDragOver}
      onDrop={disabled ? undefined : handleDrop}
      ref={dropZoneRef}
    >
      {children}

      {/* Drop Overlay */}
      {showOverlay && isDragOver && !disabled && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded-lg">
          <div className="flex flex-col items-center justify-center text-primary p-8">
            <div className="relative mb-4">
              <Upload className="h-12 w-12 mb-2" />
              <ImageIcon className="h-6 w-6 absolute -bottom-1 -right-1 bg-background rounded-full p-1" />
            </div>
            <div className="text-lg font-semibold mb-2">Drop images here</div>
            <div className="text-sm text-muted-foreground text-center max-w-xs">
              Release to upload your images
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
