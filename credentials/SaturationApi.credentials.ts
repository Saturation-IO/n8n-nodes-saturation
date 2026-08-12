import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

// Saturation API credential. A personal API token authenticates as a
// user (or a workspace service identity) and inherits that principal's live
// permissions. Create one under Settings > Developers > API. The token is
// injected as `Authorization: Bearer <token>` on every request (securityScheme
// `bearerAuth` in the OpenAPI), and verified by the credential test which calls
// `GET /v1/me`.
export class SaturationApi implements ICredentialType {
	name = 'saturationApi';

	displayName = 'Saturation API';

	// Themed pair: the light-theme icon is the dark tile, and vice versa, so the
	// mark keeps contrast against whichever background n8n renders behind it.
	icon: Icon = { light: 'file:saturation.svg', dark: 'file:saturation.dark.svg' };

	// Community credentials link to Saturation's docs, not an n8n docs slug.
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
			description: 'Your personal API token. Create one in Saturation under Settings > Developers > API.',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			// Public production API. The override supports a local or self-hosted edge.
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
