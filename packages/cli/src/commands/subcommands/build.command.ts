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
			.action(async (opts) => {
				const app = await NestFactory.createApplicationContext(
					AppModule.register({
						command: this,
					}),
				);

				const service = app.get(BuildService);
				const builder = app.get(ResumeBuilder);

				if (!opts.name) {
					const resumes = await Array.fromAsync(service.listResumes());

					opts.name = await Input.prompt({
						message: 'Which resume?',
						suggestions: resumes.map((page: any) => {
							const prop = page.properties['Name'];
							return prop.title[0].plain_text as string;
						}),
					});
				}

				try {
					const resume = await builder.setName(opts.name).build();
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
