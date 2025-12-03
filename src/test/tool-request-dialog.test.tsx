import React from 'react';
import test from 'ava';
import {render} from 'ink-testing-library';
import ToolRequestDialog from '../ui/components/ToolRequestDialog.js';
import {SessionManager} from '../core/api/sessionManager.js';
import {ToolManager} from '../core/tools/ToolManager.js';
import {ToolExecutionRequest} from '../interfaces/tools.js';

// Mock SessionManager
const mockSessionManager = {
	getToolApproval: () => null,
	addToolApproval: () => {},
} as unknown as SessionManager;

// Mock ToolManager
const mockToolManager = {
	executeToolRequests: () => {},
} as unknown as ToolManager;

test.skip('ToolRequestDialog renders request details', t => {
	const request: ToolExecutionRequest = {
		id: 'req-1',
		name: 'read_file',
		args: {path: '/tmp/test.txt'},
		approved: false,
	};

	const {lastFrame} = render(
		<ToolRequestDialog
			toolRequest={request}
			sessionManager={mockSessionManager}
			toolManager={mockToolManager}
			setPendingTool={() => {}}
			addHistoryItem={() => {}}
		/>,
	);

	t.true(
		lastFrame()?.includes('Execute read_file?'),
		`Actual frame: ${lastFrame()}`,
	);
	t.true(
		lastFrame()?.includes('path: /tmp/test.txt'),
		`Actual frame: ${lastFrame()}`,
	);
});

test.skip('ToolRequestDialog renders options', t => {
	const request: ToolExecutionRequest = {
		id: 'req-2',
		name: 'read_file',
		args: {path: '/tmp/test.txt'},
		approved: false,
	};

	const {lastFrame} = render(
		<ToolRequestDialog
			toolRequest={request}
			sessionManager={mockSessionManager}
			toolManager={mockToolManager}
			setPendingTool={() => {}}
			addHistoryItem={() => {}}
		/>,
	);

	t.true(lastFrame()?.includes('[Y] Yes'), `Actual frame: ${lastFrame()}`);
	t.true(lastFrame()?.includes('[A] Always'), `Actual frame: ${lastFrame()}`);
	t.true(lastFrame()?.includes('[N] No'), `Actual frame: ${lastFrame()}`);
});
