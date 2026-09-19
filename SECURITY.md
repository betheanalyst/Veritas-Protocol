# Security Policy

## Reporting a Vulnerability

Please report security vulnerabilities privately via GitHub Security Advisories or direct contact with the maintainers. Do not open public issues for security-sensitive findings.

## Security Notes

- **No private keys in the application.** The frontend never handles private keys, seed phrases, or signing credentials — all signing is delegated to the connected browser wallet via EIP-1193.
- **All values read from the contract.** Bond amounts, tolerance bounds, and every displayed number are read live from the deployed Veritas contracts; nothing is hard-coded or fabricated.
- **Exact-match bonds.** Payable calls attach the precise bond amount read from governance; over- or under-payment is rejected by the contract.
- **Session-only transaction tracking.** Pending transaction hashes are stored in `sessionStorage` (cleared on tab close), never in cookies or long-term storage.
- **`NEXT_PUBLIC_*` variables are public.** Only contract addresses and the network preset are in these variables. Never place secrets in `NEXT_PUBLIC_*` — they are embedded in the client bundle.
- **No off-chain database.** All protocol state lives on GenLayer; the frontend is a pure read/write interface.

## Pre-Deploy Checklist

```bash
npm run lint && npm run type-check && npm test && npm run build
npm run smoke   # live Studionet connectivity check
```

Verify `.env.local` (or Vercel environment variables) contain the correct network preset and contract addresses before deploying.
