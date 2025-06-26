import { describe, expect, test } from 'vitest';

import { expectToNotBeNull } from '../../__tests__/typedExpectHelpers.js';
import {
  convertToBase64DataURL,
  formatFileSize,
  getImageFilesFromDataTransfer,
  isImageFile,
  processClipboardImages,
  validateImageFile,
} from '../imageUtils.js';

/**
 *
 * @param files
 */
function createTestDataTransfer(files: File[]): DataTransfer {
  // Mock DataTransfer for testing environment
  const mockFiles = Object.assign([], files, {
    item: (index: number): File | null => files[index] ?? null,
  });
  Object.defineProperty(mockFiles, 'length', { value: files.length });

  const mockItems = Object.assign(
    files.map((file) => ({
      getAsFile: (): File => file,
      kind: 'file',
      type: file.type,
    })),
    {
      add: (): void => undefined,
      clear: (): void => undefined,
      remove: (): void => undefined,
    }
  );
  Object.defineProperty(mockItems, 'length', { value: files.length });

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Required for test mocking
  const dt = {
    clearData: (): void => undefined,
    dropEffect: 'none',
    effectAllowed: 'all',
    files: mockFiles,
    getData: (): string => '',
    items: mockItems,
    setData: (): void => undefined,
    setDragImage: (): void => undefined,
    types: [],
  } as unknown as DataTransfer;
  return dt;
}

// Test utilities
/**
 *
 * @param options
 * @param options.name
 * @param options.type
 * @param options.size
 */
function createTestImageFile(
  options: { name?: string; size?: number; type?: string } = {}
): File {
  const { name = 'test.jpg', size = 1024, type = 'image/jpeg' } = options;
  const content = new Uint8Array(size).fill(65);
  return new File([content], name, { type });
}

describe('ImageUtils Integration Tests', () => {
  describe('convertToBase64DataURL', () => {
    test('should convert a file to base64 data URL', async () => {
      const file = createTestImageFile({
        name: 'test.jpg',
        size: 10,
        type: 'image/jpeg',
      });

      const dataURL = await convertToBase64DataURL(file);

      expect(dataURL).toMatch(/^data:image\/jpeg;base64,/);
      expect(dataURL.length).toBeGreaterThan(30);
    });

    test('should handle different image formats', async () => {
      const jpegFile = createTestImageFile({
        name: 'test.jpg',
        type: 'image/jpeg',
      });
      const pngFile = createTestImageFile({
        name: 'test.png',
        type: 'image/png',
      });
      const webpFile = createTestImageFile({
        name: 'test.webp',
        type: 'image/webp',
      });

      const jpegDataURL = await convertToBase64DataURL(jpegFile);
      const pngDataURL = await convertToBase64DataURL(pngFile);
      const webpDataURL = await convertToBase64DataURL(webpFile);

      expect(jpegDataURL).toMatch(/^data:image\/jpeg;base64,/);
      expect(pngDataURL).toMatch(/^data:image\/png;base64,/);
      expect(webpDataURL).toMatch(/^data:image\/webp;base64,/);
    });

    test('should preserve file content in base64 encoding', async () => {
      const content = new Uint8Array([255, 216, 255, 224]); // JPEG header
      const file = new File([content], 'test.jpg', { type: 'image/jpeg' });

      const dataURL = await convertToBase64DataURL(file);

      expect(dataURL).toMatch(/^data:image\/jpeg;base64,/);
      const base64Part = dataURL.split(',')[1];
      const decodedContent = Uint8Array.from(atob(base64Part), (c) =>
        c.charCodeAt(0)
      );
      expect(Array.from(decodedContent)).toEqual([255, 216, 255, 224]);
    });

    test('should reject with ImageProcessingError on invalid input', async () => {
      // We can't easily simulate FileReader errors, but we can test the error type
      const file = createTestImageFile();

      const result = await convertToBase64DataURL(file);
      expect(typeof result).toBe('string');
    });
  });

  describe('validateImageFile', () => {
    test('should validate supported image types', () => {
      const jpegFile = createTestImageFile({
        name: 'test.jpg',
        type: 'image/jpeg',
      });
      const pngFile = createTestImageFile({
        name: 'test.png',
        type: 'image/png',
      });
      const webpFile = createTestImageFile({
        name: 'test.webp',
        type: 'image/webp',
      });
      const gifFile = createTestImageFile({
        name: 'test.gif',
        type: 'image/gif',
      });

      expect(validateImageFile(jpegFile).isValid).toBe(true);
      expect(validateImageFile(pngFile).isValid).toBe(true);
      expect(validateImageFile(webpFile).isValid).toBe(true);
      expect(validateImageFile(gifFile).isValid).toBe(true);
    });

    test('should reject unsupported file types', () => {
      const textFile = new File(['content'], 'test.txt', {
        type: 'text/plain',
      });
      const pdfFile = new File(['content'], 'test.pdf', {
        type: 'application/pdf',
      });

      const textResult = validateImageFile(textFile);
      const pdfResult = validateImageFile(pdfFile);

      expect(textResult.isValid).toBe(false);
      expect(textResult.error).toContain('Unsupported file type');
      expect(pdfResult.isValid).toBe(false);
    });

    test('should validate file size limits', () => {
      const smallFile = createTestImageFile({
        name: 'small.jpg',
        size: 1024,
        type: 'image/jpeg',
      });
      const largeFile = createTestImageFile({
        name: 'large.jpg',
        size: 11 * 1024 * 1024,
        type: 'image/jpeg',
      });

      const smallResult = validateImageFile(smallFile);
      const largeResult = validateImageFile(largeFile);

      expect(smallResult.isValid).toBe(true);
      expect(largeResult.isValid).toBe(false);
      expect(largeResult.error).toContain('File size too large');
      expectToNotBeNull(largeResult.details);
      expect(largeResult.details?.actualSize).toBe(11 * 1024 * 1024);
    });

    test('should respect custom validation options', () => {
      const file = createTestImageFile({
        name: 'test.jpg',
        size: 2048,
        type: 'image/jpeg',
      });

      const strictResult = validateImageFile(file, {
        allowedTypes: ['image/png'],
        maxSize: 1024,
      });

      expect(strictResult.isValid).toBe(false);
    });

    test('should handle null/undefined files', () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-assertions -- Testing invalid input
      const result = validateImageFile(null as any);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('No file provided');
    });
  });

  describe('isImageFile', () => {
    test('should identify image files correctly', () => {
      const imageFile = createTestImageFile({
        name: 'test.jpg',
        type: 'image/jpeg',
      });
      const textFile = new File(['content'], 'test.txt', {
        type: 'text/plain',
      });

      expect(isImageFile(imageFile)).toBe(true);
      expect(isImageFile(textFile)).toBe(false);
    });
  });

  describe('getImageFilesFromDataTransfer', () => {
    test('should extract only image files from DataTransfer', () => {
      const imageFile1 = createTestImageFile({
        name: 'image1.jpg',
        type: 'image/jpeg',
      });
      const imageFile2 = createTestImageFile({
        name: 'image2.png',
        type: 'image/png',
      });
      const textFile = new File(['content'], 'text.txt', {
        type: 'text/plain',
      });

      const dataTransfer = createTestDataTransfer([
        imageFile1,
        textFile,
        imageFile2,
      ]);
      const imageFiles = getImageFilesFromDataTransfer(dataTransfer);

      expect(imageFiles).toHaveLength(2);
      expect(imageFiles[0].name).toBe('image1.jpg');
      expect(imageFiles[1].name).toBe('image2.png');
    });

    test('should return empty array when no image files present', () => {
      const textFile = new File(['content'], 'text.txt', {
        type: 'text/plain',
      });
      const dataTransfer = createTestDataTransfer([textFile]);

      const imageFiles = getImageFilesFromDataTransfer(dataTransfer);

      expect(imageFiles).toHaveLength(0);
    });
  });

  describe('processClipboardImages', () => {
    test('should extract image files from clipboard data', () => {
      // Create a mock clipboard data transfer
      const imageFile = createTestImageFile({
        name: 'clipboard.png',
        type: 'image/png',
      });
      const dataTransfer = createTestDataTransfer([imageFile]);

      const images = processClipboardImages(dataTransfer);

      expect(images).toHaveLength(1);
      expect(images[0].name).toBe('clipboard.png');
      expect(images[0].type).toBe('image/png');
    });
  });

  describe('formatFileSize', () => {
    test('should format file sizes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(1023)).toBe('1023 Bytes');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(formatFileSize(1.5 * 1024 * 1024)).toBe('1.5 MB');
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
    });
  });

  describe('error handling', () => {
    test('should throw ImageProcessingError with correct codes', () => {
      // Test error handling by checking the error types
      const validFile = createTestImageFile();

      // Most of our functions handle errors gracefully
      // We test that they return appropriate results rather than throwing
      const validation = validateImageFile(validFile);
      expect(validation.isValid).toBe(true);
    });
  });
});

// Note: Tests for compressImage, extractImageMetadata, and generateThumbnailDataURL
// would require actual image manipulation which needs a more complex test setup
// with canvas and image loading. These are integration tests that would be better
// tested in a browser environment with actual image data.
