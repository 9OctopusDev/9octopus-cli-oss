import test from 'ava';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {ReadFileTool} from '../core/tools/ReadFileTool.js';
import {WriteFileTool} from '../core/tools/WriteFileTool.js';
import {SearchTool} from '../core/tools/SearchTool.js';
import {ShellTool} from '../core/tools/ShellTool.js';

const tempDir = os.tmpdir();

test('WriteFileTool writes content to file', async t => {
	const tool = new WriteFileTool();
	const filePath = path.join(tempDir, `test-write-${Date.now()}.txt`);

	const result = await tool.execute(
		{path: filePath, content: 'Hello World'},
		'tool-1',
	);

	t.true(result.ok);
	t.is(fs.readFileSync(filePath, 'utf8'), 'Hello World');

	fs.unlinkSync(filePath);
});

test('ReadFileTool reads content from file', async t => {
	const tool = new ReadFileTool();
	const filePath = path.join(tempDir, `test-read-${Date.now()}.txt`);
	fs.writeFileSync(filePath, 'Read Me');

	const result = await tool.execute({path: filePath}, 'tool-2');

	t.true(result.ok);
	t.true((result.result as any).content.includes('Read Me'));

	fs.unlinkSync(filePath);
});

test('SearchTool finds matches in file', async t => {
	const tool = new SearchTool();
	const filePath = path.join(tempDir, `test-search-${Date.now()}.txt`);
	fs.writeFileSync(filePath, 'Line 1\nTarget Line\nLine 3');

	const result = await tool.execute(
		{path: filePath, pattern: 'Target'},
		'tool-3',
	);

	t.true(result.ok);
	const searchResults = (result.result as any).content;
	t.true(searchResults.some((item: any) => item.match.includes('Target Line')));

	fs.unlinkSync(filePath);
});

test('ShellTool executes command', async t => {
	const tool = new ShellTool();

	const result = await tool.execute({command: 'echo "Hello Shell"'}, 'tool-4');

	t.true(result.ok);
	t.true((result.result as any).stdout.includes('Hello Shell'));
});
