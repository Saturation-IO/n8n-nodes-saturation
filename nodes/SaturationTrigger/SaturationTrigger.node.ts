import { createHmac, timingSafeEqual } from 'node:crypto';

import {
	NodeApiError,
	NodeConnectionTypes,
	NodeOperationError,
	type IDataObject,
	type JsonObject,
	type IHookFunctions,
	type INodePropertyOptions,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
} from 'n8n-workflow';

// Closed WebhookEvent enum (components.schemas.WebhookEvent in the OpenAPI).
// Only the events the API actually emits today are offered; reserved-but-unemitted
// names (pack.enabled, usage.threshold_reached) are deliberately excluded.
const WEBHOOK_EVENTS: INodePropertyOptions[] = [
	{ name: 'Transaction Created', value: 'transaction.created' },
	{ name: 'Transaction Updated', value: 'transaction.updated' },
	{ name: 'Budget Changed', value: 'budget.changed' },
	{ name: 'Purchase Order Created', value: 'purchaseOrder.created' },
	{ name: 'Purchase Order Pending', value: 'purchaseOrder.pending' },
	{ name: 'Purchase Order Approved', value: 'purchaseOrder.approved' },
	{ name: 'Purchase Order Rejected', value: 'purchaseOrder.rejected' },
	{ name: 'Purchase Order Actualizing', value: 'purchaseOrder.actualizing' },
	{ name: 'Purchase Order Paid', value: 'purchaseOrder.paid' },
	{ name: 'Purchase Order Voided', value: 'purchaseOrder.void' },
	{ name: 'Document Created', value: 'document.created' },
	{ name: 'Document Assigned', value: 'document.assigned' },
	{ name: 'Document Unassigned', value: 'document.unassigned' },
	{ name: 'Document Deleted', value: 'document.deleted' },
	{ name: 'Incentive Added', value: 'incentive.added' },
	{ name: 'Pack Installed', value: 'pack.installed' },
	{ name: 'Pack Uninstalled', value: 'pack.uninstalled' },
];

function getBaseUrl(credentials: IDataObject): string {
	return (credentials.baseUrl as string) || 'https://next-api.saturation.io/v1';
}

// Replay-tolerance window for inbound deliveries (seconds). Mirrors the
// dispatcher's documented `SIGNATURE_TOLERANCE_SECONDS` (5 minutes) so a
// captured delivery can't be replayed indefinitely.
const SIGNATURE_TOLERANCE_SECONDS = 5 * 60;

/** The signature header value prefix (Stripe wire format). */
const SIG_PREFIX = 'sha256=';

/**
 * Verify an inbound delivery against the stored signing secret. Mirrors the
 * dispatcher's signer (see webhooks/signing.ts `signPayload`/`verifySignature`):
 * the MAC is HMAC-SHA256 over `timestamp + '.' + rawBody` keyed by the secret,
 * sent as `X-Saturation-Signature: sha256=<hex>`. Returns `true` only when the
 * MAC matches AND the timestamp is within the replay-tolerance window.
 *
 * `rawBody` MUST be the exact bytes received (before JSON parsing) — re-encoding
 * the parsed object would change the bytes and never match.
 */
function verifyDeliverySignature(input: {
	secret: string;
	rawBody: string;
	timestamp: string;
	signature: string;
	now?: Date;
}): boolean {
	const expected =
		SIG_PREFIX +
		createHmac('sha256', input.secret)
			.update(`${input.timestamp}.${input.rawBody}`, 'utf8')
			.digest('hex');

	// Constant-time compare over equal-length buffers. Unequal lengths can't be a
	// match; bail before `timingSafeEqual` (which throws on length mismatch).
	const a = Buffer.from(expected, 'utf8');
	const b = Buffer.from(input.signature, 'utf8');
	if (a.length !== b.length) return false;
	if (!timingSafeEqual(a, b)) return false;

	// Replay window: reject a timestamp outside the tolerance (past OR future).
	const sentAt = Date.parse(input.timestamp);
	if (Number.isNaN(sentAt)) return false;
	const now = (input.now ?? new Date()).getTime();
	const skewSeconds = Math.abs(now - sentAt) / 1000;
	return skewSeconds <= SIGNATURE_TOLERANCE_SECONDS;
}

/** Case-insensitive single-header lookup over an n8n header map. */
function getHeader(headers: IDataObject, name: string): string | undefined {
	const value = headers[name.toLowerCase()];
	if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : undefined;
	return typeof value === 'string' ? value : undefined;
}

// Saturation Trigger node. Registers an outbound webhook against the Saturation
// Webhook API and tears it down across the node lifecycle (the workspace is
// the API token's workspace, so paths carry no workspace segment):
//   create      -> POST   /webhooks  {url, events[], projectId?}
//   delete      -> DELETE /webhooks/{id}
//   checkExists -> GET    /webhooks/{id}
// Deliveries are HMAC-signed (X-Saturation-Signature) and carry a stable
// delivery id; n8n passes the body straight through.
export class SaturationTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Saturation Trigger',
		name: 'saturationTrigger',
		// Themed pair so the mark keeps contrast in both n8n themes.
		icon: { light: 'file:saturation.svg', dark: 'file:saturation.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["events"].join(", ")}}',
		description: 'Starts a workflow when a Saturation event fires',
		defaults: {
			name: 'Saturation Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		// n8n's type only accepts `true` (or omission) -- there is no way to declare
		// "not a tool" -- and the verification scan requires the property to be
		// present. So `true` it is, which is also what n8n's own rule advises. In
		// practice a webhook trigger is started by Saturation pushing an event, not
		// by a tool call, so this changes nothing about how it runs.
		usableAsTool: true,
		credentials: [
			{
				name: 'saturationApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: [],
				description: 'The events to subscribe to',
				options: WEBHOOK_EVENTS,
			},
			{
				displayName: 'Project ID',
				name: 'projectId',
				type: 'string',
				default: '',
				description:
					'Optional. Narrow the subscription to a single project (prj_…). Leave blank for every project you can read in the workspace.',
			},
			// No Payload Style option: v1 delivers the THIN envelope for every
			// subscription. The server accepts `payloadStyle: 'full'` but
			// documents that those subscriptions "also receive the thin body for
			// now — the CASL-projected object inline requires the per-entity
			// projection service, deferred with this loud note rather than
			// shipping an unprojected (permission-leaking) object"
			// (apps-next/next-api/src/jobs/webhook-delivery.ts:37-41).
			//
			// Offering the choice therefore lied to the user: picking "Full"
			// still delivered an id-only envelope, and every downstream node
			// reading inline fields got undefined. The Zapier factory hardcodes
			// `thin` for the same reason ("do not request what won't be
			// honored"). Re-add this option in BOTH integrations when the
			// projection service ships.
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				if (!webhookData.webhookId) {
					return false;
				}
				const credentials = await this.getCredentials('saturationApi');
				const baseUrl = getBaseUrl(credentials);
				try {
					await this.helpers.httpRequestWithAuthentication.call(this, 'saturationApi', {
						method: 'GET',
						baseURL: baseUrl,
						url: `/webhooks/${webhookData.webhookId}`,
						json: true,
					});
					return true;
				} catch (error) {
					const status =
						(error as { httpCode?: string; statusCode?: number })?.statusCode ??
						Number((error as { httpCode?: string })?.httpCode);
					if (status === 404) {
						// The subscription no longer exists. Clear all state so n8n can recreate it.
						delete webhookData.webhookId;
						delete webhookData.secret;
						return false;
					}
					// Auth, server, and network failures do not prove that the
					// subscription is gone. Surface them instead of attempting a
					// duplicate create.
					throw new NodeApiError(this.getNode(), error as JsonObject);
				}
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const events = this.getNodeParameter('events') as string[];
				const projectId = this.getNodeParameter('projectId') as string;
				const credentials = await this.getCredentials('saturationApi');
				const baseUrl = getBaseUrl(credentials);

				// Always thin: v1 delivers the id-only envelope regardless, so
				// requesting `full` would only misrepresent what arrives. See the
				// Payload Style note on the properties list above.
				const body: IDataObject = { url: webhookUrl, events, payloadStyle: 'thin' };
				if (projectId) {
					body.projectId = projectId;
				}

				const response = (await this.helpers.httpRequestWithAuthentication.call(
					this,
					'saturationApi',
					{
						method: 'POST',
						baseURL: baseUrl,
						url: `/webhooks`,
						body,
						json: true,
					},
				)) as { id?: string; secret?: string };

				if (!response.id) {
					return false;
				}
				const webhookData = this.getWorkflowStaticData('node');
				webhookData.webhookId = response.id;
				// The signing secret is returned exactly once; stash it so the
				// workflow can verify X-Saturation-Signature if it chooses.
				if (response.secret) {
					webhookData.secret = response.secret;
				}
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				if (!webhookData.webhookId) {
					return true;
				}
				const credentials = await this.getCredentials('saturationApi');
				const baseUrl = getBaseUrl(credentials);
				try {
					await this.helpers.httpRequestWithAuthentication.call(this, 'saturationApi', {
						method: 'DELETE',
						baseURL: baseUrl,
						url: `/webhooks/${webhookData.webhookId}`,
						json: true,
					});
				} catch (error) {
					// A 404 means the subscription is already gone, which is the
					// outcome we wanted, so treat it as success. Anything else -- a
					// 500, an auth failure, a network fault -- must surface: the lines
					// below drop the webhook id, so swallowing a real failure leaves a
					// live subscription on the server that nothing can ever delete.
					const status =
						(error as { httpCode?: string; statusCode?: number })?.statusCode ??
						Number((error as { httpCode?: string })?.httpCode);
					if (status !== 404) {
						// Wrapped, not re-thrown raw, so n8n renders it as a node error
						// with the API's own message attached rather than a bare stack.
						throw new NodeApiError(this.getNode(), error as JsonObject);
					}
				}
				delete webhookData.webhookId;
				delete webhookData.secret;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		// HMAC gate: the create hook stashed the subscription's signing secret, so
		// every inbound POST must carry a matching `X-Saturation-Signature`. Without
		// this anyone who learns the webhook URL could POST arbitrary payloads.
		const webhookData = this.getWorkflowStaticData('node');
		const secret = typeof webhookData.secret === 'string' ? webhookData.secret : undefined;
		const headers = this.getHeaderData() as IDataObject;
		const signature = getHeader(headers, 'X-Saturation-Signature');
		const timestamp = getHeader(headers, 'X-Saturation-Timestamp');

		// The MAC is over the RAW bytes; the re-serialized parsed body would differ.
		// n8n populates `rawBody` on the webhook request object.
		const req = this.getRequestObject() as { rawBody?: Buffer | string };
		const rawBody =
			typeof req.rawBody === 'string'
				? req.rawBody
				: Buffer.isBuffer(req.rawBody)
					? req.rawBody.toString('utf8')
					: undefined;

		const verified =
			secret !== undefined &&
			signature !== undefined &&
			timestamp !== undefined &&
			rawBody !== undefined &&
			verifyDeliverySignature({ secret, rawBody, timestamp, signature });

		if (!verified) {
			// Reject: an unsigned/forged POST must not reach the workflow. Throwing
			// makes n8n respond non-2xx and emit nothing (the pattern n8n's own
			// signature-checking trigger nodes use).
			throw new NodeOperationError(
				this.getNode(),
				'Invalid or missing X-Saturation-Signature: webhook payload failed HMAC verification',
			);
		}

		const body = this.getBodyData();
		return {
			workflowData: [this.helpers.returnJsonArray([body as IDataObject])],
		};
	}
}
