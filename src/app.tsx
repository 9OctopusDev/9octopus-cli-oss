
import React, { useEffect, useState } from 'react';
import HomeComponent from './ui/components/HomeComponent.js';
import HistoryComponent from './ui/components/HistoryComponent.js';
import { Box, Text } from 'ink';
import useHistoryDisplay from './hooks/historyDisplay.js';
import InputComponent from './ui/components/InputComponent.js';
import { CommandAgregator } from './core/commands/commands.js';
import { SessionManager } from './core/api/sessionManager.js';
import { ModelManager } from './core/api/modelManager.js';
import { BackendApiService } from './core/api/backendApiService.js';
import { ConfigManager } from './core/configs/configManager.js';
import { LoginCommand } from './core/commands/loginCommand.js';
import { LogoutCommand } from './core/commands/logoutCommand.js';
import { ClearCommand } from './core/commands/clearCommand.js';
import { ModelsCommand } from './core/commands/modelsCommand.js';
import { InitCommand } from './core/commands/initCommand.js';
import { UpgradeCommand } from './core/commands/upgradeCommand.js';
import { InputProvider } from './ui/contexts/InputContext.js';
import { ToolManager } from './core/tools/ToolManager.js';
import { AuthenticationManager, AuthenticationState } from './core/auth/authenticationManager.js';
import { ShellTool } from './core/tools/ShellTool.js';
import { ReadFileTool } from './core/tools/ReadFileTool.js';
import { WriteFileTool } from './core/tools/WriteFileTool.js';
import { SearchTool } from './core/tools/SearchTool.js';
import { ToolExecutionRequest } from './interfaces/tools.js';
import ToolRequestComponent from './ui/components/ToolRequestDialog.js';
import ModelSelectionDialog from './ui/components/ModelSelectionDialog.js';
import AuthenticationDialog from './ui/components/AuthenticationDialog.js';

const commandAgregator = new CommandAgregator();
const sessionManager = new SessionManager();
const backendApiService = new BackendApiService(sessionManager.getSessionId());
const configManager = new ConfigManager();
const modelManager = new ModelManager(configManager, backendApiService);
const toolManager = new ToolManager(backendApiService);
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
		// commandAgregator.addCommand(new WhoamiCommand());
		// commandAgregator.addCommand(new StatusCommand());
		commandAgregator.addCommand(new ClearCommand(sessionManager));
		commandAgregator.addCommand(
			new ModelsCommand(backendApiService, modelManager),
		);
		commandAgregator.addCommand(
			new InitCommand(backendApiService, sessionManager),
		);
		commandAgregator.addCommand(new UpgradeCommand());
	}, []);

	const [pendingTool, setPendingTool] = useState<ToolExecutionRequest | null>(
		null,
	);

	const [authState, setAuthState] = useState<AuthenticationState>({
		isAuthenticating: false,
		authMode: 'device',
		status: 'initializing',
	});

	const [showModelSelection, setShowModelSelection] = useState<{
		backendApiService: BackendApiService;
		modelManager: ModelManager;
	} | null>(null);

	const { history, addHistoryItem, clearHistory } =
		useHistoryDisplay();

	useEffect(() => {
		authManager.setAuthStateCallback(setAuthState);
	}, []);

	backendApiService.setToolRequestCallback(toolRequest => {
		// Create enhanced tool request message with arguments preview
		// Log when a tool is requested
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
	backendApiService.setTokenUsageUpdateCallback((tokenUsage: any) => {
		sessionManager.updateTokenUsage(tokenUsage);
	});

	// Handle model selection completion
	const handleModelSelected = async (provider: string, modelName: string) => {
		try {
			const result = await modelManager.setDefaultModel(provider, modelName, false);

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
			<Box flexDirection="column">
				<HomeComponent />
				<HistoryComponent history={history} />

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
						backendApiService={showModelSelection.backendApiService}
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

				<InputProvider>
					<InputComponent
						addHistoryItem={addHistoryItem}
						commandAgregator={commandAgregator}
						sessionManager={sessionManager}
						modelManager={modelManager}
						clearHistory={clearHistory}
					/>
				</InputProvider>

				<Text>{'\n'}</Text>
			</Box>
		</>
	);
}
