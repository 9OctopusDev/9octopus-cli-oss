export interface RetryConfig {
	maxAttempts: number;
	baseDelay: number;
	maxDelay: number;
	jitterPercent: number;
	retryCondition?: (error: any) => boolean;
}

export interface RetryResult<T> {
	success: boolean;
	result?: T;
	error?: Error;
	attempts: number;
	totalTime: number;
}

export class RetryService {
	private static readonly DEFAULT_CONFIG: RetryConfig = {
		maxAttempts: 3,
		baseDelay: 1000,
		maxDelay: 10000,
		jitterPercent: 25,
	};

	/**
	 * Check if an error should be retried based on common network conditions
	 */
	private static isRetryableError(error: any): boolean {
		// Network connectivity errors
		if (
			error?.code === 'ECONNREFUSED' ||
			error?.code === 'ETIMEDOUT' ||
			error?.code === 'ENOTFOUND' ||
			error?.code === 'ECONNRESET'
		) {
			return true;
		}

		// HTTP errors that should be retried
		if (error?.status || error instanceof Response) {
			const status = error.status || error.status;
			return (
				status === 408 || // Request Timeout
				status === 502 || // Bad Gateway
				status === 503 || // Service Unavailable
				status === 504 || // Gateway Timeout
				(status >= 500 && status <= 599) // Other 5xx errors
			);
		}

		// Fetch API network errors
		if (error instanceof TypeError && error.message.includes('fetch')) {
			return true;
		}

		// Generic network error messages
		const errorMessage = error?.message?.toLowerCase() || '';
		return (
			errorMessage.includes('network') ||
			errorMessage.includes('connection') ||
			errorMessage.includes('timeout') ||
			errorMessage.includes('unreachable')
		);
	}

	/**
	 * Check if an error should NOT be retried
	 */
	private static isNonRetryableError(error: any): boolean {
		// Authentication and authorization errors
		if (error?.status === 401 || error?.status === 403) {
			return true;
		}

		// Rate limiting errors
		if (error?.status === 429) {
			return true;
		}

		// Client errors (except 408)
		if (error?.status >= 400 && error?.status < 500 && error?.status !== 408) {
			return true;
		}

		// Specific error types that shouldn't be retried
		if (error?.name === 'AbortError') {
			return true;
		}

		return false;
	}

	/**
	 * Calculate delay with exponential backoff and jitter
	 */
	private static calculateDelay(attempt: number, config: RetryConfig): number {
		const exponentialDelay = config.baseDelay * Math.pow(2, attempt - 1);
		const cappedDelay = Math.min(exponentialDelay, config.maxDelay);

		// Add jitter to prevent thundering herd
		const jitterRange = cappedDelay * (config.jitterPercent / 100);
		const jitter = (Math.random() * 2 - 1) * jitterRange;

		return Math.max(0, cappedDelay + jitter);
	}

	/**
	 * Retry an async operation with configurable retry logic
	 */
	public static async retry<T>(
		operation: () => Promise<T>,
		config: Partial<RetryConfig> = {},
		context?: string,
	): Promise<T> {
		const finalConfig = {...RetryService.DEFAULT_CONFIG, ...config};
		let lastError: any;

		// Use custom retry condition if provided, otherwise use default logic
		const shouldRetry =
			finalConfig.retryCondition ||
			((error: any) => {
				return (
					RetryService.isRetryableError(error) &&
					!RetryService.isNonRetryableError(error)
				);
			});

		for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
			try {
				const result = await operation();

				// Log successful retry if it took more than 1 attempt
				if (attempt > 1 && context) {
				}

				return result;
			} catch (error) {
				lastError = error;

				// Don't retry if this is the last attempt
				if (attempt === finalConfig.maxAttempts) {
					break;
				}

				// Don't retry if error is not retryable
				if (!shouldRetry(error)) {
					break;
				}

				const delay = RetryService.calculateDelay(attempt, finalConfig);

				if (context) {
					console.warn(
						`⚠️ ${context} attempt ${attempt} failed: Retrying in ${Math.round(
							delay,
						)}ms...`,
					);
				}

				await new Promise(resolve => setTimeout(resolve, delay));
			}
		}

		// If we get here, all retries failed

		throw lastError;
	}

	/**
	 * Retry a fetch operation with default network retry logic
	 */
	public static async retryFetch(
		url: string | Request,
		options?: RequestInit,
		config: Partial<RetryConfig> = {},
		context?: string,
	): Promise<Response> {
		return RetryService.retry(
			async () => {
				const response = await fetch(url, options);

				// Check if response indicates a retryable error
				if (
					!response.ok &&
					RetryService.isRetryableError({status: response.status})
				) {
					const error = new Error(
						`HTTP ${response.status}: ${response.statusText}`,
					);
					(error as any).status = response.status;
					throw error;
				}

				return response;
			},
			config,
			context || `Fetch ${typeof url === 'string' ? url : url.url}`,
		);
	}

	/**
	 * Create a retry wrapper for any async function
	 */
	public static withRetry<T extends (...args: any[]) => Promise<any>>(
		fn: T,
		config: Partial<RetryConfig> = {},
		context?: string,
	): T {
		return (async (...args: any[]) => {
			return RetryService.retry(() => fn(...args), config, context || fn.name);
		}) as T;
	}
}
