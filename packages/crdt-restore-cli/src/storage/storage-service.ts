import type { Pool } from 'pg';
import { v4 } from 'uuid';

/**
 * `packages/entities/prisma.config.ts` puts this project's tables in the
 * `resume_builder` schema via a `?schema=` query param, which Prisma
 * understands but plain `pg` connections ignore (falling back to the role's
 * default `search_path`). Schema-qualify table names here instead of relying
 * on `search_path` to pick it up.
 */
const TABLE = '"resume_builder"."DocumentUpdate"';

export interface DocumentUpdateRecord {
	id: string;
	name: string;
	uid: string;
	sequence: number;
	update: Uint8Array;
	createdAt: Date;
	updatedAt: Date;
}

export class StorageService {
	constructor(private readonly pool: Pool) {}

	async getItems(name: string, uid: string): Promise<DocumentUpdateRecord[] | null> {
		const result = await this.pool.query<{
			id: string;
			name: string;
			uid: string;
			sequence: number;
			update: Buffer;
			createdAt: Date;
			updatedAt: Date;
		}>(
			`SELECT id, name, uid, sequence, update, "createdAt", "updatedAt"
			 FROM ${TABLE}
			 WHERE name = $1 AND uid = $2
			 ORDER BY sequence ASC`,
			[name, uid],
		);

		if (result.rows.length === 0) {
			return null;
		}

		return result.rows.map((row) => ({
			id: row.id,
			name: row.name,
			uid: row.uid,
			sequence: row.sequence,
			update: new Uint8Array(row.update),
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
		}));
	}

	async createNewDocument(
		newName: string,
		uid: string,
		updates: DocumentUpdateRecord[],
	): Promise<void> {
		const client = await this.pool.connect();

		try {
			await client.query('BEGIN');

			for (const [index, update] of updates.entries()) {
				await client.query(
					`INSERT INTO ${TABLE} (id, name, uid, sequence, update, "createdAt", "updatedAt")
					 VALUES ($1, $2, $3, $4, $5, now(), now())`,
					[v4(), newName, uid, index + 1, Buffer.from(update.update)],
				);
			}

			await client.query('COMMIT');
		} catch (err) {
			await client.query('ROLLBACK');
			throw err;
		} finally {
			client.release();
		}
	}
}
