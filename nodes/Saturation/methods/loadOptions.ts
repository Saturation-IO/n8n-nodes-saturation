import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

// Shared helper: call a Saturation /v1 endpoint with the configured credential
// and return its `{ data }` collection. The workspace is the API token's
// workspace, so paths carry no workspace segment.
async function fetchCollection(
	context: ILoadOptionsFunctions,
	path: string,
	qs: Record<string, string | number> = {},
): Promise<Array<Record<string, unknown>>> {
	const credentials = await context.getCredentials('saturationApi');
	const baseUrl = (credentials.baseUrl as string) || 'https://api.saturation.io/v1';
	const response = (await context.helpers.httpRequestWithAuthentication.call(
		context,
		'saturationApi',
		{
			method: 'GET',
			baseURL: baseUrl,
			url: path,
			qs: { limit: 100, ...qs },
			json: true,
		},
	)) as { data?: Array<Record<string, unknown>> };
	return response.data ?? [];
}

// Project dropdown — GET /v1/projects (the token's workspace,
// permission-filtered).
export async function listProjects(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const rows = await fetchCollection(this, '/projects', {
		status: 'active',
	});
	return rows.map((p) => ({
		name: (p.name as string) ?? (p.slug as string) ?? (p.id as string),
		value: p.id as string,
	}));
}

// Contact dropdown — GET /v1/contacts.
export async function listContacts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const rows = await fetchCollection(this, '/contacts');
	return rows.map((c) => ({
		name: (c.name as string) ?? (c.id as string),
		value: c.id as string,
	}));
}

// Rate-pack dropdown — GET /v1/library/rates.
export async function listRatePacks(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const rows = await fetchCollection(this, '/library/rates');
	return rows.map((r) => ({
		name: (r.name as string) ?? (r.id as string),
		value: r.id as string,
	}));
}
