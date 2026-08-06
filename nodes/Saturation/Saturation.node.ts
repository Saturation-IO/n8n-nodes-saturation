import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';

import { resourceProperty } from './descriptions/Common';
import { transactionOperations, transactionFields } from './descriptions/TransactionDescription';
import { documentOperations, documentFields } from './descriptions/DocumentDescription';
import { libraryOperations, libraryFields } from './descriptions/LibraryDescription';
import { searchOperations, searchFields } from './descriptions/SearchDescription';
import {
	listProjects,
	listProjectsWithAll,
	listContacts,
	listRatePacks,
} from './methods/loadOptions';

// Declarative Saturation node. Every operation is HTTP-routing onto the
// Saturation API (/v1); the resource/operation map mirrors the OpenAPI
// operations one-to-one. The Bearer token and base URL come from the
// `saturationApi` credential; unsafe writes set an `Idempotency-Key` header so
// a re-run produces exactly one row (mirrors the server contract).
export class Saturation implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Saturation',
		name: 'saturation',
		// Themed pair so the mark keeps contrast in both n8n themes.
		icon: { light: 'file:saturation.svg', dark: 'file:saturation.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Work with Saturation production-finance data',
		defaults: {
			name: 'Saturation',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		// Every operation here is a discrete read or write against the Saturation
		// API, which is exactly what an AI agent should be able to call.
		usableAsTool: true,
		credentials: [
			{
				name: 'saturationApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: '={{$credentials.baseUrl}}',
			headers: {
				Accept: 'application/json',
			},
		},
		properties: [
			resourceProperty,
			...transactionOperations,
			...transactionFields,
			...documentOperations,
			...documentFields,
			...libraryOperations,
			...libraryFields,
			...searchOperations,
			...searchFields,
		],
	};

	methods = {
		loadOptions: {
			listProjects,
			listProjectsWithAll,
			listContacts,
			listRatePacks,
		},
	};
}
