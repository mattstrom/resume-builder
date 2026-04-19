export class ProfileNarrativeSummaryCompletedEvent {
	constructor(
		public readonly jobId: string,
		public readonly uid: string,
	) {}
}
