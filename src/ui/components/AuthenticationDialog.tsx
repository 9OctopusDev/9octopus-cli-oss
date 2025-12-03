import React from 'react';
import {Box, Text} from 'ink';
import Spinner from 'ink-spinner';

export interface DeviceAuthInfo {
	verificationUri: string;
	userCode: string;
	verificationUriComplete: string;
}

interface AuthenticationDialogProps {
	isVisible: boolean;
	authMode: 'device' | 'browser';
	deviceInfo?: DeviceAuthInfo;
	status: 'initializing' | 'waiting' | 'polling' | 'success' | 'error';
	statusMessage?: string;
	errorMessage?: string;
	onClose?: () => void;
}

const AuthenticationDialog: React.FC<AuthenticationDialogProps> = ({
	isVisible,
	authMode,
	deviceInfo,
	status,
	statusMessage,
	errorMessage,
}) => {
	if (!isVisible) return null;

	return (
		<Box
			flexDirection="column"
			borderStyle="round"
			borderColor="cyan"
			paddingX={2}
			paddingY={1}
			marginY={1}
		>
			<Box marginBottom={1}>
				<Text bold color="cyan">
					🔐 Authentication {status === 'success' ? 'Complete' : 'Required'}
				</Text>
			</Box>

			{status === 'initializing' && (
				<Box>
					<Text color="yellow">
						<Spinner type="dots" /> Initializing authentication...
					</Text>
				</Box>
			)}

			{authMode === 'device' && deviceInfo && status !== 'initializing' && (
				<Box flexDirection="column" gap={1}>
					<Box borderStyle="single" borderColor="yellow" paddingX={1}>
						<Box flexDirection="column">
							<Text bold color="yellow">
								Device Authentication Steps:
							</Text>
							<Text> </Text>
							<Text>1. Open this URL in your browser:</Text>
							<Text color="cyan"> {deviceInfo.verificationUri}</Text>
							<Text> </Text>
							<Text>2. Enter this code:</Text>
							<Box paddingLeft={3}>
								<Text bold color="green" backgroundColor="black">
									{' '}
									{deviceInfo.userCode}{' '}
								</Text>
							</Box>
							<Text> </Text>
							<Text>3. Complete the authentication process</Text>
						</Box>
					</Box>
				</Box>
			)}

			{authMode === 'browser' && status === 'waiting' && (
				<Box flexDirection="column">
					<Text color="yellow">
						<Spinner type="dots" /> Opening browser for authentication...
					</Text>
					<Text color="dim">
						Please complete the authentication in your browser
					</Text>
				</Box>
			)}

			{status === 'polling' && (
				<Box>
					<Text color="yellow">
						<Spinner type="dots" /> Waiting for authentication...
					</Text>
					{statusMessage && <Text color="dim"> {statusMessage}</Text>}
				</Box>
			)}

			{status === 'success' && (
				<Box flexDirection="column">
					<Text color="green">✅ Authentication successful!</Text>
					{statusMessage && <Text color="green">{statusMessage}</Text>}
				</Box>
			)}

			{status === 'error' && (
				<Box flexDirection="column">
					<Text color="red">❌ Authentication failed</Text>
					{errorMessage && <Text color="red">{errorMessage}</Text>}
				</Box>
			)}
		</Box>
	);
};

export default AuthenticationDialog;
