import React, {useEffect, useState} from 'react';
import {Box, Text, useInput} from 'ink';
import {LLMService} from '../../core/api/llm/LLMService.js';
import {ModelManager} from '../../core/api/modelManager.js';

interface ModelSelectionDialogProps {
	llmService: LLMService;
	modelManager: ModelManager;
	onModelSelected: (provider: string, modelName: string) => void;
	onCancel: () => void;
}

interface ModelOption {
	provider: string;
	modelName: string;
	displayName: string;
	description: string;
}

const ModelSelectionDialog: React.FC<ModelSelectionDialogProps> = ({
	llmService,
	modelManager: _,
	onModelSelected,
	onCancel,
}) => {
	const [models, setModels] = useState<ModelOption[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedIndex, setSelectedIndex] = useState(0);

	useEffect(() => {
		loadAvailableModels();
	}, []);

	// Handle keyboard navigation
	useInput((_, key) => {
		if (key.escape) {
			onCancel();
		} else if (key.upArrow) {
			setSelectedIndex(prev => (prev > 0 ? prev - 1 : models.length - 1));
		} else if (key.downArrow) {
			setSelectedIndex(prev => (prev < models.length - 1 ? prev + 1 : 0));
		} else if (key.return) {
			const selectedModel = models[selectedIndex];
			if (selectedModel) {
				onModelSelected(
					selectedModel.provider.toLowerCase(),
					selectedModel.modelName,
				);
			}
		}
	});

	const loadAvailableModels = async () => {
		try {
			setIsLoading(true);
			const response = await llmService.getAllModels();

			if (
				response.status === 'success' &&
				response.data &&
				response.data.providers
			) {
				const modelOptions: ModelOption[] = [];

				for (const [, provider] of Object.entries(response.data.providers)) {
					if (!provider || !provider.models || !provider.provider_name) {
						continue; // Skip invalid providers
					}

					for (const [, model] of Object.entries(provider.models)) {
						if (!model || !model.name || !model.display_name) {
							continue; // Skip invalid models
						}

						modelOptions.push({
							provider: provider.provider_name,
							modelName: model.name,
							displayName: model.display_name || model.name,
							description: model.description || 'No description available',
						});
					}
				}

				// Sort models by provider, then by display name
				modelOptions.sort((a, b) => {
					if (a.provider !== b.provider) {
						return a.provider.localeCompare(b.provider);
					}
					return a.displayName.localeCompare(b.displayName);
				});

				if (modelOptions.length === 0) {
					setError('No models found. The API may not be returning model data.');
				} else {
					setModels(modelOptions);
					setSelectedIndex(0); // Reset to first item
				}
			} else {
				setError(
					`Failed to load available models. Response status: ${
						response.status
					}, has providers: ${!!response.data?.providers}`,
				);
			}
		} catch (err) {
			setError(
				`Error loading models: ${
					err instanceof Error ? err.message : String(err)
				}`,
			);
		} finally {
			setIsLoading(false);
		}
	};

	if (isLoading) {
		return (
			<Box
				flexDirection="column"
				borderStyle="round"
				borderColor="cyan"
				padding={1}
			>
				<Text color="cyan" bold>
					Loading Available Models...
				</Text>
				<Text color="gray">
					Please wait while we fetch the list of available models.
				</Text>
			</Box>
		);
	}

	if (error) {
		return (
			<Box
				flexDirection="column"
				borderStyle="round"
				borderColor="red"
				padding={1}
			>
				<Text color="red" bold>
					Error Loading Models
				</Text>
				<Text color="white">{error}</Text>
				<Box marginTop={1}>
					<Text color="gray">
						Press ESC to cancel or try using the manual format:
					</Text>
				</Box>
				<Text color="blue">
					/models default set &lt;provider&gt; &lt;model&gt;
				</Text>
			</Box>
		);
	}

	return (
		<Box
			flexDirection="column"
			borderStyle="round"
			borderColor="cyan"
			padding={1}
		>
			<Text color="cyan" bold>
				Select Default Model
			</Text>
			<Box marginBottom={1}>
				<Text color="gray">
					Choose a model to set as your default. Use ↑↓ arrows to navigate,
					Enter to select, ESC to cancel.
				</Text>
			</Box>

			<Box flexDirection="column" height={10}>
				{models
					.slice(Math.max(0, selectedIndex - 4), selectedIndex + 6)
					.map((model, displayIndex) => {
						const actualIndex = Math.max(0, selectedIndex - 4) + displayIndex;
						return (
							<Text
								key={actualIndex}
								color={actualIndex === selectedIndex ? 'cyan' : 'white'}
							>
								{actualIndex === selectedIndex ? '> ' : '  '}
								{model.provider} - {model.displayName}
							</Text>
						);
					})}
				{models.length > 10 && (
					<Text color="gray">
						... ({selectedIndex + 1} of {models.length})
					</Text>
				)}
			</Box>

			<Box marginTop={1}>
				<Text color="gray">Total: {models.length} models available</Text>
			</Box>
		</Box>
	);
};

export default ModelSelectionDialog;
