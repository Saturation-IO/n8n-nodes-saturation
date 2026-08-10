# Saturation for n8n

[![npm version](https://img.shields.io/npm/v/n8n-nodes-saturation)](https://www.npmjs.com/package/n8n-nodes-saturation)
[![CI](https://github.com/Saturation-IO/n8n-nodes-saturation/actions/workflows/publish.yml/badge.svg)](https://github.com/Saturation-IO/n8n-nodes-saturation/actions/workflows/publish.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Use Saturation production finance data in n8n workflows. The package includes:

- **Saturation**, for reading and writing transactions, documents, Library data, and search
- **Saturation Trigger**, for starting a workflow when a supported Saturation event occurs

[Install](#install) | [Connect](#connect-saturation) | [Try a workflow](#try-a-workflow) | [Supported operations](#supported-operations) | [Develop](#develop)

## Install

This package is available from [npm](https://www.npmjs.com/package/n8n-nodes-saturation).

On a self-hosted n8n instance:

1. Open **Settings > Community Nodes**.
2. Select **Install**.
3. Enter `n8n-nodes-saturation`.
4. Review the community-node warning, then select **Install**.

See n8n's [community-node installation guide](https://docs.n8n.io/integrations/community-nodes/installation-and-management/gui-installation/) for role and deployment requirements.

Unverified community nodes are available on self-hosted n8n only. The package will become available on n8n Cloud after n8n approves it through the Creator Portal.

## Connect Saturation

1. In Saturation, open **Settings > API Tokens** and create a personal API token.
2. In n8n, create a **Saturation API** credential.
3. Paste the token into **API Token**.
4. Leave **Base URL** set to `https://next-api.saturation.io/v1` for production.
5. Save the credential. n8n checks it with `GET /me`.

Treat the token as a secret. It carries the permissions of its Saturation user or service identity and is bound to one workspace.

## Try a workflow

To list recent transactions:

1. Add a **Saturation** node to a workflow.
2. Select **Transaction** as the resource.
3. Select **Get Many** as the operation.
4. Choose **All Projects**, or select one project.
5. Attach your Saturation credential and run the node.

The API returns money as an integer number of minor units plus an ISO 4217 currency code. For example, `50000` with `USD` means $500.00.

## Supported operations

| Resource    | Operation         | API request                                             |
| ----------- | ----------------- | ------------------------------------------------------- |
| Transaction | Create            | `POST /transactions`                                    |
| Transaction | Get Many          | `GET /transactions`                                     |
| Document    | Assign            | `POST /documents/{documentId}/assign`                   |
| Document    | Get Many          | `GET /documents`                                        |
| Library     | Install Rate Pack | `POST /projects/{projectId}/library/rates/{packId}/add` |
| Library     | Add Incentive     | `POST /projects/{projectId}/library/incentives/add`     |
| Search      | Spotlight         | `GET /search`                                           |

Write operations send an `Idempotency-Key` based on the n8n execution and input item. Requests that reuse that key and body do not create a second record. A new workflow execution receives a new key.

Document upload is not yet a first-class operation. Use n8n's **HTTP Request** node with the Saturation credential to call `POST /documents`, then use **Document > Assign**.

## Trigger workflows

The **Saturation Trigger** node registers and removes a webhook with the workflow lifecycle. It supports transaction, budget, purchase-order, document, incentive, and rate-pack events.

Each delivery contains a compact event envelope with the entity ID. Add a Saturation action node after the trigger to fetch the current record. The trigger verifies the delivery's HMAC signature and rejects missing, invalid, or stale signatures.

Budget and purchase-order support is currently trigger-only. The Saturation action node does not yet read or write those resources.

## Documentation

- [Saturation API documentation](https://docs.saturation.io)
- [OpenAPI contract](https://docs.saturation.io/openapi.yaml)
- [Agent documentation map](https://docs.saturation.io/llms.txt)
- [n8n community-node documentation](https://docs.n8n.io/integrations/community-nodes/)

## Develop

Use Node.js 20 or later.

```bash
git clone https://github.com/Saturation-IO/n8n-nodes-saturation.git
cd n8n-nodes-saturation
npm ci --ignore-scripts
npm run build
npm run lint
npm test
```

`npm run scan` checks the latest published package with n8n's community-package scanner. See [CONTRIBUTING.md](CONTRIBUTING.md) for the source checks and release process.

## Support

Open a [GitHub issue](https://github.com/Saturation-IO/n8n-nodes-saturation/issues) for reproducible bugs and feature requests. Report security issues through [GitHub private vulnerability reporting](https://github.com/Saturation-IO/n8n-nodes-saturation/security/advisories/new).

## License

[MIT](LICENSE)
