import { WebView } from '@/components/WebView.tsx';
import { useStore } from '@/stores/store.provider.tsx';
import { observer } from 'mobx-react';
import { type FC } from 'react';

interface TailorViewProps {}

export const TailorView: FC<TailorViewProps> = observer(() => {
	const { resumeStore } = useStore();
	const { selectedResume } = resumeStore;

	if (!selectedResume?.jobPostingUrl) {
		return null;
	}

	return <WebView url={selectedResume.jobPostingUrl} />;
});
