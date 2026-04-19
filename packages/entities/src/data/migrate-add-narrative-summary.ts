import { getModelForClass } from '@typegoose/typegoose';
import { connectMongoose } from '../utils/database';
import { Profile } from '../models/profile';

async function main() {
	console.log(
		'Adding narrativeSummary field to existing Profile documents...',
	);

	await using db = await connectMongoose({
		url: process.env.MONGODB_URL || 'mongodb://localhost:27017',
		dbName: 'resume-builder',
	});

	const ProfileModel = getModelForClass(Profile);
	const collection = ProfileModel.collection;

	const totalCount = await collection.countDocuments({});
	console.log(`Total Profile documents: ${totalCount}`);

	if (totalCount === 0) {
		console.log('No Profile documents found. Exiting.');
		return;
	}

	const missingFields = await collection.countDocuments({
		narrativeSummary: { $exists: false },
	});

	if (missingFields === 0) {
		console.log('All documents already have the narrativeSummary field.');
		return;
	}

	console.log(`Documents missing narrativeSummary: ${missingFields}`);

	const result = await collection.updateMany(
		{ narrativeSummary: { $exists: false } },
		{ $set: { narrativeSummary: null } },
		{ writeConcern: { w: 'majority' } },
	);

	console.log(
		`Updated ${result.modifiedCount} of ${result.matchedCount} documents`,
	);

	console.log('Migration completed successfully!');
}

main().catch(console.error);
