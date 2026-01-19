import { getModelForClass } from '@typegoose/typegoose';
import { connectMongoose } from '../utils/database';
import { Resume } from '../models/resume';

async function main() {
	console.log('Adding company and jobPostingUrl fields to existing resume documents...');

	await using db = await connectMongoose({
		url: process.env.MONGODB_URL || 'mongodb://localhost:27017',
		dbName: 'resume-builder',
	});

	const ResumeModel = getModelForClass(Resume);
	const collection = ResumeModel.collection;

	// Check total document count
	const totalCount = await collection.countDocuments({});
	console.log(`Total Resume documents: ${totalCount}`);

	if (totalCount === 0) {
		console.log('No Resume documents found. Exiting.');
		return;
	}

	// Count documents missing the fields
	const missingFields = await collection.countDocuments({
		$or: [
			{ company: { $exists: false } },
			{ jobPostingUrl: { $exists: false } },
		],
	});

	if (missingFields === 0) {
		console.log('All documents already have the required fields.');
		return;
	}

	console.log(`Documents missing fields: ${missingFields}`);

	// Update documents using native MongoDB driver with write concern
	const result = await collection.updateMany(
		{
			$or: [
				{ company: { $exists: false } },
				{ jobPostingUrl: { $exists: false } },
			],
		},
		{ $set: { company: '', jobPostingUrl: '' } },
		{ writeConcern: { w: 'majority' } },
	);

	console.log(
		`Updated ${result.modifiedCount} of ${result.matchedCount} documents`,
	);

	// Verify the update
	const finalCount = await collection.countDocuments({
		company: { $exists: true },
		jobPostingUrl: { $exists: true },
	});

	console.log(`Documents with both fields: ${finalCount}/${totalCount}`);
	console.log('Migration completed successfully!');
}

main().catch(console.error);
