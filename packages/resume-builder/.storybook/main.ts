import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
export default {
	framework: getAbsolutePath('@storybook/react-vite'),

	stories: ['../src/**/*.stories.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],

	addons: [getAbsolutePath('@storybook/addon-vitest'), getAbsolutePath('@storybook/addon-docs')],

	viteFinal: async (config) => {
		config.resolve ??= {};
		config.resolve.alias ??= {};

		return config;
	},
};

function getAbsolutePath(value: string): any {
	return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}
