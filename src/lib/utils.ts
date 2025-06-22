import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { fromError, isZodErrorLike } from 'zod-validation-error';

/**
 *
 * @param inputs
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 *
 * @param args
 */
export function logError(...args: unknown[]): void {
  // TODO: Replace with zod v4 https://zod.dev/error-formatting?id=zprettifyerror
  console.error(
    ...args.map((x) => (isZodErrorLike(x) ? fromError(x).toString() : x))
  );
}
