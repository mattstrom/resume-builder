export default {
	framework: '@storybook/react-vite',

	stories: [
		'../src/**/*.stories.mdx',
		'../src/**/*.stories.@(js|jsx|ts|tsx)',
	],

	addons: ['@storybook/addon-vitest'],

	viteFinal: async (config) => {
		config.resolve ??= {};
		config.resolve.alias ??= {};

		return config;
	},
};
