import { WebView } from '@/components/WebView.tsx';
import { useStore } from '@/stores/store.provider.tsx';
import { observer } from 'mobx-react';
import { type FC } from 'react';

interface TailorViewProps {}

export const TailorView: FC<TailorViewProps> = observer(() => {
	const { applicationStore } = useStore();
	const { selectedApplication } = applicationStore;

	if (selectedApplication?.jobPostingUrl) {
		return <WebView url={selectedApplication.jobPostingUrl} />;
	}

	return (
		<div className="tailor-empty-state">
			<h2 className="tailor-empty-state-title">Job Posting</h2>
			<p className="tailor-empty-state-copy">
				No job posting URL is available for this application.
			</p>
		</div>
	);
});
