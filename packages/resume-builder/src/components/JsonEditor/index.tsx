import { type FC } from 'react';
import { JsonEditor as Editor } from './JsonEditor';

export const JsonEditor: FC = () => {
	return (
		<div className="flex flex-col h-full bg-editor">
			<Editor />
		</div>
	);
};
