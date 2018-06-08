'use strict';

const assert = require('assert');
const {tryWith} = require('../dist/try-with');

///////////////////////////////////////////////////////////
/// Disposable implementations
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

///////////////////////////////////////////////////////////
/// Tests
///////////////////////////////////////////////////////////

describe('try-with', () => {
	///////////////////////////////////////////////////////////////////////////
	describe('no error thrown during execution', () => {
		it('dispose after end', () => {
			const item = new DisposableItem();
			tryWith(item, noop);
			assert.strictEqual(item.isDisposed, true);
		});

		it('close after end, if no dispose', () => {
			const item = new CloseableItem();
			tryWith(item, noop);
			assert.strictEqual(item.isClosed, true);
		});

		it('dispose but not cancel, if both are defined', () => {
			const item = new DisposableAndCloseableItem();
			tryWith(item, noop);
			assert.strictEqual(item.isDisposed, true);
			assert.strictEqual(item.isClosed, false);
		});

		it('cleanup via custom method name', () => {
			const item = new CancelableCustom();
			tryWith(item, noop, 'cancel');
			assert.strictEqual(item.isCanceled, true);
			assert.strictEqual(item.isDisposed, false);
			assert.strictEqual(item.isClosed, false);
		});

		it('cleanup via custom function', () => {
			let disposed = false;
			let executed = false;
			const obj = {};
			tryWith(obj, () => {
				executed = true;
				assert.strictEqual(disposed, false);
			}, () => {
				assert.strictEqual(executed, true);
				disposed = true;
			});
			assert.strictEqual(executed, true);
			assert.strictEqual(disposed, true);
		});
	});
	///////////////////////////////////////////////////////////////////////////
	describe('error thrown during execution', () => {
		it('dispose on error', () => {
			const item = new DisposableItem();
			assert.throws(() => {
				tryWith(item, noopThrow);
			});
			assert.strictEqual(item.isDisposed, true);
		});

		it('close on error, if no dispose', () => {
			const item = new CloseableItem();
			assert.throws(() => {
				tryWith(item, noopThrow);
			});
			assert.strictEqual(item.isClosed, true);
		});

		it('dispose but not cancel on error, if both dispose', () => {
			const item = new DisposableAndCloseableItem();
			assert.throws(() => {
				tryWith(item, noopThrow);
			});
			assert.strictEqual(item.isDisposed, true);
			assert.strictEqual(item.isClosed, false);
		});
		it('cleanup via custom method name on error', () => {
			const item = new CancelableCustom();
			assert.throws(() => {
				tryWith(item, noopThrow, 'cancel');
			});
			assert.strictEqual(item.isCanceled, true);
			assert.strictEqual(item.isDisposed, false);
			assert.strictEqual(item.isClosed, false);
		});

		it('cleanup via custom function on error', () => {
			let disposed = false;
			let executed = false;
			const obj = {};
			assert.throws(() => {
				tryWith(obj, () => {
					executed = true;
					assert.strictEqual(disposed, false);
					throw 'Something?';
				}, () => {
					assert.strictEqual(executed, true);
					disposed = true;
				});
			});
			assert.strictEqual(executed, true);
			assert.strictEqual(disposed, true);
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
			assert.strictEqual(error, msg);
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
			assert.strictEqual(item.isDisposed, false);
			assert.strictEqual(item.isClosed, false);

			tryWith(item, noop);
			assert.strictEqual(item.isDisposed, true);
			assert.strictEqual(item.isClosed, false);

			tryWith(item, noop, 'close');
			assert.strictEqual(item.isDisposed, true);
			assert.strictEqual(item.isClosed, true);
		});

		it('should dispose/cancel correctly even when dispose/cancel is specified manually', () => {
			const item = new MultiCleanup();

			assert.strictEqual(item.isDisposed, 0);
			assert.strictEqual(item.isClosed, 0);
			assert.strictEqual(item.isCanceled, 0);

			tryWith(item, noop);
			assert.strictEqual(item.isDisposed, 1);
			assert.strictEqual(item.isClosed, 0);
			assert.strictEqual(item.isCanceled, 0);

			tryWith(item, noop, 'close');
			assert.strictEqual(item.isDisposed, 1);
			assert.strictEqual(item.isClosed, 1);
			assert.strictEqual(item.isCanceled, 0);

			tryWith(item, noop, 'dispose');
			assert.strictEqual(item.isDisposed, 2);
			assert.strictEqual(item.isClosed, 1);
			assert.strictEqual(item.isCanceled, 0);

			tryWith(item, noop, 'cancel');
			assert.strictEqual(item.isDisposed, 2);
			assert.strictEqual(item.isClosed, 1);
			assert.strictEqual(item.isCanceled, 1);

			tryWith(item, noop, 'nothing');
			assert.strictEqual(item.isDisposed, 2);
			assert.strictEqual(item.isClosed, 1);
			assert.strictEqual(item.isCanceled, 1);
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
