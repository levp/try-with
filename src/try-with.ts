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

/**
 * Invokes `action`, passing `object` as an argument.
 * After `action` is finished (whether successfully or by an error being thrown), if `object` has a "dispose" property
 * and it's a function, then `object.dispose` will be called. Otherwise, if `object` has a "close" property and it's a
 * function, then `object.close` will be called.
 * If `object` has neither of the above two properties then no cleanup logic will be performed.
 *
 * If `action` has thrown an error, it will continue propagating after any cleanup logic is done.
 *
 * Note: If an error is thrown by the cleanup logic the error from `action` will be lost.
 *
 * @param {T} object An object that will be passed to `object` and on which cleanup will be performed.
 * @param {Action<T extends Disposable | Closeable>} action A function that could throw an error and should thus be
 * called in a cleanup-guaranteed context.
 */
function tryWith<T extends Disposable | Closeable>(object: T, action: Action<T>): void;

/**
 * Invokes `action`, passing `object` as an argument.
 * After `action` is finished (whether successfully or by an error being thrown), if `cleanupFunction` is a function
 * then it will be invoked and `object` will be passed to it as an argument.
 *
 * If `action` has thrown an error, it will continue propagating after any cleanup logic is done.
 *
 * Note: If an error is thrown by the cleanup logic the error from `action` will be lost.
 *
 * @param {T} object An object that will be passed to `object` and on which cleanup will be performed.
 * @param {Action<T extends Disposable | Closeable>} action A function that could throw an error and should thus be
 * called in a cleanup-guaranteed context.
 * @param {CleanupFunction<T>} cleanupFunction A function that performs cleanup logic.
 */
function tryWith<T>(object: T, action: Action<T>, cleanupFunction: CleanupFunction<T>): void;

/**
 * Invokes `action`, passing `object` as an argument.
 * After `action` is finished (whether successfully or by an error being thrown), if `object` has a property with the
 * key `cleanupProperty` and it's a function, then it will be invoked with `object` being passed to it as `this`.
 *
 * If `action` has thrown an error, it will continue propagating after any cleanup logic is done.
 *
 * Note: If an error is thrown by the cleanup logic the error from `action` will be lost.
 *
 * @param {T} object An object that will be passed to `object` and on which cleanup will be performed.
 * @param {Action<T extends Disposable | Closeable>} action A function that could throw an error and should thus be
 * called in a cleanup-guaranteed context.
 * @param {string | symbol} cleanupProperty
 */
function tryWith<T>(object: T, action: Action<T>, cleanupProperty: string | symbol): void;

function tryWith<T>(object: T, action: Action<T>, cleanupFnOrMethodName?: CleanupFunction<T> | string | symbol): void {
	try {
		action(object);
	} finally {
		if (arguments.length < 3) {
			callBuiltInCleanup(object);
		} else {
			callCustomCleanup(object, cleanupFnOrMethodName);
		}
	}
}

///////////////////////////////////////////////////////////
/// Helpers
///////////////////////////////////////////////////////////

function callBuiltInCleanup(object: any): void {
	if (object == null) {
		return;
	}
	if (typeof object.dispose === 'function') {
		object.dispose();
	} else if (typeof object.close === 'function') {
		object.close();
	}
}

function callCustomCleanup<T>(object: T, cleanupFnOrMethodName: CleanupFunction<T> | string | symbol | undefined): void {
	switch (typeof cleanupFnOrMethodName) {
		case 'string':
		case 'symbol':
			if (object != null && typeof object[cleanupFnOrMethodName as string | symbol] === 'function') {
				object[cleanupFnOrMethodName as string | symbol]();
			}
			break;
		case 'function':
			(cleanupFnOrMethodName as CleanupFunction<T>)(object);
			break;
	}
}
