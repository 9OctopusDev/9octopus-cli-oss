import {
	CommandOption,
	SlashCommand,
	SlashCommandSubCommand,
} from '../../interfaces/slashCommands.js';
import { BackendApiService } from '../api/backendApiService.js';
import { SessionManager } from '../api/sessionManager.js';
import * as fs from 'fs';
import * as path from 'path';

export class InitCommand implements SlashCommand {
	name: string = 'init';
	description: string = 'Initialise the agent by creating the octopus.md file';
	subcommands: SlashCommandSubCommand[] = [];
	options: CommandOption[] = [];

	constructor(
		private backendApiService: BackendApiService,
		private sessionManager: SessionManager,
	) { }

	async action(args: string[], context?: any): Promise<void> {
		try {
			// Check if octopus.md already exists
			const octopusPath = path.join(process.cwd(), 'octopus.md');

			if (fs.existsSync(octopusPath)) {
				context?.addHistoryItem({
					id: new Date().toLocaleDateString(),
					role: 'system',
					content: 'octopus.md already exists. Use --force to overwrite.',
					timestamp: new Date(),
				});

				if (!args.includes('--force')) {
					return;
				}
			}

			context?.addHistoryItem(
				'Init Started',
				'🚀 Initializing project documentation with AI assistance...',
				'text',
			);

			context?.addHistoryItem({
				id: new Date().toLocaleDateString(),
				role: 'system',
				content: 'Initializing project documentation with AI assistance...',
				timestamp: new Date(),
			});

			// Create the prompt for generating octopus.md content
			const initPrompt = `You are helping to initialize a CLI application project by creating comprehensive documentation in octopus.md format.

Based on the project structure and codebase analysis, please create an octopus.md file that includes:

1. **Project Overview**:
   - Brief description of this CLI application built with React Ink
   - Main purpose and functionality
   - Target audience

2. **Architecture Overview**:
   - Key components and their relationships
   - Command system architecture
   - Tool system architecture
   - Core services (BackendApiService, SessionManager, etc.)

3. **Coding Standards and Style Guidelines**:
   - TypeScript best practices
   - Code organization patterns
   - Naming conventions
   - File structure conventions
   - Testing guidelines

4. **Available Commands**:
   - List all slash commands with descriptions
   - Usage examples
   - Command parameters and options

5. **Project Workflows**:
   - Development workflow
   - Build and deployment process
   - Testing procedures
   - Contribution guidelines

6. **Tools and Utilities**:
   - Available tools (/tools command)
   - Tool usage patterns
   - Custom tool development

Please generate comprehensive, well-structured markdown content that will serve as the main documentation file for this project. Focus on practical information that developers would need to understand and contribute to the codebase.`;

			// Use the backend service to generate the content
			await this.backendApiService.startConversation(
				this.sessionManager.getSessionId(),
				initPrompt,
				undefined, // no additional context
				'openai', // default to anthropic
				'gpt-5', // use a capable model
			);

			context?.addHistoryItem({
				id: new Date().toLocaleDateString(),
				role: 'system',
				content: 'AI is analyzing the project and generating documentation...',
				timestamp: new Date(),
			});

		} catch (error) {

			context?.addHistoryItem({
				id: new Date().toLocaleDateString(),
				role: 'system',
				content: `Failed to initialize project: ${error instanceof Error ? error.message : String(error)}`,
				timestamp: new Date(),
			});

		}
	}
}
