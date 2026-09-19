"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/primitives/Button";
import { ConfigurationError } from "@/config/env";

/**
 * Honest configuration-incomplete state — rendered instead of any fabricated
 * fallback when required environment configuration is missing.
 */
export function ConfigErrorState({ error }: { readonly error: ConfigurationError }) {
  const [isProduction, setIsProduction] = useState(false);
  useEffect(() => {
    setIsProduction(process.env.NODE_ENV === "production");
  }, []);

  return (
    <div role="alert" className="mx-auto max-w-2xl px-4 py-24">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-warning">Configuration incomplete</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-fg">Veritas is not configured yet</h1>
      <p className="mt-3 text-sm leading-6 text-fg-secondary">{error.message}</p>
      <p className="mt-3 text-xs leading-5 text-fg-muted">
        The application never fabricates network or contract configuration. Operators: set the variables
        above in the deployment environment (local: <code className="font-mono">apps/web/.env.local</code>, see
        <code className="ml-1 font-mono">apps/web/.env.example</code>).
      </p>
      <div className="mt-6">
        <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
          Reload after configuring
        </Button>
      </div>
      {isProduction ? null : (
        <p className="mt-6 break-all font-mono text-[11px] text-fg-muted">{error.stack}</p>
      )}
    </div>
  );
}
