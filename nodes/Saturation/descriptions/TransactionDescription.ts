import type { INodeProperties } from 'n8n-workflow';

import { optionalQueryRouting, projectIdFilterProperty, projectIdProperty } from './Common';

const show = { resource: ['transaction'] };

export const transactionOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a transaction',
				description: 'Create a manual transaction',
				// POST /transactions — billable write, carries an
				// Idempotency-Key for safe retries. projectId rides in the body
				// to assign the transaction to a project (optional server-side).
				routing: {
					request: {
						method: 'POST',
						url: '=/transactions',
						headers: {
							'Idempotency-Key': '=n8n-{{$execution.id}}-{{$itemIndex}}',
						},
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'List transactions',
				description: 'List transactions with the filter grammar',
				routing: {
					request: {
						method: 'GET',
						url: '=/transactions',
					},
					send: { paginate: false },
				},
			},
		],
		default: 'create',
	},
];

export const transactionFields: INodeProperties[] = [
	// Create assigns the transaction to a project via the request body
	// (projectId is optional server-side, but kept required here so the n8n
	// user always picks a project to assign).
	{
		...projectIdProperty,
		displayOptions: { show: { ...show, operation: ['create'] } },
		routing: { send: { type: 'body', property: 'projectId' } },
	},
	// List takes projectId as an optional query filter (absent = whole
	// workspace), so it must not be sent when the picker is left empty.
	{
		...projectIdFilterProperty,
		displayOptions: { show: { ...show, operation: ['getAll'] } },
		routing: optionalQueryRouting('projectId'),
	},

	// --- create ---
	{
		displayName: 'Type',
		name: 'type',
		type: 'string',
		required: true,
		default: 'Invoice',
		description: 'Movement type, e.g. Invoice, Payment, Expense',
		displayOptions: { show: { ...show, operation: ['create'] } },
		routing: { send: { type: 'body', property: 'type' } },
	},
	{
		displayName: 'Amount (Minor Units)',
		name: 'amount',
		type: 'number',
		required: true,
		default: 0,
		description: 'Integer minor units. 50000 means $500.00. Never enter a decimal.',
		displayOptions: { show: { ...show, operation: ['create'] } },
		routing: { send: { type: 'body', property: 'amount.amount' } },
	},
	{
		displayName: 'Currency',
		name: 'currency',
		type: 'string',
		required: true,
		default: 'USD',
		description: 'ISO-4217 currency code',
		displayOptions: { show: { ...show, operation: ['create'] } },
		routing: { send: { type: 'body', property: 'amount.currency' } },
	},
	{
		displayName: 'Date',
		name: 'timestamp',
		type: 'dateTime',
		required: true,
		default: '={{ $now.toISO() }}',
		description: 'Transaction date and time. Defaults to the workflow execution time.',
		displayOptions: { show: { ...show, operation: ['create'] } },
		routing: { send: { type: 'body', property: 'timestamp' } },
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { ...show, operation: ['create'] } },
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				default: '',
				routing: { send: { type: 'body', property: 'description' } },
			},
			{
				displayName: 'Contact Name or ID',
				name: 'contactId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'listContacts' },
				default: '',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				hint: 'The list shows the first 100 contacts you can read.',
				routing: { send: { type: 'body', property: 'contactId' } },
			},
			{
				displayName: 'Budget Line ID',
				name: 'budgetLineId',
				type: 'string',
				default: '',
				description: 'Coded budget line ID',
				routing: { send: { type: 'body', property: 'budgetLineId' } },
			},
		],
	},

	// --- getAll filters ---
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 50,
		description: 'Max number of results to return',
		displayOptions: { show: { ...show, operation: ['getAll'] } },
		routing: { send: { type: 'query', property: 'limit' } },
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: { ...show, operation: ['getAll'] } },
		options: [
			{
				displayName: 'Amount Max',
				name: 'amountMax',
				type: 'number',
				default: 0,
				routing: { send: { type: 'query', property: 'amountMax' } },
			},
			{
				displayName: 'Amount Min',
				name: 'amountMin',
				type: 'number',
				default: 0,
				routing: { send: { type: 'query', property: 'amountMin' } },
			},
			{
				displayName: 'Budget Line ID',
				name: 'budgetLineId',
				type: 'string',
				default: '',
				routing: { send: { type: 'query', property: 'budgetLineId' } },
			},
			{
				displayName: 'Contact ID',
				name: 'contactId',
				type: 'string',
				default: '',
				routing: { send: { type: 'query', property: 'contactId' } },
			},
			{
				displayName: 'Date From',
				name: 'dateFrom',
				type: 'dateTime',
				default: '',
				routing: { send: { type: 'query', property: 'dateFrom' } },
			},
			{
				displayName: 'Date To',
				name: 'dateTo',
				type: 'dateTime',
				default: '',
				routing: { send: { type: 'query', property: 'dateTo' } },
			},
			{
				displayName: 'Search',
				name: 'q',
				type: 'string',
				default: '',
				description: 'Trigram full-text search over description',
				routing: { send: { type: 'query', property: 'q' } },
			},
			{
				displayName: 'Source',
				name: 'source',
				type: 'string',
				default: '',
				description: 'Filter by source, such as manual. Separate multiple values with commas.',
				routing: { send: { type: 'query', property: 'source' } },
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'string',
				default: '',
				routing: { send: { type: 'query', property: 'status' } },
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'string',
				default: '',
				routing: { send: { type: 'query', property: 'type' } },
			},
		],
	},
];
