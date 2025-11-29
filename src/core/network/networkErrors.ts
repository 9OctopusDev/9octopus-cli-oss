/**
 * Network-related error types and utilities
 */

export enum NetworkErrorType {
	CONNECTION_REFUSED = 'CONNECTION_REFUSED',
	TIMEOUT = 'TIMEOUT',
	DNS_RESOLUTION = 'DNS_RESOLUTION',
	SSL_ERROR = 'SSL_ERROR',
	NETWORK_UNREACHABLE = 'NETWORK_UNREACHABLE',
	SERVER_ERROR = 'SERVER_ERROR',
	SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
	RATE_LIMITED = 'RATE_LIMITED',
	AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
	UNKNOWN = 'UNKNOWN',
}

export class NetworkError extends Error {
	public readonly type: NetworkErrorType;
	public readonly originalError?: any;
	public readonly statusCode?: number;
	public readonly retryable: boolean;

	constructor(
		message: string,
		type: NetworkErrorType = NetworkErrorType.UNKNOWN,
		originalError?: any,
		statusCode?: number,
	) {
		super(message);
		this.name = 'NetworkError';
		this.type = type;
		this.originalError = originalError;
		this.statusCode = statusCode;
		this.retryable = NetworkErrorUtils.isRetryableErrorType(type);
	}

	/**
	 * Create a user-friendly error message
	 */
	public getUserMessage(): string {
		switch (this.type) {
			case NetworkErrorType.CONNECTION_REFUSED:
				return 'Unable to connect to the server. Please check your internet connection and try again.';
			case NetworkErrorType.TIMEOUT:
				return 'Request timed out. The server might be busy, please try again.';
			case NetworkErrorType.DNS_RESOLUTION:
				return 'Unable to resolve server address. Please check your internet connection.';
			case NetworkErrorType.SSL_ERROR:
				return 'Secure connection failed. Please check your network settings.';
			case NetworkErrorType.NETWORK_UNREACHABLE:
				return 'Network is unreachable. Please check your internet connection.';
			case NetworkErrorType.SERVER_ERROR:
				return 'Server error occurred. Please try again later.';
			case NetworkErrorType.SERVICE_UNAVAILABLE:
				return 'Service is temporarily unavailable. Please try again later.';
			case NetworkErrorType.RATE_LIMITED:
				return 'Too many requests. Please wait a moment before trying again.';
			case NetworkErrorType.AUTHENTICATION_FAILED:
				return 'Authentication failed. Please login again.';
			default:
				return this.message || 'An unexpected network error occurred.';
		}
	}
}

export class NetworkErrorUtils {
	/**
	 * Classify an error into a NetworkErrorType
	 */
	public static classifyError(error: any): NetworkErrorType {
		// Check error codes from Node.js
		if (error?.code) {
			switch (error.code) {
				case 'ECONNREFUSED':
					return NetworkErrorType.CONNECTION_REFUSED;
				case 'ETIMEDOUT':
				case 'ESOCKETTIMEDOUT':
					return NetworkErrorType.TIMEOUT;
				case 'ENOTFOUND':
				case 'EAI_AGAIN':
					return NetworkErrorType.DNS_RESOLUTION;
				case 'EPROTO':
				case 'UNABLE_TO_VERIFY_LEAF_SIGNATURE':
					return NetworkErrorType.SSL_ERROR;
				case 'ENETUNREACH':
				case 'EHOSTUNREACH':
					return NetworkErrorType.NETWORK_UNREACHABLE;
			}
		}

		// Check HTTP status codes
		if (error?.status || error?.statusCode) {
			const status = error.status || error.statusCode;
			if (status === 401 || status === 403) {
				return NetworkErrorType.AUTHENTICATION_FAILED;
			}
			if (status === 429) {
				return NetworkErrorType.RATE_LIMITED;
			}
			if (status === 503) {
				return NetworkErrorType.SERVICE_UNAVAILABLE;
			}
			if (status >= 500) {
				return NetworkErrorType.SERVER_ERROR;
			}
		}

		// Check error messages
		const message = error?.message?.toLowerCase() || '';
		if (message.includes('timeout')) {
			return NetworkErrorType.TIMEOUT;
		}
		if (message.includes('connection') && message.includes('refused')) {
			return NetworkErrorType.CONNECTION_REFUSED;
		}
		if (message.includes('network') || message.includes('unreachable')) {
			return NetworkErrorType.NETWORK_UNREACHABLE;
		}
		if (message.includes('dns') || message.includes('resolve')) {
			return NetworkErrorType.DNS_RESOLUTION;
		}

		return NetworkErrorType.UNKNOWN;
	}

	/**
	 * Create a NetworkError from any error
	 */
	public static fromError(error: any): NetworkError {
		const type = NetworkErrorUtils.classifyError(error);
		const message = error?.message || 'Unknown network error';
		const statusCode = error?.status || error?.statusCode;

		return new NetworkError(message, type, error, statusCode);
	}

	/**
	 * Check if an error type is retryable
	 */
	public static isRetryableErrorType(type: NetworkErrorType): boolean {
		return [
			NetworkErrorType.CONNECTION_REFUSED,
			NetworkErrorType.TIMEOUT,
			NetworkErrorType.DNS_RESOLUTION,
			NetworkErrorType.NETWORK_UNREACHABLE,
			NetworkErrorType.SERVER_ERROR,
			NetworkErrorType.SERVICE_UNAVAILABLE,
		].includes(type);
	}

	/**
	 * Check if an error is retryable
	 */
	public static isRetryableError(error: any): boolean {
		const type = NetworkErrorUtils.classifyError(error);
		return NetworkErrorUtils.isRetryableErrorType(type);
	}

	/**
	 * Get a user-friendly error message from any error
	 */
	public static getUserMessage(error: any): string {
		const networkError = NetworkErrorUtils.fromError(error);
		return networkError.getUserMessage();
	}

	/**
	 * Create a standardized error message for logging
	 */
	public static getLogMessage(error: any, context?: string): string {
		const type = NetworkErrorUtils.classifyError(error);
		const prefix = context ? `[${context}] ` : '';
		const statusInfo = error?.status ? ` (HTTP ${error.status})` : '';

		return `${prefix}Network Error [${type}]: ${
			error?.message || 'Unknown error'
		}${statusInfo}`;
	}
}

/**
 * Circuit breaker pattern for network requests
 */
export class CircuitBreaker {
	private failures: number = 0;
	private lastFailureTime: number = 0;
	private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

	constructor(
		private maxFailures: number = 5,
		private timeout: number = 60000, // 1 minute
	) {}

	/**
	 * Check if the circuit breaker allows requests
	 */
	public canExecute(): boolean {
		if (this.state === 'CLOSED') {
			return true;
		}

		if (this.state === 'OPEN') {
			if (Date.now() - this.lastFailureTime >= this.timeout) {
				this.state = 'HALF_OPEN';
				return true;
			}
			return false;
		}

		// HALF_OPEN state
		return true;
	}

	/**
	 * Record a successful execution
	 */
	public recordSuccess(): void {
		this.failures = 0;
		this.state = 'CLOSED';
	}

	/**
	 * Record a failed execution
	 */
	public recordFailure(): void {
		this.failures++;
		this.lastFailureTime = Date.now();

		if (this.failures >= this.maxFailures) {
			this.state = 'OPEN';
		}
	}

	/**
	 * Get current circuit breaker state
	 */
	public getState(): 'CLOSED' | 'OPEN' | 'HALF_OPEN' {
		return this.state;
	}

	/**
	 * Reset the circuit breaker
	 */
	public reset(): void {
		this.failures = 0;
		this.lastFailureTime = 0;
		this.state = 'CLOSED';
	}
}
