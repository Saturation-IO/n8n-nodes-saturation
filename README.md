# n8n-nodes-saturation

This is an [n8n](https://n8n.io) community node. It lets you use the
[Saturation](https://saturation.io) Public API (`/v1`) in your n8n workflows —
production-finance data: transactions, budgets, purchase orders, documents and
the Library.

The node is built from and conforms to the single Saturation API OpenAPI
3.1 contract (`docs/next/next-api-build/openapi/openapi.yaml`). Every endpoint,
event name and field is derived from that document.

[Installation](#installation) ·
[Credentials](#credentials) ·
[Operations](#operations) ·
[Trigger](#trigger) ·
[Development](#development)

## Installation

Follow the
[community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/).
In a self-hosted n8n, go to **Settings → Community Nodes**, install
`n8n-nodes-saturation`.

## Credentials

You need a **Saturation API token** (a JWT). Mint one in Saturation under
**Settings → API Tokens**. The token acts as you (or a workspace service
identity) and inherits your live permissions.

The `Saturation API` credential injects `Authorization: Bearer <token>` on every
request and is verified against **`GET /v1/me`**. For a sandbox or self-hosted
edge, set the **Base URL** field (default `https://api.saturation.io/v1`).

## Operations

The **Saturation** node is a declarative node: every operation is HTTP-routing
onto a `/v1` endpoint. Unsafe writes set an `Idempotency-Key` header
(`n8n-{executionId}-{itemIndex}`) so a re-run produces exactly one row.

| Resource | Operation | Endpoint |
|---|---|---|
| Transaction | Create | `POST …/transactions` |
| Transaction | Get Many | `GET …/transactions` (full filter grammar) |
| Document | Assign | `POST …/documents/{id}/assign` |
| Document | Get Many | `GET …/documents` |
| Library | Install Rate Pack | `POST …/library/rates/{packId}/add` |
| Library | Add Incentive | `POST …/library/incentives/add` |
| Search | Spotlight | `GET …/search` |

Project, contact and rate-pack fields are populated by live load-option calls
(`GET /v1/projects`, `…/contacts`, `…/library/rates`), permission-filtered to
the token's reach. The workspace is the API token's workspace (a token is bound
to exactly one workspace), so no workspace field or path segment exists.

Money is always an integer count of minor units plus an ISO-4217 currency
(`50000` + `USD` means $500.00) — never a float.

> Dropping a new document is a `multipart/form-data` upload; use the core
> **HTTP Request** node (with the Saturation credential) against
> `POST …/documents` for that, then use this node's **Assign** operation. The
> trigger and all other operations are first-class here.

## Trigger

The **Saturation Trigger** node registers an outbound webhook against the
Saturation Webhook API and tears it down across the workflow lifecycle:

- **create** → `POST /v1/webhooks` with `{url, events[], projectId?}`
- **checkExists** → `GET …/webhooks/{id}`
- **delete** → `DELETE …/webhooks/{id}`

Pick one or more events from the closed enum:
`transaction.created|updated`, `budget.changed`,
`purchaseOrder.created|pending|approved|rejected|actualizing|paid|void`,
`document.created|assigned|unassigned|deleted`, `incentive.added`,
`pack.installed|uninstalled`. The purchase-order suffix is the exact status the
PO entered (flow-derived, read-only) — there is no submitted/approve/pay event.

Deliveries are HMAC-signed (`X-Saturation-Signature`); the signing secret is
returned exactly once at create and stashed in the node's static data.

Every delivery is the **thin** envelope — `{id, event, entityId, kind,
occurredAt}` — and your workflow re-fetches what it needs, which re-checks
permissions on the way back in. The API also accepts a `full` payload style,
but v1 delivers the thin body for those subscriptions too: inlining the
permission-projected object needs a per-entity projection service that has not
shipped. The node therefore does not offer the choice, rather than let you pick
an option the server will not honor.

## Development

```bash
cd apps-next/next-api/integrations/n8n-nodes-saturation
npm install
npm run build       # tsc + copy icons into dist/
npm run lint        # eslint with eslint-plugin-n8n-nodes-base
npm run scan        # npx @n8n/scan-community-package n8n-nodes-saturation
```

Smoke against a sandbox edge (4300 block, never 4000/4001/4003/4048 or
4094-4099):

```bash
npm run dev         # tsc --watch
# In a linked n8n instance, add a Saturation credential pointing at
# http://localhost:4300/v1 and run a workflow.
```

### Publishing

Publishing to npm is done out-of-band by a maintainer via the GitHub Actions
workflow (`.github/workflows/publish.yml`), which builds, lints, scans, and runs
`npm publish --provenance` (OIDC). Directory listing and verification-queue
review are a human, n8n-side step.

## Compatibility

Requires n8n with `n8nNodesApiVersion: 1`. Node.js ≥ 18.17.

## License

MIT
