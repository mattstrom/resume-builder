// Browser shim for @nestjs/graphql — decorators are no-ops in the browser.

const noop = () => () => {};
const noopFn = () => {};

export const Field = noop;
export const ID = 'ID';
export const Float = 'Float';
export const Int = 'Int';
export const ObjectType = noop;
export const InputType = noop;
export const registerEnumType = noopFn;

export const OmitType = <T, K extends keyof T>(
	classRef: new (...args: unknown[]) => T,
	_keys: readonly K[],
) => classRef as unknown as new (...args: unknown[]) => Omit<T, K>;

export const PartialType = <T>(classRef: new (...args: unknown[]) => T) =>
	classRef as unknown as new (...args: unknown[]) => Partial<T>;

export const IntersectionType = <A, B>(
	a: new (...args: unknown[]) => A,
	_b: new (...args: unknown[]) => B,
) => a as unknown as new (...args: unknown[]) => A & B;

export const PickType = <T, K extends keyof T>(
	classRef: new (...args: unknown[]) => T,
	_keys: readonly K[],
) => classRef as unknown as new (...args: unknown[]) => Pick<T, K>;
