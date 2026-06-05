#!/usr/bin/env tsx
/**
 * MongoDB → PostgreSQL one-way data migration.
 *
 * Usage (from repo root):
 *   cd packages/backend && tsx ../../node_modules/.bin/tsx src/pg-migration.ts [--dry-run]
 *
 * Or:
 *   cd packages/backend && npx tsx src/pg-migration.ts [--dry-run]
 *
 * Strategy:
 *   - Each MongoDB _id.toString() becomes the Postgres id, so all existing
 *     cross-references (applicationId, sourceResumeId, etc.) stay valid
 *     without a translation table.
 *   - Prisma upsert is used throughout — safe to re-run.
 *   - ConversationMessages are skipped on re-run if messages already exist
 *     for that conversationId.
 *   - Facts / Expressions / JobRequirementFacts / ResumeFacts are
 *     Postgres-only tables and are left untouched.
 */

import { PrismaPg } from '@prisma/adapter-pg';
import mongoose, { Schema, Types, model } from 'mongoose';

import { PrismaClient } from './generated/prisma/client.js';

const MONGO_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/resume-builder';
const DATABASE_URL =
	process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/mastra';
const DRY_RUN = process.argv.includes('--dry-run');
const SCHEMA = 'resume_builder';

// ─── Helpers ────────────────────────────────────────────────────────────────

function mongoId(raw: unknown): string {
	return String(raw);
}

/** Extract creation timestamp from ObjectId for entities without timestamps. */
function objectIdTs(raw: unknown): Date {
	try {
		return new Types.ObjectId(String(raw)).getTimestamp();
	} catch {
		return new Date();
	}
}

function log(msg: string) {
	console.log(msg);
}

function toFloat(val: unknown): number | undefined {
	if (val == null) return undefined;
	const n = typeof val === 'number' ? val : parseFloat(String(val));
	return isNaN(n) ? undefined : n;
}

function summary(collection: string, total: number, errors: number) {
	const tag = DRY_RUN ? '[dry-run] ' : '';
	const ok = total - errors;
	log(`  ${tag}${collection}: ${ok} upserted${errors ? `, ${errors} errors` : ''}`);
}

// ─── Mongoose Models (read-only, minimal schemas) ───────────────────────────

const ProfileModel = model(
	'Profile',
	new Schema({}, { strict: false, timestamps: true }),
	'profiles',
);

const CoverLetterModel = model('CoverLetter', new Schema({}, { strict: false }), 'cover-letters');

const ContactInformationModel = model(
	'ContactInformation',
	new Schema({}, { strict: false }),
	'contactinformations',
);

const EducationModel = model('Education', new Schema({}, { strict: false }), 'educations');

const JobModel = model('Job', new Schema({}, { strict: false }), 'jobs');

const ProjectModel = model('Project', new Schema({}, { strict: false }), 'projects');

const SkillModel = model('Skill', new Schema({}, { strict: false }), 'skills');

const SkillGroupModel = model('SkillGroup', new Schema({}, { strict: false }), 'skillgroups');

const VolunteeringModel = model('Volunteering', new Schema({}, { strict: false }), 'volunteerings');

const ApplicationModel = model(
	'Application',
	new Schema({}, { strict: false, timestamps: true }),
	'applications',
);

const ConversationModel = model(
	'Conversation',
	new Schema({}, { strict: false, timestamps: true }),
	'conversations',
);

const ResumeModel = model('Resume', new Schema({}, { strict: false, timestamps: true }), 'resumes');

// ─── Migration Functions ─────────────────────────────────────────────────────

async function migrateProfiles(prisma: PrismaClient) {
	log('\nMigrating profiles…');
	const docs = await ProfileModel.find().lean();
	log(`  Found ${docs.length} documents`);

	let errors = 0;
	for (const doc of docs) {
		if (DRY_RUN) continue;
		try {
			const id = mongoId(doc._id);
			await prisma.profile.upsert({
				where: { id },
				create: {
					id,
					uid: doc.uid,
					narrative: doc.narrative ?? '',
					narrativeSummary: doc.narrativeSummary ?? undefined,
					jobPreferences: doc.jobPreferences ?? {},
					createdAt: doc.createdAt,
					updatedAt: doc.updatedAt,
				},
				update: {
					narrative: doc.narrative ?? '',
					narrativeSummary: doc.narrativeSummary ?? undefined,
					jobPreferences: doc.jobPreferences ?? {},
					updatedAt: doc.updatedAt,
				},
			});
		} catch (err) {
			errors++;
			console.error(`  Error on profile ${doc._id}:`, err);
		}
	}

	summary('profiles', docs.length, errors);
}

async function migrateCoverLetters(prisma: PrismaClient) {
	log('\nMigrating cover letters…');
	const docs = await CoverLetterModel.find().lean();
	log(`  Found ${docs.length} documents`);

	let errors = 0;
	for (const doc of docs) {
		if (DRY_RUN) continue;
		try {
			const id = mongoId(doc._id);
			const ts = objectIdTs(doc._id);
			await prisma.coverLetter.upsert({
				where: { id },
				create: {
					id,
					uid: doc.uid,
					name: doc.name ?? '',
					company: doc.company ?? '',
					jobPostingUrl: doc.jobPostingUrl ?? '',
					content: doc.content ?? '',
					createdAt: ts,
					updatedAt: ts,
				},
				update: {
					name: doc.name ?? '',
					company: doc.company ?? '',
					jobPostingUrl: doc.jobPostingUrl ?? '',
					content: doc.content ?? '',
				},
			});
		} catch (err) {
			errors++;
			console.error(`  Error on cover letter ${doc._id}:`, err);
		}
	}

	summary('cover-letters', docs.length, errors);
}

async function migrateContactInformation(prisma: PrismaClient) {
	log('\nMigrating contact information…');
	const docs = await ContactInformationModel.find().lean();
	log(`  Found ${docs.length} documents`);

	let errors = 0;
	for (const doc of docs) {
		if (DRY_RUN) continue;
		try {
			const id = mongoId(doc._id);
			const ts = objectIdTs(doc._id);
			await prisma.contactInformation.upsert({
				where: { id },
				create: {
					id,
					uid: doc.uid,
					location: doc.location ?? '',
					phoneNumber: doc.phoneNumber ?? '',
					email: doc.email ?? '',
					linkedInProfile: doc.linkedInProfile ?? '',
					githubProfile: doc.githubProfile ?? '',
					personalWebsite: doc.personalWebsite ?? '',
					createdAt: ts,
					updatedAt: ts,
				},
				update: {
					location: doc.location ?? '',
					phoneNumber: doc.phoneNumber ?? '',
					email: doc.email ?? '',
					linkedInProfile: doc.linkedInProfile ?? '',
					githubProfile: doc.githubProfile ?? '',
					personalWebsite: doc.personalWebsite ?? '',
				},
			});
		} catch (err) {
			errors++;
			console.error(`  Error on contact info ${doc._id}:`, err);
		}
	}

	summary('contactinformations', docs.length, errors);
}

async function migrateEducation(prisma: PrismaClient) {
	log('\nMigrating education…');
	const docs = await EducationModel.find().lean();
	log(`  Found ${docs.length} documents`);

	let errors = 0;
	for (const doc of docs) {
		if (DRY_RUN) continue;
		try {
			const id = mongoId(doc._id);
			const ts = objectIdTs(doc._id);
			await prisma.education.upsert({
				where: { id },
				create: {
					id,
					uid: doc.uid,
					degree: doc.degree ?? '',
					field: doc.field ?? '',
					institution: doc.institution ?? '',
					graduated: doc.graduated ?? '',
					createdAt: ts,
					updatedAt: ts,
				},
				update: {
					degree: doc.degree ?? '',
					field: doc.field ?? '',
					institution: doc.institution ?? '',
					graduated: doc.graduated ?? '',
				},
			});
		} catch (err) {
			errors++;
			console.error(`  Error on education ${doc._id}:`, err);
		}
	}

	summary('educations', docs.length, errors);
}

async function migrateJobs(prisma: PrismaClient) {
	log('\nMigrating jobs…');
	const docs = await JobModel.find().lean();
	log(`  Found ${docs.length} documents`);

	let errors = 0;
	for (const doc of docs) {
		if (DRY_RUN) continue;
		try {
			const id = mongoId(doc._id);
			const ts = objectIdTs(doc._id);
			await prisma.job.upsert({
				where: { id },
				create: {
					id,
					uid: doc.uid,
					company: doc.company ?? '',
					position: doc.position ?? '',
					location: doc.location ?? '',
					startDate: doc.startDate ?? '',
					endDate: doc.endDate ?? undefined,
					responsibilities: doc.responsibilities ?? [],
					relevance: toFloat(doc.relevance),
					createdAt: ts,
					updatedAt: ts,
				},
				update: {
					company: doc.company ?? '',
					position: doc.position ?? '',
					location: doc.location ?? '',
					startDate: doc.startDate ?? '',
					endDate: doc.endDate ?? undefined,
					responsibilities: doc.responsibilities ?? [],
					relevance: toFloat(doc.relevance),
				},
			});
		} catch (err) {
			errors++;
			console.error(`  Error on job ${doc._id}:`, err);
		}
	}

	summary('jobs', docs.length, errors);
}

async function migrateProjects(prisma: PrismaClient) {
	log('\nMigrating projects…');
	const docs = await ProjectModel.find().lean();
	log(`  Found ${docs.length} documents`);

	let errors = 0;
	for (const doc of docs) {
		if (DRY_RUN) continue;
		try {
			const id = mongoId(doc._id);
			const ts = objectIdTs(doc._id);
			const type =
				doc.type === 'professional' || doc.type === 'personal' ? doc.type : undefined;
			await prisma.project.upsert({
				where: { id },
				create: {
					id,
					uid: doc.uid,
					name: doc.name ?? '',
					technologies: doc.technologies ?? [],
					items: doc.items ?? [],
					type,
					relevance: toFloat(doc.relevance),
					createdAt: ts,
					updatedAt: ts,
				},
				update: {
					name: doc.name ?? '',
					technologies: doc.technologies ?? [],
					items: doc.items ?? [],
					type,
					relevance: toFloat(doc.relevance),
				},
			});
		} catch (err) {
			errors++;
			console.error(`  Error on project ${doc._id}:`, err);
		}
	}

	summary('projects', docs.length, errors);
}

async function migrateSkills(prisma: PrismaClient) {
	log('\nMigrating skills…');
	const docs = await SkillModel.find().lean();
	log(`  Found ${docs.length} documents`);

	let errors = 0;
	for (const doc of docs) {
		if (DRY_RUN) continue;
		try {
			const id = mongoId(doc._id);
			const ts = objectIdTs(doc._id);
			await prisma.skill.upsert({
				where: { id },
				create: {
					id,
					uid: doc.uid,
					name: doc.name ?? '',
					category: doc.category ?? '',
					relevance: toFloat(doc.relevance),
					createdAt: ts,
					updatedAt: ts,
				},
				update: {
					name: doc.name ?? '',
					category: doc.category ?? '',
					relevance: toFloat(doc.relevance),
				},
			});
		} catch (err) {
			errors++;
			console.error(`  Error on skill ${doc._id}:`, err);
		}
	}

	summary('skills', docs.length, errors);
}

async function migrateSkillGroups(prisma: PrismaClient) {
	log('\nMigrating skill groups…');
	const docs = await SkillGroupModel.find().lean();
	log(`  Found ${docs.length} documents`);

	let errors = 0;
	for (const doc of docs) {
		if (DRY_RUN) continue;
		try {
			const id = mongoId(doc._id);
			const ts = objectIdTs(doc._id);
			await prisma.skillGroup.upsert({
				where: { id },
				create: {
					id,
					uid: doc.uid,
					name: doc.name ?? '',
					items: doc.items ?? [],
					createdAt: ts,
					updatedAt: ts,
				},
				update: {
					name: doc.name ?? '',
					items: doc.items ?? [],
				},
			});
		} catch (err) {
			errors++;
			console.error(`  Error on skill group ${doc._id}:`, err);
		}
	}

	summary('skillgroups', docs.length, errors);
}

async function migrateVolunteering(prisma: PrismaClient) {
	log('\nMigrating volunteering…');
	const docs = await VolunteeringModel.find().lean();
	log(`  Found ${docs.length} documents`);

	let errors = 0;
	for (const doc of docs) {
		if (DRY_RUN) continue;
		try {
			const id = mongoId(doc._id);
			const ts = objectIdTs(doc._id);
			await prisma.volunteering.upsert({
				where: { id },
				create: {
					id,
					uid: doc.uid,
					organization: doc.organization ?? undefined,
					position: doc.position ?? '',
					location: doc.location ?? undefined,
					startDate: doc.startDate ?? '',
					endDate: doc.endDate ?? undefined,
					responsibilities: doc.responsibilities ?? [],
					relevance: toFloat(doc.relevance),
					createdAt: ts,
					updatedAt: ts,
				},
				update: {
					organization: doc.organization ?? undefined,
					position: doc.position ?? '',
					location: doc.location ?? undefined,
					startDate: doc.startDate ?? '',
					endDate: doc.endDate ?? undefined,
					responsibilities: doc.responsibilities ?? [],
					relevance: toFloat(doc.relevance),
				},
			});
		} catch (err) {
			errors++;
			console.error(`  Error on volunteering ${doc._id}:`, err);
		}
	}

	summary('volunteerings', docs.length, errors);
}

async function migrateApplications(prisma: PrismaClient) {
	log('\nMigrating applications…');
	const docs = await ApplicationModel.find().lean();
	log(`  Found ${docs.length} documents`);

	let errors = 0;
	for (const doc of docs) {
		if (DRY_RUN) continue;
		try {
			const id = mongoId(doc._id);
			const coverLetterId = doc.coverLetterId ? mongoId(doc.coverLetterId) : undefined;
			await prisma.application.upsert({
				where: { id },
				create: {
					id,
					uid: doc.uid,
					name: doc.name ?? '',
					company: doc.company ?? '',
					jobPostingUrl: doc.jobPostingUrl ?? '',
					jobDescription: doc.jobDescription ?? undefined,
					notionId: doc.notionId ?? undefined,
					coverLetterId,
					jobSummary: doc.jobSummary ?? undefined,
					analysis: doc.analysis ?? undefined,
					notes: doc.notes ?? undefined,
					createdAt: doc.createdAt,
					updatedAt: doc.updatedAt,
				},
				update: {
					name: doc.name ?? '',
					company: doc.company ?? '',
					jobPostingUrl: doc.jobPostingUrl ?? '',
					jobDescription: doc.jobDescription ?? undefined,
					notionId: doc.notionId ?? undefined,
					coverLetterId,
					jobSummary: doc.jobSummary ?? undefined,
					analysis: doc.analysis ?? undefined,
					notes: doc.notes ?? undefined,
					updatedAt: doc.updatedAt,
				},
			});
		} catch (err) {
			errors++;
			console.error(`  Error on application ${doc._id}:`, err);
		}
	}

	summary('applications', docs.length, errors);
}

async function migrateConversations(prisma: PrismaClient) {
	log('\nMigrating conversations…');
	const docs = await ConversationModel.find().lean();
	log(`  Found ${docs.length} documents`);

	let errors = 0;
	for (const doc of docs) {
		if (DRY_RUN) continue;
		try {
			const id = mongoId(doc._id);
			const applicationId = doc.applicationId ? mongoId(doc.applicationId) : undefined;
			await prisma.conversation.upsert({
				where: { id },
				create: {
					id,
					uid: doc.uid,
					applicationId,
					title: doc.title ?? 'New Conversation',
					model: doc.model ?? undefined,
					createdAt: doc.createdAt,
					updatedAt: doc.updatedAt,
				},
				update: {
					applicationId,
					title: doc.title ?? 'New Conversation',
					model: doc.model ?? undefined,
					updatedAt: doc.updatedAt,
				},
			});

			const messages: Array<{ role: string; content: string; createdAt: Date }> =
				doc.messages ?? [];
			if (messages.length > 0) {
				const existing = await prisma.conversationMessage.count({
					where: { conversationId: id },
				});
				if (existing === 0) {
					await prisma.conversationMessage.createMany({
						data: messages.map((m) => ({
							conversationId: id,
							role: m.role,
							content: m.content,
							createdAt: m.createdAt ?? doc.createdAt,
						})),
					});
				}
			}
		} catch (err) {
			errors++;
			console.error(`  Error on conversation ${doc._id}:`, err);
		}
	}

	summary('conversations', docs.length, errors);
}

async function migrateResumes(prisma: PrismaClient) {
	log('\nMigrating resumes…');
	const docs = await ResumeModel.find().lean();
	log(`  Found ${docs.length} documents`);

	let errors = 0;
	for (const doc of docs) {
		if (DRY_RUN) continue;
		try {
			const id = mongoId(doc._id);
			const applicationId = doc.applicationId ? mongoId(doc.applicationId) : undefined;
			const sourceResumeId = doc.sourceResume ? mongoId(doc.sourceResume) : undefined;
			await prisma.resume.upsert({
				where: { id },
				create: {
					id,
					uid: doc.uid,
					name: doc.name ?? '',
					company: doc.company ?? '',
					level: doc.level ?? undefined,
					jobPostingUrl: doc.jobPostingUrl ?? '',
					readOnly: doc.readOnly ?? false,
					base: doc.base ?? false,
					applicationId,
					sourceResumeId,
					data: doc.data ?? {},
					createdAt: doc.createdAt,
					updatedAt: doc.updatedAt,
				},
				update: {
					name: doc.name ?? '',
					company: doc.company ?? '',
					level: doc.level ?? undefined,
					jobPostingUrl: doc.jobPostingUrl ?? '',
					readOnly: doc.readOnly ?? false,
					base: doc.base ?? false,
					applicationId,
					sourceResumeId,
					data: doc.data ?? {},
					updatedAt: doc.updatedAt,
				},
			});
		} catch (err) {
			errors++;
			console.error(`  Error on resume ${doc._id}:`, err);
		}
	}

	summary('resumes', docs.length, errors);
}

// ─── Entry Point ─────────────────────────────────────────────────────────────

async function main() {
	if (DRY_RUN) {
		log('DRY RUN — counts will be shown, no writes will be made\n');
	}

	await mongoose.connect(MONGO_URI);
	log('Connected to MongoDB');

	const adapter = new PrismaPg(DATABASE_URL, { schema: SCHEMA });
	const prisma = new PrismaClient({ adapter } as never);
	await prisma.$connect();
	log('Connected to PostgreSQL\n');

	try {
		await migrateProfiles(prisma);
		await migrateCoverLetters(prisma);
		await migrateContactInformation(prisma);
		await migrateEducation(prisma);
		await migrateJobs(prisma);
		await migrateProjects(prisma);
		await migrateSkills(prisma);
		await migrateSkillGroups(prisma);
		await migrateVolunteering(prisma);
		await migrateApplications(prisma);
		await migrateConversations(prisma);
		await migrateResumes(prisma);

		log('\nMigration complete.');
	} finally {
		await mongoose.disconnect();
		await prisma.$disconnect();
	}
}

main().catch((err) => {
	console.error('\nFatal error:', err);
	process.exit(1);
});
