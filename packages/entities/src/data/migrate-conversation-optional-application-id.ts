// applicationId is now optional on Conversation to support profile-scoped
// conversations (narrative, background, preferences) that have no linked
// application. Existing documents all have applicationId and remain valid.
// No data transformation is required.

import { connectMongoose } from '../utils/database';

async function main() {
	console.log('Verifying Conversation documents for optional applicationId migration...');

	await using _ = await connectMongoose({
		url: process.env.MONGODB_URL || 'mongodb://localhost:27017',
		dbName: 'resume-builder',
	});

	const { default: mongoose } = await import('mongoose');
	const collection = mongoose.connection.collection('conversations');
	const total = await collection.countDocuments({});
	const missing = await collection.countDocuments({
		applicationId: { $exists: false },
	});

	console.log(`Total Conversation documents: ${total}`);
	console.log(`Documents without applicationId (expected 0 before this migration): ${missing}`);
	console.log('No data transformation needed. Migration complete.');
}

main().catch(console.error);
