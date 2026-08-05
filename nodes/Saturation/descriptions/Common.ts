import type { INodeProperties } from 'n8n-workflow';

// The top-level resource picker. Each resource maps to a family of OpenAPI
// operations.
export const resourceProperty: INodeProperties = {
	displayName: 'Resource',
	name: 'resource',
	type: 'options',
	noDataExpression: true,
	options: [
		{ name: 'Transaction', value: 'transaction' },
		{ name: 'Document', value: 'document' },
		{ name: 'Library', value: 'library' },
		{ name: 'Search', value: 'search' },
	],
	default: 'transaction',
};

// Project picker, populated from `GET /v1/projects`, scoped to the API
// token's workspace (tokens are bound to exactly one workspace). Required
// variant for path-nested resources (library) and for assigning a project on
// transaction create.
export const projectIdProperty: INodeProperties = {
	displayName: 'Project Name or ID',
	name: 'projectId',
	type: 'options',
	typeOptions: { loadOptionsMethod: 'listProjects' },
	required: true,
	default: '',
	description:
		'The project to act on. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
};

// Optional project filter for workspace-level list operations. Absent = the
// whole workspace; pick a project to scope the read to that project.
export const projectIdFilterProperty: INodeProperties = {
	...projectIdProperty,
	required: false,
	description:
		'Optional project filter. Leave empty to list across the whole workspace, or choose a project to scope the read. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
};
