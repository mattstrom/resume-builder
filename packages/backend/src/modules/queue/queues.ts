/**
 * Single source of truth for BullMQ queue names. Import this constant
 * wherever a queue is produced or consumed so processors and producers
 * cannot drift out of sync.
 */
export const QUEUES = {
	PING: 'ping',
	JOB_ASSESSMENT: 'job-assessment',
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];
