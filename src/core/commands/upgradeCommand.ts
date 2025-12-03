import {SlashCommand} from '../../interfaces/slashCommands.js';

export class UpgradeCommand implements SlashCommand {
	name = 'upgrade';
	description = 'Open upgrade page to access more models and features';

	subcommands = [];

	constructor() {}

	async action(_args: string[], context?: any): Promise<void> {
		const upgradeUrl = 'https://app.9octopus.com/profile';

		let output = `# Upgrade Your Plan

**Unlock More Features:**
- Access to all AI models including Claude-3.5-Sonnet
- Higher usage limits
- Priority support
- Advanced features

**Visit:** ${upgradeUrl}

To open the upgrade page, copy and paste the URL above into your browser.`;

		context?.addHistoryItem({
			id: new Date().toLocaleDateString(),
			role: 'system',
			content: output,
			timestamp: new Date(),
		});

		// In a real implementation, you might want to automatically open the URL
		// using a system command like 'open' on macOS or 'xdg-open' on Linux
		try {
			const {spawn} = await import('child_process');
			const platform = process.platform;

			let command: string;
			if (platform === 'darwin') {
				command = 'open';
			} else if (platform === 'win32') {
				command = 'start';
			} else {
				command = 'xdg-open';
			}

			spawn(command, [upgradeUrl], {detached: true, stdio: 'ignore'});
		} catch (error) {
			// If opening fails, the URL is already displayed above
		}
	}
}
