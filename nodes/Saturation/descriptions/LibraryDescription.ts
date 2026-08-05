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
				// POST /projects/{prj}/library/rates/{packId}/add — the verb is `add`,
				// not `install` (library/index.ts:'/projects/{projectId}/library/rates/{packId}/add').
				// `/install` 404s; the Zapier path builder has always used `add`.
				// Idempotent upsert; carries an Idempotency-Key for the unified contract.
				routing: {
					request: {
						method: 'POST',
						url: '=/projects/{{$parameter.projectId}}/library/rates/{{$parameter.packId}}/add',
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
				// POST /projects/{prj}/library/incentives/add
				routing: {
					request: {
						method: 'POST',
						url: '=/projects/{{$parameter.projectId}}/library/incentives/add',
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
			'The workspace rate pack to install. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
		displayOptions: { show: { ...show, operation: ['installRatePack'] } },
	},

	// --- addIncentive ---
	{
		displayName: 'Incentive Program ID',
		name: 'programId',
		type: 'string',
		required: true,
		default: '',
		description: 'The published incentive program to add (ipr_…)',
		displayOptions: { show: { ...show, operation: ['addIncentive'] } },
		routing: { send: { type: 'body', property: 'programId' } },
	},
];
