import * as fs from 'fs';
import * as path from 'path';
import { Tool, ToolParameter, ToolResult } from '../../interfaces/tools.js';

export class WriteFileTool implements Tool {
	name: string = 'write_file';
	description: string = 'Write content to a file';
	parameters: ToolParameter[] = [
		{
			name: 'path',
			type: 'string',
			required: true,
			description: 'Path to the file to write',
		},
		{
			name: 'content',
			type: 'string',
			required: true,
			description: 'Content to write to the file',
		},
		{
			name: 'encoding',
			type: 'string',
			required: false,
			description: 'File encoding (default: utf8)',
		},
		{
			name: 'createDirs',
			type: 'boolean',
			required: false,
			description:
				"Create parent directories if they don't exist (default: false)",
		},
	];

	async execute(
		args: Record<string, any>,
		toolId: string,
	): Promise<ToolResult> {
		const {
			path: filePath,
			content,
			encoding = 'utf8',
			createDirs = false,
		} = args;



		try {
			if (createDirs) {
				const dir = path.dirname(filePath as string);
				if (!fs.existsSync(dir)) {
					fs.mkdirSync(dir, { recursive: true });
				}
			}

			fs.writeFileSync(
				filePath as string,
				content as string,
				encoding as BufferEncoding,
			);

			return {
				id: toolId,
				name: this.name,
				ok: true,
				result: {
					content: `File written successfully: ${filePath}`,
				},
			};
		} catch (error: any) {
			return {
				id: toolId,
				name: this.name,
				ok: false,
				result: {},
				error: `Failed to write file: ${error.message}`,
			};
		}
	}
}
