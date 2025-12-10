import {Box, useInput} from 'ink';
import React, {useCallback, useEffect, useState} from 'react';
import TextInput from 'ink-text-input';
import {Text} from 'ink';
import {ConversationMessage} from '../../types/converstionTypes.js';
import {execSync} from 'child_process';
import {CommandAgregator} from '../../core/commands/commands.js';
import {SessionManager} from '../../core/api/sessionManager.js';
import {ModelManager} from '../../core/api/modelManager.js';
import {ToolManager} from '../../core/tools/ToolManager.js';
import TokenUsageDisplay from './TokenUsageDisplay.js';
import {useInputContext} from '../contexts/InputContext.js';
import path from 'path';
import * as fs from 'fs';

type InputComponentProps = {
	addHistoryItem: (message: ConversationMessage) => void;
	commandAgregator: CommandAgregator;
	sessionManager: SessionManager;
	modelManager: ModelManager;
	toolManager: ToolManager;
	clearHistory: () => void;
	setLoading: (state: boolean) => void;
	setShowModelSelection: ({
		llmService,
		modelManager,
	}: {
		llmService: any;
		modelManager: ModelManager;
	}) => void;
};

const InputComponent: React.FC<InputComponentProps> = ({
	addHistoryItem,
	commandAgregator,
	sessionManager,
	modelManager,
	toolManager,
	clearHistory,
	setLoading,
	setShowModelSelection,
}) => {
	const {setTypingState} = useInputContext();

	const [gitBranch, setGitBranch] = useState<string>('');
	const [inputMessage, setInputMessage] = useState('');
	const [autocomplete, setAutocomplete] = useState<
		{name: string; description: string}[]
	>([]);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [commandHistory, setCommandHistory] = useState<string[]>([]);
	const [historyIndex, setHistoryIndex] = useState(-1);
	const [tempCommand, setTempCommand] = useState('');
	const [tokenUsage, setTokenUsage] = useState(
		sessionManager.getCurrentSession().tokenUsage,
	);

	useEffect(() => {
		try {
			const branch = execSync('git branch --show-current', {
				encoding: 'utf8',
			}).trim();
			setGitBranch(branch);
		} catch {
			setGitBranch('');
		}
	}, []);

	// Poll for token usage updates
	useEffect(() => {
		const interval = setInterval(() => {
			const currentTokenUsage = sessionManager.getCurrentSession().tokenUsage;
			setTokenUsage(currentTokenUsage);
		}, 1000); // Check every second

		return () => clearInterval(interval);
	}, [sessionManager]);

	const isSlashCommand = (input: string): boolean => {
		return input.trim().startsWith('/');
	};

	const isTextInput = (input: string): boolean => {
		return !isSlashCommand(input) && input.trim().length > 0;
	};

	const handlePaste = useCallback(async () => {
		try {
			// First try to get text from clipboard
			try {
				const text = execSync('wl-paste --no-newline', {encoding: 'utf8'});
				if (text && text.trim()) {
					const newCommand = inputMessage + text;
					setInputMessage(newCommand);
					return;
				}
			} catch {
				// Text paste failed, try image
			}

			// Try to get image from clipboard
			const tempDir = '/tmp/octopus-images';
			if (!fs.existsSync(tempDir)) {
				fs.mkdirSync(tempDir, {recursive: true});
			}

			const timestamp = Date.now();
			const imagePath = path.join(tempDir, `pasted-image-${timestamp}.png`);

			execSync(`wl-paste --type image/png > "${imagePath}"`, {
				encoding: 'utf8',
			});

			if (fs.existsSync(imagePath) && fs.statSync(imagePath).size > 0) {
				const newCommand = `${inputMessage}[Image: ${imagePath}] `;
				setInputMessage(newCommand);
			}
		} catch (error) {}
	}, [inputMessage]);

	useInput((input, key) => {
		// Handle autocomplete navigation (priority over everything)
		if (autocomplete.length > 0) {
			if (key.tab || key.return) {
				selectCurrentAutocomplete();
				return;
			}
			if (key.upArrow) {
				setSelectedIndex(prev =>
					prev > 0 ? prev - 1 : autocomplete.length - 1,
				);
				return;
			}
			if (key.downArrow) {
				setSelectedIndex(prev =>
					prev < autocomplete.length - 1 ? prev + 1 : 0,
				);
				return;
			}
		}

		// Handle tab when no autocomplete
		if (key.tab && autocomplete.length === 0) {
			return; // Prevent default tab behavior
		}

		// Handle command history navigation when no autocomplete
		if (autocomplete.length === 0) {
			if (key.upArrow && commandHistory.length > 0) {
				if (historyIndex === -1) {
					// First time pressing up, save current command
					setTempCommand(inputMessage);
					const newIndex = commandHistory.length - 1;
					setHistoryIndex(newIndex);
					setInputMessage(commandHistory[newIndex] || '');
				} else if (historyIndex > 0) {
					// Go further back in history
					const newIndex = historyIndex - 1;
					setHistoryIndex(newIndex);
					setInputMessage(commandHistory[newIndex] || '');
				}
				return;
			}
			if (key.downArrow && historyIndex >= 0) {
				if (historyIndex < commandHistory.length - 1) {
					// Go forward in history
					const newIndex = historyIndex + 1;
					setHistoryIndex(newIndex);
					setInputMessage(commandHistory[newIndex] || '');
				} else {
					// Return to current/temp command
					setHistoryIndex(-1);
					setInputMessage(tempCommand);
				}
				return;
			}
		}

		// Handle paste
		if (key.ctrl && input === 'v') {
			handlePaste();
			return;
		}
	});

	const handleInputChange = useCallback(
		(input: string, resetSelection = true) => {
			if (resetSelection) {
				setSelectedIndex(0);
			}
			// Reset history navigation when user starts typing
			// setHistoryIndex(-1);
			// setTempCommand('');

			if (isSlashCommand(input)) {
				const commandParts = input.trim().slice(1).split(' ');
				const commandName = commandParts[0];
				const subcommandPart = commandParts[1] || '';

				if (commandName === '') {
					// Show all commands when just "/" is typed
					const commands = commandAgregator.getCommands();
					setAutocomplete(
						commands.map(command => ({
							name: command.name,
							description: command.description || '',
						})),
					);
				} else {
					// Check if we have an exact command match to show subcommands
					const exactCommand = commandName
						? commandAgregator.getCommand(commandName)
						: null;

					if (
						exactCommand &&
						exactCommand.subcommands &&
						(commandParts.length === 1 ||
							(commandParts.length === 2 && subcommandPart === ''))
					) {
						// Show subcommands for exact command match when user types "/models" or "/models "
						setAutocomplete(
							exactCommand.subcommands.map(subcommand => {
								const optionsText =
									subcommand.options.length > 0
										? ` ${subcommand.options.map(opt => opt.name).join(' ')}`
										: '';
								return {
									name: `${commandName} ${subcommand.name}${optionsText}`,
									description: subcommand.description,
								};
							}),
						);
					} else if (
						exactCommand &&
						exactCommand.subcommands &&
						subcommandPart
					) {
						// Filter subcommands based on partial subcommand input
						const matchingSubcommands = exactCommand.subcommands.filter(sub =>
							sub.name.toLowerCase().startsWith(subcommandPart.toLowerCase()),
						);

						setAutocomplete(
							matchingSubcommands.map(subcommand => {
								const optionsText =
									subcommand.options.length > 0
										? ` ${subcommand.options.map(opt => opt.name).join(' ')}`
										: '';
								return {
									name: `${commandName} ${subcommand.name}${optionsText}`,
									description: subcommand.description,
								};
							}),
						);
					} else {
						// Fallback to command name matching
						const commands = commandName
							? commandAgregator.searchCommand(commandName)
							: [];
						if (commands.length > 0) {
							setAutocomplete(
								commands.map(command => ({
									name: command.name,
									description: command.description || '',
								})),
							);
						} else {
							setAutocomplete([]);
						}
					}
				}
			} else {
				setAutocomplete([]);
			}
		},
		[commandAgregator],
	);

	const selectCurrentAutocomplete = useCallback(() => {
		if (autocomplete.length > 0 && selectedIndex < autocomplete.length) {
			const selectedItem = autocomplete[selectedIndex];
			if (selectedItem?.name) {
				// Check if this is a subcommand (contains spaces) or a main command
				const newCommand = selectedItem.name.includes(' ')
					? '/' + selectedItem.name + ' ' // Already formatted subcommand
					: '/' + selectedItem.name + ' '; // Main command

				setInputMessage(newCommand);
				handleInputChange(newCommand, false); // Don't reset selection on tab completion
			}
		}
	}, [autocomplete, selectedIndex, handleInputChange]);

	const handleSubmit = async (input: string) => {
		// Add to command history if not empty and not duplicate of last command
		if (
			input.trim() &&
			(commandHistory.length === 0 ||
				commandHistory[commandHistory.length - 1] !== input.trim())
		) {
			setCommandHistory(prev => [...prev, input.trim()]);
		}

		// Clear input immediately when user presses enter
		setInputMessage('');
		setAutocomplete([]);
		setHistoryIndex(-1);
		setTempCommand('');
		// Clear typing state when command is submitted
		setTypingState(false);

		if (isSlashCommand(input)) {
			addHistoryItem({
				id: new Date().toLocaleDateString(),
				role: 'user',
				content: input,
				timestamp: new Date(),
			});

			const commandName = input.trim().slice(1).split(' ')[0];
			const command = commandAgregator.getCommand(commandName ?? '');

			if (command) {
				try {
					await command.action(input.trim().slice(1).split(' ').slice(1), {
						addHistoryItem,
						clearHistory,
						setLoading,
						setShowModelSelection,
					});
				} catch (error) {}
			}
		}
		if (isTextInput(input)) {
			setLoading(true);
			addHistoryItem({
				id: new Date().toLocaleDateString(),
				role: 'user',
				content: input,
				timestamp: new Date(),
			});

			try {
				// Check what model will be used and provide feedback
				const modelInfo = modelManager.getModelSelectionInfo();

				if (!modelInfo.effectiveModel) {
					addHistoryItem({
						id: new Date().toLocaleDateString(),
						role: 'system',
						content:
							'No model available. Please set a default model with `/models default set <provider> <model>` or use `/chat <provider> <model> <message>` format.',
						timestamp: new Date(),
					});
					return;
				}

				// Check if this is the first message in the conversation
				const isFirst = sessionManager.isFirstMessage();

				// Increment message count before starting conversation
				sessionManager.incrementMessageCount();

				// Use ModelManager to start conversation
				await modelManager.startConversation({
					message: input,
					sessionId: sessionManager.getSessionId(),
					includeContext: isFirst, // Only include context on first message
					tools: toolManager.getTools(),
				});
			} catch (error) {
				setLoading(false);
				addHistoryItem({
					id: new Date().toLocaleDateString(),
					role: 'system',
					content: `Internal error: ${error}`,
					timestamp: new Date(),
				});
			}
		}
	};

	return (
		<Box flexDirection="column" width="100%" marginTop={0} paddingTop={0}>
			<Box
				flexDirection="column"
				borderStyle="single"
				borderColor="white"
				paddingX={1}
				paddingY={0}
				width="100%"
			>
				{/* Prompt indicator with TextInput on same line	 */}
				<Box flexDirection="row" width="100%">
					<Text color="white">{'>'} </Text>
					<Box flexGrow={1}>
						<TextInput
							value={inputMessage}
							onSubmit={handleSubmit}
							onChange={(value: string) => {
								setInputMessage(value);
								handleInputChange(value);
								// Update typing state - user is typing if there's content
								// setTypingState(value.length > 0);
							}}
						/>
					</Box>
				</Box>

				{/* Helper text */}
				<Box marginTop={1}>
					<Text dimColor>
						Press Enter to submit • Ctrl+V to paste • ↑↓ arrows for history
					</Text>
				</Box>
			</Box>

			{/* Command suggestions - positioned to not affect main layout */}
			{autocomplete.length > 0 && (
				<Box marginLeft={2} marginTop={1} flexDirection="column">
					{autocomplete.map((item, index) => (
						<Text
							key={item.name}
							color={index === selectedIndex ? 'cyan' : 'white'}
						>
							{index === selectedIndex ? '► ' : '  '}/{item.name} -{' '}
							{item.description}
						</Text>
					))}
				</Box>
			)}

			{/* Status bar - always visible at consistent position */}
			<Box marginLeft={2} marginTop={1} flexDirection="row" gap={4}>
				{gitBranch && <Text color="white">Branch: {gitBranch}</Text>}
				<Text color="white">
					Session: {sessionManager.getSessionId().slice(-8)}
				</Text>
				{modelManager.hasDefaultModel() && (
					<Text color="white">
						Model:{' '}
						{modelManager.formatModelDisplay(modelManager.getDefaultModel()!)}
					</Text>
				)}
				{!modelManager.hasDefaultModel() && (
					<Text color="red">Model: None (use /models set to configure)</Text>
				)}
				<TokenUsageDisplay
					compact={true}
					sessionTotal={{
						total_tokens: tokenUsage.total_tokens,
					}}
				/>
			</Box>
		</Box>
	);
};

export default InputComponent;
