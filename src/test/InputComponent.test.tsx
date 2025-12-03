import React from 'react';
import {render} from 'ink-testing-library';
import test from 'ava';
import InputComponent from '../ui/components/InputComponent.js';
import {CommandAgregator} from '../core/commands/commands.js';
import {SessionManager} from '../core/api/sessionManager.js';
import {ModelManager} from '../core/api/modelManager.js';
import {ToolManager} from '../core/tools/ToolManager.js';
import {ConfigManager} from '../core/configs/configManager.js';
import {ServiceFactory} from '../core/api/llm/ServiceFactory.js';

// Mock dependencies
const commandAgregator = new CommandAgregator();
const sessionManager = new SessionManager();
const llmService = ServiceFactory.createService('test-session');
const configManager = new ConfigManager();
const modelManager = new ModelManager(configManager, llmService);
const toolManager = new ToolManager(llmService);

const noop = () => {};

test('InputComponent renders correctly', t => {
	const {lastFrame} = render(
		<InputComponent
			addHistoryItem={noop}
			commandAgregator={commandAgregator}
			sessionManager={sessionManager}
			modelManager={modelManager}
			toolManager={toolManager}
			clearHistory={noop}
			setLoading={noop}
			setShowModelSelection={noop}
		/>,
	);

	t.true(lastFrame()?.includes('>'));
});
