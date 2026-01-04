import { getModelForClass } from '@typegoose/typegoose';
import { connectMongoose } from '../utils/database';
import { ContactInformation } from '../models/contact-information';
import { Job } from '../models/job';

import contactInformation from './contact-information.json';
import education from './education.json';
import jobs from './jobs.json';
import skills from './skills.json';
import projects from './projects.json';
import resumeContent from './resume-content.json';

import { Education } from '../models/education';
import { Skill } from '../models/skill';
import { Project } from '../models/project';
import { ResumeContent } from '../models/resume-content';

const data = [
	{
		name: 'contactInformation',
		type: getModelForClass(ContactInformation),
		items: contactInformation,
	},
	{
		name: 'education',
		type: getModelForClass(Education),
		items: education,
	},
	{
		name: 'jobs',
		type: getModelForClass(Job),
		items: jobs,
	},
	{
		name: 'skills',
		type: getModelForClass(Skill),
		items: skills,
	},
	{
		name: 'projects',
		type: getModelForClass(Project),
		items: projects,
	},
];

const data2 = [
	{
		name: 'resume-content',
		type: getModelForClass(ResumeContent),
		items: resumeContent,
	},
];

async function main() {
	console.log('Inserting data...');

	await using db = await connectMongoose({
		url: 'mongodb://localhost:27017',
		dbName: 'resume-builder',
	});

	for (const { name, type, items } of data2) {
		console.log(`Inserting ${name}...`);

		for (const [index, item] of items.entries()) {
			console.log(`Inserting item ${index + 1}...`);
			await type.create(item as any);
		}
	}
}

main();
