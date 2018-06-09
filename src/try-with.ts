///////////////////////////////////////////////////////////
/// Required type definitions
///////////////////////////////////////////////////////////

interface Disposable {
	dispose(): void;
}

interface Closeable {
	close(): void;
}

type Action<T> = (object: T) => void;

type CleanupFunction<T> = (object: T) => void;

///////////////////////////////////////////////////////////
/// Main implementation
///////////////////////////////////////////////////////////

export = tryWith;

function tryWith<T extends Disposable | Closeable>(object: T, action: Action<T>): void;

function tryWith<T>(object: T, action: Action<T>, cleanupFunction: CleanupFunction<T>): void;

function tryWith<T>(object: T, action: Action<T>, cleanupProperty: string | symbol): void;

function tryWith<T>(object: T, action: Action<T>, cleanupFnOrMethodName?: any): void {
	try {
		action(object);
	} finally {
		// todo: separate arguments.length < 3 and >= 3 into separate functions that resolve the cleanup
		const cleanup = resolveCleanup(object, cleanupFnOrMethodName, arguments.length < 3);
		performCleanup(object, cleanup);
	}
}

///////////////////////////////////////////////////////////
/// Helpers
///////////////////////////////////////////////////////////

function findBuiltInCleanupMethodName(object: any): 'dispose' | 'close' | null {
	if (typeof object.dispose === 'function') {
		return 'dispose';
	}
	if (typeof object.close === 'function') {
		return 'close';
	}
	return null;
}

function resolveCleanup(obj: any, cleanupFnOrMethodName: any, tryResolveProperty: boolean): CleanupFunction<any> | string | symbol | null {
	if (obj === null || obj === void 0) {
		return null;
	}

	const type = typeof cleanupFnOrMethodName;

	if (type === 'function') {
		return cleanupFnOrMethodName;
	}

	if (cleanupFnOrMethodName !== void 0) {
		if (type === 'symbol') {
			return cleanupFnOrMethodName;
		}
		if (type === 'string') {
			return cleanupFnOrMethodName;
		}
	}

	if (tryResolveProperty) {
		return findBuiltInCleanupMethodName(obj);
	}

	return null;
}

function performCleanup<T>(object: T, cleanupFnOrMethodName: CleanupFunction<T> | string | symbol | null): void {
	switch (typeof cleanupFnOrMethodName) {
		case 'symbol':
		case 'string':
			if (typeof object[cleanupFnOrMethodName as any] === 'function') {
				object[cleanupFnOrMethodName as any]();
			}
			break;
		case 'function':
			(cleanupFnOrMethodName as CleanupFunction<T>)(object);
			break;
	}
}
