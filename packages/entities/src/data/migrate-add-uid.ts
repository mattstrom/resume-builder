import mongoose from 'mongoose';
import { connectMongoose } from '../utils/database';

const COLLECTIONS = [
	'resumes',
	'conversations',
	'cover-letters',
	'jobs',
	'skills',
	'skillgroups',
	'educations',
	'projects',
	'volunteerings',
	'contactinformations',
];

async function main() {
	const DEFAULT_UID = process.env.DEFAULT_UID;
	if (!DEFAULT_UID) {
		console.error(
			'DEFAULT_UID environment variable is required. Set it to the Auth0 sub claim of the user who owns existing data.',
		);
		process.exit(1);
	}

	console.log(
		`Adding uid field to existing documents with uid=${DEFAULT_UID}`,
	);

	await using db = await connectMongoose({
		url: process.env.MONGODB_URL || 'mongodb://localhost:27017',
		dbName: 'resume-builder',
	});

	for (const collectionName of COLLECTIONS) {
		console.log(`\n--- Processing collection: ${collectionName} ---`);

		const collection = mongoose.connection.db!.collection(collectionName);

		const totalCount = await collection.countDocuments({});
		console.log(`Total documents: ${totalCount}`);

		if (totalCount === 0) {
			console.log('No documents found. Skipping.');
			continue;
		}

		const missingUid = await collection.countDocuments({
			uid: { $exists: false },
		});

		if (missingUid === 0) {
			console.log('All documents already have uid. Skipping update.');
		} else {
			console.log(`Documents missing uid: ${missingUid}`);

			const result = await collection.updateMany(
				{ uid: { $exists: false } },
				{ $set: { uid: DEFAULT_UID } },
				{ writeConcern: { w: 'majority' } },
			);

			console.log(
				`Updated ${result.modifiedCount} of ${result.matchedCount} documents`,
			);
		}

		// Create index on uid
		await collection.createIndex({ uid: 1 });
		console.log('Created index on uid');

		// Verify
		const withUid = await collection.countDocuments({
			uid: { $exists: true },
		});
		console.log(`Documents with uid: ${withUid}/${totalCount}`);
	}

	console.log('\nMigration completed successfully!');
}

main().catch(console.error);
