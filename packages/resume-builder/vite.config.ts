import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { TanStackRouterVite } from '@tanstack/router-vite-plugin';
import config from 'config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		react({
			babel: {
				plugins: [
					[
						'@babel/plugin-proposal-decorators',
						{ version: 'legacy' },
					],
					[
						'@babel/plugin-transform-class-properties',
						{ loose: true },
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
		},
	},
});
