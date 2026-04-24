import mongoose from 'mongoose';
import { Application, ApplicationSchema } from '../models/application.js';
import { Resume, ResumeSchema } from '../models/resume.js';
import { connectMongoose } from '../utils/database.js';

async function main() {
	await using db = await connectMongoose({
		url: process.env.MONGODB_URL || 'mongodb://localhost:27017',
		dbName: 'resume-builder',
	});

	void db;

	const ResumeModel =
		mongoose.models[Resume.name] ??
		mongoose.model(Resume.name, ResumeSchema);
	const ApplicationModel =
		mongoose.models[Application.name] ??
		mongoose.model(Application.name, ApplicationSchema);

	const applications = await ApplicationModel.find({
		resumeId: { $exists: true, $ne: null },
	})
		.select({ _id: 1, uid: 1, resumeId: 1 })
		.lean()
		.exec();

	console.log(
		`Found ${applications.length} applications with resumeId to migrate`,
	);

	let updated = 0;
	let warnings = 0;

	for (const application of applications) {
		const resumeId = (application as { resumeId: mongoose.Types.ObjectId })
			.resumeId;

		const existing = await ResumeModel.findOne({
			_id: resumeId,
			applicationId: { $exists: true, $ne: null },
		})
			.select({ _id: 1, applicationId: 1 })
			.lean()
			.exec();

		if (existing) {
			const existingAppId = (
				existing as { applicationId: mongoose.Types.ObjectId }
			).applicationId;
			if (existingAppId.toString() !== application._id.toString()) {
				console.warn(
					`Warning: Resume ${resumeId} is already linked to application ${existingAppId}, skipping (would have set to ${application._id})`,
				);
				warnings++;
				continue;
			}
		}

		await ResumeModel.updateOne(
			{ _id: resumeId },
			{ $set: { applicationId: application._id } },
		).exec();
		updated++;
	}

	console.log(`Set applicationId on ${updated} resumes`);
	if (warnings > 0) {
		console.warn(
			`Skipped ${warnings} resumes due to existing applicationId`,
		);
	}

	const unsetResult = await ApplicationModel.updateMany(
		{ resumeId: { $exists: true } },
		{ $unset: { resumeId: '' } },
	).exec();

	console.log(
		`Unset resumeId from ${unsetResult.modifiedCount} application documents`,
	);
	console.log('\nMigration completed successfully!');
}

main().catch(console.error);
