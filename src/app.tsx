import React, {useEffect, useState} from 'react';
import HistoryComponent from './ui/components/HistoryComponent.js';
import {Box, Text} from 'ink';
import useHistoryDisplay from './hooks/historyDisplay.js';
import InputComponent from './ui/components/InputComponent.js';
import {CommandAgregator} from './core/commands/commands.js';
import {SessionManager} from './core/api/sessionManager.js';
import {ModelManager} from './core/api/modelManager.js';
import {ConfigManager} from './core/configs/configManager.js';
import {LoginCommand} from './core/commands/loginCommand.js';
import {LogoutCommand} from './core/commands/logoutCommand.js';
import {ClearCommand} from './core/commands/clearCommand.js';
import {ModelsCommand} from './core/commands/modelsCommand.js';
import {InitCommand} from './core/commands/initCommand.js';
import {UpgradeCommand} from './core/commands/upgradeCommand.js';
import {InputProvider} from './ui/contexts/InputContext.js';
import {ToolManager} from './core/tools/ToolManager.js';
import {
	AuthenticationManager,
	AuthenticationState,
} from './core/auth/authenticationManager.js';
import {ShellTool} from './core/tools/ShellTool.js';
import {ReadFileTool} from './core/tools/ReadFileTool.js';
import {WriteFileTool} from './core/tools/WriteFileTool.js';
import {SearchTool} from './core/tools/SearchTool.js';
import {ToolExecutionRequest} from './interfaces/tools.js';
import ToolRequestComponent from './ui/components/ToolRequestDialog.js';
import ModelSelectionDialog from './ui/components/ModelSelectionDialog.js';
import AuthenticationDialog from './ui/components/AuthenticationDialog.js';
import LoadingComponent from './ui/components/LoadingComponent.js';

import {ServiceFactory} from './core/api/llm/ServiceFactory.js';

const commandAgregator = new CommandAgregator();
const sessionManager = new SessionManager();
const llmService = ServiceFactory.createService(sessionManager.getSessionId());
const configManager = new ConfigManager();
const modelManager = new ModelManager(configManager, llmService);
const toolManager = new ToolManager(llmService);
const authManager = AuthenticationManager.getInstance();

export default function App() {
	useEffect(() => {
		// Register tools
		toolManager.registerTool(new ShellTool());
		toolManager.registerTool(new ReadFileTool());
		toolManager.registerTool(new WriteFileTool());
		toolManager.registerTool(new SearchTool());

		// Register commands
		commandAgregator.addCommand(new LoginCommand());
		commandAgregator.addCommand(new LogoutCommand());
		commandAgregator.addCommand(new ClearCommand(sessionManager));
		commandAgregator.addCommand(new ModelsCommand(llmService, modelManager));
		commandAgregator.addCommand(new InitCommand(modelManager, sessionManager));
		commandAgregator.addCommand(new UpgradeCommand());
	}, []);

	const [pendingTool, setPendingTool] = useState<ToolExecutionRequest | null>(
		null,
	);

	const [loading, setLoading] = useState<Boolean>(false);

	const [authState, setAuthState] = useState<AuthenticationState>({
		isAuthenticating: false,
		authMode: 'device',
		status: 'initializing',
	});

	const [showModelSelection, setShowModelSelection] = useState<{
		llmService: any;
		modelManager: ModelManager;
	} | null>(null);

	const {history, addHistoryItem, clearHistory} = useHistoryDisplay();

	useEffect(() => {
		authManager.setAuthStateCallback(setAuthState);
	}, []);

	modelManager.setStatusUpdateCallback(message => {
		console.log(message);
		// setLoading(false);
	});

	modelManager.setOnUpdateCallback((action, details) => {
		// Track when we start getting responses
		setLoading(false);
		if (action === 'Response' && details) {
			addHistoryItem({
				id: new Date().toLocaleDateString(),
				role: 'assistant',
				content: details,
				timestamp: new Date(),
			});
		}
	});

	modelManager.setToolRequestCallback(toolRequest => {
		// Create enhanced tool request message with arguments preview
		// Log when a tool is requested
		setLoading(false);
		addHistoryItem({
			id: new Date().toLocaleDateString(),
			role: 'system',
			content: 'Tool requested: ' + toolRequest.name,
			timestamp: new Date(),
		});

		// Show approval dialog
		setPendingTool(toolRequest);
	});

	// Set up token usage update callback
	modelManager.setTokenUsageUpdateCallback((tokenUsage: any) => {
		sessionManager.updateTokenUsage(tokenUsage);
	});

	// Handle model selection completion
	const handleModelSelected = async (provider: string, modelName: string) => {
		try {
			const result = await modelManager.setDefaultModel(
				provider,
				modelName,
				false,
			);

			if (result.success) {
				addHistoryItem({
					id: new Date().toLocaleDateString(),
					role: 'system',
					content: 'Model Set: ' + provider + '/' + modelName,
					timestamp: new Date(),
				});
			} else {
				addHistoryItem({
					id: new Date().toLocaleDateString(),
					role: 'system',
					content: 'Model Set Error: ' + result.error,
					timestamp: new Date(),
				});
			}
		} catch (error) {
			addHistoryItem({
				id: new Date().toLocaleDateString(),
				role: 'system',
				content: 'Model Set Error: ' + String(error),
				timestamp: new Date(),
			});
		} finally {
			setShowModelSelection(null);
		}
	};

	const handleModelSelectionCancel = () => {
		addHistoryItem({
			id: new Date().toLocaleDateString(),
			role: 'system',
			content: 'Model Selection Cancelled',
			timestamp: new Date(),
		});
		setShowModelSelection(null);
	};

	return (
		<>
			{/* Static History Log - Prints once and scrolls up */}
			{!pendingTool && !showModelSelection && !authState.isAuthenticating && (
				<HistoryComponent history={history} />
			)}

			{/* Dynamic UI Area - Stays at the bottom */}
			<Box flexDirection="column">
				{loading && <LoadingComponent />}

				{/* Dialogs - displayed inline below history */}
				{pendingTool && (
					<ToolRequestComponent
						toolRequest={pendingTool}
						sessionManager={sessionManager}
						setPendingTool={setPendingTool}
						addHistoryItem={addHistoryItem}
						toolManager={toolManager}
					/>
				)}

				{showModelSelection && (
					<ModelSelectionDialog
						llmService={showModelSelection.llmService}
						modelManager={showModelSelection.modelManager}
						onModelSelected={handleModelSelected}
						onCancel={handleModelSelectionCancel}
					/>
				)}

				{authState.isAuthenticating && (
					<AuthenticationDialog
						isVisible={authState.isAuthenticating}
						authMode={authState.authMode}
						deviceInfo={authState.deviceInfo}
						status={authState.status}
						statusMessage={authState.statusMessage}
						errorMessage={authState.errorMessage}
						onClose={() => authManager.closeAuthDialog()}
					/>
				)}

				{!pendingTool && !showModelSelection && !authState.isAuthenticating && (
					<InputProvider>
						<InputComponent
							addHistoryItem={addHistoryItem}
							commandAgregator={commandAgregator}
							sessionManager={sessionManager}
							modelManager={modelManager}
							toolManager={toolManager}
							clearHistory={clearHistory}
							setLoading={setLoading}
							setShowModelSelection={setShowModelSelection}
						/>
					</InputProvider>
				)}

				<Text>{'\n'}</Text>
			</Box>
		</>
	);
}
