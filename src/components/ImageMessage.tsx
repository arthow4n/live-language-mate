import { Eye } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils.js';

import type {
  Attachment,
  ImageAttachment,
} from '../schemas/imageAttachment.js';

import { imageStorage } from '../services/imageStorage.js';
import { formatFileSize } from '../services/imageUtils.js';
import { LazyImage } from './LazyImage.js';

/**
 *
 */
export interface ImageMessageProps {
  attachments: Attachment[];
  className?: string;
  maxPreviewSize?: 'lg' | 'md' | 'sm';
  onImageClick?: (attachment: ImageAttachment, imageUrl: string) => void;
  showMetadata?: boolean;
}

/**
 *
 */
interface ImageItemProps {
  attachment: Attachment;
  errorImages: Set<string>;
  imageUrls: Map<string, string>;
  loadingImages: Set<string>;
  onImageClick: (attachment: Attachment, imageUrl: string) => void;
  showMetadata: boolean;
  sizeClasses: {
    container: string;
    maxHeight: number;
    text: string;
  };
}

const sizeVariants = {
  lg: {
    container: 'max-w-md',
    maxHeight: 192, // 48 * 4px = 192px
    text: 'text-sm',
  },
  md: {
    container: 'max-w-sm',
    maxHeight: 128, // 32 * 4px = 128px
    text: 'text-sm',
  },
  sm: {
    container: 'max-w-xs',
    maxHeight: 96, // 24 * 4px = 96px
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

  // Load images from OPFS storage or use URL directly
  React.useEffect(() => {
    const loadImages = async (): Promise<void> => {
      for (const attachment of attachments) {
        if (imageUrls.has(attachment.id) || loadingImages.has(attachment.id)) {
          continue;
        }

        setLoadingImages((prev) => new Set(prev).add(attachment.id));

        try {
          if (attachment.type === 'url') {
            // For URL attachments, use the URL directly
            setImageUrls((prev) =>
              new Map(prev).set(attachment.id, attachment.url)
            );
          } else {
            // For file attachments, load from OPFS storage
            const file = await imageStorage.getImage(attachment.id);
            if (file) {
              const url = URL.createObjectURL(file);
              setImageUrls((prev) => new Map(prev).set(attachment.id, url));
            } else {
              setErrorImages((prev) => new Set(prev).add(attachment.id));
            }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- imageUrls and loadingImages are intentionally excluded to avoid infinite loop
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
  const handleImageClick = (attachment: Attachment, imageUrl: string): void => {
    if (onImageClick) {
      // For URL attachments, we still pass them to onImageClick but as ImageAttachment-like objects
      if (attachment.type === 'file') {
        onImageClick(attachment, imageUrl);
      } else {
        // For URL attachments, create a compatible object for the callback
        // This might not be ideal but maintains backward compatibility
        const fakeImageAttachment: ImageAttachment = {
          aspectRatio: 1, // Default aspect ratio for URL images
          filename: 'url-image',
          height: 100, // Default height for URL images
          id: attachment.id,
          mimeType: 'image/jpeg', // Default MIME type for URL images
          savedAt: attachment.addedAt,
          size: 0, // Unknown size for URL images
          type: 'file',
          width: 100, // Default width for URL images
        };
        onImageClick(fakeImageAttachment, imageUrl);
      }
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
                  maxHeight: 96,
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

  // Calculate dimensions based on aspect ratio
  const containerStyle = React.useMemo(() => {
    if (attachment.type === 'file' && 'aspectRatio' in attachment) {
      const { aspectRatio } = attachment;
      const maxHeight = sizeClasses.maxHeight;

      // Calculate width based on aspect ratio and max height
      const calculatedWidth = maxHeight * aspectRatio;

      return {
        height: `${maxHeight.toString()}px`,
        width: `${calculatedWidth.toString()}px`,
      };
    }

    // Fallback for URL attachments or missing aspect ratio
    return {
      height: `${sizeClasses.maxHeight.toString()}px`,
      width: 'auto',
    };
  }, [attachment, sizeClasses.maxHeight]);

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border border-border',
        sizeClasses.container
      )}
      style={containerStyle}
    >
      {/* Loading State */}
      {isLoading && (
        <div
          className="flex items-center justify-center bg-muted animate-pulse w-full h-full"
          data-testid="image-loading"
        >
          <div className="w-8 h-8 bg-muted-foreground/20 rounded" />
        </div>
      )}

      {/* Error State */}
      {hasError && !isLoading && (
        <div
          className="flex flex-col items-center justify-center bg-destructive/10 text-destructive w-full h-full"
          data-testid="image-error"
        >
          <div className="text-center p-2">
            <div className={cn('font-medium', sizeClasses.text)}>
              Failed to load
            </div>
            <div className={cn('opacity-75', sizeClasses.text)}>
              {attachment.type === 'file' ? attachment.filename : 'URL Image'}
            </div>
          </div>
        </div>
      )}

      {/* Image */}
      {imageUrl && !isLoading && !hasError && (
        <>
          <div
            className="cursor-pointer"
            data-testid="image-clickable"
            onClick={() => {
              if (imageUrl) {
                onImageClick(attachment, imageUrl);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (imageUrl) {
                  onImageClick(attachment, imageUrl);
                }
              }
            }}
            role="button"
            tabIndex={0}
          >
            <LazyImage
              alt={
                attachment.type === 'file' ? attachment.filename : 'URL image'
              }
              className="w-full h-full"
              src={imageUrl}
            />
          </div>

          {/* Hover Overlay */}
          <div
            className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 cursor-pointer flex items-center justify-center opacity-0 group-hover:opacity-100"
            onClick={() => {
              if (imageUrl) {
                onImageClick(attachment, imageUrl);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (imageUrl) {
                  onImageClick(attachment, imageUrl);
                }
              }
            }}
            role="button"
            tabIndex={0}
          >
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
            {attachment.type === 'file' ? attachment.filename : 'URL Image'}
          </div>
          <div className={cn('text-white/80', sizeClasses.text)}>
            {attachment.type === 'file'
              ? formatFileSize(attachment.size)
              : 'External URL'}
          </div>
        </div>
      )}
    </div>
  );
}
