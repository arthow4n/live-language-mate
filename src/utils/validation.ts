import type { z } from 'zod/v4';

/**
 * Creates a strict parser function for a given Zod schema
 * Throws validation errors if data doesn't match schema
 * @param schema
 */
export const createStrictParser =
  <T>(schema: z.ZodType<T>) =>
  (data: unknown): T =>
    schema.parse(data);

/**
 * Safely parses stored data from localStorage with schema validation
 * Returns null if key doesn't exist or data is invalid
 * Throws error if schema validation fails
 * @param key
 * @param schema
 */
export const parseStoredData = <T>(
  key: string,
  schema: z.ZodType<T>
): null | T => {
  const stored = localStorage.getItem(key);
  if (!stored) return null;

  try {
    const parsed: unknown = JSON.parse(stored);
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
 * @param req
 * @param schema
 */
export const validateApiRequest = async <T>(
  req: Request,
  schema: z.ZodType<T>
): Promise<T> => {
  try {
    const body: unknown = await req.json();
    return schema.parse(body);
  } catch (error) {
    throw new Error(
      `Invalid API request: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

/**
 * Type-safe localStorage setter with schema validation
 * @param options
 * @param options.key
 * @param options.data
 * @param options.schema
 */
export const setStoredData = <T>(options: {
  data: T;
  key: string;
  schema: z.ZodType<T>;
}): void => {
  const { data, key, schema } = options;
  // Validate data before storing
  const validated = schema.parse(data);
  localStorage.setItem(key, JSON.stringify(validated));
};
