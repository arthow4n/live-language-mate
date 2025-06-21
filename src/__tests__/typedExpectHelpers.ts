import { expect } from 'vitest';

/**
 * Type narrowing version of `.toBeInstanceOf()`.
 * Prefer this over `.toBeTruthy()`, `.toBeInstanceOf()`. or `instanceof` operator.
 * @param value
 * @param instanceType
 */
export function expectToBeInstanceOf<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generic function
  T extends abstract new (...args: any) => any,
>(value: unknown, instanceType: T): asserts value is InstanceType<T> {
  expect(value).toBeInstanceOf(instanceType);
}

/**
 * Type narrowing version of `.not.toBeNull()`.
 * Prefer this over `.toBeTruthy()` or `.not.toBeNull()`.
 * @param value
 */
export function expectToNotBeNull<T>(value: null | T): asserts value is T {
  expect(value).not.toBeNull();
}

/**
 * Type narrowing version of `.toBeDefined()`.
 * Prefer this over `.toBeTruthy()` or `.toBeDefined()`.
 * @param value
 */
export function expectToNotBeUndefined<T>(
  value: T | undefined
): asserts value is T {
  expect(value).toBeDefined();
}
