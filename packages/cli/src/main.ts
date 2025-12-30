import { Command } from '@cliffy/command';

import { BuildCommand } from './commands/subcommands/build.command.ts';

const program = new Command()
	.name('resume-builder')
	.version('0.0.1')
	.description('A collection of tools')
	.command('build', new BuildCommand());

program.parse();
