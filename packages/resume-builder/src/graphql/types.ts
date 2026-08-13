import type { Application, ConceptQualifierValue, Resume } from '@resume-builder/entities';

export interface ListApplicationsData {
	listApplications: Application[];
}

export interface GetApplicationData {
	getApplication: Application;
}

export interface CreateApplicationData {
	createApplication: Application;
}

export interface UpdateApplicationData {
	updateApplication: Application;
}

export interface GetApplicationVariables {
	id: string;
}

export interface GetJobRequirementsData {
	jobRequirements: JobRequirement[];
}

export interface JobRequirementConceptAssertion {
	jobRequirementId: string;
	conceptId: string;
	relation: 'requires' | 'prefers' | 'expects';
	source: string;
	confidence?: number | null;
	qualifier?: ConceptQualifierValue | null;
	concept: {
		id: string;
		vocabulary: string;
		key: string;
		label: string;
		definition?: string | null;
	};
}

export interface JobRequirement {
	id: string;
	applicationId: string;
	kind: string;
	what: string;
	technologies: string[];
	tags: string[];
	concepts: JobRequirementConceptAssertion[];
	createdAt: string;
}

export interface GetJobRequirementsVariables {
	applicationId: string;
}

export interface ProfileKnowledgeProposalRecord {
	id: string;
	feedbackId: string;
	kind: 'fact' | 'requirement-interpretation' | 'scoring-guidance';
	title: string;
	rationale: string;
	payload: unknown;
	status: 'proposed' | 'accepted' | 'rejected';
	acceptedFactId?: string | null;
	createdAt: string;
	resolvedAt?: string | null;
}

export interface RequirementGradeFeedbackRecord {
	id: string;
	applicationId: string;
	jobRequirementId: string;
	agentGrade: string;
	manualGrade?: string | null;
	explanation?: string | null;
	createdAt: string;
	proposals: ProfileKnowledgeProposalRecord[];
}

export interface ProfileKnowledgeInboxItem {
	proposal: ProfileKnowledgeProposalRecord;
	applicationId: string;
	applicationName: string;
	company: string;
	jobRequirementId: string;
	requirement: string;
	agentGrade: string;
	manualGrade?: string | null;
	explanation?: string | null;
}

export interface GetProfileKnowledgeInboxData {
	profileKnowledgeInbox: ProfileKnowledgeInboxItem[];
}

export interface GetProfileKnowledgeLedgerData {
	profileKnowledgeLedger: {
		accepted: ProfileKnowledgeInboxItem[];
		pendingSuggestionCount: number;
	};
}

export interface ResolveProfileKnowledgeProposalData {
	resolveProfileKnowledgeProposal: Pick<
		ProfileKnowledgeProposalRecord,
		'id' | 'status' | 'acceptedFactId' | 'resolvedAt'
	>;
}

export interface ResolveProfileKnowledgeProposalVariables {
	proposalId: string;
	accept: boolean;
}

export interface GetRequirementGradeFeedbackData {
	requirementGradeFeedback: RequirementGradeFeedbackRecord[];
	profileKnowledgeGuidance: string[];
}

export interface GetRequirementGradeFeedbackVariables {
	applicationId: string;
}

/** A free-text label matched to the concept it names, plus its parent chain. */
export interface ResolvedConceptLabel {
	label: string;
	conceptId: string;
	broaderConceptIds: string[];
}

export interface ResolveConceptLabelsData {
	resolveConceptLabels: ResolvedConceptLabel[];
}

export interface ResolveConceptLabelsVariables {
	labels: string[];
}

export interface ConceptEvidenceAssessment {
	id: string;
	applicationId: string;
	resumeId: string;
	inputHash: string;
	evaluatorVersion: number;
	result: unknown;
	createdAt: string;
	updatedAt: string;
}

export interface GetConceptEvidenceAssessmentData {
	conceptEvidenceAssessment: ConceptEvidenceAssessment | null;
}

export interface ConceptEvidenceAssessmentVariables {
	applicationId: string;
	resumeId: string;
}

export interface SaveConceptEvidenceAssessmentData {
	saveConceptEvidenceAssessment: ConceptEvidenceAssessment;
}

export interface SaveConceptEvidenceAssessmentVariables extends ConceptEvidenceAssessmentVariables {
	inputHash: string;
	evaluatorVersion: number;
	result: unknown;
}

export interface CreateApplicationVariables {
	applicationData: Omit<Application, '_id' | 'uid' | 'createdAt' | 'updatedAt'>;
	sourceResumeId?: string;
}

export interface UpdateApplicationVariables {
	id: string;
	applicationData: Partial<
		Omit<
			Application,
			| '_id'
			| 'uid'
			| 'createdAt'
			| 'updatedAt'
			| 'jobDescription'
			| 'notionId'
			| 'coverLetterId'
			| 'jobSummary'
			| 'analysis'
			| 'notes'
		> & {
			jobDescription?: Application['jobDescription'] | null;
			notionId?: Application['notionId'] | null;
			coverLetterId?: Application['coverLetterId'] | null;
			jobSummary?: Application['jobSummary'] | null;
			analysis?: Application['analysis'] | null;
			notes?: Application['notes'] | null;
		}
	>;
}

export interface ListResumesData {
	listResumes: Resume[];
}

export type BaseResumeSummary = Pick<Resume, '_id' | 'name' | 'base'>;

export interface ListBaseResumesData {
	listResumes: BaseResumeSummary[];
}

export interface ListResumesVariables {
	sort?: { field: string; ascending: boolean };
	filter?: { base?: boolean; company?: string; applicationId?: string };
}

export interface GetResumeData {
	getResume: Resume;
}

export interface CreateBlankResumeData {
	createBlankResume: Resume;
}

export interface CreateBlankResumeVariables {
	resumeData: {
		name: string;
		company: string;
		jobPostingUrl: string;
		base: boolean;
		applicationId?: string;
		sourceResumeId?: string;
	};
}

export interface UpdateResumeData {
	updateResume: Resume;
}

export interface UpdateResumeVariables {
	id: string;
	resumeData: {
		name?: string;
		company?: string;
		level?: string;
		jobPostingUrl?: string;
		base?: boolean;
		applicationId?: string;
	};
}

export interface DeleteResumeData {
	deleteResume: boolean;
}

export interface DeleteResumeVariables {
	id: string;
}

export interface GetResumeVariables {
	id: string;
}
