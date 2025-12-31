import { Command } from '@cliffy/command';
import { Input, Select } from '@cliffy/prompt';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module.ts';
import { BuildService } from '../../services/build.service.ts';
import { ResumeBuilder } from '../../services/resume.builder.ts';
import {
	RenderService,
	type TemplateType,
} from '../../services/render.service.ts';

export class RenderCommand extends Command {
	constructor() {
		super();

		this.name('render')
			.description('Build and render a resume to HTML')
			.option('-n, --name <name>', 'The name of the resume to render.', {
				required: false,
			})
			.option(
				'-i, --id <id>',
				'The ID of the resume (e.g., "RES-4" or "4").',
				{
					required: false,
				},
			)
			.option(
				'-t, --template <template:string>',
				'The template to use (basic, column, grid).',
				{
					default: 'basic',
				},
			)
			.option(
				'-o, --output <output:string>',
				'Output file path for the HTML.',
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

				const buildService = app.get(BuildService);
				const builder = app.get(ResumeBuilder);
				const renderService = app.get(RenderService);

				// Prompt for resume selection if not provided
				if (!opts.name && !opts.id) {
					const resumes = await Array.fromAsync(
						buildService.listResumes(),
					);

					const selection = await Input.prompt({
						message: 'Which resume?',
						suggestions: resumes.map((page: any) => {
							const prop = page.properties['Name'];
							return prop.title[0].plain_text as string;
						}),
					});

					const matchById = resumes.find(
						(page: any) => page.id === selection,
					);
					if (matchById) {
						opts.id = selection;
					} else {
						opts.name = selection;
					}
				}

				// Prompt for template if not provided via flag
				let template = opts.template as TemplateType;
				if (!opts.template || opts.template === 'basic') {
					const selectedTemplate = await Select.prompt({
						message: 'Which template?',
						options: [
							{ name: 'Basic', value: 'basic' },
							{ name: 'Column', value: 'column' },
							{ name: 'Grid', value: 'grid' },
						],
						default: 'basic',
					});
					template = selectedTemplate as TemplateType;
				}

				try {
					// Build the resume data
					if (opts.id) {
						builder.setId(opts.id);
					} else if (opts.name) {
						builder.setName(opts.name);
					}
					const resume = await builder.build();

					// Render to HTML
					const html = renderService.render(resume, {
						template,
						title: resume.name || 'Resume',
					});

					// Output the result
					if (opts.output) {
						await Deno.writeTextFile(opts.output, html);
						console.log(`Resume rendered to: ${opts.output}`);
					} else {
						console.log(html);
					}
				} catch (error) {
					console.error(
						'Error rendering resume:',
						error instanceof Error ? error.message : error,
					);
				}

				await app.close();
			});
	}
}
