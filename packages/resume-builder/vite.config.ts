import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { TanStackRouterVite } from '@tanstack/router-vite-plugin';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		react(),
		TanStackRouterVite({
			routesDirectory: path.resolve(__dirname, './src/routes'),
			generatedRouteTree: path.resolve(__dirname, './src/routeTree.gen.ts'),
		}),
	],
});
