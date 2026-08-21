/**
 * Single source of truth for BullMQ queue names. Import this constant
 * wherever a queue is produced or consumed so processors and producers
 * cannot drift out of sync.
 */
export const QUEUES = {
	PING: 'ping',
	PROFILE_NARRATIVE_SUMMARY: 'profile-narrative-summary',
	RESUME_SUMMARIES: 'resume-summaries',
	EMBEDDINGS: 'embeddings',
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];
