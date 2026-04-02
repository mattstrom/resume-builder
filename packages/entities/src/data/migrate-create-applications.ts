import mongoose from 'mongoose';
import { Application, ApplicationSchema } from '../models/application.js';
import { Resume, ResumeSchema } from '../models/resume.js';
import { connectMongoose } from '../utils/database.js';
import { buildApplicationBackfillInserts } from './migrate-create-applications.helpers.js';

async function main() {
	await using db = await connectMongoose({
		url: process.env.MONGODB_URL || 'mongodb://localhost:27017',
		dbName: 'resume-builder',
	});

	const db_ = mongoose.connection.db!;

	// Create the collection if it doesn't exist
	const collections = await db_
		.listCollections({ name: 'applications' })
		.toArray();

	if (collections.length === 0) {
		console.log('Creating applications collection...');
		await db_.createCollection('applications');
	} else {
		console.log('Applications collection already exists.');
	}

	// Ensure uid index
	const collection = db_.collection('applications');
	await collection.createIndex({ uid: 1 });
	console.log('Ensured uid index on applications collection');

	const ResumeModel =
		mongoose.models[Resume.name] ??
		mongoose.model(Resume.name, ResumeSchema);
	const ApplicationModel =
		mongoose.models[Application.name] ??
		mongoose.model(Application.name, ApplicationSchema);

	const resumes = await ResumeModel.find({})
		.select({
			_id: 1,
			uid: 1,
			name: 1,
			company: 1,
			jobPostingUrl: 1,
		})
		.lean()
		.exec();
	const existingApplications = await ApplicationModel.find({
		resumeId: { $exists: true, $ne: null },
	})
		.select({
			uid: 1,
			resumeId: 1,
		})
		.lean()
		.exec();

	console.log(`Found ${resumes.length} resumes`);
	console.log(
		`Found ${existingApplications.length} applications already linked to resumes`,
	);

	const applicationsToCreate = buildApplicationBackfillInserts(
		resumes,
		existingApplications,
	);
	const alreadyAttachedCount = resumes.length - applicationsToCreate.length;

	console.log(`Resumes already attached: ${alreadyAttachedCount}`);
	console.log(`Resumes needing backfill: ${applicationsToCreate.length}`);

	if (applicationsToCreate.length === 0) {
		console.log('\nNo applications needed backfill.');
		console.log('Migration completed successfully!');
		return;
	}

	const createdApplications = await ApplicationModel.create(applicationsToCreate);

	console.log(`Created ${createdApplications.length} applications`);
	console.log('\nMigration completed successfully!');
}

main().catch(console.error);
