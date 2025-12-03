import {exec} from 'child_process';
import {promisify} from 'util';
import {Tool, ToolResult, ToolParameter} from '../../interfaces/tools.js';

const execAsync = promisify(exec);

export class ShellTool implements Tool {
	name: string = 'shell';
	description: string = 'Execute shell commands';
	parameters: ToolParameter[] = [
		{
			name: 'command',
			type: 'string',
			required: true,
			description: 'The shell command to execute',
		},
	];

	async execute(
		args: Record<string, any>,
		toolId: string,
	): Promise<ToolResult> {
		const {command} = args;

		try {
			const {stdout, stderr} = await execAsync(command as string, {
				encoding: 'utf8',
				maxBuffer: 1024 * 1024, // 1MB buffer
			});

			return {
				id: toolId,
				name: this.name,
				ok: true,
				result: {
					stdout: stdout.trim(),
					stderr: stderr.trim(),
				},
			};
		} catch (error: any) {
			return {
				id: toolId,
				name: this.name,
				ok: false,
				result: {
					stdout: error.stdout || '',
					stderr: error.stderr || '',
				},
				error: error.message,
			};
		}
	}
}
