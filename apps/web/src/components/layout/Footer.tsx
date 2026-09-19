import Link from "next/link";

import { VeritasLogo } from "@/components/brand/VeritasLogo";

/** Footer — quiet, informational. */
export function Footer() {
  return (
    <footer className="mt-24 border-t border-hairline py-10">
      <div className="mx-auto flex w-full max-w-content flex-col gap-6 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div>
          <VeritasLogo />
          <p className="mt-3 max-w-md text-sm leading-6 text-fg-muted">
            Decentralized verification on GenLayer. Results are evaluated against frozen policy
            snapshots and remain inspectable and challengeable.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-fg-secondary">
          <Link href="/verify" className="hover:text-fg">Verify</Link>
          <Link href="/modules" className="hover:text-fg">Modules</Link>
          <Link href="/protocol" className="hover:text-fg">Protocol</Link>
          <a
            href="https://docs.genlayer.com"
            target="_blank"
            rel="noreferrer"
            className="hover:text-fg"
          >
            GenLayer docs
          </a>
        </nav>
      </div>
      <div className="mx-auto mt-8 w-full max-w-content px-4 sm:px-6 lg:px-8">
        <p className="text-xs text-fg-muted">
          All protocol data shown in this application is read live from the deployed Veritas contracts.
        </p>
      </div>
    </footer>
  );
}
