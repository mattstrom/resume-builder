import { DatabaseObjectResponse, isFullDatabase } from '@notionhq/client';

export type DatabasePropertyConfigResponse =
	DatabaseObjectResponse['properties'][string];

export abstract class Adapter<P = unknown, T = unknown> {
	abstract get(): T;
}
