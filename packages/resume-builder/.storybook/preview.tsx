import type { Preview } from '@storybook/react-vite';
import { sb } from 'storybook/test';
import { StoreProvider } from '../src/stores/store.provider.tsx';
import '../src/index.css';

console.log('URL: ', import.meta.url);
sb.mock(import('../src/stores/root.store.ts'));

const preview: Preview = {
	decorators: [
		(Story) => (
			<StoreProvider>
				<Story />
			</StoreProvider>
		),
	],
};

export default preview;
