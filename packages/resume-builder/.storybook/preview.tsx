import type { Preview } from '@storybook/react-vite';
import { sb } from 'storybook/test';
import { StoreProvider } from '../src/stores/store.provider.tsx';

import '../src/index.css';

sb.mock(import('../src/stores/root.store.ts'));

const preview: Preview = {
	parameters: {
		backgrounds: {
			default: 'light',
			options: {
				light: { name: 'Light', value: '#ffffff' },
				dark: { name: 'Dark', value: '#1e1e1e' },
			},
		},
	},
	initialGlobals: {
		backgrounds: { value: 'dark' },
	},
	decorators: [
		(Story) => (
			<StoreProvider>
				<Story />
			</StoreProvider>
		),
	],
};

export default preview;
