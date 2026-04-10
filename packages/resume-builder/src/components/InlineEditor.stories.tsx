import { StoreProvider } from '@/stores/store.provider.tsx';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { InlineEditor } from './InlineEditor';

const meta = {
	// 👇 The component you're working on
	component: InlineEditor,
	decorators: [
		(Story) => (
			<StoreProvider>
				<Story />
			</StoreProvider>
		),
	],
} satisfies Meta<typeof InlineEditor>;

export default meta;
// 👇 Type helper to reduce boilerplate
type Story = StoryObj<typeof meta>;

// 👇 A story named Primary that renders `<InlineEditor primary label="InlineEditor" />`
export const Primary: Story = {
	args: {
		path: '',
		value: '',
		resumeId: '',
	},
};
