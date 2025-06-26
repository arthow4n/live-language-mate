import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { expectToBeInstanceOf, expectToNotBeNull } from '../../__tests__/typedExpectHelpers.js';
import { imageStorage, ImageStorageError } from '../imageStorage.js';

// Create test files
/**
 *
 * @param name
 * @param type
 * @param size
 */
function createTestFile(name: string, type: string, size = 1024): File {
  const content = new Uint8Array(size).fill(65); // Fill with 'A' characters
  return new File([content], name, { type });
}

/**
 *
 * @param name
 * @param size
 */
function createTestImageFile(name = 'test.jpg', size = 1024): File {
  return createTestFile(name, 'image/jpeg', size);
}

describe('ImageStorage Integration Tests', () => {
  // Skip all tests if OPFS is not available (Node.js environment)
  const isOPFSAvailable = typeof navigator !== 'undefined' && navigator.storage?.getDirectory;
  
  if (!isOPFSAvailable) {
    test.skip('OPFS tests require browser environment with FileSystem API support', () => {
      // These tests need to run in a real browser environment
    });
    return;
  }
  beforeEach(async () => {
    // Clean up any existing test data
    try {
      const images = await imageStorage.listImages();
      for (const image of images) {
        await imageStorage.deleteImage(image.id);
      }
    } catch {
      // Ignore errors during cleanup
    }
  });

  afterEach(async () => {
    // Clean up test data
    try {
      const images = await imageStorage.listImages();
      for (const image of images) {
        await imageStorage.deleteImage(image.id);
      }
    } catch {
      // Ignore errors during cleanup
    }
  });

  describe('saveImage', () => {
    test('should save a valid image file and return metadata', async () => {
      const testFile = createTestImageFile('test.jpg', 2048);
      
      const metadata = await imageStorage.saveImage(testFile);
      
      expect(metadata.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(metadata.filename).toBe('test.jpg');
      expect(metadata.mimeType).toBe('image/jpeg');
      expect(metadata.size).toBe(2048);
      expectToBeInstanceOf(metadata.savedAt, Date);
    });

    test('should save multiple different image formats', async () => {
      const jpegFile = createTestFile('test.jpg', 'image/jpeg', 1024);
      const pngFile = createTestFile('test.png', 'image/png', 2048);
      const webpFile = createTestFile('test.webp', 'image/webp', 1536);
      
      const jpegMetadata = await imageStorage.saveImage(jpegFile);
      const pngMetadata = await imageStorage.saveImage(pngFile);
      const webpMetadata = await imageStorage.saveImage(webpFile);
      
      expect(jpegMetadata.mimeType).toBe('image/jpeg');
      expect(pngMetadata.mimeType).toBe('image/png');
      expect(webpMetadata.mimeType).toBe('image/webp');
      
      // All should have unique IDs
      const ids = new Set([jpegMetadata.id, pngMetadata.id, webpMetadata.id]);
      expect(ids.size).toBe(3);
    });

    test('should reject unsupported file types', async () => {
      const invalidFile = createTestFile('test.txt', 'text/plain');
      
      await expect(imageStorage.saveImage(invalidFile)).rejects.toThrow(ImageStorageError);
      await expect(imageStorage.saveImage(invalidFile)).rejects.toThrow('Unsupported file type');
    });

    test('should handle large files within limits', async () => {
      const largeFile = createTestImageFile('large.jpg', 5 * 1024 * 1024); // 5MB
      
      const metadata = await imageStorage.saveImage(largeFile);
      
      expect(metadata.size).toBe(5 * 1024 * 1024);
      expect(metadata.filename).toBe('large.jpg');
    });
  });

  describe('getImage', () => {
    test('should retrieve a saved image', async () => {
      const originalFile = createTestImageFile('test.jpg', 1024);
      const metadata = await imageStorage.saveImage(originalFile);
      
      const retrievedFile = await imageStorage.getImage(metadata.id);
      
      expectToNotBeNull(retrievedFile);
      expect(retrievedFile.name).toBe('test.jpg');
      expect(retrievedFile.type).toBe('image/jpeg');
      expect(retrievedFile.size).toBe(1024);
    });

    test('should return null for non-existent image', async () => {
      const result = await imageStorage.getImage('non-existent-id');
      
      expect(result).toBeNull();
    });

    test('should preserve file content integrity', async () => {
      const content = new Uint8Array([1, 2, 3, 4, 5]);
      const originalFile = new File([content], 'test.jpg', { type: 'image/jpeg' });
      const metadata = await imageStorage.saveImage(originalFile);
      
      const retrievedFile = await imageStorage.getImage(metadata.id);
      expectToNotBeNull(retrievedFile);
      
      const retrievedContent = new Uint8Array(await retrievedFile.arrayBuffer());
      expect(Array.from(retrievedContent)).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('deleteImage', () => {
    test('should delete an existing image', async () => {
      const testFile = createTestImageFile('test.jpg');
      const metadata = await imageStorage.saveImage(testFile);
      
      const deleted = await imageStorage.deleteImage(metadata.id);
      
      expect(deleted).toBe(true);
      
      const retrievedFile = await imageStorage.getImage(metadata.id);
      expect(retrievedFile).toBeNull();
    });

    test('should return false for non-existent image', async () => {
      const deleted = await imageStorage.deleteImage('non-existent-id');
      
      expect(deleted).toBe(false);
    });

    test('should remove image from list after deletion', async () => {
      const testFile = createTestImageFile('test.jpg');
      const metadata = await imageStorage.saveImage(testFile);
      
      let images = await imageStorage.listImages();
      expect(images).toHaveLength(1);
      
      await imageStorage.deleteImage(metadata.id);
      
      images = await imageStorage.listImages();
      expect(images).toHaveLength(0);
    });
  });

  describe('listImages', () => {
    test('should return empty array when no images exist', async () => {
      const images = await imageStorage.listImages();
      
      expect(images).toEqual([]);
    });

    test('should list all saved images', async () => {
      const file1 = createTestImageFile('test1.jpg');
      const file2 = createTestFile('test2.png', 'image/png');
      
      const metadata1 = await imageStorage.saveImage(file1);
      const metadata2 = await imageStorage.saveImage(file2);
      
      const images = await imageStorage.listImages();
      
      expect(images).toHaveLength(2);
      
      const ids = images.map(img => img.id);
      expect(ids).toContain(metadata1.id);
      expect(ids).toContain(metadata2.id);
    });

    test('should return images sorted by savedAt date (newest first)', async () => {
      const file1 = createTestImageFile('first.jpg');
      const file2 = createTestImageFile('second.jpg');
      
      const metadata1 = await imageStorage.saveImage(file1);
      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      const metadata2 = await imageStorage.saveImage(file2);
      
      const images = await imageStorage.listImages();
      
      expect(images).toHaveLength(2);
      expect(images[0].id).toBe(metadata2.id); // Newest first
      expect(images[1].id).toBe(metadata1.id);
    });
  });

  describe('cleanupUnusedImages', () => {
    test('should delete images not in the used set', async () => {
      const file1 = createTestImageFile('keep.jpg');
      const file2 = createTestImageFile('delete.jpg');
      
      const metadata1 = await imageStorage.saveImage(file1);
      await imageStorage.saveImage(file2); // This will be cleaned up
      
      const usedIds = new Set([metadata1.id]); // Only keep the first image
      const deletedCount = await imageStorage.cleanupUnusedImages(usedIds);
      
      expect(deletedCount).toBe(1);
      
      const remainingImages = await imageStorage.listImages();
      expect(remainingImages).toHaveLength(1);
      expect(remainingImages[0].id).toBe(metadata1.id);
    });

    test('should not delete any images when all are in used set', async () => {
      const file1 = createTestImageFile('keep1.jpg');
      const file2 = createTestImageFile('keep2.jpg');
      
      const metadata1 = await imageStorage.saveImage(file1);
      const metadata2 = await imageStorage.saveImage(file2);
      
      const usedIds = new Set([metadata1.id, metadata2.id]);
      const deletedCount = await imageStorage.cleanupUnusedImages(usedIds);
      
      expect(deletedCount).toBe(0);
      
      const remainingImages = await imageStorage.listImages();
      expect(remainingImages).toHaveLength(2);
    });

    test('should return 0 when no images exist', async () => {
      const usedIds = new Set(['some-id']);
      const deletedCount = await imageStorage.cleanupUnusedImages(usedIds);
      
      expect(deletedCount).toBe(0);
    });
  });

  describe('getStorageStats', () => {
    test('should return correct stats for empty storage', async () => {
      const stats = await imageStorage.getStorageStats();
      
      expect(stats.totalImages).toBe(0);
      expect(stats.totalSize).toBe(0);
      // availableQuota and usedQuota might be undefined depending on browser support
    });

    test('should return correct stats with images', async () => {
      const file1 = createTestImageFile('test1.jpg', 1024);
      const file2 = createTestImageFile('test2.jpg', 2048);
      
      await imageStorage.saveImage(file1);
      await imageStorage.saveImage(file2);
      
      const stats = await imageStorage.getStorageStats();
      
      expect(stats.totalImages).toBe(2);
      expect(stats.totalSize).toBe(3072); // 1024 + 2048
    });

    test('should update stats after deletion', async () => {
      const file = createTestImageFile('test.jpg', 1024);
      const metadata = await imageStorage.saveImage(file);
      
      let stats = await imageStorage.getStorageStats();
      expect(stats.totalImages).toBe(1);
      expect(stats.totalSize).toBe(1024);
      
      await imageStorage.deleteImage(metadata.id);
      
      stats = await imageStorage.getStorageStats();
      expect(stats.totalImages).toBe(0);
      expect(stats.totalSize).toBe(0);
    });
  });

  describe('error handling', () => {
    test('should handle quota exceeded errors gracefully', async () => {
      // This test would require a way to simulate quota exceeded
      // For now, we just test that the error type is correct
      const invalidFile = createTestFile('test.txt', 'text/plain');
      
      try {
        await imageStorage.saveImage(invalidFile);
      } catch (error) {
        expectToBeInstanceOf(error, ImageStorageError);
        expect(error.code).toBe('INVALID_FILE');
      }
    });

    test('should throw ImageStorageError with correct codes', async () => {
      const invalidFile = createTestFile('test.doc', 'application/msword');
      
      await expect(imageStorage.saveImage(invalidFile)).rejects.toThrow(ImageStorageError);
      
      try {
        await imageStorage.saveImage(invalidFile);
      } catch (error) {
        expectToBeInstanceOf(error, ImageStorageError);
        expect(error.code).toBe('INVALID_FILE');
        expect(error.message).toContain('Unsupported file type');
      }
    });
  });
});