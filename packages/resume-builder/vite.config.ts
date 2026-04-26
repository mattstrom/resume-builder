/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { TanStackRouterVite } from '@tanstack/router-vite-plugin';
import config from 'config';
import path from 'path';
import { fileURLToPath } from 'url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		react({
			babel: {
				plugins: [
					[
						'@babel/plugin-proposal-decorators',
						{
							version: 'legacy',
						},
					],
					[
						'@babel/plugin-transform-class-properties',
						{
							loose: true,
						},
					],
				],
			},
		}),
		TanStackRouterVite({
			routesDirectory: path.resolve(__dirname, './src/routes'),
			generatedRouteTree: path.resolve(
				__dirname,
				'./src/routeTree.gen.ts',
			),
		}),
	],
	server: {
		proxy: {
			'/api': {
				target: 'http://localhost:3000',
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/api/, ''),
			},
		},
	},
	define: {
		__CONFIG__: JSON.stringify(config.util.toObject()),
	},
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
			'@nestjs/graphql': path.resolve(
				__dirname,
				'../entities/src/shims/nestjs-graphql.ts',
			),
		},
	},
	test: {
		projects: [
			{
				extends: true,
				plugins: [
					// The plugin will run tests for the stories defined in your Storybook config
					// See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
					storybookTest({
						configDir: path.join(__dirname, '.storybook'),
					}),
				],
				test: {
					name: 'storybook',
					browser: {
						enabled: true,
						headless: true,
						provider: playwright({}),
						instances: [
							{
								browser: 'chromium',
							},
						],
					},
				},
			},
		],
	},
});
