# Agent guide

This repository publishes `n8n-nodes-saturation`, the public Saturation community-node package for n8n.

## Start here

- API documentation map: https://docs.saturation.io/llms.txt
- Full agent-readable API documentation: https://docs.saturation.io/llms-full.txt
- OpenAPI contract: https://docs.saturation.io/openapi.yaml
- n8n community-node guidance: https://docs.n8n.io/integrations/community-nodes/building-community-nodes/

## Source map

- `credentials/`: bearer-token credential and connection test
- `nodes/Saturation/`: action node, operations, fields, and dynamic options
- `nodes/SaturationTrigger/`: webhook registration and signature verification
- `test/node.test.mjs`: compiled-node contract and regression tests
- `.github/workflows/publish.yml`: pull-request checks and npm trusted publishing

## Invariants

- Production API base URL: `https://next-api.saturation.io/v1`
- Authentication: opaque bearer token, never parsed or logged
- Tenant scope: one workspace per token, with no workspace segment in resource paths
- Writes: idempotency key on every create or assignment request
- Webhooks: raw-body HMAC verification with a five-minute replay window
- Dependencies: no runtime dependencies
- Public prose: concrete and concise, with no em dash

## Verification

Run:

```bash
npm ci --ignore-scripts
npm run build
npm run lint
npm test
npm pack --dry-run
```

Tests load compiled files from `dist`, so build before running a focused Vitest command. `npm run scan` checks the published npm version, not the current checkout.

## Release boundary

Do not run `npm publish` locally. A maintainer publishes a GitHub Release, and `.github/workflows/publish.yml` publishes through npm trusted publishing with provenance.
