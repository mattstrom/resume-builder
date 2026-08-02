import { z } from 'zod';

const conceptSchema = <V extends string>(vocabulary: V) =>
	z.object({
		vocabulary: z.literal(vocabulary),
		key: z.string().trim().min(1),
		label: z.string().trim().min(1),
	});

const meaningSchema = z.discriminatedUnion('relation', [
	z.object({
		relation: z.literal('is-a'),
		concept: conceptSchema('fact-type'),
		confidence: z.number().min(0).max(1),
	}),
	z.object({
		relation: z.literal('relates-to'),
		concept: conceptSchema('entity'),
		confidence: z.number().min(0).max(1),
	}),
	z.object({
		relation: z.literal('about'),
		concept: conceptSchema('topic'),
		confidence: z.number().min(0).max(1),
	}),
	z.object({
		relation: z.literal('uses'),
		concept: conceptSchema('technology'),
		confidence: z.number().min(0).max(1),
	}),
	z.object({
		relation: z.literal('demonstrates'),
		concept: conceptSchema('capability'),
		confidence: z.number().min(0).max(1),
	}),
	z.object({
		relation: z.literal('supports'),
		concept: conceptSchema('outcome'),
		confidence: z.number().min(0).max(1),
	}),
	z.object({
		relation: z.literal('produced'),
		concept: conceptSchema('artifact'),
		confidence: z.number().min(0).max(1),
	}),
]);

export const bulletConceptAnnotationSchema = z.object({
	meanings: z.array(meaningSchema).max(16),
});

export type BulletConceptAnnotation = z.infer<typeof bulletConceptAnnotationSchema>;
