"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, buttonStyles } from "@/components/primitives/Button";
import { Input } from "@/components/primitives/Input";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";

export default function VerifyLookupPage() {
  const router = useRouter();
  const [taskId, setTaskId] = useState("");
  const [error, setError] = useState<string | null>(null);

  function lookup(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = taskId.trim();
    if (!trimmed) {
      setError("Enter a verification (task) ID to inspect it.");
      return;
    }
    router.push(`/verify/${encodeURIComponent(trimmed)}`);
  }

  return (
    <>
      <PageHeader
        eyebrow="Verification"
        title="Inspect a verification"
        description="Look up an existing verification by its task ID. The full result, evaluation history, and integrity evidence are public."
      />
      <Container className="py-14">
        <form onSubmit={lookup} className="max-w-xl" noValidate>
          <label htmlFor="task-id" className="text-xs uppercase tracking-[0.14em] text-fg-muted">
            Task ID
          </label>
          <div className="mt-2 flex gap-3">
            <Input
              id="task-id"
              name="taskId"
              value={taskId}
              onChange={(event) => {
                setTaskId(event.target.value);
                setError(null);
              }}
              placeholder="VT-00000001-0x…"
              className="font-mono"
              invalid={Boolean(error)}
              aria-describedby={error ? "task-id-error" : undefined}
            />
            <Button variant="primary" type="submit">
              Inspect
            </Button>
          </div>
          {error ? (
            <p id="task-id-error" role="alert" className="mt-2 text-sm text-danger">
              {error}
            </p>
          ) : null}
        </form>
        <p className="mt-8 text-sm">
          <Link href="/verify" className={buttonStyles({ variant: "ghost", size: "sm" })}>
            Run a new verification instead
          </Link>
        </p>
      </Container>
    </>
  );
}
