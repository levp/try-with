///////////////////////////////////////////////////////////
/// Required type definitions.
///////////////////////////////////////////////////////////

export const DISPOSE_METHOD = 'dispose';
export const CLOSE_METHOD = 'close';

export interface Disposable {
	[DISPOSE_METHOD](): void;
}

export interface Closeable {
	[CLOSE_METHOD](): void;
}

export type Action<T> = (object: T) => void;

export type CleanupFunction<T> = (object: T) => void;

///////////////////////////////////////////////////////////
/// Main implementation with overload resolution.
///////////////////////////////////////////////////////////

export function tryWith<T extends Disposable | Closeable>(object: T, action: Action<T>): void;

export function tryWith<T>(object: T, action: Action<T>, cleanupFunction: CleanupFunction<T>): void;

export function tryWith<T>(object: T, action: Action<T>, cleanupProperty: string | symbol): void;

export function tryWith<T>(object: T, action: Action<T>, cleanupMethodOrName?: any): void {
	const cleanup = resolveDispose(object, cleanupMethodOrName, arguments.length < 3);

	try {
		action(object);
	} finally {
		disposeOf(object, cleanup);
	}
}

function getCleanupMethodName(object: any): typeof DISPOSE_METHOD | typeof CLOSE_METHOD | null {
	if (typeof object[DISPOSE_METHOD] === 'function') {
		return DISPOSE_METHOD;
	}
	if (typeof object[CLOSE_METHOD] === 'function') {
		return CLOSE_METHOD;
	}
	return null;
}

function resolveDispose(obj: any, disposeOrMethodName: any, tryResolveProperty: boolean): CleanupFunction<any> | string | symbol | null {
	if (obj === null || obj === void 0) {
		return null;
	}

	const type = typeof disposeOrMethodName;

	if (type === 'function') {
		return disposeOrMethodName;
	}

	if (disposeOrMethodName !== void 0) {
		if (type === 'symbol') {
			return disposeOrMethodName;
		}
		if (type === 'string') {
			return disposeOrMethodName;
		}
	}

	if (tryResolveProperty) {
		return getCleanupMethodName(obj);
	}

	return null;
}

///////////////////////////////////////////////////////////
/// Utilities
///////////////////////////////////////////////////////////

function disposeOf<T>(object: T, disposeOrMethodName: CleanupFunction<T> | string | symbol | null): void {
	switch (typeof disposeOrMethodName) {
		case 'symbol':
		case 'string':
			// todo: Remove ugly, duplicate type assertions.
			if (typeof (object as any)[(disposeOrMethodName as string | symbol)] === 'function') {
				(object as any)[(disposeOrMethodName as string | symbol)]();
			}
			break;
		case 'function':
			(disposeOrMethodName as CleanupFunction<T>)(object);
			break;
	}
}
