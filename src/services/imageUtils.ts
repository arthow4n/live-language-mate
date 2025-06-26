/**
 *
 */
export interface CompressionOptions {
  format?: 'image/jpeg' | 'image/webp';
  maxHeight?: number;
  maxWidth?: number;
  quality?: number;
}

/**
 *
 */
export interface ImageMetadata {
  aspectRatio: number;
  height: number;
  size: number;
  type: string;
  width: number;
}

/**
 *
 */
export interface ImageValidationResult {
  details?: {
    actualSize?: number;
    actualType?: string;
    maxSizeAllowed?: number;
  };
  error?: string;
  isValid: boolean;
}

/**
 *
 */
export class ImageProcessingError extends Error {
  constructor(
    message: string,
    public code:
      | 'COMPRESSION_FAILED'
      | 'CONVERSION_FAILED'
      | 'INVALID_FILE'
      | 'METADATA_EXTRACTION_FAILED'
  ) {
    super(message);
    this.name = 'ImageProcessingError';
  }
}

const SUPPORTED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
] as const;
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const DEFAULT_COMPRESSION_QUALITY = 0.8;
const DEFAULT_MAX_DIMENSION = 2048;

/**
 *
 * @param file
 * @param options
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const {
    format = file.type.startsWith('image/png')
      ? 'image/webp'
      : // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Safe format fallback
        (file.type as 'image/jpeg' | 'image/webp'),
    maxHeight = DEFAULT_MAX_DIMENSION,
    maxWidth = DEFAULT_MAX_DIMENSION,
    quality = DEFAULT_COMPRESSION_QUALITY,
  } = options;

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    if (!ctx) {
      reject(
        new ImageProcessingError(
          'Cannot get canvas context',
          'COMPRESSION_FAILED'
        )
      );
      return;
    }

    img.onload = (): void => {
      try {
        const { height: newHeight, width: newWidth } = calculateDimensions(
          { height: img.height, width: img.width },
          { height: maxHeight, width: maxWidth }
        );

        canvas.width = newWidth;
        canvas.height = newHeight;

        ctx.drawImage(img, 0, 0, newWidth, newHeight);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(
                new ImageProcessingError(
                  'Canvas toBlob returned null',
                  'COMPRESSION_FAILED'
                )
              );
              return;
            }

            const compressedFile = new File([blob], file.name, {
              lastModified: Date.now(),
              type: format,
            });

            resolve(compressedFile);
          },
          format,
          quality
        );
      } catch (error) {
        reject(
          new ImageProcessingError(
            `Compression failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            'COMPRESSION_FAILED'
          )
        );
      }
    };

    img.onerror = (): void => {
      reject(
        new ImageProcessingError(
          'Failed to load image for compression',
          'COMPRESSION_FAILED'
        )
      );
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 *
 * @param file
 */
export async function convertToBase64DataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (): void => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(
          new ImageProcessingError(
            'Failed to convert file to base64',
            'CONVERSION_FAILED'
          )
        );
      }
    };

    reader.onerror = (): void => {
      reject(
        new ImageProcessingError(
          'FileReader error during base64 conversion',
          'CONVERSION_FAILED'
        )
      );
    };

    reader.readAsDataURL(file);
  });
}

/**
 *
 * @param file
 */
export async function extractImageMetadata(file: File): Promise<ImageMetadata> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = (): void => {
      try {
        const metadata: ImageMetadata = {
          aspectRatio: img.width / img.height,
          height: img.height,
          size: file.size,
          type: file.type,
          width: img.width,
        };

        URL.revokeObjectURL(img.src);
        resolve(metadata);
      } catch (error) {
        reject(
          new ImageProcessingError(
            `Failed to extract metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
            'METADATA_EXTRACTION_FAILED'
          )
        );
      }
    };

    img.onerror = (): void => {
      URL.revokeObjectURL(img.src);
      reject(
        new ImageProcessingError(
          'Failed to load image for metadata extraction',
          'METADATA_EXTRACTION_FAILED'
        )
      );
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 *
 * @param bytes
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${String(parseFloat((bytes / Math.pow(k, i)).toFixed(2)))} ${sizes[i] ?? ''}`;
}

/**
 *
 * @param file
 * @param size
 */
export function generateThumbnailDataURL(
  file: File,
  size = 200
): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    if (!ctx) {
      reject(
        new ImageProcessingError(
          'Cannot get canvas context',
          'COMPRESSION_FAILED'
        )
      );
      return;
    }

    img.onload = (): void => {
      try {
        const { height, width } = calculateSquareThumbnailDimensions(
          { height: img.height, width: img.width },
          size
        );

        canvas.width = size;
        canvas.height = size;

        // Fill with light gray background
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(0, 0, size, size);

        // Center the image
        const offsetX = (size - width) / 2;
        const offsetY = (size - height) / 2;

        ctx.drawImage(img, offsetX, offsetY, width, height);

        const dataURL = canvas.toDataURL('image/jpeg', 0.7);
        URL.revokeObjectURL(img.src);
        resolve(dataURL);
      } catch (error) {
        reject(
          new ImageProcessingError(
            `Thumbnail generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            'COMPRESSION_FAILED'
          )
        );
      }
    };

    img.onerror = (): void => {
      URL.revokeObjectURL(img.src);
      reject(
        new ImageProcessingError(
          'Failed to load image for thumbnail',
          'COMPRESSION_FAILED'
        )
      );
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 *
 * @param dataTransfer
 */
export function getImageFilesFromDataTransfer(
  dataTransfer: DataTransfer
): File[] {
  const files: File[] = [];

  for (const file of Array.from(dataTransfer.files)) {
    if (isImageFile(file)) {
      files.push(file);
    }
  }

  return files;
}

/**
 *
 * @param file
 */
export function isImageFile(file: DataTransferItem | File): boolean {
  const type = file instanceof File ? file.type : file.type;
  return SUPPORTED_MIME_TYPES.includes(
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Safe type check for MIME types
    type as (typeof SUPPORTED_MIME_TYPES)[number]
  );
}

/**
 *
 * @param clipboardData
 */
export function processClipboardImages(clipboardData: DataTransfer): File[] {
  const files: File[] = [];

  for (const item of Array.from(clipboardData.items)) {
    if (item.kind === 'file' && isImageFile(item)) {
      const file = item.getAsFile();
      if (file) {
        files.push(file);
      }
    }
  }

  return files;
}

/**
 *
 * @param file
 * @param options
 * @param options.allowedTypes
 * @param options.maxSize
 */
export function validateImageFile(
  file: File,
  options: {
    allowedTypes?: readonly string[];
    maxSize?: number;
  } = {}
): ImageValidationResult {
  const {
    allowedTypes = SUPPORTED_MIME_TYPES,
    maxSize = DEFAULT_MAX_FILE_SIZE,
  } = options;

  // File existence check is unnecessary since it's typed as File
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Legacy compatibility check
  if (!file) {
    return {
      error: 'No file provided',
      isValid: false,
    };
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      details: {
        actualType: file.type,
      },
      error: `Unsupported file type. Allowed types: ${allowedTypes.join(', ')}`,
      isValid: false,
    };
  }

  if (file.size > maxSize) {
    return {
      details: {
        actualSize: file.size,
        maxSizeAllowed: maxSize,
      },
      error: `File size too large. Maximum allowed: ${formatFileSize(maxSize)}`,
      isValid: false,
    };
  }

  return {
    isValid: true,
  };
}

/**
 *
 * @param originalDimensions
 * @param originalDimensions.width
 * @param originalDimensions.height
 * @param maxDimensions
 * @param maxDimensions.width
 * @param maxDimensions.height
 */
function calculateDimensions(
  originalDimensions: { height: number; width: number },
  maxDimensions: { height: number; width: number }
): { height: number; width: number } {
  const { height: originalHeight, width: originalWidth } = originalDimensions;
  const { height: maxHeight, width: maxWidth } = maxDimensions;
  let width = originalWidth;
  let height = originalHeight;

  if (width > maxWidth) {
    height = (height * maxWidth) / width;
    width = maxWidth;
  }

  if (height > maxHeight) {
    width = (width * maxHeight) / height;
    height = maxHeight;
  }

  return {
    height: Math.round(height),
    width: Math.round(width),
  };
}

/**
 *
 * @param originalDimensions
 * @param originalDimensions.width
 * @param originalDimensions.height
 * @param maxSize
 */
function calculateSquareThumbnailDimensions(
  originalDimensions: { height: number; width: number },
  maxSize: number
): { height: number; width: number } {
  const { height: originalHeight, width: originalWidth } = originalDimensions;
  const aspectRatio = originalWidth / originalHeight;
  let width: number;
  let height: number;

  if (aspectRatio > 1) {
    // Landscape
    width = maxSize;
    height = maxSize / aspectRatio;
  } else {
    // Portrait or square
    width = maxSize * aspectRatio;
    height = maxSize;
  }

  return {
    height: Math.round(height),
    width: Math.round(width),
  };
}
