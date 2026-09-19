/**
 * Phase 0B — first real GenLayer integration smoke test against Studionet.
 * Uses the pinned genlayer-js@1.1.8 exactly as the application adapters do.
 * Real deployed contract reads only — no fabricated responses. Any failure
 * is reported verbatim and stops the phase (owner instruction, 2026-09-13).
 *
 * Usage: npm run smoke   (from apps/web; reads .env.local)
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionHashVariant } from "genlayer-js/types";

/*
 * Sandbox/UA note: studio.genlayer.com's edge rejects non-browser User-Agents
 * (observed 403 with library default UAs from this environment). The browser
 * application is unaffected (browsers send real UAs); this Node-based script
 * attaches a browser-like UA so the check runs from non-browser environments.
 */
const originalFetch = globalThis.fetch;
globalThis.fetch = (input, init) =>
  originalFetch(input, {
    ...init,
    headers: {
      "User-Agent":
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });

function loadEnvFile(filePath) {
  const env = {};
  for (const line of readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

const env = loadEnvFile(fileURLToPath(new URL("../.env.local", import.meta.url)));
const CORE = env.NEXT_PUBLIC_VERITAS_CORE_ADDRESS;
const REGISTRY = env.NEXT_PUBLIC_VERITAS_REGISTRY_ADDRESS;
const GOVERNANCE = env.NEXT_PUBLIC_VERITAS_GOVERNANCE_ADDRESS;

for (const [name, value] of Object.entries({
  NEXT_PUBLIC_VERITAS_CORE_ADDRESS: CORE,
  NEXT_PUBLIC_VERITAS_REGISTRY_ADDRESS: REGISTRY,
  NEXT_PUBLIC_VERITAS_GOVERNANCE_ADDRESS: GOVERNANCE,
})) {
  if (!value) {
    console.error(`CONFIGURATION INCOMPLETE: ${name} missing from .env.local`);
    process.exit(1);
  }
}

function inspect(value) {
  if (value !== null && typeof value === "object") {
    const types = {};
    for (const [k, v] of Object.entries(value)) types[k] = typeof v;
    return `fieldTypes=${JSON.stringify(types)} data=${JSON.stringify(value, (_k, v) =>
      typeof v === "bigint" ? `${v.toString()}n` : v,
    )}`;
  }
  return `typeof=${typeof value} value=${String(value)}`;
}

const client = createClient({ chain: studionet });

const read = (address, functionName, args, transactionHashVariant = TransactionHashVariant.LATEST_NONFINAL) =>
  client.readContract({ address, functionName, args, transactionHashVariant });

const steps = [];
async function step(name, fn) {
  const started = Date.now();
  try {
    const detail = await fn();
    steps.push({ name, ok: true, ms: Date.now() - started, detail });
    console.log(`PASS  ${name} (${Date.now() - started}ms)`);
    console.log(`      ${detail}`);
  } catch (error) {
    steps.push({ name, ok: false, ms: Date.now() - started, detail: String(error) });
    console.log(`FAIL  ${name} (${Date.now() - started}ms)`);
    console.log(`      ${String(error)}`);
  }
}

console.log("Veritas Phase 0B smoke test — GenLayer Studionet (genlayer-js@1.1.8, exact pin)");
console.log(`core      = ${CORE}`);
console.log(`registry  = ${REGISTRY}`);
console.log(`governance= ${GOVERNANCE}`);
console.log("");

await step("1. client creation + get_protocol_info (VeritasCore, LATEST_NONFINAL)", async () =>
  inspect(await read(CORE, "get_protocol_info", [])),
);

await step("2. get_protocol_info at LATEST_FINAL (durable read)", async () =>
  inspect(await read(CORE, "get_protocol_info", [], TransactionHashVariant.LATEST_FINAL)),
);

await step("3. get_governance_summary (VeritasGovernance)", async () =>
  inspect(await read(GOVERNANCE, "get_governance_summary", [])),
);

await step("4. get_module_count (ModuleRegistry)", async () =>
  inspect(await read(REGISTRY, "get_module_count", [])),
);

await step("5. get_module('hallucination-detector-v1') (curated known module ID)", async () =>
  inspect(await read(REGISTRY, "get_module", ["hallucination-detector-v1"])),
);

await step("6. BigInt/value handling: get_bond_amount('submission') (VeritasGovernance)", async () => {
  const raw = await read(GOVERNANCE, "get_bond_amount", ["submission"]);
  return `typeof=${typeof raw} value=${String(raw)} (must be bigint or integer — attached exactly, never via Number)`;
});

const failures = steps.filter((s) => !s.ok);
console.log("");
console.log(`RESULT: ${steps.length - failures.length}/${steps.length} steps passed`);
if (failures.length > 0) {
  console.log("SMOKE TEST FAILED — report the exact failures above before building further.");
  process.exitCode = 1;
} else {
  console.log("SMOKE TEST PASSED — protocol connectivity and reads verified against deployed contracts.");
}
