import {createHash, randomBytes} from 'crypto';
import {createServer, Server} from 'http';
import {URL} from 'url';
import {default as open} from 'open';
import {v4 as uuidv4} from 'uuid';
import {AuthConfigManager} from '../configs/config.js';
import {SecureTokenStorage, TokenData, UserInfo} from './tokenStorage.js';
import {RetryService} from '../network/retryService.js';
import {NetworkErrorUtils} from '../network/networkErrors.js';

export interface DeviceCodeResponse {
	device_code: string;
	user_code: string;
	verification_uri: string;
	verification_uri_complete: string;
	expires_in: number;
	interval: number;
}

export interface PKCEChallenge {
	codeVerifier: string;
	codeChallenge: string;
	codeChallengeMethod: string;
}

export class AuthService {
	private static instance: AuthService;
	private configManager: AuthConfigManager;
	private tokenStorage: SecureTokenStorage;
	private callbackServer: Server | null = null;
	private callbackPort: number = 8080;

	private constructor() {
		this.configManager = AuthConfigManager.getInstance();
		this.tokenStorage = SecureTokenStorage.getInstance();
	}

	public static getInstance(): AuthService {
		if (!AuthService.instance) {
			AuthService.instance = new AuthService();
		}
		return AuthService.instance;
	}

	/**
	 * Generate PKCE challenge for authorization code flow
	 */
	private generatePKCEChallenge(): PKCEChallenge {
		const codeVerifier = randomBytes(32).toString('base64url');
		const codeChallenge = createHash('sha256')
			.update(codeVerifier)
			.digest('base64url');

		return {
			codeVerifier,
			codeChallenge,
			codeChallengeMethod: 'S256',
		};
	}

	/**
	 * Find an available port for the callback server
	 */
	private async findAvailablePort(startPort: number = 8080): Promise<number> {
		return new Promise(resolve => {
			const server = createServer();
			server.listen(startPort, () => {
				const port = (server.address() as any)?.port;
				server.close(() => resolve(port));
			});
			server.on('error', () => {
				resolve(this.findAvailablePort(startPort + 1));
			});
		});
	}

	/**
	 * Start callback server for authorization code flow
	 */
	private async startCallbackServer(
		_codeVerifier: string,
	): Promise<{code: string; state: string}> {
		return new Promise(async (resolve, reject) => {
			this.callbackPort = await this.findAvailablePort();

			this.callbackServer = createServer((req, res) => {
				const url = new URL(req.url!, `http://localhost:${this.callbackPort}`);

				if (url.pathname === '/callback') {
					const code = url.searchParams.get('code');
					const state = url.searchParams.get('state');
					const error = url.searchParams.get('error');
					const errorDescription = url.searchParams.get('error_description');

					if (error) {
						res.writeHead(400, {'Content-Type': 'text/html'});
						res.end(`
							<html>
								<body>
									<h1>Authentication Error</h1>
									<p>Error: ${error}</p>
									<p>Description: ${errorDescription}</p>
									<p>You can close this window and return to the CLI.</p>
								</body>
							</html>
						`);
						reject(
							new Error(`Authentication error: ${error} - ${errorDescription}`),
						);
						return;
					}

					if (code && state) {
						res.writeHead(200, {'Content-Type': 'text/html'});
						res.end(`
							<html>
								<body>
									<h1>Authentication Successful!</h1>
									<p>You can close this window and return to the CLI.</p>
									<script>window.close();</script>
								</body>
							</html>
						`);
						resolve({code, state});
					} else {
						res.writeHead(400, {'Content-Type': 'text/html'});
						res.end(`
							<html>
								<body>
									<h1>Authentication Error</h1>
									<p>Missing authorization code or state parameter.</p>
									<p>You can close this window and return to the CLI.</p>
								</body>
							</html>
						`);
						reject(new Error('Missing authorization code or state parameter'));
					}
				} else {
					res.writeHead(404, {'Content-Type': 'text/plain'});
					res.end('Not Found');
				}
			});

			this.callbackServer.listen(this.callbackPort, () => {});

			this.callbackServer.on('error', error => {
				reject(new Error(`Failed to start callback server: ${error.message}`));
			});

			// Timeout after 10 minutes
			setTimeout(() => {
				reject(new Error('Authentication timeout'));
			}, 10 * 60 * 1000);
		});
	}

	/**
	 * Stop the callback server
	 */
	private stopCallbackServer(): void {
		if (this.callbackServer) {
			this.callbackServer.close();
			this.callbackServer = null;
		}
	}

	/**
	 * Perform Authorization Code Flow with PKCE
	 */
	public async loginWithAuthorizationCode(addHistoryItem?: any): Promise<{
		tokens: TokenData;
		userInfo: UserInfo;
	}> {
		const config = this.configManager.getAuthConfig();
		const pkce = this.generatePKCEChallenge();
		const state = uuidv4();

		// Update redirect URI to use dynamic port
		const redirectUri = `http://localhost:${this.callbackPort}/callback`;

		// Build authorization URL
		const authParams = new URLSearchParams({
			response_type: 'code',
			client_id: config.auth0ClientId,
			redirect_uri: redirectUri,
			scope: config.scopes.join(' '),
			state,
			code_challenge: pkce.codeChallenge,
			code_challenge_method: pkce.codeChallengeMethod,
			audience: config.auth0Audience,
		});

		const authUrl = `https://${
			config.auth0Domain
		}/authorize?${authParams.toString()}`;

		if (addHistoryItem) {
			addHistoryItem('Starting authentication flow...', '', 'text');
			addHistoryItem(`Opening browser to: ${authUrl}`, '', 'text');
		} else {
		}

		try {
			// Start callback server and open browser
			const callbackPromise = this.startCallbackServer(pkce.codeVerifier);

			// Open browser
			await open(authUrl);
			if (addHistoryItem) {
				addHistoryItem(
					'Please complete the authentication in your browser...',
					'',
					'text',
				);
			} else {
			}

			// Wait for callback
			const {code, state: returnedState} = await callbackPromise;

			// Verify state parameter
			if (state !== returnedState) {
				throw new Error('State parameter mismatch - possible CSRF attack');
			}

			// Exchange code for tokens with retry logic
			const tokenResponse = await RetryService.retryFetch(
				`https://${config.auth0Domain}/oauth/token`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						grant_type: 'authorization_code',
						client_id: config.auth0ClientId,
						code,
						redirect_uri: redirectUri,
						code_verifier: pkce.codeVerifier,
					}),
				},
				{
					maxAttempts: 3,
					baseDelay: 1000,
					maxDelay: 5000,
					jitterPercent: 25,
					// Don't retry auth-specific errors
					retryCondition: (error: any) => {
						if (error?.status >= 400 && error?.status < 500) {
							return false; // Don't retry client errors in auth
						}
						return NetworkErrorUtils.isRetryableError(error);
					},
				},
				'Token exchange',
			);

			if (!tokenResponse.ok) {
				const errorData = await tokenResponse.json();
				throw new Error(
					`Token exchange failed: ${
						errorData.error_description || tokenResponse.statusText
					}`,
				);
			}

			const tokenData = await tokenResponse.json();

			// Get user info with retry logic
			const userInfoResponse = await RetryService.retryFetch(
				`https://${config.auth0Domain}/userinfo`,
				{
					headers: {
						Authorization: `Bearer ${tokenData.access_token}`,
					},
				},
				{
					maxAttempts: 3,
					baseDelay: 1000,
					maxDelay: 5000,
					jitterPercent: 25,
				},
				'Get user info',
			);

			if (!userInfoResponse.ok) {
				throw new Error(
					`Failed to get user info: ${userInfoResponse.statusText}`,
				);
			}

			const userInfo = await userInfoResponse.json();

			// Create token object
			const tokens: TokenData = {
				accessToken: tokenData.access_token,
				refreshToken: tokenData.refresh_token,
				expiresAt: Date.now() + tokenData.expires_in * 1000,
				tokenType: tokenData.token_type || 'Bearer',
				scope: tokenData.scope,
			};

			// Store tokens and user info
			await this.tokenStorage.storeTokens(tokens);
			await this.tokenStorage.storeUserInfo(userInfo);

			return {tokens, userInfo};
		} finally {
			this.stopCallbackServer();
		}
	}

	/**
	 * Device Authorization Flow with callback for UI updates
	 */
	public async loginWithDeviceFlowWithCallback(
		callback?: (type: string, message: string) => void,
	): Promise<{
		tokens: TokenData;
		userInfo: UserInfo;
	}> {
		const config = this.configManager.getAuthConfig();

		// Start device authorization with retry logic
		const deviceResponse = await RetryService.retryFetch(
			`https://${config.auth0Domain}/oauth/device/code`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: new URLSearchParams({
					client_id: config.auth0ClientId,
					scope: config.scopes.join(' '),
					audience: config.auth0Audience,
				}),
			},
			{
				maxAttempts: 3,
				baseDelay: 1000,
				maxDelay: 5000,
				jitterPercent: 25,
			},
			'Device authorization',
		);

		if (!deviceResponse.ok) {
			throw new Error(
				`Device authorization failed: ${deviceResponse.statusText}`,
			);
		}

		const deviceData: DeviceCodeResponse = await deviceResponse.json();

		// Send device code info to callback
		if (callback) {
			callback(
				'device_code',
				JSON.stringify({
					verification_uri: deviceData.verification_uri,
					user_code: deviceData.user_code,
					verification_uri_complete: deviceData.verification_uri_complete,
				}),
			);
		}

		// Open browser automatically
		try {
			await open(deviceData.verification_uri_complete);
		} catch (error) {
			// Silently fail if browser can't be opened
		}

		// Poll for token with callback
		return this.pollForTokensWithCallback(
			deviceData,
			config.auth0Domain,
			config.auth0ClientId,
			callback,
		);
	}

	/**
	 * Poll for tokens with callback for UI updates
	 */
	private async pollForTokensWithCallback(
		deviceData: DeviceCodeResponse,
		domain: string,
		clientId: string,
		callback?: (type: string, message: string) => void,
	): Promise<{tokens: TokenData; userInfo: UserInfo}> {
		const startTime = Date.now();
		const expirationTime = startTime + deviceData.expires_in * 1000;

		while (Date.now() < expirationTime) {
			await new Promise(resolve =>
				setTimeout(resolve, deviceData.interval * 1000),
			);

			try {
				const tokenResponse = await fetch(`https://${domain}/oauth/token`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
					},
					body: new URLSearchParams({
						grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
						device_code: deviceData.device_code,
						client_id: clientId,
					}),
				});

				const tokenData = await tokenResponse.json();

				if (tokenResponse.ok) {
					// Get user info
					const userInfoResponse = await fetch(`https://${domain}/userinfo`, {
						headers: {
							Authorization: `Bearer ${tokenData.access_token}`,
						},
					});

					if (!userInfoResponse.ok) {
						throw new Error(
							`Failed to get user info: ${userInfoResponse.statusText}`,
						);
					}

					const userInfo = await userInfoResponse.json();

					// Create token object
					const tokens: TokenData = {
						accessToken: tokenData.access_token,
						refreshToken: tokenData.refresh_token,
						expiresAt: Date.now() + tokenData.expires_in * 1000,
						tokenType: tokenData.token_type || 'Bearer',
						scope: tokenData.scope,
					};

					// Store tokens and user info
					await this.tokenStorage.storeTokens(tokens);
					await this.tokenStorage.storeUserInfo(userInfo);

					return {tokens, userInfo};
				} else if (tokenData.error === 'authorization_pending') {
					// Continue polling
					if (callback) {
						callback('polling', 'Waiting for authentication...');
					}
					continue;
				} else if (tokenData.error === 'slow_down') {
					// Increase polling interval
					await new Promise(resolve => setTimeout(resolve, 5000));
					continue;
				} else {
					throw new Error(
						`Authentication failed: ${
							tokenData.error_description || tokenData.error
						}`,
					);
				}
			} catch (error: any) {
				if (error.message.includes('Authentication failed')) {
					throw error;
				}
				// Network error, continue polling
				if (callback) {
					callback('polling', 'Network error, retrying...');
				}
			}
		}

		throw new Error('Authentication timeout - please try again');
	}

	/**
	 * Device Authorization Flow (alternative to authorization code flow)
	 */
	public async loginWithDeviceFlow(addHistoryItem?: any): Promise<{
		tokens: TokenData;
		userInfo: UserInfo;
	}> {
		const config = this.configManager.getAuthConfig();

		// Start device authorization with retry logic
		const deviceResponse = await RetryService.retryFetch(
			`https://${config.auth0Domain}/oauth/device/code`,
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: new URLSearchParams({
					client_id: config.auth0ClientId,
					scope: config.scopes.join(' '),
					audience: config.auth0Audience,
				}),
			},
			{
				maxAttempts: 3,
				baseDelay: 1000,
				maxDelay: 5000,
				jitterPercent: 25,
			},
			'Device authorization',
		);

		if (!deviceResponse.ok) {
			throw new Error(
				`Device authorization failed: ${deviceResponse.statusText}`,
			);
		}

		const deviceData: DeviceCodeResponse = await deviceResponse.json();

		if (addHistoryItem) {
			addHistoryItem('\n🔐 Device Authentication Required', '', 'text');
			addHistoryItem('='.repeat(50), '', 'text');
			addHistoryItem(
				`1. Open this URL in your browser: ${deviceData.verification_uri}`,
				'',
				'text',
			);
			addHistoryItem(`2. Enter this code: ${deviceData.user_code}`, '', 'text');
			addHistoryItem('3. Complete the authentication process', '', 'text');
			addHistoryItem('='.repeat(50), '', 'text');
		} else {
		}

		// Open browser automatically
		try {
			await open(deviceData.verification_uri_complete);
		} catch (error) {
			if (addHistoryItem) {
				addHistoryItem(
					'Could not open browser automatically. Please open the URL manually.',
					'',
					'text',
				);
			} else {
			}
		}

		// Poll for token
		return this.pollForTokens(
			deviceData,
			config.auth0Domain,
			config.auth0ClientId,
			addHistoryItem,
		);
	}

	/**
	 * Poll for tokens in device flow
	 */
	private async pollForTokens(
		deviceData: DeviceCodeResponse,
		domain: string,
		clientId: string,
		addHistoryItem?: any,
	): Promise<{tokens: TokenData; userInfo: UserInfo}> {
		const startTime = Date.now();
		const expirationTime = startTime + deviceData.expires_in * 1000;

		while (Date.now() < expirationTime) {
			await new Promise(resolve =>
				setTimeout(resolve, deviceData.interval * 1000),
			);

			try {
				const tokenResponse = await fetch(`https://${domain}/oauth/token`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/x-www-form-urlencoded',
					},
					body: new URLSearchParams({
						grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
						device_code: deviceData.device_code,
						client_id: clientId,
					}),
				});

				const tokenData = await tokenResponse.json();

				if (tokenResponse.ok) {
					// Get user info
					const userInfoResponse = await fetch(`https://${domain}/userinfo`, {
						headers: {
							Authorization: `Bearer ${tokenData.access_token}`,
						},
					});

					if (!userInfoResponse.ok) {
						throw new Error(
							`Failed to get user info: ${userInfoResponse.statusText}`,
						);
					}

					const userInfo = await userInfoResponse.json();

					// Create token object
					const tokens: TokenData = {
						accessToken: tokenData.access_token,
						refreshToken: tokenData.refresh_token,
						expiresAt: Date.now() + tokenData.expires_in * 1000,
						tokenType: tokenData.token_type || 'Bearer',
						scope: tokenData.scope,
					};

					// Store tokens and user info
					await this.tokenStorage.storeTokens(tokens);
					await this.tokenStorage.storeUserInfo(userInfo);

					return {tokens, userInfo};
				} else if (tokenData.error === 'authorization_pending') {
					// Continue polling
					if (addHistoryItem) {
						addHistoryItem('⏳ Waiting for authentication...', '', 'text');
					} else {
					}
					continue;
				} else if (tokenData.error === 'slow_down') {
					// Increase polling interval
					await new Promise(resolve => setTimeout(resolve, 5000));
					continue;
				} else {
					throw new Error(
						`Authentication failed: ${
							tokenData.error_description || tokenData.error
						}`,
					);
				}
			} catch (error: any) {
				if (error.message.includes('Authentication failed')) {
					throw error;
				}
				// Network error, continue polling
				if (addHistoryItem) {
					addHistoryItem('Network error, retrying...', '', 'text');
				} else {
				}
			}
		}

		throw new Error('Authentication timeout - please try again');
	}

	/**
	 * Check if user is authenticated
	 */
	public async isAuthenticated(): Promise<boolean> {
		if (!this.configManager.isAuthEnabled()) {
			return true; // Authentication disabled
		}

		return await this.tokenStorage.hasValidTokens();
	}

	/**
	 * Get current user information
	 */
	public async getCurrentUser(): Promise<UserInfo | null> {
		if (!this.configManager.isAuthEnabled()) {
			return null;
		}

		return await this.tokenStorage.getUserInfo();
	}

	/**
	 * Get valid access token
	 */
	public async getAccessToken(): Promise<string | null> {
		if (!this.configManager.isAuthEnabled()) {
			return null;
		}

		return await this.tokenStorage.getValidAccessToken();
	}

	/**
	 * Logout user
	 */
	public async logout(): Promise<void> {
		await this.tokenStorage.clearTokens();
	}

	/**
	 * Get authentication status
	 */
	public async getAuthStatus(): Promise<{
		isAuthenticated: boolean;
		user: UserInfo | null;
		tokenExpiry: number | null;
		authEnabled: boolean;
	}> {
		const authEnabled = this.configManager.isAuthEnabled();
		const isAuthenticated = await this.isAuthenticated();
		const user = await this.getCurrentUser();

		let tokenExpiry = null;
		if (authEnabled) {
			const tokens = await this.tokenStorage.getTokens();
			tokenExpiry = tokens?.expiresAt || null;
		}

		return {
			isAuthenticated,
			user,
			tokenExpiry,
			authEnabled,
		};
	}
}
