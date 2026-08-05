import type { INodeProperties } from 'n8n-workflow';

const show = { resource: ['search'] };

export const searchOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show },
		options: [
			{
				name: 'Spotlight',
				value: 'spotlight',
				action: 'Search via spotlight',
				description:
					'Ranked, mixed-type search across transactions, documents, contacts and budget lines',
				// GET /search — permission-scoped IN-QUERY, so a
				// project-scoped token never sees cross-project rows.
				routing: {
					request: {
						method: 'GET',
						url: '=/search',
					},
				},
			},
		],
		default: 'spotlight',
	},
];

export const searchFields: INodeProperties[] = [
	{
		displayName: 'Query',
		name: 'q',
		type: 'string',
		required: true,
		default: '',
		description: '1–500 characters. Trigram-matched against each kind.',
		displayOptions: { show: { ...show, operation: ['spotlight'] } },
		routing: { send: { type: 'query', property: 'q' } },
	},
	{
		displayName: 'Types',
		name: 'types',
		type: 'string',
		default: '',
		description:
			'Optional comma-separated subset of kinds (e.g. transactions,documents). Omit to search every supported kind.',
		displayOptions: { show: { ...show, operation: ['spotlight'] } },
		routing: { send: { type: 'query', property: 'types' } },
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 50,
		description: 'Max number of results to return',
		displayOptions: { show: { ...show, operation: ['spotlight'] } },
		routing: { send: { type: 'query', property: 'limit' } },
	},
];
