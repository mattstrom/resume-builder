import { getModelForClass } from '@typegoose/typegoose';
import { connectMongoose } from '../utils/database';
import { Resume } from '../models/resume';

async function main() {
	console.log('Adding base field to existing resume documents...');

	await using db = await connectMongoose({
		url: process.env.MONGODB_URL || 'mongodb://localhost:27017',
		dbName: 'resume-builder',
	});

	const ResumeModel = getModelForClass(Resume);
	const collection = ResumeModel.collection;

	const totalCount = await collection.countDocuments({});
	console.log(`Total Resume documents: ${totalCount}`);

	if (totalCount === 0) {
		console.log('No Resume documents found. Exiting.');
		return;
	}

	const missingFields = await collection.countDocuments({
		base: { $exists: false },
	});

	if (missingFields === 0) {
		console.log('All documents already have the base field.');
		return;
	}

	console.log(`Documents missing base: ${missingFields}`);

	const result = await collection.updateMany(
		{ base: { $exists: false } },
		{ $set: { base: false } },
		{ writeConcern: { w: 'majority' } },
	);

	console.log(
		`Updated ${result.modifiedCount} of ${result.matchedCount} documents`,
	);

	const finalCount = await collection.countDocuments({
		base: { $exists: true },
	});

	console.log(`Documents with base field: ${finalCount}/${totalCount}`);
	console.log('Migration completed successfully!');
}

main().catch(console.error);
