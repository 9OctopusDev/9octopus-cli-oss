import * as fs from 'fs';
import { Tool, ToolResult, ToolParameter } from '../../interfaces/tools.js';

export class ReadFileTool implements Tool {
	name: string = 'read_file';
	description: string = 'Read contents of a file';
	parameters: ToolParameter[] = [
		{
			name: 'path',
			type: 'string',
			required: true,
			description: 'Path to the file to read',
		},
		{
			name: 'encoding',
			type: 'string',
			required: false,
			description: 'File encoding (default: utf8)',
		},
	];

	async execute(
		args: Record<string, any>,
		toolId: string
	): Promise<ToolResult> {
		const { path, encoding = 'utf8' } = args;



		try {
			if (!fs.existsSync(path as string)) {
				return {
					id: toolId,
					name: this.name,
					ok: false,
					result: {},
					error: `File does not exist: ${path}`,
				};
			}

			const stats = fs.statSync(path as string);
			if (!stats.isFile()) {
				return {
					id: toolId,
					name: this.name,
					ok: false,
					result: {},
					error: `Path is not a file: ${path}`,
				};
			}

			const content = fs.readFileSync(
				path as string,
				encoding as BufferEncoding,
			);

			return {
				id: toolId,
				name: this.name,
				ok: true,
				result: {
					content: content.toString(),
				},
			};
		} catch (error: any) {
			return {
				id: toolId,
				name: this.name,
				ok: false,
				result: {},
				error: `Failed to read file: ${error.message}`,
			};
		}
	}
}
