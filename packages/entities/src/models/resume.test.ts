import { beforeAll, describe, expect, it } from 'vitest';
import { ResumeModel } from './resume';
import { connectMongoose } from '../utils/database';

describe('Resume', () => {
	beforeAll(async () => {
		await connectMongoose({});
	});

	it('should retrieve list of resumes', async () => {
		// Act
		const results = await ResumeModel.find().exec();

		// Assert
		expect(results).not.toBeNull();
	});
});
