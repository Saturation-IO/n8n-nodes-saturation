/**
 * ESLint config for the Saturation n8n community node. Uses the official
 * eslint-plugin-n8n-nodes-base rule sets so the node passes the community
 * node review lint (npm run lint).
 */
module.exports = {
	root: true,
	env: {
		browser: true,
		es6: true,
		node: true,
	},
	parser: '@typescript-eslint/parser',
	parserOptions: {
		project: ['./tsconfig.eslint.json'],
		sourceType: 'module',
		extraFileExtensions: ['.json'],
	},
	ignorePatterns: ['.eslintrc.js', '.prettierrc.js', 'gulpfile.js', 'index.js', '**/node_modules/**', '**/dist/**'],
	overrides: [
		{
			files: ['package.json'],
			plugins: ['eslint-plugin-n8n-nodes-base'],
			extends: ['plugin:n8n-nodes-base/community'],
			rules: {
				'n8n-nodes-base/community-package-json-name-still-default': 'off',
			},
		},
		{
			files: ['./credentials/**/*.ts'],
			plugins: ['eslint-plugin-n8n-nodes-base'],
			extends: ['plugin:n8n-nodes-base/credentials'],
		},
		{
			files: ['./nodes/**/*.ts'],
			plugins: ['eslint-plugin-n8n-nodes-base'],
			extends: ['plugin:n8n-nodes-base/nodes'],
			rules: {
				// These three rules DIRECTLY CONTRADICT the verification scan.
				//
				// eslint-plugin-n8n-nodes-base (this plugin) wants the string literal
				// `['main']`. @n8n/scan-community-package, which gates Creator Portal
				// verification, rejects that literal and requires
				// `NodeConnectionTypes.Main` (rule: node-connection-type-literal).
				// Both cannot be satisfied, so the one that gates verification wins.
				//
				// This is not hypothetical: satisfying this plugin is exactly why the
				// import was removed and `outputs: ['main']` hardcoded earlier, which
				// then failed the scan on the first verification attempt.
				'n8n-nodes-base/node-class-description-inputs-wrong-regular-node': 'off',
				'n8n-nodes-base/node-class-description-outputs-wrong': 'off',
				'n8n-nodes-base/node-class-description-outputs-wrong-trigger-node': 'off',
				//
				// Worth knowing: the scan's rules ship separately as
				// @n8n/eslint-plugin-community-nodes, so they COULD run here instead of
				// only against a published version. It peers on eslint 9.29 while this
				// package (and eslint-plugin-n8n-nodes-base) is on eslint 8, so wiring
				// it in means an eslint 9 + flat-config migration. Until then the scan
				// only runs post-publish, which is how these errors reached a release.
			},
		},
	],
};
