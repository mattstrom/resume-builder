import mongoose from 'mongoose';
import { connectMongoose } from '../utils/database.js';

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

	console.log('\nMigration completed successfully!');
}

main().catch(console.error);
