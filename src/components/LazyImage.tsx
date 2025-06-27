import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Props for LazyImage component
 */
export interface LazyImageProps {
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
  onError?: () => void;
  onLoad?: () => void;
  src: string;
}

/**
 * Simple lazy loading image component using native loading="lazy"
 * @param root0
 * @param root0.alt
 * @param root0.className
 * @param root0.fallback
 * @param root0.onError
 * @param root0.onLoad
 * @param root0.src
 */
export function LazyImage({
  alt,
  className,
  fallback,
  onError,
  onLoad,
  src,
}: LazyImageProps): React.JSX.Element {
  const [hasError, setHasError] = React.useState(false);

  const handleError = (): void => {
    setHasError(true);
    if (onError) {
      onError();
    }
  };

  const handleLoad = (): void => {
    setHasError(false);
    if (onLoad) {
      onLoad();
    }
  };

  // Show error fallback
  if (hasError && fallback) {
    return (
      <div className={className} data-testid="lazy-image-fallback">
        {fallback}
      </div>
    );
  }

  return (
    <img
      alt={alt}
      className={cn('w-full h-full object-cover', className)}
      draggable={false}
      loading="lazy"
      onError={handleError}
      onLoad={handleLoad}
      src={src}
    />
  );
}
