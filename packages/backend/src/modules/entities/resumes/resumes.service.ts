import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
	BlankResumeCreateInput,
	Resume,
	ResumeContent,
	ResumeCreateInput,
	ResumeFilterInput,
	ResumeSortBy,
	ResumeSortInput,
	ResumeUpdateInput,
	resumeContentFromXml,
	resumeToXml,
	resumeSummarySchema,
	type ResumeSummaryValue,
} from '@resume-builder/entities';

import { PrismaService } from '../../prisma/index.js';
import { EMBEDDING_MODEL, EMBEDDING_PROFILES } from '../../queue/embeddings/embedding.constants.js';
import { EmbeddingService } from '../../queue/embeddings/embedding.service.js';
import {
	ResumeSearchMatchKind,
	type ResumeSearchMatch,
	type ResumeSearchResult,
} from './resume-search.graphql.js';
import { ResumeXmlRepository } from './resume-xml.repository.js';

type ResumeWithId = Resume & { _id: string; xml?: string };
const SCHEMA = 'resume_builder';

interface LexicalSearchRow {
	id: string;
	nameMatch: boolean;
	companyMatch: boolean;
	lexicalScore: number;
}

interface SemanticSearchRow {
	id: string;
	distance: number;
}

interface SearchRank {
	score: number;
	nameMatch: boolean;
	companyMatch: boolean;
	semanticMatch: boolean;
}

@Injectable()
export class ResumesService {
	private readonly logger = new Logger(ResumesService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly resumeXml: ResumeXmlRepository,
		private readonly embedding: EmbeddingService,
	) {}

	async search(
		uid: string,
		query: string,
		requestedLimit = 10,
		semanticOnly = false,
	): Promise<ResumeSearchResult[]> {
		const text = query.trim();
		if (text.length < 2) return [];
		const limit = Math.max(1, Math.min(requestedLimit, 50));
		const candidateLimit = Math.max(50, limit * 5);
		const pattern = `%${escapeLike(text)}%`;
		const lexical = semanticOnly
			? []
			: await this.prisma.$queryRawUnsafe<LexicalSearchRow[]>(
					`WITH searchable AS (
				SELECT r.id,
				       lower(r.name) LIKE lower($3) ESCAPE '\\' AS "nameMatch",
				       lower(r.company) LIKE lower($3) ESCAPE '\\' AS "companyMatch",
				       setweight(to_tsvector('simple', coalesce(r.name, '')), 'A') ||
				       setweight(to_tsvector('simple', coalesce(r.company, '')), 'A') ||
				       setweight(to_tsvector('simple', CASE
				         WHEN r."lastSummarizedAt" IS NOT NULL
				          AND (rx."updatedAt" IS NULL OR r."lastSummarizedAt" >= rx."updatedAt")
				         THEN coalesce(r.summary::text, '') ELSE '' END), 'B') AS document
				FROM "${SCHEMA}"."Resume" r
				LEFT JOIN "${SCHEMA}"."ResumeXml" rx ON rx."resumeId" = r.id
				WHERE r.uid = $1
			), ranked AS (
				SELECT id, "nameMatch", "companyMatch",
				       ts_rank_cd(document, websearch_to_tsquery('simple', $2)) AS "lexicalScore"
				FROM searchable
			)
			SELECT id, "nameMatch", "companyMatch", "lexicalScore"
			FROM ranked
			WHERE "nameMatch" OR "companyMatch" OR "lexicalScore" > 0
			ORDER BY "nameMatch" DESC, "companyMatch" DESC, "lexicalScore" DESC, id
			LIMIT $4`,
					uid,
					text,
					pattern,
					candidateLimit,
				);

		let semantic: SemanticSearchRow[] = [];
		try {
			const vector = await this.embedding.embed(text);
			semantic = await this.prisma.$queryRawUnsafe<SemanticSearchRow[]>(
				`SELECT r.id,
				        r.embedding OPERATOR(${SCHEMA}.<=>) $1::${SCHEMA}.vector AS distance
				 FROM "${SCHEMA}"."Resume" r
				 JOIN "${SCHEMA}"."ResumeXml" rx ON rx."resumeId" = r.id
				 WHERE r.uid = $2
				   AND r.summary IS NOT NULL
				   AND r."lastSummarizedAt" >= rx."updatedAt"
				   AND r.embedding IS NOT NULL
				   AND r."embeddedRevision" = r."embeddingRevision"
				   AND r."embeddingModel" = $3
				   AND r."embeddingProfile" = $4
				   AND r.embedding OPERATOR(${SCHEMA}.<=>) $1::${SCHEMA}.vector <= 0.45
				 ORDER BY distance, r.id
				 LIMIT $5`,
				`[${vector.join(',')}]`,
				uid,
				EMBEDDING_MODEL,
				EMBEDDING_PROFILES.resume,
				candidateLimit,
			);
		} catch (error) {
			this.logger.warn(
				`Resume semantic search unavailable; returning lexical matches: ${error instanceof Error ? error.message : String(error)}`,
			);
		}

		const ranks = new Map<string, SearchRank>();
		lexical.forEach((row, index) => {
			ranks.set(row.id, {
				score: 1 / (60 + index + 1) + (row.nameMatch ? 2 : 0) + (row.companyMatch ? 1 : 0),
				nameMatch: row.nameMatch,
				companyMatch: row.companyMatch,
				semanticMatch: false,
			});
		});
		semantic.forEach((row, index) => {
			const rank = ranks.get(row.id) ?? {
				score: 0,
				nameMatch: false,
				companyMatch: false,
				semanticMatch: false,
			};
			rank.score += 1 / (60 + index + 1);
			rank.semanticMatch = true;
			ranks.set(row.id, rank);
		});

		const ordered = [...ranks.entries()]
			.sort(
				([leftId, left], [rightId, right]) =>
					right.score - left.score || leftId.localeCompare(rightId),
			)
			.slice(0, limit);
		const resumes = await this.prisma.resume.findMany({
			where: { uid, id: { in: ordered.map(([id]) => id) } },
			include: { resumeXml: { select: { updatedAt: true } } },
		});
		const byId = new Map(resumes.map((resume) => [resume.id, resume]));

		return ordered.flatMap(([id, rank]) => {
			const resume = byId.get(id);
			if (!resume) return [];
			const summaryIsFresh =
				resume.lastSummarizedAt !== null &&
				(!resume.resumeXml || resume.lastSummarizedAt >= resume.resumeXml.updatedAt);
			const parsedSummary = resumeSummarySchema.safeParse(
				summaryIsFresh ? resume.summary : null,
			);
			const summary = parsedSummary.success ? parsedSummary.data : undefined;
			return [
				{
					resumeId: resume.id,
					name: resume.name,
					company: resume.company,
					level: resume.level ?? undefined,
					base: resume.base,
					applicationId: resume.applicationId ?? undefined,
					summary,
					updatedAt: resume.updatedAt,
					score: rank.score,
					matches: buildMatches(text, summary, rank),
				},
			];
		});
	}

	private async hydrate(result: Record<string, unknown>): Promise<ResumeWithId> {
		const id = String(result.id);
		const uid = String(result.uid);
		const xml = await this.resumeXml.find(uid, id);
		return {
			...result,
			_id: id,
			xml: xml ?? undefined,
			data: xml ? resumeContentFromXml(xml, uid) : (result.data as ResumeContent),
		} as ResumeWithId;
	}

	async findAll(
		uid: string,
		sort?: ResumeSortInput,
		filter?: ResumeFilterInput,
	): Promise<ResumeWithId[]> {
		const where: Record<string, unknown> = { uid };

		if (filter?.base !== undefined) {
			where['base'] = filter.base;
		}
		if (filter?.company) {
			where['company'] = {
				contains: filter.company,
				mode: 'insensitive',
			};
		}
		if (filter?.applicationId) {
			where['applicationId'] = filter.applicationId;
		}

		const orderBy: Record<string, string>[] = [];

		if (sort) {
			const fieldMap: Record<ResumeSortBy, string> = {
				[ResumeSortBy.COMPANY]: 'company',
				[ResumeSortBy.LEVEL]: 'level',
				[ResumeSortBy.DATE]: 'createdAt',
			};
			orderBy.push({
				[fieldMap[sort.field]]: sort.ascending ? 'asc' : 'desc',
			});
		}

		orderBy.push({ name: 'asc' });

		const results = await this.prisma.resume.findMany({ where, orderBy });

		return Promise.all(results.map((result) => this.hydrate(result)));
	}

	async find(uid: string, id: string): Promise<ResumeWithId> {
		const result = await this.prisma.resume.findFirst({
			where: { id, uid },
		});
		if (!result) {
			throw new NotFoundException();
		}
		return this.hydrate(result);
	}

	async create(uid: string, resumeData: ResumeCreateInput): Promise<ResumeWithId> {
		const result = await this.prisma.resume.create({
			data: {
				...resumeData,
				uid,
				data: resumeData.data as object,
			},
		});

		const hydrated = {
			...result,
			_id: result.id,
			data: result.data as ResumeContent,
		} as ResumeWithId;
		const xml = resumeToXml(hydrated);
		await this.resumeXml.upsert(result.id, xml);
		return { ...hydrated, xml };
	}

	async createBlank(uid: string, resumeData: BlankResumeCreateInput): Promise<ResumeWithId> {
		let data: object;
		let sourceXml: string | null = null;

		if (resumeData.sourceResumeId) {
			const sourceResume = await this.prisma.resume.findFirst({
				where: { id: resumeData.sourceResumeId, uid },
			});

			if (!sourceResume) {
				throw new NotFoundException(
					`Resume with id ${resumeData.sourceResumeId} not found`,
				);
			}

			sourceXml = await this.resumeXml.find(uid, sourceResume.id);
			data = sourceXml ? resumeContentFromXml(sourceXml, uid) : (sourceResume.data as object);
		} else {
			const contactInfo = await this.prisma.contactInformation.findFirst({
				where: { uid },
			});

			if (!contactInfo) {
				throw new NotFoundException('Contact information not found');
			}

			data = { contactInformation: contactInfo };
		}

		const result = await this.prisma.resume.create({
			data: {
				...resumeData,
				uid,
				data,
			},
		});

		const hydrated = {
			...result,
			_id: result.id,
			data: result.data as ResumeContent,
		} as ResumeWithId;
		const xml = sourceXml ?? resumeToXml(hydrated);
		await this.resumeXml.upsert(result.id, xml);
		return { ...hydrated, xml };
	}

	async update(uid: string, id: string, resumeData: ResumeUpdateInput): Promise<ResumeWithId> {
		const existing = await this.prisma.resume.findFirst({
			where: { id, uid },
			select: { id: true },
		});

		if (!existing) {
			throw new NotFoundException(`Resume with id ${id} not found`);
		}

		const result = await this.prisma.resume.update({
			where: { id },
			data: resumeData,
		});
		return this.hydrate(result);
	}

	async delete(uid: string, id: string): Promise<void> {
		const resume = await this.prisma.resume.findFirst({
			where: { id, uid },
			select: { id: true },
		});

		if (!resume) {
			throw new NotFoundException();
		}

		await this.prisma.$transaction([
			this.prisma.resume.updateMany({
				where: { sourceResumeId: id },
				data: { sourceResumeId: null },
			}),
			this.prisma.resumeFact.deleteMany({ where: { resumeId: id } }),
			this.prisma.documentUpdate.deleteMany({
				where: { name: `resume:${id}`, uid },
			}),
			this.prisma.resume.delete({ where: { id } }),
		]);
	}
}

function escapeLike(value: string): string {
	return value.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_');
}

function buildMatches(
	query: string,
	summary: ResumeSummaryValue | undefined,
	rank: SearchRank,
): ResumeSearchMatch[] {
	const matches: ResumeSearchMatch[] = [];
	if (rank.nameMatch) matches.push({ kind: ResumeSearchMatchKind.NAME, label: 'Name' });
	if (rank.companyMatch) matches.push({ kind: ResumeSearchMatchKind.COMPANY, label: 'Company' });
	if (summary) {
		const tokens = query
			.toLocaleLowerCase()
			.split(/\s+/)
			.filter((token) => token.length >= 2);
		const matchingValue = (values: string[]) =>
			values.find((value) => {
				const normalized = value.toLocaleLowerCase();
				return tokens.some((token) => normalized.includes(token));
			});
		const dominantTheme = matchingValue([summary.dominantTheme]);
		const summaryTheme = matchingValue([summary.summaryTheme]);
		const technology = matchingValue(summary.technologies);
		const project = summary.projects.find(({ name, description }) =>
			matchingValue([name, description]),
		);
		const contentTheme = matchingValue(summary.contentThemes);
		if (dominantTheme) {
			matches.push({
				kind: ResumeSearchMatchKind.DOMINANT_THEME,
				label: dominantTheme,
			});
		}
		if (summaryTheme) {
			matches.push({
				kind: ResumeSearchMatchKind.SUMMARY_THEME,
				label: summaryTheme,
			});
		}
		if (technology) {
			matches.push({
				kind: ResumeSearchMatchKind.TECHNOLOGY,
				label: technology,
			});
		}
		if (project) {
			matches.push({
				kind: ResumeSearchMatchKind.PROJECT,
				label: project.name,
			});
		}
		if (contentTheme) {
			matches.push({
				kind: ResumeSearchMatchKind.CONTENT_THEME,
				label: contentTheme,
			});
		}
	}
	if (rank.semanticMatch) {
		matches.push({
			kind: ResumeSearchMatchKind.SEMANTIC,
			label: 'Similar content',
		});
	}
	return matches.slice(0, 4);
}
