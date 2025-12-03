import React from 'react';
import {Box, Text} from 'ink';

const HomeComponent: React.FC = () => {
	return (
		<Box flexDirection="column" padding={1}>
			<Box marginBottom={1}>
				<Text bold color="cyan">
					9OCTOPUS CLI
				</Text>
			</Box>
			<Box marginBottom={1}>
				<Text>
					Welcome to 9OCTOPUS CLI - Your AI-powered command line assistant
				</Text>
			</Box>
			<Box flexDirection="column" marginBottom={1}>
				<Text bold color="yellow">
					Quick Start:
				</Text>
				<Text>• Type /login to login to your account</Text>
				<Text>• Type /init to create a context file</Text>
				<Text>• Type your message to start a conversation</Text>
				<Text>• Type /models to configure AI models</Text>
				<Text>• Type /clear to clear the conversation</Text>
				<Text>• Type /logout to logout from your account</Text>
			</Box>
			<Box>
				<Text dimColor>
					Ready to assist you with code, questions, and tasks!
				</Text>
			</Box>
		</Box>
	);
};

export default React.memo(HomeComponent);
