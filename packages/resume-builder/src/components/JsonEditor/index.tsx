import { type FC } from 'react';
import { JsonEditor as Editor } from './JsonEditor';

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
			<Editor />
		</div>
	);
};
