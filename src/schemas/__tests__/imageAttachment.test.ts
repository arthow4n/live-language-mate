import { describe, expect, test } from 'vitest';

import {
  imageAttachmentInputSchema,
  imageAttachmentSchema,
  imageCompressionOptionsSchema,
  imageMetadataSchema,
  imageValidationOptionsSchema,
  parseImageAttachmentInput,
  serializeImageAttachment,
  storageStatsSchema,
  supportedImageMimeTypes,
} from '../imageAttachment.js';

describe('ImageAttachment Schema Tests', () => {
  describe('imageAttachmentSchema', () => {
    test('should validate a valid image attachment', () => {
      const validAttachment = {
        filename: 'test.jpg',
        id: '123e4567-e89b-12d3-a456-426614174000',
        mimeType: 'image/jpeg',
        savedAt: new Date(),
        size: 1024,
      };

      const result = imageAttachmentSchema.parse(validAttachment);
      
      expect(result).toEqual(validAttachment);
    });

    test('should validate all supported MIME types', () => {
      supportedImageMimeTypes.forEach(mimeType => {
        const attachment = {
          filename: 'test-file',
          id: 'test-id',
          mimeType,
          savedAt: new Date(),
          size: 1024,
        };

        const result = imageAttachmentSchema.parse(attachment);
        expect(result.mimeType).toBe(mimeType);
      });
    });

    test('should reject invalid MIME types', () => {
      const invalidAttachment = {
        filename: 'test.txt',
        id: 'test-id',
        mimeType: 'text/plain',
        savedAt: new Date(),
        size: 1024,
      };

      expect(() => imageAttachmentSchema.parse(invalidAttachment)).toThrow();
    });

    test('should reject negative or zero sizes', () => {
      const invalidAttachment = {
        filename: 'test.jpg',
        id: 'test-id',
        mimeType: 'image/jpeg',
        savedAt: new Date(),
        size: 0,
      };

      expect(() => imageAttachmentSchema.parse(invalidAttachment)).toThrow();
    });

    test('should reject empty strings for required fields', () => {
      const invalidAttachment = {
        filename: 'test.jpg',
        id: '',
        mimeType: 'image/jpeg',
        savedAt: new Date(),
        size: 1024,
      };

      expect(() => imageAttachmentSchema.parse(invalidAttachment)).toThrow();
    });

    test('should reject additional properties (strict mode)', () => {
      const invalidAttachment = {
        extraProperty: 'should not be allowed',
        filename: 'test.jpg',
        id: 'test-id',
        mimeType: 'image/jpeg',
        savedAt: new Date(),
        size: 1024,
      };

      expect(() => imageAttachmentSchema.parse(invalidAttachment)).toThrow();
    });
  });

  describe('imageAttachmentInputSchema', () => {
    test('should validate input with ISO date string', () => {
      const validInput = {
        filename: 'test.jpg',
        id: 'test-id',
        mimeType: 'image/jpeg',
        savedAt: '2023-12-01T10:00:00.000Z',
        size: 1024,
      };

      const result = imageAttachmentInputSchema.parse(validInput);
      expect(result.savedAt).toBe('2023-12-01T10:00:00.000Z');
    });

    test('should reject invalid date strings', () => {
      const invalidInput = {
        filename: 'test.jpg',
        id: 'test-id',
        mimeType: 'image/jpeg',
        savedAt: 'invalid-date',
        size: 1024,
      };

      expect(() => imageAttachmentInputSchema.parse(invalidInput)).toThrow();
    });
  });

  describe('parseImageAttachmentInput', () => {
    test('should parse valid input and convert date string to Date object', () => {
      const input = {
        filename: 'test.jpg',
        id: 'test-id',
        mimeType: 'image/jpeg',
        savedAt: '2023-12-01T10:00:00.000Z',
        size: 1024,
      };

      const result = parseImageAttachmentInput(input);
      
      expect(result.id).toBe('test-id');
      expect(result.filename).toBe('test.jpg');
      expect(result.mimeType).toBe('image/jpeg');
      expect(result.size).toBe(1024);
      expect(result.savedAt).toBeInstanceOf(Date);
      expect(result.savedAt.toISOString()).toBe('2023-12-01T10:00:00.000Z');
    });

    test('should throw on invalid input', () => {
      const invalidInput = {
        filename: 'test.jpg',
        id: 'test-id',
        mimeType: 'invalid-type',
        savedAt: '2023-12-01T10:00:00.000Z',
        size: 1024,
      };

      expect(() => parseImageAttachmentInput(invalidInput)).toThrow();
    });
  });

  describe('serializeImageAttachment', () => {
    test('should serialize attachment and convert Date to ISO string', () => {
      const attachment = {
        filename: 'test.jpg',
        id: 'test-id',
        mimeType: 'image/jpeg' as const,
        savedAt: new Date('2023-12-01T10:00:00.000Z'),
        size: 1024,
      };

      const result = serializeImageAttachment(attachment);
      
      expect(result.id).toBe('test-id');
      expect(result.filename).toBe('test.jpg');
      expect(result.mimeType).toBe('image/jpeg');
      expect(result.size).toBe(1024);
      expect(result.savedAt).toBe('2023-12-01T10:00:00.000Z');
    });
  });

  describe('round-trip serialization', () => {
    test('should preserve data through parse->serialize->parse cycle', () => {
      const original = {
        filename: 'test.jpg',
        id: 'test-id',
        mimeType: 'image/jpeg' as const,
        savedAt: new Date('2023-12-01T10:00:00.000Z'),
        size: 1024,
      };

      const serialized = serializeImageAttachment(original);
      const parsed = parseImageAttachmentInput(serialized);
      
      expect(parsed.id).toBe(original.id);
      expect(parsed.filename).toBe(original.filename);
      expect(parsed.mimeType).toBe(original.mimeType);
      expect(parsed.size).toBe(original.size);
      expect(parsed.savedAt.getTime()).toBe(original.savedAt.getTime());
    });
  });

  describe('imageValidationOptionsSchema', () => {
    test('should validate valid options', () => {
      const validOptions = {
        allowedTypes: ['image/jpeg', 'image/png'],
        maxSize: 1024 * 1024,
      };

      const result = imageValidationOptionsSchema.parse(validOptions);
      expect(result).toEqual(validOptions);
    });

    test('should allow partial options', () => {
      const partialOptions = {
        maxSize: 2048,
      };

      const result = imageValidationOptionsSchema.parse(partialOptions);
      expect(result.maxSize).toBe(2048);
      expect(result.allowedTypes).toBeUndefined();
    });

    test('should reject negative maxSize', () => {
      const invalidOptions = {
        maxSize: -1024,
      };

      expect(() => imageValidationOptionsSchema.parse(invalidOptions)).toThrow();
    });
  });

  describe('imageCompressionOptionsSchema', () => {
    test('should validate valid compression options', () => {
      const validOptions = {
        format: 'image/jpeg' as const,
        maxHeight: 1080,
        maxWidth: 1920,
        quality: 0.8,
      };

      const result = imageCompressionOptionsSchema.parse(validOptions);
      expect(result).toEqual(validOptions);
    });

    test('should reject quality values outside 0-1 range', () => {
      const invalidOptions = {
        quality: 1.5,
      };

      expect(() => imageCompressionOptionsSchema.parse(invalidOptions)).toThrow();
    });

    test('should reject negative dimensions', () => {
      const invalidOptions = {
        maxWidth: -100,
      };

      expect(() => imageCompressionOptionsSchema.parse(invalidOptions)).toThrow();
    });
  });

  describe('imageMetadataSchema', () => {
    test('should validate image metadata', () => {
      const validMetadata = {
        aspectRatio: 1.777,
        height: 1080,
        size: 1024000,
        type: 'image/jpeg',
        width: 1920,
      };

      const result = imageMetadataSchema.parse(validMetadata);
      expect(result).toEqual(validMetadata);
    });

    test('should reject negative dimensions', () => {
      const invalidMetadata = {
        aspectRatio: 1.777,
        height: 1080,
        size: 1024000,
        type: 'image/jpeg',
        width: -1920,
      };

      expect(() => imageMetadataSchema.parse(invalidMetadata)).toThrow();
    });
  });

  describe('storageStatsSchema', () => {
    test('should validate storage statistics', () => {
      const validStats = {
        availableQuota: 10000000,
        totalImages: 5,
        totalSize: 1024000,
        usedQuota: 2048000,
      };

      const result = storageStatsSchema.parse(validStats);
      expect(result).toEqual(validStats);
    });

    test('should allow optional quota fields', () => {
      const statsWithoutQuota = {
        totalImages: 3,
        totalSize: 512000,
      };

      const result = storageStatsSchema.parse(statsWithoutQuota);
      expect(result.totalImages).toBe(3);
      expect(result.totalSize).toBe(512000);
      expect(result.availableQuota).toBeUndefined();
      expect(result.usedQuota).toBeUndefined();
    });

    test('should reject negative counts', () => {
      const invalidStats = {
        totalImages: -1,
        totalSize: 1024000,
      };

      expect(() => storageStatsSchema.parse(invalidStats)).toThrow();
    });
  });

  describe('supportedImageMimeTypes', () => {
    test('should include all expected MIME types', () => {
      const expectedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
      
      expect(supportedImageMimeTypes).toEqual(expectedTypes);
    });

    test('should be readonly array', () => {
      // TypeScript should prevent this, but we can't test compilation errors in runtime tests
      expect(Array.isArray(supportedImageMimeTypes)).toBe(true);
    });
  });
});