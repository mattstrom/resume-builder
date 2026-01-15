import { type FC } from 'react';
import { JsonEditor as Editor } from './JsonEditor';
import { SaveButton } from './SaveButton';

export const JsonEditor: FC = () => {
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				height: '100%',
				backgroundColor: '#1e1e1e',
			}}
		>
			<SaveButton />
			<div style={{ flex: 1, overflow: 'hidden' }}>
				<Editor />
			</div>
		</div>
	);
};
