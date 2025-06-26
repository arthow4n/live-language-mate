import { Eye } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils.js';

import type { ImageAttachment } from '../schemas/imageAttachment.js';

import { imageStorage } from '../services/imageStorage.js';
import { formatFileSize } from '../services/imageUtils.js';

/**
 *
 */
export interface ImageMessageProps {
  attachments: ImageAttachment[];
  className?: string;
  maxPreviewSize?: 'lg' | 'md' | 'sm';
  onImageClick?: (attachment: ImageAttachment, imageUrl: string) => void;
  showMetadata?: boolean;
}

/**
 *
 */
interface ImageItemProps {
  attachment: ImageAttachment;
  errorImages: Set<string>;
  imageUrls: Map<string, string>;
  loadingImages: Set<string>;
  onImageClick: (attachment: ImageAttachment) => void;
  showMetadata: boolean;
  sizeClasses: {
    container: string;
    image: string;
    text: string;
  };
}

const sizeVariants = {
  lg: {
    container: 'max-w-md',
    image: 'h-48',
    text: 'text-sm',
  },
  md: {
    container: 'max-w-sm',
    image: 'h-32',
    text: 'text-sm',
  },
  sm: {
    container: 'max-w-xs',
    image: 'h-24',
    text: 'text-xs',
  },
};

/**
 *
 * @param root0
 * @param root0.attachments
 * @param root0.className
 * @param root0.maxPreviewSize
 * @param root0.onImageClick
 * @param root0.showMetadata
 */
export function ImageMessage({
  attachments,
  className,
  maxPreviewSize = 'md',
  onImageClick,
  showMetadata = true,
}: ImageMessageProps): React.JSX.Element {
  const [imageUrls, setImageUrls] = React.useState<Map<string, string>>(
    new Map()
  );
  const [loadingImages, setLoadingImages] = React.useState<Set<string>>(
    new Set()
  );
  const [errorImages, setErrorImages] = React.useState<Set<string>>(new Set());

  const sizeClasses = sizeVariants[maxPreviewSize];

  // Load images from OPFS storage
  React.useEffect(() => {
    const loadImages = async (): Promise<void> => {
      for (const attachment of attachments) {
        if (imageUrls.has(attachment.id) || loadingImages.has(attachment.id)) {
          continue;
        }

        setLoadingImages((prev) => new Set(prev).add(attachment.id));

        try {
          const file = await imageStorage.getImage(attachment.id);
          if (file) {
            const url = URL.createObjectURL(file);
            setImageUrls((prev) => new Map(prev).set(attachment.id, url));
          } else {
            setErrorImages((prev) => new Set(prev).add(attachment.id));
          }
        } catch {
          setErrorImages((prev) => new Set(prev).add(attachment.id));
        } finally {
          setLoadingImages((prev) => {
            const newSet = new Set(prev);
            newSet.delete(attachment.id);
            return newSet;
          });
        }
      }
    };

    void loadImages();
  }, [attachments]);

  // Cleanup object URLs on unmount
  React.useEffect(() => {
    return (): void => {
      for (const url of imageUrls.values()) {
        URL.revokeObjectURL(url);
      }
    };
  }, [imageUrls]);

  // Handle image click
  const handleImageClick = (attachment: ImageAttachment): void => {
    const url = imageUrls.get(attachment.id);
    if (url && onImageClick) {
      onImageClick(attachment, url);
    }
  };

  if (attachments.length === 0) {
    return <></>;
  }

  return (
    <div className={cn('space-y-2', className)}>
      {attachments.length === 1 ? (
        // Single image - larger display
        <div className={cn('relative group', sizeClasses.container)}>
          <ImageItem
            attachment={attachments[0]}
            errorImages={errorImages}
            imageUrls={imageUrls}
            loadingImages={loadingImages}
            onImageClick={handleImageClick}
            showMetadata={showMetadata}
            sizeClasses={sizeClasses}
          />
        </div>
      ) : (
        // Multiple images - grid layout
        <div
          className="grid grid-cols-2 gap-2 max-w-md"
          data-testid="image-grid"
        >
          {attachments.map((attachment) => (
            <div className="relative group" key={attachment.id}>
              <ImageItem
                attachment={attachment}
                errorImages={errorImages}
                imageUrls={imageUrls}
                loadingImages={loadingImages}
                onImageClick={handleImageClick}
                showMetadata={showMetadata}
                sizeClasses={{
                  container: 'w-full',
                  image: 'h-24',
                  text: 'text-xs',
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 *
 * @param root0
 * @param root0.attachment
 * @param root0.errorImages
 * @param root0.imageUrls
 * @param root0.loadingImages
 * @param root0.onImageClick
 * @param root0.showMetadata
 * @param root0.sizeClasses
 */
function ImageItem({
  attachment,
  errorImages,
  imageUrls,
  loadingImages,
  onImageClick,
  showMetadata,
  sizeClasses,
}: ImageItemProps): React.JSX.Element {
  const isLoading = loadingImages.has(attachment.id);
  const hasError = errorImages.has(attachment.id);
  const imageUrl = imageUrls.get(attachment.id);

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border border-border',
        sizeClasses.container
      )}
    >
      {/* Loading State */}
      {isLoading && (
        <div
          className={cn(
            'flex items-center justify-center bg-muted animate-pulse',
            sizeClasses.image
          )}
          data-testid="image-loading"
        >
          <div className="w-8 h-8 bg-muted-foreground/20 rounded" />
        </div>
      )}

      {/* Error State */}
      {hasError && !isLoading && (
        <div
          className={cn(
            'flex flex-col items-center justify-center bg-destructive/10 text-destructive',
            sizeClasses.image
          )}
          data-testid="image-error"
        >
          <div className="text-center p-2">
            <div className={cn('font-medium', sizeClasses.text)}>
              Failed to load
            </div>
            <div className={cn('opacity-75', sizeClasses.text)}>
              {attachment.filename}
            </div>
          </div>
        </div>
      )}

      {/* Image */}
      {imageUrl && !isLoading && !hasError && (
        <>
          <img
            alt={attachment.filename}
            className={cn(
              'w-full object-cover cursor-pointer transition-transform duration-200 hover:scale-105',
              sizeClasses.image
            )}
            onClick={() => {
              onImageClick(attachment);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onImageClick(attachment);
              }
            }}
            role="button"
            src={imageUrl}
            tabIndex={0}
          />

          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 cursor-pointer flex items-center justify-center opacity-0 group-hover:opacity-100">
            <div className="bg-white/90 rounded-full p-2">
              <Eye className="w-4 h-4 text-gray-800" />
            </div>
          </div>
        </>
      )}

      {/* Metadata Overlay */}
      {showMetadata && imageUrl && !isLoading && !hasError && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className={cn('truncate font-medium', sizeClasses.text)}>
            {attachment.filename}
          </div>
          <div className={cn('text-white/80', sizeClasses.text)}>
            {formatFileSize(attachment.size)}
          </div>
        </div>
      )}
    </div>
  );
}
