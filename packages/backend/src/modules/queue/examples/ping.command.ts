/**
 * Command dispatched by the controller. The command handler is responsible
 * for turning this into a queued BullMQ job. Keep commands as plain data —
 * no behavior, no methods.
 */
export class PingCommand {
	constructor(public readonly message: string) {}
}

export interface PingCommandResult {
	jobId: string;
}
