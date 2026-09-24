# Deployment Guide

## Frontend (Vercel)

### 1. Push to GitHub

```bash
cd veritas-protocol
git init
git add -A
git commit -m "Veritas Protocol — initial release"
git remote add origin https://github.com/<org>/veritas-protocol.git
git branch -M main
git push -u origin main
```

### 2. Import in Vercel

| Setting | Value |
|---|---|
| Framework preset | Next.js |
| Root directory | `apps/web` |
| Install command | `npm ci` |
| Build command | `npm run build` |
| Output directory | `.next` |

### 3. Environment Variables (Vercel Project Settings)

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_GENLAYER_NETWORK` | `studionet` |
| `NEXT_PUBLIC_VERITAS_CORE_ADDRESS` | `0x0D38aDC5e11A395B0785A8F0AF9ee012252b7763` |
| `NEXT_PUBLIC_VERITAS_REGISTRY_ADDRESS` | `0xBb087A4FA41d5a40a4f40450a0A565d3748f0080` |
| `NEXT_PUBLIC_VERITAS_GOVERNANCE_ADDRESS` | `0x1A3E7a5B67e961dD2dB6D64C5732635fc5e0Cd9D` |
| `NEXT_PUBLIC_ENABLE_FIXTURES` | `false` |

### 4. Post-Deploy Verification

- Open the production URL — the landing page renders with real protocol stats (no wallet required).
- Connect a wallet — the balance and address appear in the header.
- Look up a verification by task ID — the result page renders.
- If any value shows \u201cunavailable\u201d, check the browser console for the specific `ERR:*` code.

## Promoting to Testnet Bradbury

The application is network-agnostic. To move:
1. Set `NEXT_PUBLIC_GENLAYER_NETWORK=testnetBradbury`
2. Update the three contract addresses to the Bradbury deployments
3. Redeploy

No code changes are required (D-01).
