import { Command } from '@cliffy/command';
import { Input } from '@cliffy/prompt';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module.ts';
import { BuildService } from '../../services/build.service.ts';
import { ResumeBuilder } from '../../services/resume.builder.ts';

export class BuildCommand extends Command {
	constructor() {
		super();

		this.name('build')
			.description('Build a resume from Notion data')
			.option('-n, --name <name>', 'The name of the resume to build.', {
				required: false,
			})
			.option(
				'-i, --id <id>',
				'The ID of the resume (e.g., "RES-4" or "4").',
				{
					required: false,
				},
			)
			.action(async (opts) => {
				const app = await NestFactory.createApplicationContext(
					AppModule.register({
						command: this,
					}),
				);

				const service = app.get(BuildService);
				const builder = app.get(ResumeBuilder);

				if (!opts.name && !opts.id) {
					const resumes = await Array.fromAsync(
						service.listResumes(),
					);

					const selection = await Input.prompt({
						message: 'Which resume?',
						suggestions: resumes.map((page: any) => {
							const prop = page.properties['Name'];
							return prop.title[0].plain_text as string;
						}),
					});

					// Check if selection matches a page ID
					const matchById = resumes.find(
						(page: any) => page.id === selection,
					);
					if (matchById) {
						opts.id = selection;
					} else {
						opts.name = selection;
					}
				}

				try {
					if (opts.id) {
						builder.setId(opts.id);
					} else if (opts.name) {
						builder.setName(opts.name);
					}
					const resume = await builder.build();
					console.log(JSON.stringify(resume, null, 2));
				} catch (error) {
					console.error(
						'Error building resume:',
						error instanceof Error ? error.message : error,
					);
				}

				await app.close();
			});
	}
}
