import { AlertCircle, Loader2, RotateCcw, X } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils.js';

import type { ImageAttachment } from '../schemas/imageAttachment.js';

import { formatFileSize } from '../services/imageUtils.js';
import { Button } from './ui/button.js';

/**
 *
 */
export interface ImagePreviewProps {
  className?: string;
  error?: string;
  image: ImageAttachment;
  isLoading?: boolean;
  onRemove?: (imageId: string) => void;
  onRetry?: (imageId: string) => void;
  showMetadata?: boolean;
  size?: 'lg' | 'md' | 'sm';
  src?: string;
}

const sizeVariants = {
  lg: {
    button: 'w-6 h-6',
    container: 'w-32 h-32',
    image: 'w-28 h-28',
    text: 'text-sm',
  },
  md: {
    button: 'w-5 h-5',
    container: 'w-24 h-24',
    image: 'w-20 h-20',
    text: 'text-sm',
  },
  sm: {
    button: 'w-4 h-4',
    container: 'w-16 h-16',
    image: 'w-14 h-14',
    text: 'text-xs',
  },
};

/**
 *
 * @param root0
 * @param root0.className
 * @param root0.error
 * @param root0.image
 * @param root0.isLoading
 * @param root0.onRemove
 * @param root0.onRetry
 * @param root0.showMetadata
 * @param root0.size
 * @param root0.src
 */
export function ImagePreview({
  className,
  error,
  image,
  isLoading = false,
  onRemove,
  onRetry,
  showMetadata = false,
  size = 'md',
  src,
}: ImagePreviewProps): React.JSX.Element {
  const [imageError, setImageError] = React.useState(false);
  const [isImageLoading, setIsImageLoading] = React.useState(true);
  const sizeClasses = sizeVariants[size];

  const handleImageLoad = (): void => {
    setIsImageLoading(false);
    setImageError(false);
  };

  const handleImageError = (): void => {
    setIsImageLoading(false);
    setImageError(true);
  };

  const handleRemove = (): void => {
    if (onRemove && !isLoading) {
      onRemove(image.id);
    }
  };

  const handleRetry = (): void => {
    if (onRetry && !isLoading) {
      setImageError(false);
      setIsImageLoading(true);
      onRetry(image.id);
    }
  };

  const hasError = error ?? imageError;
  const showLoader = isLoading || isImageLoading;

  return (
    <div
      className={cn(
        'relative group rounded-lg border border-border bg-background overflow-hidden',
        sizeClasses.container,
        className
      )}
    >
      {/* Loading State */}
      {showLoader && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
          <Loader2 className={cn('animate-spin text-muted-foreground', sizeClasses.button)} />
        </div>
      )}

      {/* Error State */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/10 z-10">
          <AlertCircle className={cn('text-destructive mb-1', sizeClasses.button)} />
          {onRetry && (
            <Button
              className={cn('h-6 w-6')}
              onClick={handleRetry}
              size="icon"
              title="Retry loading image"
              variant="ghost"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}

      {/* Image */}
      {src && !hasError && (
        <img
          alt={image.filename}
          className={cn(
            'object-cover rounded-md',
            sizeClasses.image,
            showLoader && 'opacity-0'
          )}
          draggable={false}
          onError={handleImageError}
          onLoad={handleImageLoad}
          src={src}
        />
      )}

      {/* Placeholder when no src */}
      {!src && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className={cn('w-6 h-6 bg-muted-foreground/20 rounded')} />
        </div>
      )}

      {/* Remove Button */}
      {onRemove && (
        <Button
          className={cn(
            'absolute -top-2 -right-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-6 w-6 shadow-md',
            'hover:bg-destructive hover:text-destructive-foreground'
          )}
          disabled={isLoading}
          onClick={handleRemove}
          size="icon"
          title="Remove image"
          variant="destructive"
        >
          <X className="h-3 w-3" />
        </Button>
      )}

      {/* Metadata Overlay */}
      {showMetadata && (
        <div className="absolute bottom-0 left-0 right-0 bg-background/90 backdrop-blur-sm p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className={cn('truncate font-medium', sizeClasses.text)}>
            {image.filename}
          </div>
          <div className={cn('text-muted-foreground', sizeClasses.text)}>
            {formatFileSize(image.size)}
          </div>
        </div>
      )}
    </div>
  );
}