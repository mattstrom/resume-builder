/**
 * Domain event emitted once a ping job has been processed. Real consumers
 * (websocket broadcasters, notifications, audit logs) should subscribe via
 * `@EventsHandler(PingCompletedEvent)`.
 */
export class PingCompletedEvent {
	constructor(
		public readonly jobId: string,
		public readonly message: string,
	) {}
}
