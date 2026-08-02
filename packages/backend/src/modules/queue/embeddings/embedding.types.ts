import type { EmbeddingEntityType, EmbeddingProfile } from './embedding.constants.js';

export interface EmbeddingTarget {
	entityType: EmbeddingEntityType;
	entityId: string;
	revision: number;
	profile: EmbeddingProfile;
}

export interface EmbeddingDocument extends EmbeddingTarget {
	text: string;
}

export interface EmbeddingDocumentProvider {
	loadDocument(id: string, entityType: EmbeddingEntityType): Promise<EmbeddingDocument | null>;
	saveIfCurrent(
		id: string,
		revision: number,
		profile: EmbeddingProfile,
		model: string,
		vector: number[],
		entityType: EmbeddingEntityType,
	): Promise<boolean>;
}

export interface GenerateEmbeddingJobData extends EmbeddingTarget {}

export interface ReconcileEmbeddingsJobData {
	entityType?: EmbeddingEntityType;
	limit?: number;
}
