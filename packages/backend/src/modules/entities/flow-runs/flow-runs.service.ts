import { Injectable } from '@nestjs/common';
import {
	Flow,
	FlowRun,
	type FlowRunUpsert,
	FlowRunStatus,
	FlowSubject,
} from '@resume-builder/entities';

import { PrismaService } from '../../prisma/index.js';

@Injectable()
export class FlowRunsService {
	constructor(private readonly prisma: PrismaService) {}

	/**
	 * One row per (user, subject, flow) — opening a new run of the same flow
	 * against the same subject replaces the previous one. Mastra retains the
	 * history, addressed by runId.
	 */
	async upsert(uid: string, input: FlowRunUpsert): Promise<FlowRun> {
		const { flow, subjectType, subjectId, status, runId, error, finishedAt } = input;
		const finished = finishedAt ? new Date(finishedAt) : null;
		const update = {
			status,
			...(runId ? { runId } : {}),
			error: error ?? null,
			finishedAt: finished,
			// A new run of the same flow restarts the clock.
			...(status === FlowRunStatus.RUNNING ? { startedAt: new Date() } : {}),
		};
		const create = {
			uid,
			flow,
			subjectType,
			subjectId: subjectId ?? null,
			status,
			runId: runId ?? null,
			error: error ?? null,
			finishedAt: finished,
		};

		// Postgres treats nulls as distinct, so the unique key cannot address a
		// row with no subjectId — collection- and user-scoped runs take the
		// read-then-write path instead. It races under concurrent starts of the
		// same flow; revisit if a flow ever runs that way.
		if (!subjectId) {
			const existing = await this.prisma.flowRun.findFirst({
				where: { uid, flow, subjectType, subjectId: null },
			});

			const result = existing
				? await this.prisma.flowRun.update({ where: { id: existing.id }, data: update })
				: await this.prisma.flowRun.create({ data: create });

			return result as FlowRun;
		}

		const result = await this.prisma.flowRun.upsert({
			where: {
				uid_subjectType_subjectId_flow: { uid, subjectType, subjectId, flow },
			},
			create,
			update,
		});

		return result as FlowRun;
	}

	async findForSubject(
		uid: string,
		subjectType: FlowSubject,
		subjectId: string,
	): Promise<FlowRun[]> {
		const results = await this.prisma.flowRun.findMany({
			where: { uid, subjectType, subjectId },
			orderBy: { startedAt: 'desc' },
		});

		return results as FlowRun[];
	}

	async findLatest(
		uid: string,
		subjectType: FlowSubject,
		subjectId: string,
		flow: Flow,
	): Promise<FlowRun | null> {
		const result = await this.prisma.flowRun.findUnique({
			where: {
				uid_subjectType_subjectId_flow: { uid, subjectType, subjectId, flow },
			},
		});

		return (result as FlowRun) ?? null;
	}

	/**
	 * FlowRun holds no foreign key — the subject is a (type, id) pair — so
	 * cleanup on subject deletion is the service layer's job.
	 */
	async deleteForSubject(
		uid: string,
		subjectType: FlowSubject,
		subjectId: string,
	): Promise<void> {
		await this.prisma.flowRun.deleteMany({ where: { uid, subjectType, subjectId } });
	}
}
