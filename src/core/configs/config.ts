import {RetryConfig} from '../network/retryService.js';
import envConfig from '../config.js';

export interface AuthConfig {
	auth0Domain: string;
	auth0ClientId: string;
	auth0Audience: string;
	redirectUri: string;
	scopes: string[];
}

export interface NetworkConfig {
	retry: RetryConfig;
	connectionTimeout: number;
	requestTimeout: number;
}

export interface AppConfig {
	baseURL: string;
	auth: AuthConfig;
	authEnabled: boolean;
	environment: 'development' | 'production';
	network: NetworkConfig;
}

export class AuthConfigManager {
	private static instance: AuthConfigManager;
	private config: AppConfig;

	private constructor() {
		this.config = this.loadConfig();
	}

	public static getInstance(): AuthConfigManager {
		if (!AuthConfigManager.instance) {
			AuthConfigManager.instance = new AuthConfigManager();
		}
		return AuthConfigManager.instance;
	}

	private loadConfig(): AppConfig {
		const authEnabled = envConfig.getSetting('AUTH_ENABLED') !== 'false';
		const environment =
			(envConfig.getSetting('NODE_ENV') as 'development' | 'production') ||
			'development';

		return {
			baseURL:
				envConfig.getSetting('OCTOPUS_API_URL') || 'http://localhost:5000/api',
			authEnabled,
			environment,
			auth: {
				auth0Domain:
					envConfig.getSetting('AUTH0_DOMAIN') || 'your-domain.auth0.com',
				auth0ClientId:
					envConfig.getSetting('AUTH0_CLIENT_ID') || 'your-client-id',
				auth0Audience:
					envConfig.getSetting('AUTH0_AUDIENCE') || 'https://your-api.com',
				redirectUri: 'http://localhost:8080/callback',
				scopes: ['openid', 'profile', 'email', 'offline_access'],
			},
			network: {
				retry: {
					maxAttempts: parseInt(
						envConfig.getSetting('NETWORK_RETRY_MAX_ATTEMPTS') || '3',
					),
					baseDelay: parseInt(
						envConfig.getSetting('NETWORK_RETRY_BASE_DELAY') || '1000',
					),
					maxDelay: parseInt(
						envConfig.getSetting('NETWORK_RETRY_MAX_DELAY') || '10000',
					),
					jitterPercent: parseInt(
						envConfig.getSetting('NETWORK_RETRY_JITTER_PERCENT') || '25',
					),
				},
				connectionTimeout: parseInt(
					envConfig.getSetting('NETWORK_CONNECTION_TIMEOUT') || '30000',
				),
				requestTimeout: parseInt(
					envConfig.getSetting('NETWORK_REQUEST_TIMEOUT') || '60000',
				),
			},
		};
	}

	public getConfig(): AppConfig {
		return this.config;
	}

	public getAuthConfig(): AuthConfig {
		return this.config.auth;
	}

	public getNetworkConfig(): NetworkConfig {
		return this.config.network;
	}

	public getRetryConfig(): RetryConfig {
		return this.config.network.retry;
	}

	public isAuthEnabled(): boolean {
		return this.config.authEnabled;
	}

	public getBaseURL(): string {
		return this.config.baseURL;
	}

	public isDevelopment(): boolean {
		return this.config.environment === 'development';
	}

	public isProduction(): boolean {
		return this.config.environment === 'production';
	}

	// Allow runtime configuration updates
	public updateConfig(updates: Partial<AppConfig>): void {
		this.config = {...this.config, ...updates};
	}

	public updateAuthConfig(updates: Partial<AuthConfig>): void {
		this.config.auth = {...this.config.auth, ...updates};
	}
}
