import * as React from 'react';

import type {
  ImageAttachment,
  ImageValidationOptions,
} from '../schemas/imageAttachment.js';

import { imageStorage } from '../services/imageStorage.js';
import {
  convertToBase64DataURL,
  validateImageFile,
} from '../services/imageUtils.js';

/**
 *
 */
export interface ImageUploadItem {
  error?: string;
  image: ImageAttachment;
  isLoading: boolean;
  src?: string;
}

/**
 *
 */
export interface UseImageUploadOptions {
  maxImages?: number;
  onError?: (error: string) => void;
  onSuccess?: (images: ImageAttachment[]) => void;
  validationOptions?: ImageValidationOptions;
}

/**
 *
 */
export interface UseImageUploadReturn {
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
  const { maxImages, onError, onSuccess, validationOptions } = options;

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
        // Validate the file
        const validation = validateImageFile(file, validationOptions);
        if (!validation.isValid) {
          if (onError) {
            onError(`${file.name}: ${validation.error ?? 'Unknown error'}`);
          }
          return null;
        }

        // Save to OPFS storage
        const imageMetadata = await imageStorage.saveImage(file);

        // Generate preview URL
        const src = await convertToBase64DataURL(file);

        return {
          error: undefined,
          image: imageMetadata,
          isLoading: false,
          src,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        if (onError) {
          onError(`Failed to process ${file.name}: ${errorMessage}`);
        }
        return null;
      }
    },
    [validationOptions, onError]
  );

  const uploadImages = React.useCallback(
    async (files: File[]): Promise<void> => {
      if (files.length === 0) return;

      // Check max images limit
      if (maxImages && images.length + files.length > maxImages) {
        if (onError) {
          onError(
            `Cannot upload ${String(files.length)} images. Maximum ${String(maxImages)} images allowed.`
          );
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
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        if (onError) {
          onError(`Upload failed: ${errorMessage}`);
        }
      } finally {
        setIsUploading(false);
      }
    },
    [images.length, maxImages, onError, onSuccess, processImageFile]
  );

  const removeImage = React.useCallback(
    async (imageId: string) => {
      try {
        // Remove from OPFS storage
        await imageStorage.deleteImage(imageId);

        // Remove from state
        setImages((prev) => prev.filter((item) => item.image.id !== imageId));
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        if (onError) {
          onError(`Failed to remove image: ${errorMessage}`);
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

      updateImageItem(imageId, { error: undefined, isLoading: true });

      try {
        // Try to retrieve the image from storage
        const file = await imageStorage.getImage(imageId);
        if (!file) {
          throw new Error('Image not found in storage');
        }

        // Generate new preview URL
        const src = await convertToBase64DataURL(file);

        updateImageItem(imageId, {
          error: undefined,
          isLoading: false,
          src,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';
        updateImageItem(imageId, {
          error: errorMessage,
          isLoading: false,
        });
      }
    },
    [images, updateImageItem]
  );

  const clearImages = React.useCallback(async () => {
    try {
      // Remove all images from storage
      await Promise.all(
        images.map((item) => imageStorage.deleteImage(item.image.id))
      );

      // Clear state
      setImages([]);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      if (onError) {
        onError(`Failed to clear images: ${errorMessage}`);
      }
    }
  }, [images, onError]);

  const getValidImages = React.useCallback(() => {
    return images
      .filter((item) => !item.isLoading && !item.error)
      .map((item) => item.image);
  }, [images]);

  return {
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
