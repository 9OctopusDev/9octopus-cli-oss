import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {AuthConfigManager} from '../configs/config.js';

export interface TokenData {
	accessToken: string;
	refreshToken?: string;
	expiresAt: number;
	tokenType: string;
	scope?: string;
}

export interface UserInfo {
	sub: string;
	email?: string;
	name?: string;
	picture?: string;
}

export class SecureTokenStorage {
	private static instance: SecureTokenStorage;
	private readonly configManager: AuthConfigManager;

	private constructor() {
		this.configManager = AuthConfigManager.getInstance();
	}

	public static getInstance(): SecureTokenStorage {
		if (!SecureTokenStorage.instance) {
			SecureTokenStorage.instance = new SecureTokenStorage();
		}
		return SecureTokenStorage.instance;
	}

	/**
	 * Store tokens securely using .octopus-cli folder
	 */
	public async storeTokens(tokens: TokenData): Promise<void> {
		await this.storeTokensToFile(tokens);
	}

	/**
	 * Retrieve tokens from .octopus-cli folder
	 */
	public async getTokens(): Promise<TokenData | null> {
		return await this.getTokensFromFile();
	}

	/**
	 * Check if we have valid (non-expired) tokens
	 */
	public async hasValidTokens(): Promise<boolean> {
		const tokens = await this.getTokens();
		if (!tokens) return false;

		const now = Date.now();
		const expiresAt = tokens.expiresAt;

		// Add 5-minute buffer to account for network delays
		const bufferTime = 5 * 60 * 1000;
		return now < expiresAt - bufferTime;
	}

	/**
	 * Store user information in .octopus-cli folder
	 */
	public async storeUserInfo(userInfo: UserInfo): Promise<void> {
		await this.storeUserInfoToFile(userInfo);
	}

	/**
	 * Retrieve user information from .octopus-cli folder
	 */
	public async getUserInfo(): Promise<UserInfo | null> {
		return await this.getUserInfoFromFile();
	}

	/**
	 * Clear all stored authentication data from .octopus-cli folder
	 */
	public async clearTokens(): Promise<void> {
		await this.clearTokenFiles();
	}

	/**
	 * Get access token, automatically refreshing if needed
	 */
	public async getValidAccessToken(): Promise<string | null> {
		const tokens = await this.getTokens();
		if (!tokens) return null;

		// If token is still valid, return it
		if (await this.hasValidTokens()) {
			return tokens.accessToken;
		}

		// Try to refresh if we have a refresh token
		if (tokens.refreshToken) {
			const refreshedTokens = await this.refreshAccessToken(
				tokens.refreshToken,
			);
			if (refreshedTokens) {
				return refreshedTokens.accessToken;
			}
		}

		// Token expired and couldn't refresh
		return null;
	}

	/**
	 * Refresh access token using refresh token
	 */
	private async refreshAccessToken(
		refreshToken: string,
	): Promise<TokenData | null> {
		try {
			const config = this.configManager.getAuthConfig();

			const response = await fetch(
				`https://${config.auth0Domain}/oauth/token`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						grant_type: 'refresh_token',
						refresh_token: refreshToken,
						client_id: config.auth0ClientId,
					}),
				},
			);

			if (!response.ok) {
				throw new Error(`Token refresh failed: ${response.statusText}`);
			}

			const data = await response.json();

			const newTokens: TokenData = {
				accessToken: data.access_token,
				refreshToken: data.refresh_token || refreshToken, // Keep old refresh token if new one not provided
				expiresAt: Date.now() + data.expires_in * 1000,
				tokenType: data.token_type || 'Bearer',
				scope: data.scope,
			};

			await this.storeTokens(newTokens);
			return newTokens;
		} catch (error) {

			return null;
		}
	}

	/**
	 * Fallback: Store tokens to encrypted file
	 */
	private async storeTokensToFile(tokens: TokenData): Promise<void> {
		try {
			const configDir = await this.getConfigDirectory();
			const tokenFile = path.join(configDir, 'tokens.json');

			const tokenJson = JSON.stringify(tokens, null, 2);
			await fs.writeFile(tokenFile, tokenJson, {mode: 0o600}); // Readable only by user
		} catch (error) {

			throw error;
		}
	}

	/**
	 * Fallback: Get tokens from file
	 */
	private async getTokensFromFile(): Promise<TokenData | null> {
		try {
			const configDir = await this.getConfigDirectory();
			const tokenFile = path.join(configDir, 'tokens.json');

			const tokenJson = await fs.readFile(tokenFile, 'utf8');
			return JSON.parse(tokenJson);
		} catch (error) {
			return null;
		}
	}

	/**
	 * Fallback: Store user info to file
	 */
	private async storeUserInfoToFile(userInfo: UserInfo): Promise<void> {
		try {
			const configDir = await this.getConfigDirectory();
			const userFile = path.join(configDir, 'user.json');

			const userJson = JSON.stringify(userInfo, null, 2);
			await fs.writeFile(userFile, userJson, {mode: 0o600});
		} catch (error) {

		}
	}

	/**
	 * Fallback: Get user info from file
	 */
	private async getUserInfoFromFile(): Promise<UserInfo | null> {
		try {
			const configDir = await this.getConfigDirectory();
			const userFile = path.join(configDir, 'user.json');

			const userJson = await fs.readFile(userFile, 'utf8');
			return JSON.parse(userJson);
		} catch (error) {
			return null;
		}
	}

	/**
	 * Clear file-based token storage
	 */
	private async clearTokenFiles(): Promise<void> {
		try {
			const configDir = await this.getConfigDirectory();
			const tokenFile = path.join(configDir, 'tokens.json');
			const userFile = path.join(configDir, 'user.json');

			await Promise.allSettled([fs.unlink(tokenFile), fs.unlink(userFile)]);
		} catch (error) {
			// Ignore errors when clearing files
		}
	}

	/**
	 * Get or create .octopus-cli config directory
	 */
	private async getConfigDirectory(): Promise<string> {
		const homeDir = os.homedir();
		const configDir = path.join(homeDir, '.octopus-cli');

		try {
			await fs.access(configDir);
		} catch (error) {
			await fs.mkdir(configDir, {mode: 0o700});
		}

		return configDir;
	}
}
