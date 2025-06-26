import { z } from 'zod/v4';

/**
 * Type-safe test file factory without type assertions
 * @param options
 * @param options.mimeType
 * @param options.name
 * @param options.size
 */
export function createTestFile(options: {
  mimeType: string;
  name: string;
  size: number;
}): File {
  const file = new File(['test content'], options.name, {
    type: options.mimeType,
  });
  Object.defineProperty(file, 'size', {
    configurable: false,
    enumerable: true,
    value: options.size,
    writable: false,
  });
  return file;
}

/**
 * Schema for validating unknown test data
 */
export const TestFileSchema = z.strictObject({
  name: z.string(),
  size: z.number(),
  type: z.string(),
});

/**
 * Type-safe validation helper for test data
 * @param data
 */
export function validateTestFile(data: unknown): File | null {
  const result = TestFileSchema.safeParse(data);
  if (!result.success) {
    return null;
  }

  return createTestFile({
    mimeType: result.data.type,
    name: result.data.name,
    size: result.data.size,
  });
}
