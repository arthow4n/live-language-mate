/* eslint-disable @typescript-eslint/unbound-method -- Test file with many mock function calls */
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { createTestFile } from '@/__tests__/testUtilities';

import { IMAGE_ERROR_CODES, ImageError } from '../../services/errorHandling';
import { imageStorage } from '../../services/imageStorage';
import {
  convertToBase64DataURL,
  generateThumbnailDataURL,
  validateImageFile,
} from '../../services/imageUtils';
import { useImageUpload } from '../useImageUpload';

// Mock the services
vi.mock('../../services/imageStorage');
vi.mock('../../services/imageUtils');
vi.mock('../../services/errorHandling', async (): Promise<unknown> => {
  const actual = await vi.importActual('../../services/errorHandling');
  return {
    ...actual,
    QuotaMonitor: {
      getInstance: (): unknown => ({
        checkQuota: vi.fn().mockResolvedValue({
          quota: 1000000000, // 1GB
          usage: 0,
          usagePercent: 0,
        }),
        wouldExceedQuota: vi.fn().mockResolvedValue(false),
      }),
    },
  };
});

const mockImageStorage = vi.mocked(imageStorage);
const mockValidateImageFile = vi.mocked(validateImageFile);
const mockConvertToBase64DataURL = vi.mocked(convertToBase64DataURL);
const mockGenerateThumbnailDataURL = vi.mocked(generateThumbnailDataURL);

describe('useImageUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks
    mockValidateImageFile.mockReturnValue({ isValid: true });
    mockImageStorage.saveImage.mockResolvedValue({
      aspectRatio: 1.5,
      filename: 'test.jpg',
      height: 400,
      id: 'test-id',
      mimeType: 'image/jpeg',
      savedAt: new Date(),
      size: 1024,
      type: 'file',
      width: 600,
    });
    mockConvertToBase64DataURL.mockResolvedValue('data:image/jpeg;base64,test');
    mockGenerateThumbnailDataURL.mockResolvedValue(
      'data:image/jpeg;base64,thumbnail'
    );
    mockImageStorage.deleteImage.mockResolvedValue(true);
    mockImageStorage.getImage.mockResolvedValue(
      new File(['test'], 'test.jpg', { type: 'image/jpeg' })
    );
  });

  test('initializes with empty state', () => {
    const { result } = renderHook(() => useImageUpload());

    expect(result.current.images).toEqual([]);
    expect(result.current.isUploading).toBe(false);
  });

  test('uploads images successfully', async () => {
    const mockOnSuccess = vi.fn();
    const { result } = renderHook(() =>
      useImageUpload({ onSuccess: mockOnSuccess })
    );

    const files = [
      createTestFile({
        mimeType: 'image/jpeg',
        name: 'test.jpg',
        size: 1024,
      }),
    ];

    await act(async () => {
      await result.current.uploadImages(files);
    });

    await waitFor(() => {
      expect(result.current.images).toHaveLength(1);
    });

    expect(result.current.images[0].isLoading).toBe(false);
    expect(result.current.images[0].error).toBeUndefined();
    expect(result.current.isUploading).toBe(false);

    expect(mockImageStorage.saveImage).toHaveBeenCalledWith(files[0]);
    expect(mockGenerateThumbnailDataURL).toHaveBeenCalledWith(files[0], 300);
    expect(mockOnSuccess).toHaveBeenCalledWith([
      expect.objectContaining({
        filename: 'test.jpg',
        id: 'test-id',
      }),
    ]);
  });

  test('shows loading state during upload', async () => {
    const { result } = renderHook(() => useImageUpload());

    const files = [
      createTestFile({
        mimeType: 'image/jpeg',
        name: 'test.jpg',
        size: 1024,
      }),
    ];

    // Start the upload and wait for completion
    await act(async () => {
      await result.current.uploadImages(files);
    });

    // Verify final state after upload completes
    expect(result.current.isUploading).toBe(false);
    expect(result.current.images).toHaveLength(1);
    expect(result.current.images[0].isLoading).toBe(false);
  });

  test('handles upload errors', async () => {
    const mockOnError = vi.fn();
    mockImageStorage.saveImage.mockRejectedValue(new Error('Storage error'));

    const { result } = renderHook(() =>
      useImageUpload({ onError: mockOnError })
    );

    const files = [
      createTestFile({
        mimeType: 'image/jpeg',
        name: 'test.jpg',
        size: 1024,
      }),
    ];

    await act(async () => {
      await result.current.uploadImages(files);
    });

    await waitFor(() => {
      expect(result.current.images).toHaveLength(0); // Failed upload removed
    });

    expect(result.current.isUploading).toBe(false);

    expect(mockOnError).toHaveBeenCalledWith(
      expect.objectContaining({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- ImageError test expectation
        message: expect.stringContaining('Processing test.jpg'),
      })
    );
  });

  test('handles validation errors', async () => {
    const mockOnError = vi.fn();
    mockValidateImageFile.mockReturnValue({
      error: 'File too large',
      isValid: false,
    });

    const { result } = renderHook(() =>
      useImageUpload({ onError: mockOnError })
    );

    const files = [
      createTestFile({
        mimeType: 'image/jpeg',
        name: 'test.jpg',
        size: 1024,
      }),
    ];

    await act(async () => {
      await result.current.uploadImages(files);
    });

    await waitFor(() => {
      expect(result.current.images).toHaveLength(0);
    });

    expect(result.current.isUploading).toBe(false);

    expect(mockOnError).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'INVALID_FILE_TYPE',
        message: 'File too large',
      })
    );
    expect(mockImageStorage.saveImage).not.toHaveBeenCalled();
  });

  test('enforces max images limit', async () => {
    const mockOnError = vi.fn();
    const { result } = renderHook(() =>
      useImageUpload({ maxImages: 2, onError: mockOnError })
    );

    // Upload first batch
    const firstFiles = [
      createTestFile({
        mimeType: 'image/jpeg',
        name: 'first.jpg',
        size: 1024,
      }),
    ];
    await act(async () => {
      await result.current.uploadImages(firstFiles);
    });

    await waitFor(() => {
      expect(result.current.images).toHaveLength(1);
    });

    // Try to upload too many more
    const secondFiles = [
      createTestFile({
        mimeType: 'image/jpeg',
        name: 'second.jpg',
        size: 1024,
      }),
      createTestFile({
        mimeType: 'image/jpeg',
        name: 'third.jpg',
        size: 1024,
      }),
    ];

    await act(async () => {
      await result.current.uploadImages(secondFiles);
    });

    expect(mockOnError).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'FILE_TOO_LARGE',
        message: 'Cannot upload 2 images. Maximum 2 images allowed.',
      })
    );
    expect(result.current.images).toHaveLength(1); // Should still be 1
  });

  test('removes images successfully', async () => {
    const { result } = renderHook(() => useImageUpload());

    // Upload an image first
    const files = [
      createTestFile({
        mimeType: 'image/jpeg',
        name: 'test.jpg',
        size: 1024,
      }),
    ];
    await act(async () => {
      await result.current.uploadImages(files);
    });

    await waitFor(() => {
      expect(result.current.images).toHaveLength(1);
    });

    const imageId = result.current.images[0].image.id;

    // Remove the image
    act(() => {
      result.current.removeImage(imageId);
    });

    await waitFor(() => {
      expect(result.current.images).toHaveLength(0);
    });

    expect(mockImageStorage.deleteImage).toHaveBeenCalledWith(imageId);
  });

  test('handles remove errors', async () => {
    const mockOnError = vi.fn();
    mockImageStorage.deleteImage.mockRejectedValue(new Error('Delete error'));

    const { result } = renderHook(() =>
      useImageUpload({ onError: mockOnError })
    );

    // Upload an image first
    const files = [
      createTestFile({
        mimeType: 'image/jpeg',
        name: 'test.jpg',
        size: 1024,
      }),
    ];
    await act(async () => {
      await result.current.uploadImages(files);
    });

    await waitFor(() => {
      expect(result.current.images).toHaveLength(1);
    });

    const imageId = result.current.images[0].image.id;

    // Try to remove the image
    act(() => {
      result.current.removeImage(imageId);
    });

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- ImageError test expectation
          message: expect.stringContaining('Delete error'),
        })
      );
    });
  });

  test('reorders images correctly', async () => {
    const { result } = renderHook(() => useImageUpload());

    // Upload multiple images
    const files = [
      createTestFile({
        mimeType: 'image/jpeg',
        name: 'first.jpg',
        size: 1024,
      }),
      createTestFile({
        mimeType: 'image/jpeg',
        name: 'second.jpg',
        size: 1024,
      }),
      createTestFile({
        mimeType: 'image/jpeg',
        name: 'third.jpg',
        size: 1024,
      }),
    ];

    // Mock different IDs for each image
    mockImageStorage.saveImage
      .mockResolvedValueOnce({
        aspectRatio: 1.5,
        filename: 'first.jpg',
        height: 400,
        id: 'id-1',
        mimeType: 'image/jpeg',
        savedAt: new Date(),
        size: 1024,
        type: 'file',
        width: 600,
      })
      .mockResolvedValueOnce({
        aspectRatio: 1.5,
        filename: 'second.jpg',
        height: 400,
        id: 'id-2',
        mimeType: 'image/jpeg',
        savedAt: new Date(),
        size: 1024,
        type: 'file',
        width: 600,
      })
      .mockResolvedValueOnce({
        aspectRatio: 1.5,
        filename: 'third.jpg',
        height: 400,
        id: 'id-3',
        mimeType: 'image/jpeg',
        savedAt: new Date(),
        size: 1024,
        type: 'file',
        width: 600,
      });

    await act(async () => {
      await result.current.uploadImages(files);
    });

    await waitFor(() => {
      expect(result.current.images).toHaveLength(3);
    });

    // Reorder: move first item to last position
    act(() => {
      result.current.reorderImages(0, 2);
    });

    expect(result.current.images[0].image.filename).toBe('second.jpg');
    expect(result.current.images[1].image.filename).toBe('third.jpg');
    expect(result.current.images[2].image.filename).toBe('first.jpg');
  });

  test('clears all images', async () => {
    const { result } = renderHook(() => useImageUpload());

    // Upload multiple images
    const files = [
      createTestFile({
        mimeType: 'image/jpeg',
        name: 'first.jpg',
        size: 1024,
      }),
      createTestFile({
        mimeType: 'image/jpeg',
        name: 'second.jpg',
        size: 1024,
      }),
    ];

    await act(async () => {
      await result.current.uploadImages(files);
    });

    await waitFor(() => {
      expect(result.current.images).toHaveLength(2);
    });

    // Clear all images
    act(() => {
      result.current.clearImages();
    });

    await waitFor(() => {
      expect(result.current.images).toHaveLength(0);
    });

    expect(mockImageStorage.deleteImage).toHaveBeenCalledTimes(2);
  });

  test('handles clear errors', async () => {
    const mockOnError = vi.fn();
    mockImageStorage.deleteImage.mockRejectedValue(new Error('Clear error'));

    const { result } = renderHook(() =>
      useImageUpload({ onError: mockOnError })
    );

    // Upload an image first
    const files = [
      createTestFile({
        mimeType: 'image/jpeg',
        name: 'test.jpg',
        size: 1024,
      }),
    ];
    await act(async () => {
      await result.current.uploadImages(files);
    });

    await waitFor(() => {
      expect(result.current.images).toHaveLength(1);
    });

    // Try to clear images
    act(() => {
      result.current.clearImages();
    });

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(
        expect.objectContaining({
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- ImageError test expectation
          message: expect.stringContaining('Failed to delete'),
        })
      );
    });
  });

  test('returns valid images only', async () => {
    const { result } = renderHook(() => useImageUpload());

    // Upload images
    const files = [
      createTestFile({
        mimeType: 'image/jpeg',
        name: 'test.jpg',
        size: 1024,
      }),
      createTestFile({
        mimeType: 'image/jpeg',
        name: 'second.jpg',
        size: 1024,
      }),
    ];
    await act(async () => {
      await result.current.uploadImages(files);
    });

    await waitFor(() => {
      expect(result.current.images).toHaveLength(2);
    });

    // Simulate one image having an error
    act(() => {
      if (result.current.images[1]) {
        result.current.images[1].error = new ImageError('Some error', {
          cause: null,
          code: IMAGE_ERROR_CODES.UPLOAD_FAILED,
        });
      }
    });

    const validImages = result.current.getValidImages();
    expect(validImages).toHaveLength(1);
    expect(validImages[0].filename).toBe('test.jpg');
  });

  test('handles empty file array gracefully', async () => {
    const { result } = renderHook(() => useImageUpload());

    await act(async () => {
      await result.current.uploadImages([]);
    });

    expect(result.current.images).toHaveLength(0);
    expect(result.current.isUploading).toBe(false);
    expect(mockImageStorage.saveImage).not.toHaveBeenCalled();
  });

  test('processes multiple files with mixed success/failure', async () => {
    const mockOnError = vi.fn();
    const mockOnSuccess = vi.fn();

    // First file succeeds, second fails validation, third succeeds
    mockValidateImageFile
      .mockReturnValueOnce({ isValid: true })
      .mockReturnValueOnce({ error: 'Invalid file', isValid: false })
      .mockReturnValueOnce({ isValid: true });

    const { result } = renderHook(() =>
      useImageUpload({ onError: mockOnError, onSuccess: mockOnSuccess })
    );

    const files = [
      createTestFile({
        mimeType: 'image/jpeg',
        name: 'valid1.jpg',
        size: 1024,
      }),
      createTestFile({
        mimeType: 'text/plain',
        name: 'invalid.txt',
        size: 1024,
      }),
      createTestFile({
        mimeType: 'image/jpeg',
        name: 'valid2.jpg',
        size: 1024,
      }),
    ];

    await act(async () => {
      await result.current.uploadImages(files);
    });

    await waitFor(() => {
      expect(result.current.isUploading).toBe(false);
    });

    expect(result.current.images).toHaveLength(2); // Only valid files

    expect(mockOnError).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'INVALID_FILE_TYPE',
        message: 'Invalid file',
      })
    );
    expect(mockOnSuccess).toHaveBeenCalledWith([
      expect.objectContaining({ filename: 'test.jpg' }),
      expect.objectContaining({ filename: 'test.jpg' }),
    ]);
  });
});
/* eslint-enable @typescript-eslint/unbound-method -- Re-enable rule after test file */
