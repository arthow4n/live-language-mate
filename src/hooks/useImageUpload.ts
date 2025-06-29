import * as React from 'react';

import type {
  ImageAttachment,
  ImageValidationOptions,
} from '../schemas/imageAttachment.js';

import {
  ErrorHandler,
  IMAGE_ERROR_CODES,
  ImageError,
  QuotaMonitor,
  RetryHandler,
} from '../services/errorHandling.js';
import { imageStorage } from '../services/imageStorage.js';
import {
  compressImage,
  convertToBase64DataURL,
  generateThumbnailDataURL,
  validateImageFile,
} from '../services/imageUtils.js';

/**
 *
 */
export interface ImageUploadItem {
  error?: ImageError;
  image: ImageAttachment;
  isLoading: boolean;
  retryCount?: number;
  src?: string;
}

/**
 *
 */
export interface UseImageUploadOptions {
  enableCompression?: boolean;
  enableRetry?: boolean;
  enableThumbnails?: boolean;
  maxImages?: number;
  maxRetries?: number;
  onError?: (error: ImageError) => void;
  onQuotaWarning?: (warning: string, critical: boolean) => void;
  onSuccess?: (images: ImageAttachment[]) => void;
  validationOptions?: ImageValidationOptions;
}

/**
 *
 */
export interface UseImageUploadReturn {
  cleanup: () => void;
  clearImages: () => void;
  getValidImages: () => ImageAttachment[];
  images: ImageUploadItem[];
  isUploading: boolean;
  removeImage: (imageId: string) => void;
  reorderImages: (fromIndex: number, toIndex: number) => void;
  retryImage: (imageId: string) => Promise<void>;
  uploadImages: (files: File[]) => Promise<void>;
}

/**
 *
 * @param options
 */
export function useImageUpload(
  options: UseImageUploadOptions = {}
): UseImageUploadReturn {
  const {
    enableCompression = true,
    enableRetry = true,
    enableThumbnails = true,
    maxImages,
    maxRetries = 2,
    onError,
    onQuotaWarning,
    onSuccess,
    validationOptions,
  } = options;

  const quotaMonitor = QuotaMonitor.getInstance();

  const [images, setImages] = React.useState<ImageUploadItem[]>([]);
  const [isUploading, setIsUploading] = React.useState(false);

  const updateImageItem = React.useCallback(
    (imageId: string, updates: Partial<ImageUploadItem>) => {
      setImages((prev) =>
        prev.map((item) =>
          item.image.id === imageId ? { ...item, ...updates } : item
        )
      );
    },
    []
  );

  const processImageFile = React.useCallback(
    async (file: File): Promise<ImageUploadItem | null> => {
      try {
        // Check quota before processing
        const wouldExceedQuota = await quotaMonitor.wouldExceedQuota(file.size);
        if (wouldExceedQuota) {
          const quotaError = new ImageError('Storage quota would be exceeded', {
            cause: null,
            code: IMAGE_ERROR_CODES.QUOTA_EXCEEDED,
            details: { fileName: file.name, fileSize: file.size },
            recoverable: true,
          });
          if (onError) {
            onError(quotaError);
          }
          return null;
        }

        // Validate the file
        const validation = validateImageFile(file, validationOptions);
        if (!validation.isValid) {
          const validationError = new ImageError(
            validation.error ?? 'File validation failed',
            {
              cause: null,
              code: IMAGE_ERROR_CODES.INVALID_FILE_TYPE,
              details: { fileName: file.name, ...validation.details },
              recoverable: false,
            }
          );
          if (onError) {
            onError(validationError);
          }
          return null;
        }

        // Process with retry and timeout
        const result = await RetryHandler.withTimeout(
          async () => {
            let processedFile = file;

            // Apply compression if enabled and file is large
            if (enableCompression && file.size > 500 * 1024) {
              // Only compress files > 500KB
              try {
                processedFile = await compressImage(file, {
                  maxHeight: 1920,
                  maxWidth: 1920,
                  quality: 0.8,
                });
              } catch {
                // If compression fails, continue with original file
              }
            }

            // Save to OPFS storage
            const imageMetadata = await imageStorage.saveImage(processedFile);

            // Generate preview URL (thumbnail for better performance)
            let src: string;
            if (enableThumbnails) {
              try {
                src = await generateThumbnailDataURL(processedFile, 300);
              } catch {
                // Fallback to full image if thumbnail generation fails
                src = await convertToBase64DataURL(processedFile);
              }
            } else {
              src = await convertToBase64DataURL(processedFile);
            }

            return {
              error: undefined,
              image: imageMetadata,
              isLoading: false,
              retryCount: 0,
              src,
            };
          },
          { operationName: 'Image processing', timeoutMs: 20000 }
        );

        // Check quota after successful upload and warn if needed
        const quotaStatus = await quotaMonitor.checkQuota();
        if (quotaStatus.warning && onQuotaWarning) {
          onQuotaWarning(quotaStatus.warning, quotaStatus.critical ?? false);
        }

        return result;
      } catch (error) {
        const imageError = ErrorHandler.normalizeError(
          error,
          `Processing ${file.name}`
        );
        if (onError) {
          onError(imageError);
        }
        return null;
      }
    },
    [validationOptions, onError, onQuotaWarning, quotaMonitor]
  );

  const uploadImages = React.useCallback(
    async (files: File[]): Promise<void> => {
      if (files.length === 0) return;

      // Check max images limit
      if (maxImages && images.length + files.length > maxImages) {
        if (onError) {
          const limitError = new ImageError(
            `Cannot upload ${String(files.length)} images. Maximum ${String(maxImages)} images allowed.`,
            {
              cause: null,
              code: IMAGE_ERROR_CODES.FILE_TOO_LARGE,
              details: {
                attemptedCount: files.length,
                currentCount: images.length,
                maxAllowed: maxImages,
              },
              recoverable: false,
            }
          );
          onError(limitError);
        }
        return;
      }

      // Check total file size for quota estimation
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);
      const wouldExceedQuota = await quotaMonitor.wouldExceedQuota(totalSize);
      if (wouldExceedQuota) {
        if (onError) {
          const quotaError = new ImageError(
            'Uploading these files would exceed storage quota',
            {
              cause: null,
              code: IMAGE_ERROR_CODES.QUOTA_EXCEEDED,
              details: { fileCount: files.length, totalSize },
              recoverable: true,
            }
          );
          onError(quotaError);
        }
        return;
      }

      setIsUploading(true);

      try {
        // Create placeholder items for immediate UI feedback
        const placeholderItems: ImageUploadItem[] = files.map((file) => ({
          error: undefined,
          image: {
            filename: file.name,
            id: crypto.randomUUID(),
            mimeType: 'image/png', // placeholder - will be updated after processing
            savedAt: new Date(),
            size: file.size,
          },
          isLoading: true,
        }));

        // Add placeholders to state
        setImages((prev) => [...prev, ...placeholderItems]);

        // Process files in parallel
        const processedItems = await Promise.all(
          files.map(async (file, index) => {
            const placeholderId = placeholderItems[index].image.id;
            const result = await processImageFile(file);

            if (!result) {
              // Remove placeholder for failed upload
              setImages((prev) =>
                prev.filter((item) => item.image.id !== placeholderId)
              );
              return null;
            }

            // Replace placeholder with actual result
            setImages((prev) =>
              prev.map((item) =>
                item.image.id === placeholderId ? result : item
              )
            );

            return result;
          })
        );

        const successfulItems = processedItems.filter(
          (item): item is ImageUploadItem => item !== null
        );

        if (successfulItems.length > 0 && onSuccess) {
          onSuccess(successfulItems.map((item) => item.image));
        }
      } catch (error) {
        const imageError = ErrorHandler.normalizeError(error, 'Batch upload');
        if (onError) {
          onError(imageError);
        }
      } finally {
        setIsUploading(false);
      }
    },
    [
      images.length,
      maxImages,
      onError,
      onSuccess,
      processImageFile,
      quotaMonitor,
    ]
  );

  const removeImage = React.useCallback(
    async (imageId: string) => {
      try {
        // Remove from OPFS storage with retry
        await RetryHandler.withRetry(() => imageStorage.deleteImage(imageId), {
          maxAttempts: 2,
        });

        // Remove from state
        setImages((prev) => prev.filter((item) => item.image.id !== imageId));
      } catch (error) {
        const imageError = ErrorHandler.normalizeError(error, 'Removing image');
        if (onError) {
          onError(imageError);
        }
      }
    },
    [onError]
  );

  const reorderImages = React.useCallback(
    (fromIndex: number, toIndex: number) => {
      setImages((prev) => {
        const newImages = [...prev];
        const [movedItem] = newImages.splice(fromIndex, 1);
        newImages.splice(toIndex, 0, movedItem);
        return newImages;
      });
    },
    []
  );

  const retryImage = React.useCallback(
    async (imageId: string) => {
      const imageItem = images.find((item) => item.image.id === imageId);
      if (!imageItem) return;

      const currentRetryCount = imageItem.retryCount ?? 0;
      if (!enableRetry || currentRetryCount >= maxRetries) {
        return;
      }

      updateImageItem(imageId, {
        error: undefined,
        isLoading: true,
        retryCount: currentRetryCount + 1,
      });

      try {
        // Try to retrieve the image from storage with retry logic
        const result = await RetryHandler.withRetry(
          async () => {
            const file = await imageStorage.getImage(imageId);
            if (!file) {
              throw new ImageError('Image not found in storage', {
                cause: null,
                code: IMAGE_ERROR_CODES.CORRUPTED_FILE,
                details: { imageId },
                recoverable: false,
              });
            }

            // Generate new preview URL
            const src = await convertToBase64DataURL(file);
            return { src };
          },
          { baseDelay: 500, maxAttempts: 2 }
        );

        updateImageItem(imageId, {
          error: undefined,
          isLoading: false,
          retryCount: currentRetryCount + 1,
          src: result.src,
        });
      } catch (error) {
        const imageError = ErrorHandler.normalizeError(error, 'Retrying image');
        updateImageItem(imageId, {
          error: imageError,
          isLoading: false,
          retryCount: currentRetryCount + 1,
        });
      }
    },
    [images, updateImageItem, enableRetry, maxRetries]
  );

  const cleanup = React.useCallback(() => {
    // Cleanup all object URLs to prevent memory leaks
    images.forEach((item) => {
      if (item.src?.startsWith('blob:')) {
        URL.revokeObjectURL(item.src);
      }
    });
  }, [images]);

  const clearImages = React.useCallback(async () => {
    try {
      // Cleanup object URLs first
      cleanup();

      // Remove all images from storage with error handling per image
      const results = await Promise.allSettled(
        images.map((item) =>
          RetryHandler.withRetry(
            () => imageStorage.deleteImage(item.image.id),
            { maxAttempts: 2 }
          )
        )
      );

      // Log any failures but don't block the clear operation
      const failures = results.filter(
        (result): result is PromiseRejectedResult =>
          result.status === 'rejected'
      );

      if (failures.length > 0 && onError) {
        const clearError = new ImageError(
          `Failed to delete ${String(failures.length)} of ${String(images.length)} images`,
          {
            cause: null,
            code: IMAGE_ERROR_CODES.STORAGE_UNAVAILABLE,
            details: {
              failureCount: failures.length,
              totalCount: images.length,
            },
            recoverable: true,
          }
        );
        onError(clearError);
      }

      // Clear state regardless of storage deletion results
      setImages([]);
    } catch (error) {
      const imageError = ErrorHandler.normalizeError(error, 'Clearing images');
      if (onError) {
        onError(imageError);
      }
    }
  }, [images, onError, cleanup]);

  const getValidImages = React.useCallback(() => {
    return images
      .filter((item) => !item.isLoading && !item.error)
      .map((item) => item.image);
  }, [images]);

  // Monitor quota and provide warnings
  React.useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const checkQuotaPeriodically = async (): Promise<void> => {
      try {
        const quotaStatus = await quotaMonitor.checkQuota();
        if (quotaStatus.warning && onQuotaWarning) {
          onQuotaWarning(quotaStatus.warning, quotaStatus.critical ?? false);
        }
      } catch {
        // Ignore quota check errors
      }

      // Check again in 30 seconds
      timeoutId = setTimeout(() => {
        void checkQuotaPeriodically();
      }, 30000);
    };

    // Initial check
    checkQuotaPeriodically().catch(() => {
      // Ignore errors in initial quota check
    });

    return (): void => {
      clearTimeout(timeoutId);
    };
  }, [quotaMonitor, onQuotaWarning]);

  // Cleanup on unmount
  React.useEffect(() => {
    return (): void => {
      cleanup();
    };
  }, [cleanup]);

  return {
    cleanup,
    clearImages: (): void => {
      void clearImages();
    },
    getValidImages,
    images,
    isUploading,
    removeImage: (imageId: string): void => {
      void removeImage(imageId);
    },
    reorderImages,
    retryImage,
    uploadImages,
  };
}
