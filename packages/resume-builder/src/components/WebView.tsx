import { observer } from 'mobx-react';
import { type FC } from 'react';
import { Input } from '@/components/ui/input.tsx';

interface TailorViewProps {
	url: string;
	onUrlChanged?: (url: string) => void;
}

export const WebView: FC<TailorViewProps> = observer(({ url }) => {
	if (!url) {
		return null;
	}

	return (
		<div
			style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
		>
			<div style={{ flexGrow: 0 }}>
				<Input value={url} readOnly />
			</div>
			<div style={{ flex: 1, overflow: 'hidden' }}>
				<iframe src={url} width="100%" height="100%" />
			</div>
		</div>
	);
});
