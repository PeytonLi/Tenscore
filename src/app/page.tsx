import Link from "next/link";
import { DEMO_PROFILES } from "@/data/profiles";

const profileBlurb: Record<string, string> = {
  "power-user": "Many active connections and broad scopes across mail, fitness, home, and travel.",
  "forgotten-accounts": "Several services unused for 6–24 months still holding stale access.",
  minimalist: "Fewer connections, but one high-sensitivity location sharing problem.",
};

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-12 md:py-16" id="main-content">
      <p className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-[0.18em] text-teal uppercase">
        Tenscore
      </p>
      <h1 className="mt-4 max-w-3xl font-[family-name:var(--font-display)] text-4xl leading-tight font-semibold text-foreground md:text-5xl">
        See who has your data. Understand why. Take back control.
      </h1>
      <p className="mt-5 max-w-2xl text-lg text-muted">
        Tenscore turns invisible app permissions into an explorable map. An agent can
        inspect and stage cleanup plans; you approve every consequential change.
      </p>

      <div className="mt-6 rounded-2xl border border-border bg-surface/80 px-4 py-3 text-sm text-muted">
        Interactive simulation using fictional services and synthetic data. The score is
        an explainable heuristic, not a legal, compliance, or security assessment.
      </div>

      <section className="mt-10">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
          Choose a demo profile
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {DEMO_PROFILES.map((profile) => (
            <Link
              key={profile.id}
              href={`/workspace?profile=${profile.id}`}
              className="group rounded-2xl border border-border bg-surface p-5 transition hover:border-teal hover:bg-teal-soft/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
            >
              <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold group-hover:text-teal-deep">
                {profile.name}
              </h3>
              <p className="mt-2 text-sm text-muted">
                {profileBlurb[profile.id]}
              </p>
              <p className="mt-4 text-sm font-semibold text-teal">
                Open workspace →
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            Guided demo prompt
          </h2>
          <p className="mt-2 text-sm text-muted">
            In a WebMCP-capable browser, ask an agent:
          </p>
          <blockquote className="mt-3 rounded-xl bg-surface-2 px-4 py-3 font-[family-name:var(--font-mono)] text-sm text-foreground">
            Find stale or excessive access, trace my precise location, and prepare a
            cleanup that preserves budgeting and photo backup.
          </blockquote>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold">
            WebMCP setup
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
            <li>ChatGPT in-app browser, or</li>
            <li>Chrome 149+ with WebMCP testing enabled</li>
            <li>Open this site over HTTPS (or localhost)</li>
          </ul>
          <p className="mt-3 text-sm text-muted">
            Human-only controls work without WebMCP. The tool inspector shows live
            registration once an agent is connected.
          </p>
        </div>
      </section>
    </main>
  );
}
