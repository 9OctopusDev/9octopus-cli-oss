import {SlashCommand} from '../../interfaces/slashCommands.js';

export class CommandAgregator {
	private commands: SlashCommand[] = [];

	addCommand(command: SlashCommand) {
		this.commands.push(command);
	}

	getCommand(name: string): SlashCommand | undefined {
		return this.commands.find(command => command.name === name);
	}

	getCommands(): SlashCommand[] {
		return this.commands;
	}

	searchCommand(name: string): SlashCommand[] {
		// Return a list of commands that match or nearly match the name
		const lowerName = name.toLowerCase();
		return this.commands.filter(
			command =>
				command.name.toLowerCase().includes(lowerName) ||
				lowerName.includes(command.name.toLowerCase()),
		);
	}
}
