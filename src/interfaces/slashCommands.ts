export interface SlashCommand {
	name: string;
	description: string;
	action: (args: string[], context?: any) => void | Promise<void>;
	subcommands?: SlashCommandSubCommand[];
}

export interface CommandOption {
	name: string;
	description: string;
	type: 'string' | 'number' | 'boolean';
}

export interface SlashCommandSubCommand {
	name: string;
	description: string;
	options: CommandOption[];
	action: (args: string[]) => void;
}
