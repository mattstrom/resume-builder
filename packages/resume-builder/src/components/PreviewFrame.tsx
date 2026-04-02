import { observer } from 'mobx-react';
import { type FC } from 'react';
import { useSettings } from './Settings.provider.tsx';

interface PreviewFrameProps {
	applicationId: string;
}

export const PreviewFrame: FC<PreviewFrameProps> = observer(
	({ applicationId }) => {
		const { template, showMarginPattern } = useSettings();

		const params = new URLSearchParams({
			template,
			showMarginPattern: String(showMarginPattern),
		});

		const iframeSrc = `/preview/${applicationId}?${params}`;

		if (!iframeSrc) {
			return (
				<div
					style={{
						width: '100%',
						height: '100%',
						position: 'relative',
					}}
				>
					<div
						style={{
							position: 'absolute',
							top: '50%',
							left: '50%',
							transform: 'translate(-50%, -50%)',
							fontSize: '1rem',
							color: '#666',
						}}
					>
						No resume loaded
					</div>
				</div>
			);
		}

		return (
			<div
				style={{ width: '100%', height: '100%', position: 'relative' }}
			>
				<iframe
					id="resume-preview-iframe"
					src={iframeSrc}
					title="Resume Preview"
					sandbox="allow-same-origin allow-scripts allow-modals"
					style={{
						width: '100%',
						height: '100%',
						border: 'none',
					}}
				/>
			</div>
		);
	},
);
