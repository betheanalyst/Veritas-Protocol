"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { registryClient } from "@/adapters/registry-client";
import { describeError } from "@/adapters/errors";
import { RegisterModuleWizard } from "@/components/modules/RegisterModuleWizard";
import { Badge } from "@/components/primitives/Badge";
import { buttonStyles } from "@/components/primitives/Button";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/states/EmptyState";
import { ErrorState } from "@/components/states/ErrorState";
import { LoadingBlock } from "@/components/states/LoadingBlock";
import { useWallet } from "@/wallet/WalletProvider";
import { KNOWN_MODULE_LABELS } from "@/config/known-modules";

export default function MyModulesPage() {
  const wallet = useWallet();
  const query = useQuery({
    queryKey: ["registry", "my-modules", wallet.address],
    queryFn: async () => {
      const ids = await registryClient.getOwnerModuleIds(wallet.address as string, 0, 50);
      const modules = [];
      for (const id of ids) {
        try {
          modules.push(await registryClient.getModule(id));
        } catch {
          // skip deleted/unknown
        }
      }
      return modules;
    },
    enabled: Boolean(wallet.address),
  });

  return (
    <>
      <PageHeader
        eyebrow="My modules"
        title="My modules"
        description="Modules registered by your connected wallet, with their live policies and versioning."
        actions={<RegisterModuleWizard />}
      />
      <Container className="py-12">
        {!wallet.isConnected ? (
          <EmptyState
            title="Connect your wallet"
            message="Your modules are scoped to the address that registered them."
          />
        ) : query.isPending ? (
          <LoadingBlock label="Loading your modules\u2026" />
        ) : query.isError ? (
          <ErrorState
            title="We could not load your modules"
            message={describeError(query.error).whatHappened}
            code={describeError(query.error).code}
            onRetry={() => query.refetch()}
          />
        ) : (query.data ?? []).length === 0 ? (
          <EmptyState
            title="No modules registered yet"
            message="Modules you register with this wallet appear here, with their editor and version history."
          />
        ) : (
          <ol className="space-y-px overflow-hidden rounded-lg border border-hairline">
            {(query.data ?? []).map((mod) => (
              <li key={mod.moduleId} className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-bg-surface px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="break-all font-mono text-sm text-fg">
                      {KNOWN_MODULE_LABELS[mod.moduleId as keyof typeof KNOWN_MODULE_LABELS] ?? mod.moduleId}
                    </span>
                    <Badge tone="neutral">v{mod.version}</Badge>
                    {mod.requireInlineContent ? <Badge tone="info">inline required</Badge> : null}
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-xs text-fg-muted">{mod.description}</p>
                </div>
                <Link
                  href={`/my/modules/${encodeURIComponent(mod.moduleId)}/edit`}
                  className={buttonStyles({ variant: "secondary", size: "sm" })}
                >
                  Edit
                </Link>
              </li>
            ))}
          </ol>
        )}
        <p className="mt-6 text-xs leading-5 text-fg-muted">
          Owner-scoped listing (bounded reads). There is no global module enumeration in the protocol.
        </p>
      </Container>
    </>
  );
}
