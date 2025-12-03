import {
	SlashCommand,
	SlashCommandSubCommand,
} from '../../interfaces/slashCommands.js';
import {LLMService} from '../api/llm/LLMService.js';
import {ModelManager} from '../api/modelManager.js';

export class ModelsCommand implements SlashCommand {
	name = 'models';
	description = 'Manage and discover AI models';

	/**
	 * Safely format numbers for display, handling undefined values
	 */
	private formatNumber(value: number | undefined | null): string {
		if (value === undefined || value === null || isNaN(value)) {
			return '0';
		}
		return value.toLocaleString();
	}
	subcommands: SlashCommandSubCommand[] = [
		{
			name: 'list',
			description: 'List all available models from all providers',
			options: [],
			action: () => {},
		},
		{
			name: 'provider',
			description:
				'List models for a specific provider (anthropic, openai, google)',
			options: [
				{
					name: '<provider_name>',
					description: 'Provider name (anthropic, openai, google)',
					type: 'string',
				},
			],
			action: () => {},
		},
		{
			name: 'details',
			description: 'Show detailed information about a specific model',
			options: [
				{
					name: '<provider>',
					description: 'Provider name',
					type: 'string',
				},
				{
					name: '<model_name>',
					description: 'Model name',
					type: 'string',
				},
			],
			action: () => {},
		},
		{
			name: 'pricing',
			description: 'Show pricing comparison of all models',
			options: [],
			action: () => {},
		},
		{
			name: 'validate',
			description: 'Validate if a model selection is supported',
			options: [
				{
					name: '<model_type>',
					description: 'Model type/provider',
					type: 'string',
				},
				{
					name: '<model_version>',
					description: 'Model version/name',
					type: 'string',
				},
			],
			action: () => {},
		},
		{
			name: 'set',
			description: 'Set default model (interactive selector if no args)',
			options: [
				{
					name: '[provider]',
					description: 'Provider name (optional)',
					type: 'string',
				},
				{
					name: '[model]',
					description: 'Model name (optional)',
					type: 'string',
				},
			],
			action: () => {},
		},
		{
			name: 'default',
			description: 'Manage default model settings',
			options: [
				{
					name: '[get|set|clear]',
					description: 'Action to perform',
					type: 'string',
				},
			],
			action: () => {},
		},
		{
			name: 'help',
			description: 'Show detailed help information',
			options: [],
			action: () => {},
		},
	];

	constructor(
		private llmService: LLMService,
		private modelManager: ModelManager,
	) {}

	async action(args: string[], context?: any): Promise<void> {
		const subcommand = args[0] || 'list';

		try {
			switch (subcommand) {
				case 'list':
					await this.listAllModels(context);
					break;
				case 'provider':
					if (args[1]) {
						await this.listProviderModels(args[1], context);
					} else {
						context?.addHistoryItem({
							id: new Date().toLocaleDateString(),
							role: 'system',
							content:
								'Provider name required. Usage: /models provider <provider_name>',
							timestamp: new Date(),
						});
					}
					break;
				case 'details':
					if (args[1] && args[2]) {
						await this.getModelDetails(args[1], args[2], context);
					} else {
						context?.addHistoryItem({
							id: new Date().toLocaleDateString(),
							role: 'system',
							content:
								'Provider and model name required. Usage: /models details <provider> <model_name>',
							timestamp: new Date(),
						});
					}
					break;
				case 'pricing':
					await this.getPricing(context);
					break;
				case 'validate':
					if (args[1] && args[2]) {
						await this.validateModel(args[1], args[2], context);
					} else {
						context?.addHistoryItem({
							id: new Date().toLocaleDateString(),
							role: 'system',
							content:
								'Model type and version required. Usage: /models validate <model_type> <model_version>',
							timestamp: new Date(),
						});
					}
					break;
				case 'set':
					if (args[1] && args[2]) {
						// /models set <provider> <model>
						await this.setDefaultModel(args[1], args[2], context);
					} else {
						// /models set (without arguments) - trigger selection dialog
						this.triggerModelSelectionDialog(context);
					}
					break;
				case 'default':
					if (args[1] === 'set' && args[2] && args[3]) {
						await this.setDefaultModel(args[2], args[3], context);
					} else if (args[1] === 'set' && (!args[2] || !args[3])) {
						// Trigger model selection dialog when set is called without both arguments
						this.triggerModelSelectionDialog(context);
					} else if (args[1] === 'get' || !args[1]) {
						this.getDefaultModel(context);
					} else if (args[1] === 'clear') {
						this.clearDefaultModel(context);
					} else {
						context?.addHistoryItem({
							id: new Date().toLocaleDateString(),
							role: 'system',
							content:
								'Usage: /models default [get|set <model_type> <model_version>|clear]',
							timestamp: new Date(),
						});
					}
					break;
				case 'help':
					this.showHelp(context);
					break;
				default:
					context?.addHistoryItem({
						id: new Date().toLocaleDateString(),
						role: 'system',
						content: `Unknown models command: ${subcommand}. Use /models help for available commands.`,
						timestamp: new Date(),
					});
			}
		} catch (error) {
			context?.addHistoryItem({
				id: new Date().toLocaleDateString(),
				role: 'system',
				content: `Models command failed: ${
					error instanceof Error ? error.message : String(error)
				}`,
				timestamp: new Date(),
			});
		}
	}

	private async listAllModels(context?: any): Promise<void> {
		try {
			const response = await this.llmService.getAllModels();

			if (response.status === 'success' && response.data.providers) {
				let output = '# Available Models\n\n';

				for (const [, provider] of Object.entries(response.data.providers)) {
					output += `## ${provider.provider_name} (${
						provider.total_models || Object.keys(provider.models).length
					} models)\n\n`;

					for (const [, model] of Object.entries(provider.models)) {
						const defaultBadge = model.is_default ? ' **[DEFAULT]**' : '';
						output += `### ${model.display_name}${defaultBadge}\n`;
						output += `- **ID**: \`${model.name}\`\n`;
						output += `- **Description**: ${model.description}\n`;
					}
				}

				context?.addHistoryItem({
					id: new Date().toLocaleDateString(),
					role: 'system',
					content: output,
					timestamp: new Date(),
				});
			} else {
				context?.addHistoryItem({
					id: new Date().toLocaleDateString(),
					role: 'system',
					content: 'Failed to retrieve models',
					timestamp: new Date(),
				});
			}
		} catch (error) {
			context?.addHistoryItem({
				id: new Date().toLocaleDateString(),
				role: 'system',
				content: `Models command failed: ${
					error instanceof Error ? error.message : String(error)
				}`,
				timestamp: new Date(),
			});
		}
	}

	private async listProviderModels(
		provider: string,
		context?: any,
	): Promise<void> {
		try {
			const response = await this.llmService.getModelsByProvider(provider);

			if (response.status === 'success' && response.data.models) {
				let output = `# ${response.data.provider_name} Models\n\n`;
				output += `**Total Models**: ${response.data.total_models}\n\n`;

				for (const [, model] of Object.entries(response.data.models)) {
					const defaultBadge = model.is_default ? ' **[DEFAULT]**' : '';
					output += `## ${model.display_name}${defaultBadge}\n`;
					output += `- **ID**: \`${model.name}\`\n`;
					output += `- **Description**: ${model.description}\n`;
				}

				context?.addHistoryItem({
					id: new Date().toLocaleDateString(),
					role: 'system',
					content: output,
					timestamp: new Date(),
				});
			} else {
				context?.addHistoryItem({
					id: new Date().toLocaleDateString(),
					role: 'system',
					content: `No models found for provider: ${provider}`,
					timestamp: new Date(),
				});
			}
		} catch (error) {
			context?.addHistoryItem(
				'Models Error',
				`Models command failed: ${
					error instanceof Error ? error.message : String(error)
				}`,
				'text',
			);
		}
	}

	private async getModelDetails(
		provider: string,
		modelName: string,
		context?: any,
	): Promise<void> {
		try {
			const response = await this.llmService.getSpecificModel(
				provider,
				modelName,
			);

			if (response.status === 'success' && response.data.model) {
				const model = response.data.model;
				let output = `# ${model.display_name} Details\n\n`;
				output += `**Provider**: ${response.data.provider}\n`;
				output += `**Model ID**: \`${model.name}\`\n`;
				output += `**Description**: ${model.description}\n\n`;

				output += `## Capabilities\n`;
				output += `- **Context Length**: ${this.formatNumber(
					model.context_length,
				)} tokens\n`;
				output += `- **Max Output**: ${this.formatNumber(
					model.max_output_tokens,
				)} tokens\n`;

				if (model.is_default) {
					output += `- **Status**: 🌟 Default model for ${provider}\n`;
				}
				output += '\n';

				if (response.data.pricing) {
					output += `## Pricing\n`;
					output += `- **Input**: $${response.data.pricing.input_cost_per_1k_tokens}/1K tokens\n`;
					output += `- **Output**: $${response.data.pricing.output_cost_per_1k_tokens}/1K tokens\n`;
					output += `- **Currency**: ${response.data.pricing.currency}\n\n`;
				}

				context?.addHistoryItem({
					id: new Date().toLocaleDateString(),
					role: 'system',
					content: output,
					timestamp: new Date(),
				});
			} else {
				context?.addHistoryItem({
					id: new Date().toLocaleDateString(),
					role: 'system',
					content: `Model ${modelName} not found for provider ${provider}`,
					timestamp: new Date(),
				});
			}
		} catch (error) {
			throw error;
		}
	}

	private async getPricing(context?: any): Promise<void> {
		try {
			const response = await this.llmService.getPricingComparison();

			if (response.status === 'success' && response.data.pricing_comparison) {
				let output = `# Model Pricing Comparison\n\n`;
				output += `**Currency**: ${response.data.currency}\n`;
				output += `**Last Updated**: ${response.data.last_updated}\n`;
				if (response.data.note) {
					output += `**Note**: ${response.data.note}\n`;
				}
				output += '\n';

				output += `| Rank | Model | Provider | Input Cost/1K | Output Cost/1K | Context | Efficiency Ratio |\n`;
				output += `|------|--------|----------|---------------|----------------|---------|------------------|\n`;

				response.data.pricing_comparison.forEach((model, index) => {
					output += `| ${index + 1} | ${model.display_name} | ${
						model.provider
					} | $${model.input_cost_per_1k} | $${
						model.output_cost_per_1k
					} | ${this.formatNumber(
						model.context_length,
					)} | ${model.cost_effectiveness_ratio.toFixed(0)} |\n`;
				});

				context?.addHistoryItem({
					id: new Date().toLocaleDateString(),
					role: 'system',
					content: output,
					timestamp: new Date(),
				});
			} else {
				context?.addHistoryItem({
					id: new Date().toLocaleDateString(),
					role: 'system',
					content: 'Failed to retrieve pricing comparison',
					timestamp: new Date(),
				});
			}
		} catch (error) {
			throw error;
		}
	}

	private async validateModel(
		modelType: string,
		modelVersion: string,
		context?: any,
	): Promise<void> {
		try {
			const response = await this.llmService.validateModel(
				modelType,
				modelVersion,
			);

			if (response.status === 'success') {
				let output = `# Model Validation Result\n\n`;
				output += `**Model Type**: ${response.data.model_type}\n`;
				output += `**Model Version**: ${response.data.model_version}\n`;
				output += `**Valid**: ${response.data.valid ? '✅ Yes' : '❌ No'}\n\n`;

				if (response.data.valid && response.data.model_info) {
					const info = response.data.model_info;
					output += `## Model Information\n`;
					output += `**Display Name**: ${info.display_name}\n`;
					output += `**Description**: ${info.description}\n`;
				}

				context?.addHistoryItem({
					id: new Date().toLocaleDateString(),
					role: 'system',
					content: output,
					timestamp: new Date(),
				});
			} else {
				context?.addHistoryItem({
					id: new Date().toLocaleDateString(),
					role: 'system',
					content: `Model validation failed: ${response.message}`,
					timestamp: new Date(),
				});
			}
		} catch (error) {
			throw error;
		}
	}

	private async setDefaultModel(
		modelType: string,
		modelVersion: string,
		context?: any,
	): Promise<void> {
		try {
			// Use ModelManager to set default model without backend validation
			const result = await this.modelManager.setDefaultModel(
				modelType,
				modelVersion,
				false, // Don't validate with backend for offline usage
			);

			if (result.success) {
				let output = `# Default Model Set

				**Provider**: ${modelType}
				**Model**: ${modelVersion}
				**Status**: Saved locally

				The default model will be used when no model is specified in chat commands.
				Model capabilities will be determined when first used.`;

				context?.addHistoryItem({
					id: new Date().toLocaleDateString(),
					role: 'system',
					content: output,
					timestamp: new Date(),
				});
			} else {
				context?.addHistoryItem({
					id: new Date().toLocaleDateString(),
					role: 'system',
					content: `Failed to set default model: ${result.error}`,
					timestamp: new Date(),
				});
			}
		} catch (error) {
			context?.addHistoryItem({
				id: new Date().toLocaleDateString(),
				role: 'system',
				content: `Failed to set default model: ${
					error instanceof Error ? error.message : String(error)
				}`,
				timestamp: new Date(),
			});
		}
	}

	private getDefaultModel(context?: any): void {
		const defaultModel = this.modelManager.getDefaultModel();
		const configDir = this.modelManager.getConfigManager().getConfigDir();

		if (!defaultModel) {
			let output = `No default model set. Use \`/models default set <provider> <model>\` to set one.

			**Environment Variables** (only used on first setup):
			- \`DEFAULT_PROVIDER=anthropic\`
			- \`DEFAULT_MODEL=claude-3-5-sonnet\`

			Config stored in: ${configDir}/config.json`;

			context?.addHistoryItem({
				id: new Date().toLocaleDateString(),
				role: 'system',
				content: output,
				timestamp: new Date(),
			});

			return;
		}

		let output = `# Current Default Model

		**Provider**: ${defaultModel.provider}
		**Model**: ${defaultModel.model_name}
		**Config Location**: ${configDir}/config.json

		The model capabilities (context length, tool support) will be determined when first used.`;

		context?.addHistoryItem({
			id: new Date().toLocaleDateString(),
			role: 'system',
			content: output,
			timestamp: new Date(),
		});
	}

	private clearDefaultModel(context?: any): void {
		const hadDefault = this.modelManager.hasDefaultModel();
		this.modelManager.clearDefaultModel();

		let output = hadDefault
			? 'Default model cleared successfully.'
			: 'No default model was set.';

		context?.addHistoryItem({
			id: new Date().toLocaleDateString(),
			role: 'system',
			content: output,
			timestamp: new Date(),
		});
	}

	private triggerModelSelectionDialog(context?: any): void {
		// Set a flag in context to trigger the model selection dialog
		if (context?.setShowModelSelection) {
			context.setShowModelSelection({
				llmService: this.llmService,
				modelManager: this.modelManager,
			});
		} else {
			// Fallback to manual instruction if dialog system not available

			let output = `# Select Default Model

			To set a default model, you can either:

			1. **Use the interactive selector**: The model selection dialog should appear automatically
			2. **Manual format**: \`/models default set <provider> <model>\`

			**Examples**:
			- \`/models default set anthropic claude-3-5-sonnet\`
			- \`/models default set openai gpt-4\`
			- \`/models default set google gemini-1.5-flash\`

			First, list available models with \`/models list\` to see all options.`;

			context?.addHistoryItem({
				id: new Date().toLocaleDateString(),
				role: 'system',
				content: output,
				timestamp: new Date(),
			});
		}
	}

	private showHelp(context?: any): void {
		const output = `# Models Command Help

The \`/models\` command provides access to AI model management and discovery features.

## Available Subcommands

### \`/models list\` or \`/models\`
Lists all available models from all providers with their capabilities and pricing.

### \`/models provider <provider_name>\`
Lists all models for a specific provider (anthropic, openai, google).
**Example**: \`/models provider anthropic\`

### \`/models details <provider> <model_name>\`
Shows detailed information about a specific model.
**Example**: \`/models details anthropic claude-3-5-sonnet\`

### \`/models pricing\`
Shows a pricing comparison of all models sorted by cost-effectiveness.

### \`/models validate <model_type> <model_version>\`
Validates if a model selection is supported and shows model information.
**Example**: \`/models validate anthropic claude-3-5-sonnet\`

### \`/models set [provider] [model]\`
Quick way to set the default model. If no arguments provided, opens interactive selection dialog.
**Examples**:
- \`/models set\` - Opens interactive model selector
- \`/models set anthropic claude-3-5-sonnet\` - Sets model directly

### \`/models default [get|set|clear]\`
Manage the default model used when no model is specified in chat commands.
**Persistent**: Saved locally in ~/.octopus/config.json (no backend validation required)
- **get**: Shows the current default model (default action)
- **set <provider> <model>**: Sets a new default model
- **clear**: Clears the current default model

**Environment Variables** (only used on first setup): 
- Set \`DEFAULT_PROVIDER\` and \`DEFAULT_MODEL\` to auto-configure initial default model

**Examples**: 
- \`/models default\` or \`/models default get\`
- \`/models default set anthropic claude-3-5-sonnet\`
- \`/models default clear\`

### \`/models help\`
Shows this help information.

## Examples

\`\`\`
/models                                    # List all models
/models provider openai                    # List OpenAI models
/models details google gemini-1.5-flash   # Get Gemini Flash details
/models pricing                            # Compare pricing
/models validate anthropic claude-3-5-haiku  # Validate model
/models set                                # Interactive model selector
/models set anthropic claude-3-5-sonnet   # Set default model (direct)
/models default set anthropic claude-3-5-sonnet  # Set default model (full syntax)
/models default                            # Show current default
/models default clear                      # Clear default model
\`\`\`
`;

		context?.addHistoryItem({
			id: new Date().toLocaleDateString(),
			role: 'system',
			content: output,
			timestamp: new Date(),
		});
	}
}
