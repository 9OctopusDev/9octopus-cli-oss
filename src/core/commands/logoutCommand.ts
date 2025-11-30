import {
	CommandOption,
	SlashCommand,
	SlashCommandSubCommand,
} from '../../interfaces/slashCommands.js';
import { AuthService } from '../auth/authService.js';
import { AuthConfigManager } from '../configs/config.js';

export class LogoutCommand implements SlashCommand {
	name: string = 'logout';
	description: string = 'Sign out and clear stored authentication tokens';
	subcommands: SlashCommandSubCommand[] = [];
	options: CommandOption[] = [];

	private authService: AuthService;
	private configManager: AuthConfigManager;

	constructor() {
		this.authService = AuthService.getInstance();
		this.configManager = AuthConfigManager.getInstance();
		this.action = this.executeLogout.bind(this);
	}

	private async executeLogout(_args: string[], context?: any): Promise<void> {
		const addHistoryItem = context?.addHistoryItem || console.log;
		try {
			// Check if authentication is enabled
			if (!this.configManager.isAuthEnabled()) {

				addHistoryItem({
					id: new Date().toLocaleDateString(),
					role: 'system',
					content: 'Auth is not enabled!',
					timestamp: new Date(),
				});
				return;
			}

			// Check if user is authenticated
			const isAuthenticated = await this.authService.isAuthenticated();
			if (!isAuthenticated) {
				addHistoryItem({
					id: new Date().toLocaleDateString(),
					role: 'system',
					content: 'Authenticated user not found!',
					timestamp: new Date(),
				});
				return;
			}

			// Get user info before logout
			// const userDisplay = user?.email || user?.name || 'Unknown user';

			// Perform logout
			await this.authService.logout();

			addHistoryItem({
				id: new Date().toLocaleDateString(),
				role: 'system',
				content: 'User Logged out',
				timestamp: new Date(),
			});


		} catch (error: any) {


		}
	}

	action: (args: string[]) => void = this.executeLogout;
}
