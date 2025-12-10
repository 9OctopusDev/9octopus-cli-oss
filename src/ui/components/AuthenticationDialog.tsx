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
			borderStyle="single"
			borderColor="white"
			paddingX={2}
			paddingY={1}
			marginY={1}
		>
			<Box marginBottom={1}>
				<Text bold color="white">
					🔐 Authentication {status === 'success' ? 'Complete' : 'Required'}
				</Text>
			</Box>

			{status === 'initializing' && (
				<Box>
					<Text color="white">
						<Spinner type="dots" /> Initializing authentication...
					</Text>
				</Box>
			)}

			{authMode === 'device' && deviceInfo && status !== 'initializing' && (
				<Box flexDirection="column" gap={1}>
					<Box borderStyle="single" borderColor="white" paddingX={1}>
						<Box flexDirection="column">
							<Text bold color="white">
								Device Authentication Steps:
							</Text>
							<Text> </Text>
							<Text>1. Open this URL in your browser:</Text>
							<Text color="white"> {deviceInfo.verificationUri}</Text>
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
					<Text color="white">
						<Spinner type="dots" /> Opening browser for authentication...
					</Text>
					<Text color="white">
						Please complete the authentication in your browser
					</Text>
				</Box>
			)}

			{status === 'polling' && (
				<Box>
					<Text color="white">
						<Spinner type="dots" /> Waiting for authentication...
					</Text>
					{statusMessage && <Text color="white"> {statusMessage}</Text>}
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
