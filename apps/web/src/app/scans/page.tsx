import { ScanBuilder } from "@/features/scans/scan-builder";

/**
 * ScansPage renders the visual condition builder for running ad-hoc scans.
 */
export default function ScansPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Custom Scan Builder
        </h1>
        <p className="max-w-2xl text-sm text-zinc-600">
          Define conditions visually and run them against the Phoenix-like
          screener engine exposed by the NestJS backend.
        </p>
      </header>
      <section>
        <ScanBuilder />
      </section>
    </main>
  );
}
