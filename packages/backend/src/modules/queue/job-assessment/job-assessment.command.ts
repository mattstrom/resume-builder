export class JobAssessmentCommand {
	constructor(
		public readonly applicationId: string,
		public readonly uid: string,
	) {}
}

export interface JobAssessmentCommandResult {
	jobId: string;
}
