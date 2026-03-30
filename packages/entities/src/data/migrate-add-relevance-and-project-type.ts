import mongoose from 'mongoose';
import { connectMongoose } from '../utils/database.js';

const RELEVANCE_COLLECTIONS = ['jobs', 'skills', 'volunteerings', 'projects'];
const PROJECT_COLLECTION = 'projects';
const RESUME_CONTENTS_COLLECTION = 'resumecontents';

async function main() {
	await using db = await connectMongoose({
		url: process.env.MONGODB_URL || 'mongodb://localhost:27017',
		dbName: 'resume-builder',
	});

	// Add relevance to standalone collections
	for (const collectionName of RELEVANCE_COLLECTIONS) {
		console.log(`\n--- Processing collection: ${collectionName} ---`);

		const collection = mongoose.connection.db!.collection(collectionName);
		const missingCount = await collection.countDocuments({
			relevance: { $exists: false },
		});

		if (missingCount === 0) {
			console.log('All documents already have relevance. Skipping.');
			continue;
		}

		console.log(`Documents missing relevance: ${missingCount}`);
		const result = await collection.updateMany(
			{ relevance: { $exists: false } },
			{ $set: { relevance: null } },
			{ writeConcern: { w: 'majority' } },
		);
		console.log(`Updated ${result.modifiedCount} documents`);
	}

	// Add type to standalone projects collection
	{
		console.log(`\n--- Processing collection: ${PROJECT_COLLECTION} ---`);

		const collection =
			mongoose.connection.db!.collection(PROJECT_COLLECTION);
		const missingCount = await collection.countDocuments({
			type: { $exists: false },
		});

		if (missingCount === 0) {
			console.log('All documents already have type. Skipping.');
		} else {
			console.log(`Documents missing type: ${missingCount}`);
			const result = await collection.updateMany(
				{ type: { $exists: false } },
				{ $set: { type: null } },
				{ writeConcern: { w: 'majority' } },
			);
			console.log(`Updated ${result.modifiedCount} documents`);
		}
	}

	// Update embedded documents in resumecontents
	const hasResumeContents = await mongoose.connection
		.db!.listCollections({ name: RESUME_CONTENTS_COLLECTION })
		.hasNext();

	if (hasResumeContents) {
		console.log(
			`\n--- Processing embedded documents in ${RESUME_CONTENTS_COLLECTION} ---`,
		);

		const collection = mongoose.connection.db!.collection(
			RESUME_CONTENTS_COLLECTION,
		);

		// Add relevance to embedded workExperience items
		let result = await collection.updateMany(
			{
				'workExperience.0': { $exists: true },
				'workExperience.relevance': { $exists: false },
			},
			{ $set: { 'workExperience.$[].relevance': null } },
			{ writeConcern: { w: 'majority' } },
		);
		console.log(
			`Updated workExperience in ${result.modifiedCount} documents`,
		);

		// Add relevance to embedded skills items
		result = await collection.updateMany(
			{
				'skills.0': { $exists: true },
				'skills.relevance': { $exists: false },
			},
			{ $set: { 'skills.$[].relevance': null } },
			{ writeConcern: { w: 'majority' } },
		);
		console.log(`Updated skills in ${result.modifiedCount} documents`);

		// Add relevance to embedded volunteering items
		result = await collection.updateMany(
			{
				'volunteering.0': { $exists: true },
				'volunteering.relevance': { $exists: false },
			},
			{ $set: { 'volunteering.$[].relevance': null } },
			{ writeConcern: { w: 'majority' } },
		);
		console.log(
			`Updated volunteering in ${result.modifiedCount} documents`,
		);

		// Add relevance to embedded projects items
		result = await collection.updateMany(
			{
				'projects.0': { $exists: true },
				'projects.relevance': { $exists: false },
			},
			{ $set: { 'projects.$[].relevance': null } },
			{ writeConcern: { w: 'majority' } },
		);
		console.log(
			`Updated projects relevance in ${result.modifiedCount} documents`,
		);

		// Add type to embedded projects items
		result = await collection.updateMany(
			{
				'projects.0': { $exists: true },
				'projects.type': { $exists: false },
			},
			{ $set: { 'projects.$[].type': null } },
			{ writeConcern: { w: 'majority' } },
		);
		console.log(
			`Updated projects type in ${result.modifiedCount} documents`,
		);
	}

	console.log('\nMigration completed successfully!');
}

main().catch(console.error);
