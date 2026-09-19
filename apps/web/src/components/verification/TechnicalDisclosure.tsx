import { Accordion } from "@/components/primitives/Accordion";
import { DataField } from "@/components/primitives/DataField";
import { formatRelativeTime } from "@/lib/format";
import { getConfig } from "@/config/network";
import type { Task } from "@/domain/types";

/** Level 3 — protocol details behind progressive disclosure. */
export function TechnicalDisclosure({ task }: { readonly task: Task }) {
  const created = new Date(task.createdTs * 1000).toISOString();
  const lastEval = task.lastEvalTs > 0 ? new Date(task.lastEvalTs * 1000).toISOString() : "—";

  return (
    <Accordion
      items={[
        {
          id: "identifiers",
          summary: "Identifiers & timestamps",
          content: (
            <div className="grid gap-4 sm:grid-cols-2">
              <DataField label="Task ID" value={task.taskId} />
              <DataField label="Contract" value={getConfig().env.contracts.core} displayValue="VeritasCore" />
              <DataField label="Created" value={created} />
              <DataField label="Last evaluated" value={lastEval} />
            </div>
          ),
        },
        {
          id: "hashes",
          summary: "Integrity hashes (full values)",
          content: (
            <div className="grid gap-4">
              <DataField label="Snapshot hash" value={task.snapshotHash} />
              <DataField label="Output hash" value={task.outputHash} />
              {task.contextHash ? <DataField label="Context hash" value={task.contextHash} /> : null}
            </div>
          ),
        },
        {
          id: "submitter",
          summary: "Submitter & evaluation trigger",
          content: (
            <div className="grid gap-4 sm:grid-cols-2">
              <DataField label="Submitter" value={task.submitter} displayValue={task.submitter} />
              <DataField
                label="History trigger (latest round)"
                value={task.evalHistory[task.evalHistory.length - 1]?.triggeredBy ?? "—"}
              />
              <DataField
                label="History timestamps"
                value={task.evalHistory.map((entry) => formatRelativeTime(entry.evalTs)).join(" | ") || "—"}
              />
            </div>
          ),
        },
      ]}
    />
  );
}
