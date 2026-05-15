import { defineConfig } from 'oxfmt';

export default defineConfig({
	singleQuote: true,
	jsxSingleQuote: false,
	printWidth: 100,
	semi: true,
	sortImports: {
		newlinesBetween: false,
		// internalPattern: ['~/*', '@/*', './*'],
		customGroups: [
			{
				groupName: 'reflect-metadata',
				selector: 'side_effect',
				elementNamePattern: ['reflect-metadata'],
			},
			{
				groupName: 'route-tree',
				elementNamePattern: ['./routeTree.gen*'],
			},
		],
		groups: [
			'reflect-metadata',
			['type-builtin', 'value-builtin'],
			{ newlinesBetween: true },
			['type-import', 'value-external'],
			{ newlinesBetween: true },
			['type-subpath', 'value-subpath'],
			['type-internal', 'value-internal'],
			{ newlinesBetween: true },
			[
				'type-parent',
				'type-sibling',
				'type-index',
				'value-internal',
				'value-parent',
				'value-sibling',
				'value-index',
			],
			['value-parent', 'value-sibling', 'value-index'],
			{ newlinesBetween: true },
			'side_effect',
			'side_effect_style',
			{ newlinesBetween: true },
			'route-tree',
		],
	},
	ignorePatterns: ['**/*.hbs', '.nx/self-healing', 'build', 'coverage', 'charts', 'schema.gql'],
});
