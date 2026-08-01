import {
	type Bullet,
	BulletSourceType,
	BulletStatus,
	type CreateBulletInput,
} from '@resume-builder/entities';

export type GraphqlBullet = Omit<Bullet, 'sourceType' | 'status'> & {
	sourceType: keyof typeof BulletSourceType;
	status: keyof typeof BulletStatus;
};

function toGraphqlEnumName<T extends Record<string, string>>(
	values: T,
	value: T[keyof T],
): keyof T {
	const entry = Object.entries(values).find(([, enumValue]) => enumValue === value);
	if (!entry) throw new Error(`Unknown GraphQL enum value: ${value}`);
	return entry[0] as keyof T;
}

export function createBulletGraphqlInput(input: CreateBulletInput) {
	return {
		...input,
		sourceType: toGraphqlEnumName(BulletSourceType, input.sourceType),
	};
}

export function bulletStatusGraphqlValue(status: BulletStatus) {
	return toGraphqlEnumName(BulletStatus, status);
}

export function bulletFromGraphql(bullet: GraphqlBullet): Bullet {
	return {
		...bullet,
		sourceType: BulletSourceType[bullet.sourceType],
		status: BulletStatus[bullet.status],
	};
}
