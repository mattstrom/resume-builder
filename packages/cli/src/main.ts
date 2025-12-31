import { Command } from '@cliffy/command';

import { BuildCommand } from './commands/subcommands/build.command.ts';
import { RenderCommand } from './commands/subcommands/render.command.ts';
import { SchemaCommand } from './commands/subcommands/schema.command.ts';

const program = new Command()
	.name('resume-builder')
	.version('0.0.1')
	.description('A collection of tools')
	.command('build', new BuildCommand())
	.command('render', new RenderCommand())
	.command('schema', new SchemaCommand());

program.parse();
