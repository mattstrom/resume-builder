import { connectMongoose } from '../utils/database';

// No-op migration: the five new logistical fields (roleLevelFit, locationFit,
// compensationFit, companyFit, logisticalFit) are optional on the Analysis
// subdocument. Mongoose returns undefined for missing fields on existing
// documents, so no backfill is required. This file documents the schema
// change introduced alongside commit feat: expand Analysis with logistical fit.

async function main() {
	console.log('migrate-add-logistical-analysis: no-op, schema change only');
	await using _db = await connectMongoose({
		url: process.env.MONGODB_URL || 'mongodb://localhost:27017',
		dbName: 'resume-builder',
	});
	console.log('Done.');
}

main().catch(console.error);
