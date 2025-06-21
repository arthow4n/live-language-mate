import type { z } from 'zod';

/**
 * Creates a strict parser function for a given Zod schema
 * Throws validation errors if data doesn't match schema
 */
export const createStrictParser =
  <T>(schema: z.ZodSchema<T>) =>
  (data: unknown): T =>
    schema.parse(data);

/**
 * Safely parses stored data from localStorage with schema validation
 * Returns null if key doesn't exist or data is invalid
 * Throws error if schema validation fails
 */
export const parseStoredData = <T>(
  key: string,
  schema: z.ZodSchema<T>
): null | T => {
  const stored = localStorage.getItem(key);
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored) as unknown;
    return schema.parse(parsed);
  } catch (error) {
    // Clear invalid data and re-throw for debugging
    localStorage.removeItem(key);
    throw new Error(
      `Invalid stored data for key "${key}": ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

/**
 * Validates API request body with schema
 * For use in Deno API handlers
 */
export const validateApiRequest = async <T>(
  req: Request,
  schema: z.ZodSchema<T>
): Promise<T> => {
  try {
    const body = (await req.json()) as unknown;
    return schema.parse(body);
  } catch (error) {
    throw new Error(
      `Invalid API request: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

/**
 * Type-safe localStorage setter with schema validation
 */
export const setStoredData = <T>(
  key: string,
  data: T,
  schema: z.ZodSchema<T>
): void => {
  // Validate data before storing
  const validated = schema.parse(data);
  localStorage.setItem(key, JSON.stringify(validated));
};
