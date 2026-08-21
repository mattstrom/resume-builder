import type { RootStore } from '@/stores/root.store.ts';

import { GET_RESUME } from '../graphql/queries.ts';
import type { GetResumeData, GetResumeVariables } from '../graphql/types.ts';
import { CrdtResumeController } from './resume-document-controller.ts';

export async function loadLiveResume(
	store: Pick<RootStore, 'client' | 'authStore'>,
	resumeId: string,
) {
	const result = await store.client.query<GetResumeData, GetResumeVariables>({
		query: GET_RESUME,
		variables: { id: resumeId },
		fetchPolicy: 'network-only',
	});
	const resume = result.data?.getResume;
	if (!resume) throw new Error('Resume not found');

	const token = await store.authStore.ensureToken();
	const controller = await CrdtResumeController.connect({
		resumeId: resume._id,
		resume,
		collaborationUrl: __CONFIG__.collaborationUrl,
		token,
	});
	try {
		return controller.getSnapshot() ?? resume;
	} finally {
		await controller.destroy();
	}
}
