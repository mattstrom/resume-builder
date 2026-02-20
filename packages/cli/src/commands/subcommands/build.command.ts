import { Command } from '@cliffy/command';
import { Input } from '@cliffy/prompt';
import { NestFactory } from '@nestjs/core';
import * as fs from 'node:fs';
import * as path from 'node:path';
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
			.option(
				'-o, --output [path:string]',
				'Output to a JSON file. If no path is provided, uses the resume ID. If a directory is provided, places the file there.',
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
					const jsonOutput = JSON.stringify(resume, null, 2);

					if (opts.output !== undefined) {
						// Use the provided ID, or derive from resume name
						const resumeId =
							opts.id ??
							resume.name
								.toLowerCase()
								.replace(/[^a-z0-9]+/g, '-')
								.replace(/^-|-$/g, '') ??
							'resume';
						let outputPath: string;

						if (opts.output === true) {
							// No path provided, use resume ID in current directory
							outputPath = `${resumeId}.json`;
						} else {
							// Check if path is a directory or file
							const providedPath = opts.output as string;

							try {
								const stat = fs.statSync(providedPath);
								if (stat.isDirectory()) {
									// Path is an existing directory
									outputPath = path.join(
										providedPath,
										`${resumeId}.json`,
									);
								} else {
									// Path is an existing file
									outputPath = providedPath;
								}
							} catch {
								// Path doesn't exist, check if it looks like a file or directory
								if (
									providedPath.endsWith('/') ||
									providedPath.endsWith(path.sep)
								) {
									// Treat as directory
									fs.mkdirSync(providedPath, {
										recursive: true,
									});
									outputPath = path.join(
										providedPath,
										`${resumeId}.json`,
									);
								} else if (path.extname(providedPath)) {
									// Has extension, treat as file
									const dir = path.dirname(providedPath);
									if (dir && dir !== '.') {
										fs.mkdirSync(dir, { recursive: true });
									}
									outputPath = providedPath;
								} else {
									// No extension, treat as directory
									fs.mkdirSync(providedPath, {
										recursive: true,
									});
									outputPath = path.join(
										providedPath,
										`${resumeId}.json`,
									);
								}
							}
						}

						fs.writeFileSync(outputPath, jsonOutput);
						console.log(`Resume written to ${outputPath}`);
					} else {
						console.log(jsonOutput);
					}
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
