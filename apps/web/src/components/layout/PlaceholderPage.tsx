import Link from "next/link";

import { PageHeader } from "./PageHeader";
import { Container } from "./Container";

/** Honest interim page for routes whose product surface arrives in a later phase. */
export function PlaceholderPage({
  eyebrow,
  title,
  phase,
  description,
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly phase: string;
  readonly description: string;
}) {
  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} />
      <Container className="py-14">
        <p className="max-w-2xl text-base leading-7 text-fg-secondary">{description}</p>
        <p className="mt-4 font-mono text-xs uppercase tracking-[0.18em] text-fg-muted">{phase}</p>
        <p className="mt-8 text-sm text-fg-secondary">
          Return to the <Link href="/" className="text-accent underline-offset-4 hover:underline">landing page</Link>.
        </p>
      </Container>
    </>
  );
}
