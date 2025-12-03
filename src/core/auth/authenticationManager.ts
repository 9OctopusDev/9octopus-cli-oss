import {DeviceAuthInfo} from '../../ui/components/AuthenticationDialog.js';
import {AuthService} from './authService.js';

export type AuthStatus =
	| 'initializing'
	| 'waiting'
	| 'polling'
	| 'success'
	| 'error';

export interface AuthenticationState {
	isAuthenticating: boolean;
	authMode: 'device' | 'browser';
	deviceInfo?: DeviceAuthInfo;
	status: AuthStatus;
	statusMessage?: string;
	errorMessage?: string;
}

export class AuthenticationManager {
	private static instance: AuthenticationManager;
	private authService: AuthService;
	private authStateCallback?: (state: AuthenticationState) => void;
	private currentState: AuthenticationState = {
		isAuthenticating: false,
		authMode: 'device',
		status: 'initializing',
	};

	private constructor() {
		this.authService = AuthService.getInstance();
	}

	public static getInstance(): AuthenticationManager {
		if (!AuthenticationManager.instance) {
			AuthenticationManager.instance = new AuthenticationManager();
		}
		return AuthenticationManager.instance;
	}

	public setAuthStateCallback(callback: (state: AuthenticationState) => void) {
		this.authStateCallback = callback;
	}

	private updateState(updates: Partial<AuthenticationState>) {
		this.currentState = {...this.currentState, ...updates};
		if (this.authStateCallback) {
			this.authStateCallback(this.currentState);
		}
	}

	public async startAuthentication(
		useBrowserFlow: boolean = false,
	): Promise<void> {
		try {
			this.updateState({
				isAuthenticating: true,
				authMode: useBrowserFlow ? 'browser' : 'device',
				status: 'initializing',
				errorMessage: undefined,
			});

			if (useBrowserFlow) {
				await this.performBrowserAuth();
			} else {
				await this.performDeviceAuth();
			}
		} catch (error: any) {
			this.updateState({
				status: 'error',
				errorMessage: error.message,
			});

			// Keep dialog visible for 3 seconds after error
			setTimeout(() => {
				this.updateState({
					isAuthenticating: false,
				});
			}, 3000);

			throw error;
		}
	}

	private async performDeviceAuth(): Promise<void> {
		// Create a custom callback for device flow updates
		const authCallback = (type: string, message: string) => {
			if (type === 'device_code') {
				const data = JSON.parse(message);
				this.updateState({
					status: 'waiting',
					deviceInfo: {
						verificationUri: data.verification_uri,
						userCode: data.user_code,
						verificationUriComplete: data.verification_uri_complete,
					},
				});
			} else if (type === 'polling') {
				this.updateState({
					status: 'polling',
					statusMessage: message,
				});
			}
		};

		const result = await this.authService.loginWithDeviceFlowWithCallback(
			authCallback,
		);

		this.updateState({
			status: 'success',
			statusMessage: `Welcome, ${
				result.userInfo.name || result.userInfo.email || 'User'
			}!`,
		});

		// Keep success message visible for 2 seconds
		setTimeout(() => {
			this.updateState({
				isAuthenticating: false,
			});
		}, 2000);
	}

	private async performBrowserAuth(): Promise<void> {
		this.updateState({
			status: 'waiting',
		});

		const result = await this.authService.loginWithAuthorizationCode();

		this.updateState({
			status: 'success',
			statusMessage: `Welcome, ${
				result.userInfo.name || result.userInfo.email || 'User'
			}!`,
		});

		// Keep success message visible for 2 seconds
		setTimeout(() => {
			this.updateState({
				isAuthenticating: false,
			});
		}, 2000);
	}

	public closeAuthDialog() {
		this.updateState({
			isAuthenticating: false,
		});
	}
}
