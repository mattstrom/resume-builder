import { getModelForClass } from '@typegoose/typegoose';
import { connectMongoose } from '../utils/database';
import { Resume } from '../models/resume';

async function main() {
	console.log('Removing uid from embedded contactInformation...');

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

	const withUid = await collection.countDocuments({
		'data.contactInformation.uid': { $exists: true },
	});

	if (withUid === 0) {
		console.log('No documents have contactInformation.uid. Nothing to do.');
		return;
	}

	console.log(`Documents with contactInformation.uid: ${withUid}`);

	const result = await collection.updateMany(
		{ 'data.contactInformation.uid': { $exists: true } },
		{ $unset: { 'data.contactInformation.uid': '' } },
		{ writeConcern: { w: 'majority' } },
	);

	console.log(
		`Updated ${result.modifiedCount} of ${result.matchedCount} documents`,
	);
	console.log('Migration completed successfully!');
}

main().catch(console.error);
