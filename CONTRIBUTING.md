# Contributing

Contributions are welcome through GitHub issues and pull requests.

## Set up the repository

Use Node.js 20 or later.

```bash
git clone https://github.com/Saturation-IO/n8n-nodes-saturation.git
cd n8n-nodes-saturation
npm ci --ignore-scripts
```

The install skips dependency build scripts because `n8n-workflow` includes development-only native packages that this node does not execute. The published package has no runtime dependencies.

## Make a change

Keep each pull request focused on one behavior. The public API contract at [docs.saturation.io/openapi.yaml](https://docs.saturation.io/openapi.yaml) defines route names, request fields, response fields, and webhook events.

Preserve these integration rules:

- Production requests use `https://next-api.saturation.io/v1`.
- Personal API tokens are opaque bearer credentials. Do not parse or log them.
- The token selects one workspace. Resource paths do not include a workspace ID.
- Write operations send an idempotency key.
- Webhook signatures use the exact raw request body and a five-minute timestamp tolerance.
- The package must have no runtime dependencies for n8n verification.

## Verify the change

Run every check before opening a pull request:

```bash
npm run build
npm run lint
npm test
npm pack --dry-run
```

`npm run scan` checks the version already published to npm. It does not validate unpublished source changes.

## Release

Maintainers publish through GitHub Actions:

1. Update the version in `package.json` and `package-lock.json`.
2. Merge the verified change to `main`.
3. Publish a GitHub Release whose tag matches the package version, such as `v1.0.11`.
4. Confirm the Publish workflow and npm provenance attestation.

Do not publish from a development machine. npm trusts this repository's GitHub Actions workflow through OIDC.
