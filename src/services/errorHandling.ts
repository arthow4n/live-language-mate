import { ImageStorageError } from './imageStorage.js';
import { ImageProcessingError } from './imageUtils.js';

/**
 * Common error codes for the image attachment system
 */
export const IMAGE_ERROR_CODES = {
  // API errors
  API_ERROR: 'API_ERROR',
  // Processing errors
  COMPRESSION_FAILED: 'COMPRESSION_FAILED',
  CONVERSION_FAILED: 'CONVERSION_FAILED',
  CORRUPTED_FILE: 'CORRUPTED_FILE',

  EMPTY_FILE: 'EMPTY_FILE',
  // File validation errors
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INSUFFICIENT_CREDITS: 'INSUFFICIENT_CREDITS',

  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  MODEL_NOT_SUPPORTED: 'MODEL_NOT_SUPPORTED',
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',

  PERMISSION_DENIED: 'PERMISSION_DENIED',
  // Storage errors
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  RATE_LIMITED: 'RATE_LIMITED',

  STORAGE_UNAVAILABLE: 'STORAGE_UNAVAILABLE',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
} as const;

/**
 *
 */
export type ImageErrorCode =
  (typeof IMAGE_ERROR_CODES)[keyof typeof IMAGE_ERROR_CODES];

/**
 * Error handler utility for converting various error types to ImageError
 */
export const ErrorHandler = {
  /**
   * Handles network errors with connection details
   * @param details
   * @param details.status
   * @param details.statusText
   */
  createNetworkError(details?: {
    status?: number;
    statusText?: string;
  }): ImageError {
    const statusText = details?.status ? String(details.status) : 'unknown';
    const message = details
      ? `Network error (${statusText}): ${details.statusText ?? 'Unknown error'}`
      : 'Network connection failed';

    return new ImageError(message, {
      cause: null,
      code: IMAGE_ERROR_CODES.NETWORK_ERROR,
      details,
      recoverable: true,
    });
  },

  /**
   * Handles rate limiting errors
   * @param retryAfter
   */
  createRateLimitError(retryAfter?: number): ImageError {
    return new ImageError(
      'Too many requests. Please wait before trying again.',
      {
        cause: null,
        code: IMAGE_ERROR_CODES.RATE_LIMITED,
        details: { retryAfter },
        recoverable: true,
      }
    );
  },

  /**
   * Handles timeout errors with retry capability
   * @param operation
   * @param timeoutMs
   */
  createTimeoutError(operation: string, timeoutMs: number): ImageError {
    return new ImageError(
      `${operation} timed out after ${String(timeoutMs)}ms`,
      {
        cause: null,
        code: IMAGE_ERROR_CODES.TIMEOUT_ERROR,
        details: { operation, timeoutMs },
        recoverable: true,
      }
    );
  },

  /**
   * Handles browser DOM exceptions
   * @param error
   */
  handleDOMException(error: DOMException): ImageError {
    switch (error.name) {
      case 'AbortError':
        return new ImageError('Operation was cancelled', {
          cause: error,
          code: IMAGE_ERROR_CODES.TIMEOUT_ERROR,
          recoverable: true,
        });
      case 'NotFoundError':
        return new ImageError('File not found', {
          cause: error,
          code: IMAGE_ERROR_CODES.CORRUPTED_FILE,
          recoverable: false,
        });
      case 'NotSupportedError':
        return new ImageError('Operation not supported by browser', {
          cause: error,
          code: IMAGE_ERROR_CODES.STORAGE_UNAVAILABLE,
          recoverable: false,
        });
      case 'QuotaExceededError':
        return new ImageError('Storage quota exceeded', {
          cause: error,
          code: IMAGE_ERROR_CODES.QUOTA_EXCEEDED,
          details: { quota: 'exceeded' },
          recoverable: true,
        });
      case 'SecurityError':
        return new ImageError('Security error - storage access denied', {
          cause: error,
          code: IMAGE_ERROR_CODES.PERMISSION_DENIED,
          recoverable: true,
        });
      default:
        return new ImageError(`Browser error: ${error.message}`, {
          cause: error,
          code: IMAGE_ERROR_CODES.STORAGE_UNAVAILABLE,
          details: { domException: error.name },
          recoverable: true,
        });
    }
  },

  /**
   * Handles processing-specific errors
   * @param error
   */
  handleProcessingError(error: ImageProcessingError): ImageError {
    switch (error.code) {
      case 'COMPRESSION_FAILED':
        return new ImageError(error.message, {
          cause: error,
          code: IMAGE_ERROR_CODES.COMPRESSION_FAILED,
          recoverable: true,
        });
      case 'CONVERSION_FAILED':
        return new ImageError(error.message, {
          cause: error,
          code: IMAGE_ERROR_CODES.CONVERSION_FAILED,
          recoverable: true,
        });
      case 'INVALID_FILE':
        return new ImageError(error.message, {
          cause: error,
          code: IMAGE_ERROR_CODES.CORRUPTED_FILE,
          recoverable: false,
        });
      case 'METADATA_EXTRACTION_FAILED':
        return new ImageError(error.message, {
          cause: error,
          code: IMAGE_ERROR_CODES.CORRUPTED_FILE,
          recoverable: false,
        });
      default:
        return new ImageError(error.message, {
          cause: error,
          code: IMAGE_ERROR_CODES.COMPRESSION_FAILED,
          recoverable: true,
        });
    }
  },

  /**
   * Handles storage-specific errors
   * @param error
   */
  handleStorageError(error: ImageStorageError): ImageError {
    switch (error.code) {
      case 'FILE_NOT_FOUND':
        return new ImageError(error.message, {
          cause: error,
          code: IMAGE_ERROR_CODES.CORRUPTED_FILE,
          recoverable: false,
        });
      case 'INVALID_FILE':
        return new ImageError(error.message, {
          cause: error,
          code: IMAGE_ERROR_CODES.INVALID_FILE_TYPE,
          recoverable: false,
        });
      case 'QUOTA_EXCEEDED':
        return new ImageError(error.message, {
          cause: error,
          code: IMAGE_ERROR_CODES.QUOTA_EXCEEDED,
          recoverable: true,
        });
      case 'STORAGE_UNAVAILABLE':
        return new ImageError(error.message, {
          cause: error,
          code: IMAGE_ERROR_CODES.STORAGE_UNAVAILABLE,
          recoverable: true,
        });
      default:
        return new ImageError(error.message, {
          cause: error,
          code: IMAGE_ERROR_CODES.STORAGE_UNAVAILABLE,
          recoverable: true,
        });
    }
  },

  /**
   * Converts various error types to standardized ImageError
   * @param error
   * @param context
   */
  normalizeError(error: unknown, context?: string): ImageError {
    // Already an ImageError
    if (error instanceof ImageError) {
      return error;
    }

    // Image-specific errors
    if (error instanceof ImageStorageError) {
      return this.handleStorageError(error);
    }

    if (error instanceof ImageProcessingError) {
      return this.handleProcessingError(error);
    }

    // DOM exceptions (browser APIs)
    if (error instanceof DOMException) {
      return this.handleDOMException(error);
    }

    // Network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return new ImageError('Network request failed', {
        cause: error,
        code: IMAGE_ERROR_CODES.NETWORK_ERROR,
        details: { originalError: error.message },
        recoverable: true,
      });
    }

    // Generic errors
    if (error instanceof Error) {
      const message = context ? `${context}: ${error.message}` : error.message;
      return new ImageError(message, {
        cause: error,
        code: IMAGE_ERROR_CODES.UPLOAD_FAILED,
        details: { originalError: error.message },
      });
    }

    // Unknown error types
    return new ImageError(
      context ? `${context}: Unknown error` : 'Unknown error occurred',
      {
        cause: null,
        code: IMAGE_ERROR_CODES.UPLOAD_FAILED,
        details: { originalError: String(error) },
      }
    );
  },
};

/**
 * Enhanced error class for image-related operations
 */
export class ImageError extends Error {
  public code: ImageErrorCode;
  public details?: Record<string, unknown>;
  public recoverable: boolean;

  constructor(
    message: string,
    options: {
      cause: Error | null;
      code: ImageErrorCode;
      details?: Record<string, unknown>;
      recoverable?: boolean;
    }
  ) {
    super(message);
    this.cause = options.cause;
    this.name = 'ImageError';
    this.code = options.code;
    this.details = options.details;
    this.recoverable = options.recoverable ?? false;
  }

  /**
   * Returns suggestions for recovering from the error
   */
  getRecoverySuggestions(): string[] {
    switch (this.code) {
      case IMAGE_ERROR_CODES.CORRUPTED_FILE:
        return [
          'Try uploading a different image',
          'Re-save the image from your image editor',
          'Check if the original file opens correctly',
        ];
      case IMAGE_ERROR_CODES.FILE_TOO_LARGE:
        return [
          'Try compressing the image before uploading',
          'Use a smaller image resolution',
          'Convert to a more efficient format like WebP',
        ];
      case IMAGE_ERROR_CODES.INVALID_FILE_TYPE:
        return [
          'Convert the image to PNG, JPEG, WebP, or GIF format',
          'Save the image in a supported format from your image editor',
        ];
      case IMAGE_ERROR_CODES.MODEL_NOT_SUPPORTED:
        return [
          'Select a model that supports image inputs',
          'Remove the attached images',
          'Check the model capabilities in settings',
        ];
      case IMAGE_ERROR_CODES.NETWORK_ERROR:
        return [
          'Check your internet connection',
          'Try again in a few moments',
          'Refresh the page if the problem persists',
        ];
      case IMAGE_ERROR_CODES.QUOTA_EXCEEDED:
        return [
          'Delete unused images from your chat history',
          'Clear browser storage for this site',
          'Contact support if you need more storage',
        ];
      case IMAGE_ERROR_CODES.STORAGE_UNAVAILABLE:
        return [
          'Try refreshing the page',
          'Check if private browsing mode is enabled',
          'Ensure JavaScript and storage permissions are enabled',
        ];
      case IMAGE_ERROR_CODES.API_ERROR:
      case IMAGE_ERROR_CODES.COMPRESSION_FAILED:
      case IMAGE_ERROR_CODES.CONVERSION_FAILED:
      case IMAGE_ERROR_CODES.EMPTY_FILE:
      case IMAGE_ERROR_CODES.INSUFFICIENT_CREDITS:
      case IMAGE_ERROR_CODES.PERMISSION_DENIED:
      case IMAGE_ERROR_CODES.RATE_LIMITED:
      case IMAGE_ERROR_CODES.TIMEOUT_ERROR:
      case IMAGE_ERROR_CODES.UPLOAD_FAILED:
      default:
        return [
          'Try the operation again',
          'Refresh the page if the problem persists',
        ];
    }
  }

  /**
   * Creates a user-friendly error message
   */
  getUserMessage(): string {
    switch (this.code) {
      case IMAGE_ERROR_CODES.COMPRESSION_FAILED:
        return 'Failed to compress image. The file may be corrupted.';
      case IMAGE_ERROR_CODES.CORRUPTED_FILE:
        return 'The image file appears to be corrupted or invalid.';
      case IMAGE_ERROR_CODES.FILE_TOO_LARGE: {
        const maxSizeText =
          this.details?.maxSize && typeof this.details.maxSize === 'number'
            ? formatBytes(this.details.maxSize)
            : '10MB';
        return `File is too large. Maximum size allowed is ${maxSizeText}.`;
      }
      case IMAGE_ERROR_CODES.INVALID_FILE_TYPE:
        return 'Only PNG, JPEG, WebP, and GIF images are supported.';
      case IMAGE_ERROR_CODES.MODEL_NOT_SUPPORTED: {
        const supportedModelsText =
          this.details?.supportedModels &&
          Array.isArray(this.details.supportedModels)
            ? `Try using: ${this.details.supportedModels.join(', ')}`
            : 'Please select a different model.';
        return `The selected AI model does not support image inputs. ${supportedModelsText}`;
      }
      case IMAGE_ERROR_CODES.NETWORK_ERROR:
        return 'Network connection failed. Please check your internet connection and try again.';
      case IMAGE_ERROR_CODES.QUOTA_EXCEEDED:
        return 'Storage quota exceeded. Please delete some images to free up space.';
      case IMAGE_ERROR_CODES.STORAGE_UNAVAILABLE:
        return 'Image storage is not available. Please check your browser settings.';
      case IMAGE_ERROR_CODES.TIMEOUT_ERROR:
        return 'Operation timed out. Please try again.';
      case IMAGE_ERROR_CODES.API_ERROR:
      case IMAGE_ERROR_CODES.CONVERSION_FAILED:
      case IMAGE_ERROR_CODES.EMPTY_FILE:
      case IMAGE_ERROR_CODES.INSUFFICIENT_CREDITS:
      case IMAGE_ERROR_CODES.PERMISSION_DENIED:
      case IMAGE_ERROR_CODES.RATE_LIMITED:
      case IMAGE_ERROR_CODES.UPLOAD_FAILED:
      default:
        return (
          this.message ||
          'An unexpected error occurred while processing the image.'
        );
    }
  }
}

/**
 * Storage quota monitor
 */
export class QuotaMonitor {
  private static instance: null | QuotaMonitor = null;
  private quotaCriticalThreshold = 0.95; // 95%
  private quotaWarningThreshold = 0.8; // 80%

  static getInstance(): QuotaMonitor {
    this.instance ??= new QuotaMonitor();
    return this.instance;
  }

  /**
   * Checks current storage usage and returns warnings if necessary
   */
  async checkQuota(): Promise<{
    critical?: boolean;
    quota: number;
    usage: number;
    usagePercent: number;
    warning?: string;
  }> {
    try {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage ?? 0;
      const quota = estimate.quota ?? 0;
      const usagePercent = quota > 0 ? usage / quota : 0;

      let warning: string | undefined;
      let critical = false;

      if (usagePercent >= this.quotaCriticalThreshold) {
        warning = `Storage is ${String(Math.round(usagePercent * 100))}% full. Please delete some images immediately.`;
        critical = true;
      } else if (usagePercent >= this.quotaWarningThreshold) {
        warning = `Storage is ${String(Math.round(usagePercent * 100))}% full. Consider deleting some images.`;
      }

      return {
        critical,
        quota,
        usage,
        usagePercent,
        warning,
      };
    } catch {
      // If quota estimation fails, return safe defaults
      return {
        quota: 0,
        usage: 0,
        usagePercent: 0,
        warning: 'Unable to check storage quota',
      };
    }
  }

  /**
   * Predicts if adding a file would exceed quota
   * @param additionalBytes
   */
  async wouldExceedQuota(additionalBytes: number): Promise<boolean> {
    try {
      const { quota, usage } = await this.checkQuota();
      if (quota === 0) return false; // Unknown quota, allow operation
      return usage + additionalBytes > quota;
    } catch {
      return false; // If check fails, allow operation
    }
  }
}

/**
 * Retry utility with exponential backoff
 */
export const RetryHandler = {
  /**
   * Retries an operation with exponential backoff
   * @param operation
   * @param options
   * @param options.baseDelay
   * @param options.maxAttempts
   * @param options.maxDelay
   * @param options.shouldRetry
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    options: {
      baseDelay?: number;
      maxAttempts?: number;
      maxDelay?: number;
      shouldRetry?: (error: unknown) => boolean;
    } = {}
  ): Promise<T> {
    const {
      baseDelay = 1000,
      maxAttempts = 3,
      maxDelay = 10000,
      shouldRetry = (error: unknown): boolean => {
        if (error instanceof ImageError) {
          return error.recoverable;
        }
        return (
          error instanceof ImageStorageError ||
          error instanceof ImageProcessingError
        );
      },
    } = options;

    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt === maxAttempts || !shouldRetry(error)) {
          throw ErrorHandler.normalizeError(error);
        }

        const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw ErrorHandler.normalizeError(lastError);
  },

  /**
   * Adds timeout to an operation
   * @param operation
   * @param options
   * @param options.timeoutMs
   * @param options.operationName
   */
  withTimeout<T>(
    operation: () => Promise<T>,
    options: { operationName?: string; timeoutMs: number }
  ): Promise<T> {
    const { operationName = 'Operation', timeoutMs } = options;
    return Promise.race([
      operation(),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(ErrorHandler.createTimeoutError(operationName, timeoutMs));
        }, timeoutMs);
      }),
    ]);
  },
};

/**
 * Utility to format bytes in human readable format
 * @param bytes
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${String(parseFloat((bytes / Math.pow(k, i)).toFixed(2)))} ${sizes[i]}`;
}
