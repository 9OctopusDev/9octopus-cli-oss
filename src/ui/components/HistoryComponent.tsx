import React from 'react';
import {Box, Text} from 'ink';
import {
	ConversationMessage,
	MessageRole,
} from '../../types/converstionTypes.js';
import HomeComponent from './HomeComponent.js';

import Markdown from '@inkkit/ink-markdown';

const HistoryComponent: React.FC<{history: ConversationMessage[]}> = ({
	history,
}) => {
	const getRoleColor = (role: MessageRole) => {
		switch (role) {
			case 'user':
				return 'green';
			case 'assistant':
				return 'blue';
			case 'system':
				return 'gray';
			default:
				return 'white';
		}
	};

	return (
		<Box flexDirection="column">
			{history.map((message, index) => {
				if (message.type === 'welcome') {
					return (
						<Box key={index} flexDirection="column">
							<HomeComponent />
						</Box>
					);
				}

				const timestamp = message.timestamp
					? new Date(message.timestamp).toLocaleTimeString()
					: '';

				return (
					<Box key={index} flexDirection="column" marginBottom={1}>
						<Box flexDirection="row" marginBottom={0}>
							<Text bold color={getRoleColor(message.role)}>
								{message.role.toUpperCase()}
							</Text>
							<Text color="gray"> [{timestamp}]</Text>
						</Box>
						<Box paddingLeft={2}>
							{message.role === 'assistant' ? (
								<Markdown>{message.content}</Markdown>
							) : (
								<Text color={message.role === 'system' ? 'gray' : 'white'}>
									{message.content}
								</Text>
							)}
						</Box>
					</Box>
				);
			})}
		</Box>
	);
};

export default HistoryComponent;
