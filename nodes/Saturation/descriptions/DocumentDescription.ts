import type { INodeProperties } from 'n8n-workflow';

const show = { resource: ['document'] };

export const documentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show },
		options: [
			{
				name: 'Link',
				value: 'link',
				action: 'Link a document',
				description: 'Link an existing document to a typed target',
				routing: {
					request: {
						method: 'PUT',
						url: '=/documents/{{$parameter.documentId}}/links/{{$parameter.targetKind}}',
						headers: {
							'Idempotency-Key': '=n8n-{{$execution.id}}-{{$itemIndex}}',
						},
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'List documents',
				description: 'List documents in the workspace',
				routing: {
					request: {
						method: 'GET',
						url: '=/documents',
					},
				},
			},
		],
		default: 'link',
	},
];

export const documentFields: INodeProperties[] = [
	// --- assign ---
	{
		displayName: 'Document ID',
		name: 'documentId',
		type: 'string',
		required: true,
		default: '',
		description: 'The document to link (doc_ ID)',
		displayOptions: { show: { ...show, operation: ['link'] } },
	},
	{
		displayName: 'Target Kind',
		name: 'targetKind',
		type: 'options',
		default: 'transaction',
		options: [
			{ name: 'Transaction', value: 'transaction' },
			{ name: 'Purchase Order', value: 'purchaseOrder' },
			{ name: 'Contact', value: 'contact' },
		],
		displayOptions: { show: { ...show, operation: ['link'] } },
	},
	{
		displayName: 'Target ID',
		name: 'targetId',
		type: 'string',
		required: true,
		default: '',
		description: 'The target ID shown by the matching Saturation resource',
		displayOptions: { show: { ...show, operation: ['link'] } },
		routing: { send: { type: 'body', property: 'targetId' } },
	},
	{
		displayName: 'Replace Existing Link',
		name: 'replace',
		type: 'boolean',
		default: false,
		description: 'Whether to replace a different target already linked for this kind',
		displayOptions: { show: { ...show, operation: ['link'] } },
		routing: { send: { type: 'body', property: 'replace' } },
	},

	// --- getAll ---
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
];
