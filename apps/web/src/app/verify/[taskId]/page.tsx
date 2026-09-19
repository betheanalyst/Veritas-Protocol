"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { describeError } from "@/adapters/errors";
import { LoadingBlock } from "@/components/states/LoadingBlock";
import { ErrorState } from "@/components/states/ErrorState";
import { EmptyState } from "@/components/states/EmptyState";
import { VerificationObject } from "@/components/verification/VerificationObject";
import { EvaluationHistory } from "@/components/verification/EvaluationHistory";
import { IntegrityMap } from "@/components/verification/IntegrityMap";
import { ChallengePanel } from "@/components/verification/ChallengePanel";
import { TechnicalDisclosure } from "@/components/verification/TechnicalDisclosure";
import { TaskActions } from "@/components/verification/TaskActions";
import { DisputeTimeline } from "@/components/verification/DisputeTimeline";
import { useTask, useDisputeSummary, useDisputeHistory } from "@/queries/useProtocolReads";

export default function TaskResultPage() {
  const params = useParams<{ taskId: string }>();
  const taskId = decodeURIComponent(params.taskId);
  const taskQuery = useTask(taskId);
  const summaryQuery = useDisputeSummary(taskId, taskQuery.isSuccess);
  const historyQuery = useDisputeHistory(taskId, taskQuery.isSuccess);

  if (taskQuery.isPending) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <LoadingBlock label="Loading verification…" />
      </div>
    );
  }

  if (taskQuery.isError) {
    const described = describeError(taskQuery.error);
    if (described.code === "ERR:TASK_NOT_FOUND") {
      return (
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
          <EmptyState
            title="No verification with this ID"
            message={
              "The protocol has no task matching “" + taskId + "”. Task IDs look like VT-00000001-0x…"
            }
            action={
              <Link
                href="/verify"
                className="inline-flex h-10 items-center rounded-md bg-bg-surface-2 px-4 text-sm font-medium text-fg ring-1 ring-inset ring-hairline hover:ring-fg-muted"
              >
                Try another ID
              </Link>
            }
          />
        </div>
      );
    }
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <ErrorState
          title="We could not load this verification"
          message={described.whatHappened + " " + described.whatToDo}
          code={described.code}
          onRetry={() => taskQuery.refetch()}
        />
      </div>
    );
  }

  const task = taskQuery.data;

  return (
    <div className="mx-auto w-full max-w-content px-4 py-12 sm:px-6 lg:px-8">
      <VerificationObject task={task} />
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <section aria-label="Evaluation history">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-fg-muted">Evaluation history</h2>
            <EvaluationHistory entries={task.evalHistory} />
          </section>
          <section aria-label="Integrity">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-fg-muted">Integrity</h2>
            <IntegrityMap task={task} />
          </section>
          <section aria-label="Dispute timeline">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-fg-muted">Dispute timeline</h2>
            <DisputeTimeline task={task} disputes={historyQuery.data ?? []} />
          </section>
        </div>
        <div className="space-y-6">
          <TaskActions task={task} />
          <ChallengePanel task={task} summary={summaryQuery.data} />
        </div>
      </div>
      <section aria-label="Technical details" className="mt-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-fg-muted">Technical details</h2>
        <TechnicalDisclosure task={task} />
      </section>
    </div>
  );
}
