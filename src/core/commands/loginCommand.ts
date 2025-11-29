import { CommandOption, SlashCommand, SlashCommandSubCommand } from "../../interfaces/slashCommands.js";
import { AuthenticationManager } from "../auth/authenticationManager.js";
import { AuthService } from "../auth/authService.js";
import { AuthConfigManager } from "../configs/config.js";

export class LoginCommand implements SlashCommand {
	name: string = 'login';
	description: string = 'Authenticate with Auth0 to access the API';
	subcommands: SlashCommandSubCommand[] = [];
	options: CommandOption[] = [
		{
			name: 'browser',
			description:
				'Use browser-based authorization code flow instead of device flow',
			type: 'boolean',
		},
	];

	private authService: AuthService;
	private configManager: AuthConfigManager;
	private authManager: AuthenticationManager;

	constructor() {
		this.authService = AuthService.getInstance();
		this.configManager = AuthConfigManager.getInstance();
		this.authManager = AuthenticationManager.getInstance();
		this.action = this.executeLogin.bind(this);
	}

	private async executeLogin(args: string[], context?: any): Promise<void> {
		const addHistoryItem = context?.addHistoryItem || console.log;

		try {
			// Check if authentication is enabled
			if (!this.configManager.isAuthEnabled()) {
				addHistoryItem('⚠️  Authentication is disabled (AUTH_ENABLED=false)', '', 'text');
				addHistoryItem('✅ You can use the CLI without authentication', '', 'text');
				return;
			}

			// Check if already authenticated
			const isAuthenticated = await this.authService.isAuthenticated();
			if (isAuthenticated) {
				const user = await this.authService.getCurrentUser();
				addHistoryItem(
					`✅ Already authenticated as: ${user?.email || user?.name || 'Unknown user'
					}`,
					'',
					'text'
				);
				addHistoryItem(
					'💡 Use /logout to sign out and login with a different account',
					'',
					'text'
				);
				return;
			}

			// Parse arguments for browser flow option
			const useBrowserFlow = args.includes('--browser') || args.includes('-b');

			// Start authentication using the authentication manager
			await this.authManager.startAuthentication(useBrowserFlow);

			// Show success message
			addHistoryItem('🚀 You can now use all CLI features', '', 'text');
		} catch (error: any) {
			// Error handling is now done in the authentication manager/dialog
			// Just show a simple error message in history
			addHistoryItem(`❌ Authentication failed: ${error.message}`, '', 'text');

			if (error.message.includes('timeout')) {
				addHistoryItem('💡 Try again or use --browser flag for browser flow', '', 'text');
			} else if (error.message.includes('AUTH0_')) {
				addHistoryItem(
					'💡 Please check your Auth0 configuration in environment variables',
					'',
					'text'
				);
			} else {
				addHistoryItem(
					'💡 Run with --browser flag to try browser authorization flow',
					'',
					'text'
				);
			}
		}
	}

	action: (args: string[], context?: any) => void = (args, context) => this.executeLogin(args, context);
}
