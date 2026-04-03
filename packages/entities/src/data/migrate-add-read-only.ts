import { getModelForClass } from '@typegoose/typegoose';
import { connectMongoose } from '../utils/database';
import { Resume } from '../models/resume';

async function main() {
	console.log('Adding readOnly field to existing resume documents...');

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
		readOnly: { $exists: false },
	});

	if (missingFields === 0) {
		console.log('All documents already have the readOnly field.');
		return;
	}

	console.log(`Documents missing readOnly: ${missingFields}`);

	const result = await collection.updateMany(
		{ readOnly: { $exists: false } },
		{ $set: { readOnly: false } },
		{ writeConcern: { w: 'majority' } },
	);

	console.log(
		`Updated ${result.modifiedCount} of ${result.matchedCount} documents`,
	);

	const finalCount = await collection.countDocuments({
		readOnly: { $exists: true },
	});

	console.log(`Documents with readOnly field: ${finalCount}/${totalCount}`);
	console.log('Migration completed successfully!');
}

main().catch(console.error);
