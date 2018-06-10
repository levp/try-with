'use strict';

const assert = require('assert');
const tryWith = require('../dist/try-with');

const eq = assert.strictEqual;

///////////////////////////////////////////////////////////
/// Tests
///////////////////////////////////////////////////////////

describe('try-with', () => {
	///////////////////////////////////////////////////////////////////////////
	describe('no error thrown during execution', () => {
		it('dispose after end', () => {
			const item = new DisposableItem();
			tryWith(item, noop);
			eq(item.isDisposed, true);
		});

		it('close after end, if no dispose', () => {
			const item = new CloseableItem();
			tryWith(item, noop);
			eq(item.isClosed, true);
		});

		it('dispose but not cancel, if both are defined', () => {
			const item = new DisposableAndCloseableItem();
			tryWith(item, noop);
			eq(item.isDisposed, true);
			eq(item.isClosed, false);
		});

		it('cleanup via custom method name', () => {
			const item = new CancelableCustom();
			tryWith(item, noop, 'cancel');
			eq(item.isCanceled, true);
			eq(item.isDisposed, false);
			eq(item.isClosed, false);
		});

		it('cleanup via custom function', () => {
			let disposed = false;
			let executed = false;
			const obj = {};
			tryWith(obj, () => {
				executed = true;
				eq(disposed, false);
			}, () => {
				eq(executed, true);
				disposed = true;
			});
			eq(executed, true);
			eq(disposed, true);
		});
	});
	///////////////////////////////////////////////////////////////////////////
	describe('error thrown during execution', () => {
		it('dispose on error', () => {
			const item = new DisposableItem();
			assert.throws(() => {
				tryWith(item, noopThrow);
			});
			eq(item.isDisposed, true);
		});

		it('close on error, if no dispose', () => {
			const item = new CloseableItem();
			assert.throws(() => {
				tryWith(item, noopThrow);
			});
			eq(item.isClosed, true);
		});

		it('dispose but not cancel on error, if both dispose', () => {
			const item = new DisposableAndCloseableItem();
			assert.throws(() => {
				tryWith(item, noopThrow);
			});
			eq(item.isDisposed, true);
			eq(item.isClosed, false);
		});
		it('cleanup via custom method name on error', () => {
			const item = new CancelableCustom();
			assert.throws(() => {
				tryWith(item, noopThrow, 'cancel');
			});
			eq(item.isCanceled, true);
			eq(item.isDisposed, false);
			eq(item.isClosed, false);
		});

		it('cleanup via custom function on error', () => {
			let disposed = false;
			let executed = false;
			const obj = {};
			assert.throws(() => {
				tryWith(obj, () => {
					executed = true;
					eq(disposed, false);
					throw 'Something?';
				}, () => {
					eq(executed, true);
					disposed = true;
				});
			});
			eq(executed, true);
			eq(disposed, true);
		});

		it('ensure original error is kept', () => {
			const msg = 'abc123';
			let error;
			try {
				tryWith(null, () => {
					throw msg;
				});
			} catch (thrown) {
				error = thrown;
			}
			eq(error, msg);
		});
	});
	///////////////////////////////////////////////////////////////////////////
	describe('misc', () => {
		it('correct action argument', () => {
			let o = {};
			tryWith(o, (object) => eq(o, object));
			o = 5;
			tryWith(o, (object) => eq(o, object));
			o = null;
			tryWith(o, (object) => eq(o, object));
			o = undefined;
			tryWith(o, (object) => eq(o, object));
		});

		it('correct argument in custom cleanup function', () => {
			let o = {};
			tryWith(o, noop, (object) => eq(o, object));
			o = 5;
			tryWith(o, noop, (object) => eq(o, object));
			o = null;
			tryWith(o, noop, (object) => eq(o, object));
			o = undefined;
			tryWith(o, noop, (object) => eq(o, object));
		});

		it('correct `this` in dispose/close', () => {
			let objDispose = {
				isDisposed: false,
				dispose() {
					eq(this, objDispose);
					this.isDisposed = true;
				}
			};
			tryWith(objDispose, noop);
			eq(objDispose.isDisposed, true);

			let objClose = {
				isClosed: false,
				close() {
					eq(this, objClose);
					this.isClosed = true;
				}
			};
			tryWith(objClose, noop);
			eq(objClose.isClosed, true);
		});

		it('correct `this` in custom cleanup function', () => {
			const cleanupFnName = 'cleanStuffUp@!#';
			let isCleaned = false;
			let o = {
				[cleanupFnName]() {
					eq(this, o);
					isCleaned = true;
				}
			};
			tryWith(o, noop, cleanupFnName);
			eq(isCleaned, true);
		});
	});
	///////////////////////////////////////////////////////////////////////////
	describe('edge cases', () => {
		it('throw if argument is not a function', () => {
			assert.throws(() => {
				tryWith(0, {});
				tryWith(0, null);
				tryWith(0, undefined);
			});
		});

		it('non-objects (primitives) as values', () => {
			tryWith(0, noop);
			tryWith(1, noop);
			tryWith(true, noop);
			tryWith(false, noop);
			tryWith('', noop);
			tryWith('123', noop);
			tryWith(Symbol('abc'), noop);
		});

		it('function as value', () => {
			tryWith(noop, noop);
			tryWith(new Function(''), noop);
		});

		it('null and undefined', () => {
			tryWith(null, noop);
			tryWith(undefined, noop);
		});

		it('dispose/cancel methods should not be called if third argument is specified', () => {
			const item = new DisposableAndCloseableItem();

			tryWith(item, noop, 'stuff');
			tryWith(item, noop, null);
			tryWith(item, noop, undefined);
			eq(item.isDisposed, false);
			eq(item.isClosed, false);

			tryWith(item, noop);
			eq(item.isDisposed, true);
			eq(item.isClosed, false);

			tryWith(item, noop, 'close');
			eq(item.isDisposed, true);
			eq(item.isClosed, true);
		});

		it('should dispose/cancel correctly even when dispose/cancel is specified manually', () => {
			const item = new MultiCleanup();

			eq(item.isDisposed, 0);
			eq(item.isClosed, 0);
			eq(item.isCanceled, 0);

			tryWith(item, noop);
			eq(item.isDisposed, 1);
			eq(item.isClosed, 0);
			eq(item.isCanceled, 0);

			tryWith(item, noop, 'close');
			eq(item.isDisposed, 1);
			eq(item.isClosed, 1);
			eq(item.isCanceled, 0);

			tryWith(item, noop, 'dispose');
			eq(item.isDisposed, 2);
			eq(item.isClosed, 1);
			eq(item.isCanceled, 0);

			tryWith(item, noop, 'cancel');
			eq(item.isDisposed, 2);
			eq(item.isClosed, 1);
			eq(item.isCanceled, 1);

			tryWith(item, noop, 'nothing');
			eq(item.isDisposed, 2);
			eq(item.isClosed, 1);
			eq(item.isCanceled, 1);
		});
	});
	///////////////////////////////////////////////////////////////////////////
});

///////////////////////////////////////////////////////////
/// Utilities
///////////////////////////////////////////////////////////

function noop() {
}

function noopThrow() {
	throw new Error('noop');
}

///////////////////////////////////////////////////////////
/// Specific implementations
///////////////////////////////////////////////////////////

class DisposableItem {
	constructor() {
		this.isDisposed = false;
	}

	dispose() {
		this.isDisposed = true;
	}
}

class CloseableItem {
	constructor() {
		this.isClosed = false;
	}

	close() {
		this.isClosed = true;
	}
}

class DisposableAndCloseableItem {
	constructor() {
		this.isDisposed = false;
		this.isClosed = false;
	}

	dispose() {
		this.isDisposed = true;
	}

	close() {
		this.isClosed = true;
	}
}

class CancelableCustom {
	constructor() {
		this.isCanceled = false;
		this.isDisposed = false;
		this.isClosed = false;
	}

	cancel() {
		this.isCanceled = true;
	}
}

class MultiCleanup {
	constructor() {
		this.isDisposed = 0;
		this.isClosed = 0;
		this.isCanceled = 0;
	}

	dispose() {
		this.isDisposed++;
	}

	close() {
		this.isClosed++;
	}

	cancel() {
		this.isCanceled++;
	}
}
