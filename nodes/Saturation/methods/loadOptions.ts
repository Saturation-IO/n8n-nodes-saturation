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
	const baseUrl = (credentials.baseUrl as string) || 'https://next-api.saturation.io/v1';
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

// Project dropdown for the optional list filter. n8n renders an `options`
// parameter whose value is absent from the list as an invalid field — red
// border, warning icon — so the unfiltered default looked broken even when the
// call succeeded. A leading entry makes "no filter" a real choice.
export async function listProjectsWithAll(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	return [
		{ name: 'All Projects', value: '', description: 'List across the whole workspace' },
		...(await listProjects.call(this)),
	];
}

// Contact dropdown — GET /v1/contacts.
export async function listContacts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const rows = await fetchCollection(this, '/contacts');
	return rows.map((c) => ({
		name: (c.name as string) ?? (c.id as string),
		value: c.id as string,
	}));
}

// Rate-pack dropdown from the canonical public collection.
export async function listRatePacks(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const rows = await fetchCollection(this, '/library/rate-packs');
	return rows.map((r) => ({
		name: (r.name as string) ?? (r.id as string),
		value: r.id as string,
	}));
}
