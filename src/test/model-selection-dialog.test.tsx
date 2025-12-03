import React from 'react';
import test from 'ava';
import {render} from 'ink-testing-library';
import ModelSelectionDialog from '../ui/components/ModelSelectionDialog.js';
import {LLMService} from '../core/api/llm/LLMService.js';
import {ModelManager} from '../core/api/modelManager.js';
import {ModelsResponse} from '../interfaces/sessions.js';

// Mock LLMService
const mockLLMService = {
	getAllModels: async () =>
		({
			status: 'success',
			message: 'ok',
			data: {
				providers: {
					openai: {
						provider_name: 'openai',
						models: {
							'gpt-4': {
								name: 'gpt-4',
								display_name: 'GPT-4',
								description: 'Powerful model',
								context_length: 8192,
								input_cost_per_1k: 0.03,
								output_cost_per_1k: 0.06,
								supports_tools: true,
								supports_images: false,
								max_output_tokens: 4096,
							},
						},
					},
				},
			},
		} as ModelsResponse),
} as unknown as LLMService;

// Mock ModelManager
const mockModelManager = {} as unknown as ModelManager;

test.skip('ModelSelectionDialog renders loading state', t => {
	// Create a promise that never resolves to keep it loading
	const loadingLLMService = {
		getAllModels: () => new Promise(() => {}),
	} as unknown as LLMService;

	const {lastFrame} = render(
		<ModelSelectionDialog
			llmService={loadingLLMService}
			modelManager={mockModelManager}
			onModelSelected={() => {}}
			onCancel={() => {}}
		/>,
	);
	t.true(
		lastFrame()?.includes('Loading Available Models'),
		`Actual frame: ${lastFrame()}`,
	);
});

test.skip('ModelSelectionDialog renders models', async t => {
	const {lastFrame} = render(
		<ModelSelectionDialog
			llmService={mockLLMService}
			modelManager={mockModelManager}
			onModelSelected={() => {}}
			onCancel={() => {}}
		/>,
	);

	// Wait for models to load
	await new Promise(resolve => setTimeout(resolve, 100)); // Simple wait since we can't await render easily in ava without async helper

	// Check if model is rendered (might need to check frame content if findByText fails in this env)
	t.true(lastFrame()?.includes('GPT-4'), `Actual frame: ${lastFrame()}`); // This is safer
});
