import type { INodeProperties } from 'n8n-workflow';

import { projectIdProperty } from './Common';

const show = { resource: ['library'] };

export const libraryOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show },
		options: [
			{
				name: 'Add Incentive',
				value: 'addIncentive',
				action: 'Add an incentive program',
				description: 'Add an incentive program to a project',
				routing: {
					request: {
						method: 'POST',
						url: '=/projects/{{$parameter.projectId}}/library/incentives',
						headers: {
							'Idempotency-Key': '=n8n-{{$execution.id}}-{{$itemIndex}}',
						},
					},
				},
			},
		],
		default: 'addIncentive',
	},
];

export const libraryFields: INodeProperties[] = [
	{ ...projectIdProperty, displayOptions: { show } },

	// --- addIncentive ---
	{
		displayName: 'Incentive Program ID',
		name: 'programId',
		type: 'string',
		required: true,
		default: '',
		description: 'The published incentive program to add',
		displayOptions: { show: { ...show, operation: ['addIncentive'] } },
		routing: { send: { type: 'body', property: 'programId' } },
	},
];
