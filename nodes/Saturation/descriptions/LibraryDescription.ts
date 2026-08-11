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
				name: 'Install Rate Pack',
				value: 'installRatePack',
				action: 'Install a rate pack',
				description: 'Install a workspace-enabled rate pack into a project',
				routing: {
					request: {
						method: 'PUT',
						url: '=/projects/{{$parameter.projectId}}/library/rate-packs/{{$parameter.packId}}',
						headers: {
							'Idempotency-Key': '=n8n-{{$execution.id}}-{{$itemIndex}}',
						},
					},
				},
			},
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
		default: 'installRatePack',
	},
];

export const libraryFields: INodeProperties[] = [
	{ ...projectIdProperty, displayOptions: { show } },

	// --- installRatePack ---
	{
		displayName: 'Rate Pack Name or ID',
		name: 'packId',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'listRatePacks' },
		required: true,
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		hint: 'The list shows the first 100 workspace rate packs you can read.',
		displayOptions: { show: { ...show, operation: ['installRatePack'] } },
	},

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
