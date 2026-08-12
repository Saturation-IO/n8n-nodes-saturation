import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

// Load the compiled node definitions the way n8n loads them. Run `npm run build`
// first so `dist/` exists.
const require = createRequire(import.meta.url);
const { Saturation } = require('../dist/nodes/Saturation/Saturation.node.js');
const { SaturationTrigger } = require('../dist/nodes/SaturationTrigger/SaturationTrigger.node.js');
const { SaturationApi } = require('../dist/credentials/SaturationApi.credentials.js');

// The closed WebhookEvent enum from the OpenAPI (components.schemas.WebhookEvent).
const EXPECTED_EVENTS = [
	'transaction.created',
	'transaction.updated',
	'budget.changed',
	'purchaseOrder.created',
	'purchaseOrder.pending',
	'purchaseOrder.approved',
	'purchaseOrder.rejected',
	'purchaseOrder.actualizing',
	'purchaseOrder.paid',
	'purchaseOrder.void',
	'document.created',
	'document.linked',
	'document.unlinked',
	'document.deleted',
	'incentive.added',
];

describe('SaturationApi credential', () => {
	const cred = new SaturationApi();

	it('tests against GET /me', () => {
		expect(cred.test.request.method).toBe('GET');
		expect(cred.test.request.url).toBe('/me');
	});

	it('injects Authorization: Bearer', () => {
		expect(cred.authenticate.properties.headers.Authorization).toBe(
			'=Bearer {{$credentials.apiToken}}',
		);
	});

	it('treats personal API tokens as opaque credentials', () => {
		const apiToken = cred.properties.find((property) => property.name === 'apiToken');
		expect(apiToken.description).not.toMatch(/JWT/i);
	});

	it('points users to the current API token setting', () => {
		const apiToken = cred.properties.find((property) => property.name === 'apiToken');
		expect(apiToken.description).toContain('Settings > Developers > API');
		expect(apiToken.description).not.toContain('Settings > API Tokens');
	});
});

describe('Saturation action node', () => {
	const node = new Saturation();

	it('exposes the transaction, document, library and search resources', () => {
		const resources = node.description.properties
			.find((p) => p.name === 'resource')
			.options.map((o) => o.value);
		expect(resources).toEqual(['transaction', 'document', 'library', 'search']);
	});

	it('provides the project and contact dropdowns', () => {
		expect(Object.keys(node.methods.loadOptions).sort()).toEqual(
			['listContacts', 'listProjects', 'listProjectsWithAll'].sort(),
		);
	});

	it('discloses the first-100 option limit and expression ID escape hatch', () => {
		const loadedOptions = node.description.properties.filter(
			(property) => property.typeOptions?.loadOptionsMethod,
		);
		for (const property of loadedOptions) {
			expect(property.hint).toContain('first 100');
			expect(property.description).toContain('expression');
		}
	});

	it('uses bounded collection controls and documents the one-page limit', () => {
		const limits = node.description.properties.filter((property) => property.name === 'limit');
		expect(limits).toHaveLength(3);
		for (const limit of limits) {
			expect(limit.typeOptions?.minValue).toBe(1);
			expect(limit.description).toBe('Max number of results to return');
		}
		const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
		expect(readme).toContain('one API page, with up to 100 rows');
	});

	it('sets an Idempotency-Key header on every write operation', () => {
		const writeOps = node.description.properties
			.filter((p) => p.name === 'operation')
			.flatMap((p) => p.options)
			.filter(
				(o) =>
					o.routing &&
					o.routing.request &&
					['POST', 'PUT'].includes(o.routing.request.method),
			);
		expect(writeOps.length).toBeGreaterThan(0);
		for (const op of writeOps) {
			expect(op.routing.request.headers).toBeDefined();
			expect(op.routing.request.headers['Idempotency-Key']).toBeTruthy();
		}
	});

	it('requires a Transaction date with an execution-time default', () => {
		const date = node.description.properties.find(
			(property) =>
				property.name === 'timestamp' &&
				property.displayOptions?.show?.operation?.includes('create'),
		);
		expect(date.required).toBe(true);
		expect(date.default).toBe('={{ $now.toISO() }}');
	});

	it('packs the exact supported write routes and body fields', () => {
		const operations = node.description.properties
			.filter((property) => property.name === 'operation')
			.flatMap((property) => property.options);
		const operation = (value) => operations.find((candidate) => candidate.value === value);
		expect(operation('create').routing.request).toMatchObject({
			method: 'POST',
			url: '=/transactions',
		});
		expect(operation('link').routing.request).toMatchObject({
			method: 'PUT',
			url: '=/documents/{{$parameter.documentId}}/links/{{$parameter.kind}}',
		});
		expect(operation('addIncentive').routing.request).toMatchObject({
			method: 'POST',
			url: '=/projects/{{$parameter.projectId}}/library/incentives',
		});

		const routedBody = Object.fromEntries(
			node.description.properties
				.filter((property) => property.routing?.send?.type === 'body')
				.map((property) => [property.name, property.routing.send.property]),
		);
		expect(routedBody).toMatchObject({
			timestamp: 'timestamp',
			targetId: 'targetId',
			replace: 'replace',
			programId: 'programId',
		});
		expect(Object.values(routedBody)).not.toContain('target.kind');
		expect(Object.values(routedBody)).not.toContain('target.id');
	});

	it('offers every caller-writable document-link kind', () => {
		const kind = node.description.properties.find((property) => property.name === 'kind');
		expect(kind.options.map((option) => option.value)).toEqual([
			'budgetLine', 'contact', 'payment', 'project', 'purchaseOrder', 'transaction',
		]);
	});
});

describe('SaturationTrigger node', () => {
	const node = new SaturationTrigger();

	it('does not advertise a webhook trigger as an AI tool', () => {
		expect(node.description).not.toHaveProperty('usableAsTool');
	});

	it('subscribes/unsubscribes via the Webhook API lifecycle', () => {
		expect(Object.keys(node.webhookMethods.default).sort()).toEqual(
			['checkExists', 'create', 'delete'].sort(),
		);
	});

	it('offers exactly the closed WebhookEvent enum', () => {
		const events = node.description.properties
			.find((p) => p.name === 'events')
			.options.map((o) => o.value);
		expect(events.sort()).toEqual([...EXPECTED_EVENTS].sort());
	});

	// This previously asserted `payloadStyle.default === 'full'`, pinning a
	// user-facing lie: the server accepts `full` but documents that those
	// subscriptions "also receive the thin body for now" until the per-entity
	// projection service ships (jobs/webhook-delivery.ts:37-41). Anyone who
	// picked Full got an id-only envelope and every downstream node reading
	// inline fields saw undefined.
	it('does not offer a payload style the server will not honor', () => {
		expect(node.description.properties.find((p) => p.name === 'payloadStyle')).toBeUndefined();
	});

	it('always subscribes with the thin envelope v1 actually delivers', async () => {
		const requests = [];
		const ctx = {
			getNodeWebhookUrl: () => 'https://n8n.example/webhook/abc',
			getNodeParameter: (name) => ({ events: ['transaction.created'], projectId: '' })[name],
			getCredentials: async () => ({ apiToken: 't', baseUrl: 'https://api.example/v1' }),
			getWorkflowStaticData: () => ({}),
			helpers: {
				httpRequestWithAuthentication: {
					call: async (_self, _cred, opts) => {
						requests.push(opts);
						return { id: 'whk_1', secret: 's' };
					},
				},
			},
		};
		await node.webhookMethods.default.create.call(ctx);
		expect(requests).toHaveLength(1);
		expect(requests[0].body).not.toHaveProperty('payloadStyle');
	});

	it('recreates a missing webhook only after a 404', async () => {
		const webhookData = { webhookId: 'whk_missing', secret: 'whsec_test' };
		const ctx = {
			getWorkflowStaticData: () => webhookData,
			getCredentials: async () => ({ apiToken: 't', baseUrl: 'https://api.example/v1' }),
			helpers: {
				httpRequestWithAuthentication: {
					call: async () => {
						throw { statusCode: 404 };
					},
				},
			},
		};

		await expect(node.webhookMethods.default.checkExists.call(ctx)).resolves.toBe(false);
		expect(webhookData).toEqual({});
	});

	it('surfaces a webhook lookup failure instead of creating a duplicate', async () => {
		const webhookData = { webhookId: 'whk_existing', secret: 'whsec_test' };
		const ctx = {
			getNode: () => ({ name: 'Saturation Trigger', type: 'saturationTrigger' }),
			getWorkflowStaticData: () => webhookData,
			getCredentials: async () => ({ apiToken: 't', baseUrl: 'https://api.example/v1' }),
			helpers: {
				httpRequestWithAuthentication: {
					call: async () => {
						throw { statusCode: 500, message: 'upstream unavailable' };
					},
				},
			},
		};

		await expect(node.webhookMethods.default.checkExists.call(ctx)).rejects.toThrow();
		expect(webhookData).toEqual({ webhookId: 'whk_existing', secret: 'whsec_test' });
	});
});

// Every URL the node routes to, pinned against the real /v1 route table.
//
// Keep every declarative route pinned to the public contract. A stale template
// must fail here before it ships as a node operation that always returns 404.
//
// Kept as a literal allow-list rather than a live fetch so the test is
// hermetic; when a path here changes, the diff makes you look at the route.
describe('Saturation action node endpoints', () => {
	const KNOWN_V1_PATHS = new Set([
		'/transactions',
		'/documents',
		'/documents/{documentId}/links/{kind}',
		'/search',
		'/projects/{projectId}/library/incentives',
	]);

	// Collapse n8n's `={{$parameter.x}}` interpolation back to `{x}` so a routed
	// URL can be compared to the OpenAPI-style path it targets.
	const normalize = (url) =>
		url.replace(/^=/, '').replace(/\{\{\s*\$parameter\.(\w+)\s*\}\}/g, '{$1}');

	const routedUrls = (node) => {
		const urls = [];
		const walk = (value) => {
			if (Array.isArray(value)) return value.forEach(walk);
			if (!value || typeof value !== 'object') return;
			if (value.request && typeof value.request.url === 'string') {
				urls.push(value.request.url);
			}
			Object.values(value).forEach(walk);
		};
		walk(node.description.properties);
		return urls;
	};

	it('routes only to paths that exist in the /v1 route table', () => {
		const urls = routedUrls(new Saturation());
		expect(urls.length, 'expected the node to route somewhere').toBeGreaterThan(0);
		for (const url of urls) {
			const path = normalize(url);
			expect(
				KNOWN_V1_PATHS.has(path),
				`"${path}" is not a known /v1 path. Check the public OpenAPI contract before adding it here.`,
			).toBe(true);
		}
	});

});

// The node icon ships inside the package (`icon: 'file:saturation.svg'`), so
// nothing is fetched at runtime — whatever is committed is what users see in
// the nodes panel. Two copies exist because n8n resolves the icon relative to
// each node's own folder, and nothing else keeps them in step: the pair sat at
// a hand-drawn "S" placeholder rather than the Saturation mark, in both places.
describe('node icon', () => {
	const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

	it('is the Saturation mark, not a placeholder letterform', () => {
		const svg = read('../nodes/Saturation/saturation.svg');
		// The real mark is a single long bezier path lifted from favicon.svg. The
		// placeholder was a short hand-written path; length is a blunt but honest
		// discriminator between the two.
		expect(svg).toContain('<path');
		expect(svg.length).toBeGreaterThan(1000);
	});

	it('is byte-identical across both node folders', () => {
		expect(read('../nodes/Saturation/saturation.svg')).toBe(
			read('../nodes/SaturationTrigger/saturation.svg'),
		);
	});
});

describe('API host', () => {
	// `api.saturation.io` has no /v1 routes: probing it returns 404 while
	// next-api returns 401. A credential defaulting there can never pass its own
	// connection test, and it shipped that way in 1.0.0-1.0.7 -- only surfacing
	// when someone actually tried to connect. Pins the default and both fallbacks.
	const legacy = /(?<!next-)api\.saturation\.io/;

	it('defaults the credential Base URL to next-api', () => {
		const cred = new SaturationApi();
		const baseUrl = cred.properties.find((p) => p.name === 'baseUrl');
		expect(baseUrl.default).toBe('https://next-api.saturation.io/v1');
	});

	it('never falls back to the legacy apex anywhere in source', () => {
		const files = [
			'credentials/SaturationApi.credentials.ts',
			'nodes/Saturation/methods/loadOptions.ts',
			'nodes/SaturationTrigger/SaturationTrigger.node.ts',
		];
		// Comments are stripped first: the fix's own comment names the bad host to
		// explain why it is wrong, and a check that trips on prose would be noise.
		const code = (f) =>
			readFileSync(f, 'utf8')
				.replace(/\/\*[\s\S]*?\*\//g, '')
				.replace(/^\s*\/\/.*$/gm, '');
		const offenders = files.filter((f) => legacy.test(code(f)));
		expect(offenders, `legacy apex referenced in: ${offenders.join(', ')}`).toEqual([]);
	});
});

// n8n's declarative router writes every routed property into the request
// unconditionally (`routing-node.js`: `returnData.options.qs[propertyName] =
// value`), so an always-displayed optional picker left empty still ships
// `?projectId=`. The API resolves a named project filter and 404s when it does
// not exist, so the empty string asked for a project called "" and every
// unfiltered `transaction: getAll` — the operation's documented default — came
// back "The resource you are requesting could not be found".
describe('transaction list project filter', () => {
	// The same two steps the router takes for a routed property.
	const sentQuery = (property, paramValue) => {
		let value = paramValue;
		if (property.routing.send.value) {
			const body = property.routing.send.value.replace(/^=\{\{([\s\S]*)\}\}$/, '$1');
			value = new Function('$value', `return (${body})`)(paramValue);
		}
		const qs = { [property.routing.send.property]: value };
		// axios drops undefined params at serialization; anything else is sent.
		return Object.fromEntries(Object.entries(qs).filter(([, v]) => v !== undefined));
	};

	const filter = () =>
		new Saturation().description.properties.find(
			(p) =>
				p.name === 'projectId' &&
				p.displayOptions?.show?.operation?.includes('getAll') &&
				p.routing?.send?.type === 'query',
		);

	it('omits projectId entirely when the picker is left empty', () => {
		expect(sentQuery(filter(), '')).toEqual({});
	});

	it('still sends the project when one is chosen', () => {
		expect(sentQuery(filter(), 'prj_abc123')).toEqual({ projectId: 'prj_abc123' });
	});
});

// n8n renders an `options` parameter whose current value is not in the loaded
// list as invalid — red border and warning icon — so the optional project
// filter looked broken at its own default, on a call that had succeeded. The
// dropdown has to offer the empty value the property defaults to.
describe('optional project filter dropdown', () => {
	const node = new Saturation();
	const filter = node.description.properties.find(
		(p) => p.name === 'projectId' && p.required !== true,
	);

	it('loads a list that includes the default (no filter) value', () => {
		expect(filter.default).toBe('');
		expect(filter.typeOptions.loadOptionsMethod).toBe('listProjectsWithAll');
		expect(Object.keys(node.methods.loadOptions)).toContain('listProjectsWithAll');
	});

	it('keeps the required picker on the plain project list', () => {
		const required = node.description.properties.find(
			(p) => p.name === 'projectId' && p.required === true,
		);
		expect(required.typeOptions.loadOptionsMethod).toBe('listProjects');
	});
});
