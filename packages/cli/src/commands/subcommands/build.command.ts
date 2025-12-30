import { Command } from '@cliffy/command';
import { Input } from '@cliffy/prompt';
import { Row } from '@cliffy/table';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module.ts';
import { BuildService } from '../../services/build.service.ts';

export class BuildCommand extends Command {
	constructor() {
		super();

		this.name('build')
			.option('-n, --name <name>', 'The name of the resume to build.', {
				required: false,
			})
			.action(async (opts) => {
				const app = await NestFactory.createApplicationContext(
					AppModule.register({
						command: this,
					}),
				);

				const service = app.get(BuildService);

				if (!opts.name) {
					const resumes = await Array.fromAsync(
						service.listResumes(),
					);

					const dev = await Array.fromAsync(service.listDev());

					opts.name = await Input.prompt({
						message: 'Which resume?',
						suggestions: [
							resumes.map((page: any) => {
								const prop = page.properties['Name'];

								return prop.title[0].plain_text as string;
							}),
						],
					});
				}

				const resume = await service.findResume(opts.name);

				const headers: Row = Row.from(['Title', 'ID']);
				const rows: Row[] = [];
			});
	}
}
