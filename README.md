# Veritas Protocol

Decentralized verification on GenLayer.

Veritas turns computation into results that can be evaluated, inspected, and challenged: verification **modules** define policy, GenLayer AI consensus **evaluates** submitted outputs against a frozen policy snapshot, and every result is bound to integrity evidence (snapshot hash, output hash, context hash) and can be disputed within protocol rules.

## Repository layout

```text
veritas-protocol/
├── apps/
│   └── web/        Frontend application (Next.js)
└── contracts/      Veritas V2 intelligent contracts (GenLayer / GenVM, Python)
```

## Contracts

The authoritative V2 contracts live in [`contracts/`](./contracts):

| Contract | Role |
|---|---|
| `veritas_core.py` | Task lifecycle, evaluation, disputes, reputation, bonds |
| `module_registry.py` | Module identity, registration, updates, integrity snapshots |
| `veritas_governance.py` | Admin set, parameters, timelock, emergency pause |

## Frontend

The frontend lives in [`apps/web`](./apps/web). All protocol data is read live from the deployed contracts; the application never fabricates protocol data and never fakes transaction confirmation.

**Prerequisites:** Node.js 22 LTS (see `.nvmrc`) and its bundled npm.

**Setup:**

```bash
cp apps/web/.env.example apps/web/.env.local   # set network + contract addresses
npm --prefix apps/web install
npm run dev
```

**Scripts (repo root):** `dev` · `build` · `start` · `lint` · `type-check` · `test` · `smoke` (live GenLayer connectivity check).

## Status

Work in progress. Network and contract addresses are documented in `apps/web/.env.example`.

## License

TBD.
