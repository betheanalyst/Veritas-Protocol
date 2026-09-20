"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/primitives/Badge";
import { Input } from "@/components/primitives/Input";
import { Select } from "@/components/primitives/Select";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { LoadingBlock } from "@/components/states/LoadingBlock";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { describeError } from "@/adapters/errors";
import { useKnownModules, useOwnerModules } from "@/queries/useProtocolReads";
import { KNOWN_MODULE_LABELS } from "@/config/known-modules";
import { useWallet } from "@/wallet/WalletProvider";
import type { Module } from "@/domain/types";

function ModuleCard({ module }: { readonly module: Module }) {
  return (
    <article className="flex flex-col rounded-lg border border-hairline bg-bg-surface p-5 transition-colors hover:border-fg-muted/40">
      <div className="flex items-center justify-between gap-3">
        <Badge tone="neutral">{module.moduleType.replaceAll("_", " ")}</Badge>
        <span className="font-mono text-xs text-fg-muted">v{module.version}</span>
      </div>
      <h3 className="mt-3 text-base font-medium text-fg">
        {KNOWN_MODULE_LABELS[module.moduleId as keyof typeof KNOWN_MODULE_LABELS] ?? module.moduleId}
      </h3>
      <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-fg-secondary">{module.description}</p>
      <div className="mt-auto flex items-center justify-between gap-3 pt-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-fg-muted">
          {module.evaluationMethod.replaceAll("_", " ")}
        </span>
        <Link href={`/modules/${encodeURIComponent(module.moduleId)}`} className="text-sm font-medium text-accent underline-offset-4 hover:underline">
          Details
        </Link>
      </div>
    </article>
  );
}

export default function ModulesPage() {
  const wallet = useWallet();
  const curatedQuery = useKnownModules();
  const ownerQuery = useOwnerModules(wallet.address ?? null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const modules = useMemo(() => {
    const curated = curatedQuery.data ?? [];
    const owned = ownerQuery.data ?? [];
    const seen = new Set(curated.map((m) => m.moduleId));
    return [...curated, ...owned.filter((m) => !seen.has(m.moduleId))];
  }, [curatedQuery.data, ownerQuery.data]);
  const types = useMemo(() => [...new Set(modules.map((module) => module.moduleType))].sort(), [modules]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return modules.filter((module) => {
      const matchesType = !typeFilter || module.moduleType === typeFilter;
      const matchesSearch =
        !needle ||
        module.moduleId.toLowerCase().includes(needle) ||
        module.description.toLowerCase().includes(needle) ||
        module.moduleType.toLowerCase().includes(needle);
      return matchesType && matchesSearch;
    });
  }, [modules, search, typeFilter]);

  return (
    <>
      <PageHeader
        eyebrow="Modules"
        title="Verification modules"
        description="Each module is a registered evaluation policy: what it checks, which thresholds apply, and how disputes are handled."
        actions={
          wallet.isConnected ? (
            <Link
              href="/my/modules"
              className="inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-medium text-[#171307] transition-colors hover:bg-accent-strong"
            >
              Register a module
            </Link>
          ) : null
        }
      />
      <Container className="py-12">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[16rem] flex-1">
            <label htmlFor="module-search" className="text-xs uppercase tracking-[0.14em] text-fg-muted">
              Search
            </label>
            <Input
              id="module-search"              className="mt-2"
              placeholder="Search by name, type, or description"              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="w-56">
            <label htmlFor="module-type" className="text-xs uppercase tracking-[0.14em] text-fg-muted">
              Type
            </label>
            <Select id="module-type" className="mt-2" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              <option value="">All types</option>
              {types.map((type) => (
                <option key={type} value={type}>
                  {type.replaceAll("_", " ")}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {curatedQuery.isPending ? <LoadingBlock className="mt-10" label="Loading modules…" /> : null}

        {curatedQuery.isError ? (
          <div className="mt-10">
            <ErrorState
              title="We could not load the modules"
              message={describeError(curatedQuery.error).whatHappened}
              code={describeError(curatedQuery.error).code}
              onRetry={() => curatedQuery.refetch()}
            />
          </div>
        ) : null}

        {curatedQuery.isSuccess ? (
          filtered.length > 0 ? (
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((module) => (
                <ModuleCard key={module.moduleId} module={module} />
              ))}
            </div>
          ) : (
            <div className="mt-10">
              <EmptyState
                title="No modules match"
                message="Adjust the search or type filter to see the known modules."
              />
            </div>
          )
        ) : null}

        <p className="mt-8 text-xs leading-5 text-fg-muted">
          Showing {filtered.length} of {modules.length} known modules. This is the curated set of
          modules known to this application — not a global registry; the protocol does not expose a
          global module enumeration.
        </p>
      </Container>
    </>
  );
}
