# Saturation for n8n

[![npm version](https://img.shields.io/npm/v/n8n-nodes-saturation)](https://www.npmjs.com/package/n8n-nodes-saturation)
[![CI](https://github.com/Saturation-IO/n8n-nodes-saturation/actions/workflows/publish.yml/badge.svg)](https://github.com/Saturation-IO/n8n-nodes-saturation/actions/workflows/publish.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Use [Saturation](https://saturation.io) production finance data in n8n workflows. This package provides two nodes:

- **Saturation** reads and writes transactions, documents, Library data, and search results.
- **Saturation Trigger** starts a workflow when a supported Saturation event occurs.

[Install](#install) | [Connect](#connect-saturation) | [Build a workflow](#build-a-workflow) | [Supported operations](#supported-operations) | [Develop](#develop)

## Install

To install the community node on self-hosted n8n:

1. Open **Settings > Community Nodes**.
2. Select **Install**.
3. Enter `n8n-nodes-saturation`.
4. Review the community-node warning, then select **Install**.

See n8n's [GUI installation guide](https://docs.n8n.io/integrations/community-nodes/installation-and-management/gui-installation/) for instance and role requirements. n8n Cloud requires [community-node verification](https://docs.n8n.io/integrations/creating-nodes/deploy/submit-community-nodes/).

## Connect Saturation

1. In Saturation, open **Settings > Developers > API** and create a personal API token.
2. In n8n, create a **Saturation API** credential.
3. Paste the token into **API Token**.
4. Keep **Base URL** set to `https://next-api.saturation.io/v1` for production.
5. Save the credential. n8n verifies it with `GET /me`.

The token selects one workspace and carries that identity's current permissions. Store it as a secret. Do not add it to workflow fields, logs, or exported workflow JSON.

## Build a workflow

### List recent transactions

1. Add a **Saturation** node.
2. Select **Transaction > Get Many**.
3. Choose **All Projects**, or select one project.
4. Add filters such as date, status, contact, source, or amount.
5. Attach the **Saturation API** credential and run the node.

**Transaction > Get Many** returns one API page, with up to 100 rows. **Document > Get Many** and **Search > Spotlight** follow the same one-page limit.

### Create a manual transaction

1. Add a **Saturation** node after the node that supplies your input data.
2. Select **Transaction > Create** and choose a project.
3. Map **Type**, **Amount (Minor Units)**, **Currency**, and **Date**.
4. Add a description, contact, or budget line when needed.

Saturation represents money as integer minor units with an ISO 4217 currency code. `50000` with `USD` means $500.00.

### Fetch a transaction after an event

1. Add a **Saturation Trigger** node.
2. Select **Transaction Created** or **Transaction Updated**.
3. Add an **HTTP Request** node and choose the **Saturation API** predefined credential.
4. Send `GET https://next-api.saturation.io/v1/transactions/{{$json.data.id}}`.

The trigger emits a compact envelope. The changed record is identified by `data.kind` and `data.id`; fetch it to read current values and re-check permissions.

## Supported operations

The package exposes these action-node operations:

| Resource | Operation | API request | Inputs |
| --- | --- | --- | --- |
| Transaction | Create | `POST /transactions` | Project, type, amount, currency, date; optional description, contact, budget line |
| Transaction | Get Many | `GET /transactions` | Optional project, date, amount, contact, budget line, source, status, type, and search filters |
| Document | Link | `PUT /documents/{documentId}/links/{kind}` | Document, target kind, target, and optional replace flag |
| Document | Get Many | `GET /documents` | Limit |
| Library | Install Rate Pack | `PUT /projects/{projectId}/library/rate-packs/{packId}` | Project and workspace rate pack |
| Library | Add Incentive | `POST /projects/{projectId}/library/incentives` | Project and published incentive program |
| Search | Spotlight | `GET /search` | Query, optional result types, and limit |

Document links support transactions, payments, purchase orders, budget lines, contacts, and projects.

Project, contact, and rate-pack selectors load the first 100 records the token can read. If a record is not listed, switch the field to an [expression](https://docs.n8n.io/code/expressions/) and enter its ID. Choose **All Projects** when a project filter should cover the workspace.

Write operations send an `Idempotency-Key` based on the n8n execution and input item. Retrying the same write with the same key and body does not create a second record. A different workflow execution uses a different key.

Document upload uses `multipart/form-data` and is not an action-node operation. Use n8n's **HTTP Request** node with the **Saturation API** credential to call `POST /documents`, then use **Document > Link**.

The action node does not expose every Saturation API endpoint. Use the [OpenAPI contract](https://docs.saturation.io/openapi.yaml) with n8n's **HTTP Request** node for endpoints outside the table.

## Trigger workflows

The **Saturation Trigger** node creates a webhook when a workflow activates and removes it when the workflow deactivates. You can limit a subscription to one project.

Supported events:

- Transactions: `transaction.created`, `transaction.updated`
- Budgets: `budget.changed`
- Purchase orders: `purchaseOrder.created`, `purchaseOrder.pending`, `purchaseOrder.approved`, `purchaseOrder.rejected`, `purchaseOrder.actualizing`, `purchaseOrder.paid`, `purchaseOrder.void`
- Documents: `document.created`, `document.linked`, `document.unlinked`, `document.deleted`
- Library: `incentive.added`, `pack.installed`, `pack.uninstalled`

Each delivery contains `id`, `event`, `workspaceId`, `occurredAt`, and `data`. Project-scoped events may also contain `projectId`. Use the delivery `id` to detect duplicates.

The trigger verifies `X-Saturation-Signature` against the exact request body and rejects missing, invalid, or stale signatures. Deliveries contain identifiers rather than the full changed record.

## Documentation

- [Saturation API documentation](https://docs.saturation.io)
- [OpenAPI contract](https://docs.saturation.io/openapi.yaml)
- [n8n community-node documentation](https://docs.n8n.io/integrations/community-nodes/)

## Develop

The package supports Node.js 18.17 or later. Repository checks run on Node.js 20.

```bash
git clone https://github.com/Saturation-IO/n8n-nodes-saturation.git
cd n8n-nodes-saturation
npm ci --ignore-scripts
npm run build
npm run lint
npm test
npm pack --dry-run
```

`npm run scan` checks the latest version already published to npm. It does not scan an unpublished checkout. See [CONTRIBUTING.md](CONTRIBUTING.md) for local checks and the release process.

## Support

Open a [GitHub issue](https://github.com/Saturation-IO/n8n-nodes-saturation/issues) for reproducible bugs and feature requests. Report security issues through [GitHub private vulnerability reporting](https://github.com/Saturation-IO/n8n-nodes-saturation/security/advisories/new).

## License

[MIT](LICENSE)
