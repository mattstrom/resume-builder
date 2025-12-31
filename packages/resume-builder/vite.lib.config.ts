import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
	plugins: [
		react(),
		dts({
			include: ['src/lib/**/*', 'src/types.ts', 'src/components/**/*'],
			outDir: 'dist',
			tsconfigPath: './tsconfig.lib.json',
		}),
	],
	build: {
		lib: {
			entry: {
				'lib/index': resolve(__dirname, 'src/lib/index.ts'),
				'lib/types': resolve(__dirname, 'src/lib/types.ts'),
				'lib/components': resolve(__dirname, 'src/lib/components.ts'),
			},
			formats: ['es'],
			fileName: (_format, entryName) => `${entryName}.js`,
		},
		rollupOptions: {
			external: [
				'react',
				'react-dom',
				'react/jsx-runtime',
				'@emotion/react',
				'@emotion/react/jsx-runtime',
				'@emotion/styled',
				'@mui/material',
				'@mui/icons-material',
				'clsx',
				'react-markdown',
			],
		},
		outDir: 'dist',
		cssCodeSplit: false,
	},
});
