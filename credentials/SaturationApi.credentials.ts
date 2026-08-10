import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

// Saturation API credential. A personal API token authenticates as a
// user (or a workspace service identity) and inherits that principal's live
// permissions. The token is injected as `Authorization: Bearer <token>` on
// every request (securityScheme `bearerAuth` in the OpenAPI), and verified by
// the credential test which calls `GET /v1/me`.
export class SaturationApi implements ICredentialType {
	name = 'saturationApi';

	displayName = 'Saturation API';

	// Themed pair: the light-theme icon is the dark tile, and vice versa, so the
	// mark keeps contrast against whichever background n8n renders behind it.
	icon: Icon = { light: 'file:saturation.svg', dark: 'file:saturation.dark.svg' };

	// The rule below camelCases the VALUE, assuming n8n's first-party convention of a
	// doc slug ('airtable') that resolves inside n8n's own docs site. This is a community
	// node pointing at our own docs, so autofixing rewrites the URL to the nonsense
	// 'httpsDocsSaturationIo'. Disabled rather than renamed.
	// eslint-disable-next-line n8n-nodes-base/cred-class-field-documentation-url-miscased
	documentationUrl = 'https://docs.saturation.io';

	properties: INodeProperties[] = [
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description: 'Your personal API token. Create one in Saturation under Settings > API Tokens.',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			// next-api, NOT the legacy apex. `api.saturation.io/v1/me` 404s -- that host
			// serves the old /api/v1 stack and has no /v1 routes at all -- so every
			// install shipped a credential whose connection test could never pass.
			// Verified by probe: api 404, next-api 401 (route present, wants auth).
			default: 'https://next-api.saturation.io/v1',
			description:
				'Leave as-is for production. Override only for a sandbox or self-hosted edge (e.g. http://localhost:4300/v1).',
		},
	];

	// Inject the Bearer token on every request that uses this credential.
	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiToken}}',
			},
		},
	};

	// Credential test: GET /v1/me — the auth-probe every integration makes.
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/me',
			method: 'GET',
		},
	};
}
