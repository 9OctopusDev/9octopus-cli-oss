import test from 'ava';
import {RetryService} from '../core/network/retryService.js';

test('RetryService retries operation on failure', async t => {
	let attempts = 0;
	const operation = async () => {
		attempts++;
		if (attempts < 3) {
			throw new Error('Network error');
		}
		return 'success';
	};

	const result = await RetryService.retry(operation, {
		maxAttempts: 3,
		baseDelay: 10, // Fast for test
		maxDelay: 100,
		jitterPercent: 0,
	});

	t.is(result, 'success');
	t.is(attempts, 3);
});

test('RetryService fails after max attempts', async t => {
	let attempts = 0;
	const operation = async () => {
		attempts++;
		throw new Error('Network error');
	};

	await t.throwsAsync(async () => {
		await RetryService.retry(operation, {
			maxAttempts: 3,
			baseDelay: 10,
			maxDelay: 100,
			jitterPercent: 0,
		});
	});

	t.is(attempts, 3);
});

test('RetryService respects retry condition', async t => {
	let attempts = 0;
	const operation = async () => {
		attempts++;
		const error = new Error('Fatal error');
		(error as any).fatal = true;
		throw error;
	};

	await t.throwsAsync(async () => {
		await RetryService.retry(operation, {
			maxAttempts: 3,
			baseDelay: 10,
			retryCondition: error => !error.fatal,
		});
	});

	t.is(attempts, 1); // Should not retry
});

test('RetryService.withRetry wraps function correctly', async t => {
	let attempts = 0;
	const operation = async (arg: string) => {
		attempts++;
		if (attempts < 2) throw new Error('Network error');
		return `success ${arg}`;
	};

	const wrapped = RetryService.withRetry(operation, {
		maxAttempts: 3,
		baseDelay: 10,
	});

	const result = await wrapped('test');
	t.is(result, 'success test');
	t.is(attempts, 2);
});
