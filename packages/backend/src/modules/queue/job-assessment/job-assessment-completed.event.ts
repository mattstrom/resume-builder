export class JobAssessmentCompletedEvent {
	constructor(
		public readonly jobId: string,
		public readonly applicationId: string,
		public readonly uid: string,
	) {}
}
