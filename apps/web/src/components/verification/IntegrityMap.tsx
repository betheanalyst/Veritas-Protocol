import { DataField } from "@/components/primitives/DataField";
import { shortenHex } from "@/lib/format";
import type { Task } from "@/domain/types";

/**
 * IntegrityMap — MODULE -> POLICY SNAPSHOT -> SNAPSHOT HASH -> TASK ->
 * OUTPUT/CONTEXT HASH, rendered from the task’s real frozen fields.
 */
export function IntegrityMap({ task }: { readonly task: Task }) {
  return (
    <div className="rounded-lg border border-hairline bg-bg-surface p-5">
      <div className="grid gap-5 sm:grid-cols-3">
        <DataField label="Snapshot hash" value={task.snapshotHash} displayValue={shortenHex(task.snapshotHash, 10, 6)} />
        <DataField label="Output hash" value={task.outputHash} displayValue={shortenHex(task.outputHash, 10, 6)} />
        <DataField
          label="Context hash"
          value={task.contextHash || "— not supplied"}
          displayValue={task.contextHash ? shortenHex(task.contextHash, 10, 6) : undefined}
        />
      </div>
      <p className="mt-4 text-xs leading-5 text-fg-muted">
        MODULE → POLICY SNAPSHOT → SNAPSHOT HASH → TASK → OUTPUT / CONTEXT HASH. The policy
        snapshot is frozen at submission; module updates never alter an existing verification.
      </p>
    </div>
  );
}
