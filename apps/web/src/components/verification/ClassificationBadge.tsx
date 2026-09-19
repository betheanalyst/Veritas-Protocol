import { Badge, type BadgeTone } from "@/components/primitives/Badge";
import type { Classification } from "@/domain/types";

const TONES: Record<Classification, BadgeTone> = {
  VALID: "success",
  BORDERLINE: "warning",
  INVALID: "danger",
  UNCERTAIN: "info",
};

export function ClassificationBadge({ classification }: { readonly classification: Classification }) {
  return <Badge tone={TONES[classification]}>{classification}</Badge>;
}
