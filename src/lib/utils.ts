import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { fromError, isZodErrorLike } from 'zod-validation-error';

/**
 *
 * @param inputs
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 *
 * @param args
 */
export function logError(...args: unknown[]) {
  console.error(
    ...args.map((x) => (isZodErrorLike(x) ? fromError(x).toString() : x))
  );
}
