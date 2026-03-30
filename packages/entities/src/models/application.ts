import {
	Field,
	Float,
	ID,
	InputType,
	ObjectType,
	PartialType,
} from '@nestjs/graphql';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { z } from 'zod';

@ObjectType({ description: 'Structured summary of job posting requirements' })
@Schema({ _id: false, versionKey: false })
export class JobSummary {
	@Field(() => [String], {
		description: 'Skills required by the job posting',
	})
	@Prop({ type: [String], default: [] })
	requiredSkills: string[];

	@Field(() => [String], {
		description: 'Skills preferred but not required by the job posting',
	})
	@Prop({ type: [String], default: [] })
	preferredSkills: string[];

	@Field({ nullable: true, description: 'Education requirements' })
	@Prop({ type: String })
	requiredEducation?: string;

	@Field({
		nullable: true,
		description:
			'Experience requirements (e.g. "5+ years in distributed systems")',
	})
	@Prop({ type: String })
	requiredExperience?: string;
}

export const JobSummarySchema = SchemaFactory.createForClass(JobSummary);

@ObjectType({
	description:
		'Analysis of fit between user skills/experience and job posting',
})
@Schema({ _id: false, versionKey: false })
export class Analysis {
	@Field(() => Float, {
		description: 'Relevance of skills to the job posting (0-1)',
	})
	@Prop({ type: Number })
	skillRelevance: number;

	@Field(() => Float, {
		description: 'Relevance of work experience to the job posting (0-1)',
	})
	@Prop({ type: Number })
	experienceRelevance: number;

	@Field(() => Float, { description: 'Aggregate fit score (0-1)' })
	@Prop({ type: Number })
	overallFit: number;

	@Field(() => [String], {
		description: 'Strengths of the user relative to the job posting',
	})
	@Prop({ type: [String], default: [] })
	strengths: string[];

	@Field(() => [String], {
		description: 'Weaknesses or skill gaps relative to the job posting',
	})
	@Prop({ type: [String], default: [] })
	weaknesses: string[];

	@Field(() => [String], {
		description: 'Suggested improvements or talking points',
	})
	@Prop({ type: [String], default: [] })
	recommendations: string[];
}

export const AnalysisSchema = SchemaFactory.createForClass(Analysis);

@Schema({ collection: 'applications', versionKey: false, timestamps: true })
@ObjectType({ description: 'Application' })
export class Application {
	@Field(() => ID)
	_id: string;

	@Field({ description: 'User ID' })
	@Prop({ type: String, required: true, index: true })
	uid: string;

	@Field({ description: 'Friendly name for this application' })
	@Prop({ type: String, default: '' })
	name: string;

	@Field({ description: 'Company to which this application applies' })
	@Prop({ type: String, default: '' })
	company: string;

	@Field({ description: 'URL of the job posting' })
	@Prop({ type: String, default: '' })
	jobPostingUrl: string;

	@Field({
		nullable: true,
		description:
			'Raw text of the job posting, for when the URL is hard to load due to heavy JavaScript etc.',
	})
	@Prop({ type: String })
	jobDescription?: string;

	@Field({
		nullable: true,
		description: 'Notion database record ID linking to pipeline tracking',
	})
	@Prop({ type: String })
	notionId?: string;

	@Field({
		nullable: true,
		description: 'Reference to resume prepared for this application',
	})
	@Prop({ type: Types.ObjectId })
	resumeId?: string;

	@Field({
		nullable: true,
		description: 'Reference to cover letter prepared for this application',
	})
	@Prop({ type: Types.ObjectId })
	coverLetterId?: string;

	@Field(() => JobSummary, {
		nullable: true,
		description:
			'Key skills, education, and experience the job posting is looking for',
	})
	@Prop({ type: JobSummarySchema })
	jobSummary?: JobSummary;

	@Field(() => Analysis, {
		nullable: true,
		description:
			'Analysis of strengths, weaknesses, and relevance of skills and experience',
	})
	@Prop({ type: AnalysisSchema })
	analysis?: Analysis;

	@Field({ nullable: true, description: 'Freeform notes' })
	@Prop({ type: String })
	notes?: string;

	@Field()
	createdAt: Date;

	@Field()
	updatedAt: Date;
}

export const ApplicationSchema = SchemaFactory.createForClass(Application);

@InputType()
export class JobSummaryInput {
	@Field(() => [String])
	requiredSkills: string[];

	@Field(() => [String])
	preferredSkills: string[];

	@Field({ nullable: true })
	requiredEducation?: string;

	@Field({ nullable: true })
	requiredExperience?: string;
}

@InputType()
export class AnalysisInput {
	@Field(() => Float)
	skillRelevance: number;

	@Field(() => Float)
	experienceRelevance: number;

	@Field(() => Float)
	overallFit: number;

	@Field(() => [String])
	strengths: string[];

	@Field(() => [String])
	weaknesses: string[];

	@Field(() => [String])
	recommendations: string[];
}

@InputType()
export class ApplicationInput {
	@Field()
	name: string;

	@Field()
	company: string;

	@Field()
	jobPostingUrl: string;

	@Field({ nullable: true })
	jobDescription?: string;

	@Field({ nullable: true })
	notionId?: string;

	@Field({ nullable: true })
	resumeId?: string;

	@Field({ nullable: true })
	coverLetterId?: string;

	@Field(() => JobSummaryInput, { nullable: true })
	jobSummary?: JobSummaryInput;

	@Field(() => AnalysisInput, { nullable: true })
	analysis?: AnalysisInput;

	@Field({ nullable: true })
	notes?: string;
}

@InputType()
export class ApplicationUpdateInput extends PartialType(ApplicationInput) {}

export const jobSummarySchema = z.object({
	requiredSkills: z.array(z.string()),
	preferredSkills: z.array(z.string()),
	requiredEducation: z.string().optional(),
	requiredExperience: z.string().optional(),
});

export const analysisSchema = z.object({
	skillRelevance: z.number().min(0).max(1),
	experienceRelevance: z.number().min(0).max(1),
	overallFit: z.number().min(0).max(1),
	strengths: z.array(z.string()),
	weaknesses: z.array(z.string()),
	recommendations: z.array(z.string()),
});

export const applicationSchema = z.object({
	_id: z.any(),
	uid: z.string(),
	name: z.string(),
	company: z.string(),
	jobPostingUrl: z.string(),
	jobDescription: z.string().optional(),
	notionId: z.string().optional(),
	resumeId: z.string().optional(),
	coverLetterId: z.string().optional(),
	jobSummary: jobSummarySchema.optional(),
	analysis: analysisSchema.optional(),
	notes: z.string().optional(),
	createdAt: z.iso.datetime(),
	updatedAt: z.iso.datetime(),
});

export const applicationInputSchema = applicationSchema.omit({
	_id: true,
	uid: true,
	createdAt: true,
	updatedAt: true,
});
