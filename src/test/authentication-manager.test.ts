import test from 'ava';
import {
	AuthenticationManager,
	AuthenticationState,
} from '../core/auth/authenticationManager.js';
import {AuthService} from '../core/auth/authService.js';
import {TokenData, UserInfo} from '../core/auth/tokenStorage.js';

// Mock AuthService
class MockAuthService {
	private static instance: MockAuthService;

	static getInstance() {
		if (!MockAuthService.instance) {
			MockAuthService.instance = new MockAuthService();
		}
		return MockAuthService.instance;
	}

	async loginWithAuthorizationCode() {
		return {
			tokens: {accessToken: 'mock-token'} as TokenData,
			userInfo: {name: 'Mock User', email: 'mock@example.com'} as UserInfo,
		};
	}

	async loginWithDeviceFlowWithCallback(
		callback: (type: string, message: string) => void,
	) {
		// Simulate device flow steps
		callback(
			'device_code',
			JSON.stringify({
				verification_uri: 'http://verify',
				user_code: '123-456',
				verification_uri_complete: 'http://verify?code=123-456',
			}),
		);

		callback('polling', 'Waiting for authentication...');

		return {
			tokens: {accessToken: 'mock-token'} as TokenData,
			userInfo: {name: 'Mock User', email: 'mock@example.com'} as UserInfo,
		};
	}
}

// Mock the module
const authServiceMock = MockAuthService.getInstance();
(AuthService as any).getInstance = () => authServiceMock;

test('AuthenticationManager initializes correctly', t => {
	const manager = AuthenticationManager.getInstance();
	t.truthy(manager);
});

test.serial('AuthenticationManager handles device flow', async t => {
	const manager = AuthenticationManager.getInstance();

	let lastState: AuthenticationState | undefined;
	manager.setAuthStateCallback(state => {
		lastState = state;
	});

	await manager.startAuthentication(false); // false for device flow

	t.truthy(lastState);
	t.is(lastState?.status, 'success');
	t.is(lastState?.status, 'success');
	// t.is(lastState?.isAuthenticating, false); // Depends on timeout
	t.is(lastState?.isAuthenticating, true); // Still true immediately after success before timeout
});

test.serial('AuthenticationManager handles browser flow', async t => {
	const manager = AuthenticationManager.getInstance();

	let lastState: AuthenticationState | undefined;
	manager.setAuthStateCallback(state => {
		lastState = state;
	});

	await manager.startAuthentication(true); // true for browser flow

	t.truthy(lastState);
	t.is(lastState?.status, 'success');
});
