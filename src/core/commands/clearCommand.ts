import { SlashCommand } from "../../interfaces/slashCommands.js";
import { SessionManager } from "../api/sessionManager.js";

export class ClearCommand implements SlashCommand {
	name = 'clear';
	description = 'Clear history and start a new session';

	private sessionManager: SessionManager;

	constructor(sessionManager: SessionManager) {
		this.sessionManager = sessionManager;
	}

	async action(_args: string[], context: any): Promise<void> {
		const { addHistoryItem, clearHistory } = context;

		try {
			const oldSessionId = this.sessionManager.getSessionId().slice(-8);

			// Clear the history
			clearHistory();

			// Create new session
			const newSession = this.sessionManager.resetSession();

			// Reconnect WebSocket with new session

			addHistoryItem(
				'Session Reset',
				`New session started! Previous session: ${oldSessionId}, New session: ${newSession.sessionId.slice(
					-8,
				)}`,
				'command',
			);
		} catch (error) {
			addHistoryItem(
				'Clear Error',
				`Failed to start new session: ${error}`,
				'text',
			);
		}
	}
}
