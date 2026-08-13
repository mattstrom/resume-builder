import type { Preview } from '@storybook/react-vite';
import type { PropsWithChildren } from 'react';
import { useEffect } from 'react';
import { sb } from 'storybook/test';

import { StoreProvider } from '../src/stores/store.provider.tsx';

import '../src/index.css';

sb.mock(import('../src/stores/root.store.ts'));

function StoryTheme({ dark, children }: PropsWithChildren<{ dark: boolean }>) {
	useEffect(() => {
		document.documentElement.classList.toggle('dark', dark);

		return () => document.documentElement.classList.remove('dark');
	}, [dark]);

	return children;
}

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
		(Story, context) => {
			const background = context.globals.backgrounds as { value?: string } | undefined;

			return (
				<StoryTheme dark={background?.value === 'dark'}>
					<StoreProvider>
						<Story />
					</StoreProvider>
				</StoryTheme>
			);
		},
	],
};

export default preview;
