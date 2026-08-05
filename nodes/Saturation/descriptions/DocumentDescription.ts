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
				name: 'Assign',
				value: 'assign',
				action: 'Assign a document',
				description: 'Assign an already-dropped document to a typed target',
				// POST /documents/{documentId}/assign — idempotent on
				// the same target id; the Idempotency-Key keeps the unified
				// client write contract.
				routing: {
					request: {
						method: 'POST',
						url: '=/documents/{{$parameter.documentId}}/assign',
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
		default: 'assign',
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
		description: 'The document to assign (doc_…)',
		displayOptions: { show: { ...show, operation: ['assign'] } },
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
		displayOptions: { show: { ...show, operation: ['assign'] } },
		routing: { send: { type: 'body', property: 'target.kind' } },
	},
	{
		displayName: 'Target ID',
		name: 'targetId',
		type: 'string',
		required: true,
		default: '',
		description: 'The target ID (txn_…, lin_…, po_…, con_…)',
		displayOptions: { show: { ...show, operation: ['assign'] } },
		routing: { send: { type: 'body', property: 'target.id' } },
	},
	{
		displayName: 'Replace Existing Assignment',
		name: 'replace',
		type: 'boolean',
		default: false,
		description: 'Whether to move a same-kind assignment to this target',
		displayOptions: { show: { ...show, operation: ['assign'] } },
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
