import Link from "next/link";
import { StatusPill } from "../../../components/status-pill";
import { formatDate, getRun } from "../../../lib/api";

function JsonBlock({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <span className="muted">—</span>;
  return <pre>{JSON.stringify(value, null, 2)}</pre>;
}

export default async function RunPage({
  params
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  const run = await getRun(runId);

  return (
    <>
      <section className="page-heading">
        <div>
          <Link href={`/checks/${encodeURIComponent(run.checkId)}`} className="back-link">← Check</Link>
          <p className="eyebrow">Run evidence</p>
          <h1>{run.id}</h1>
          <div className="run-heading-meta">
            <StatusPill value={run.state} />
            <span>{formatDate(run.finishedAt)}</span>
          </div>
        </div>
      </section>

      <section className="detail-grid section-block compact">
        <div><span>Config hash</span><strong><code>{run.configHash}</code></strong></div>
        <div><span>Observed ledger</span><strong>{run.observedLedger ?? "—"}</strong></div>
        <div><span>RPC fingerprint</span><strong><code>{run.rpcEndpointFingerprint ?? "—"}</code></strong></div>
        <div><span>Scheduled at</span><strong>{formatDate(run.scheduledAt)}</strong></div>
        <div><span>Started</span><strong>{formatDate(run.startedAt)}</strong></div>
        <div><span>Finished</span><strong>{formatDate(run.finishedAt)}</strong></div>
      </section>

      <section className="section-block">
        <div className="section-title">
          <div>
            <p className="eyebrow">Ordered execution</p>
            <h2>Steps & assertions</h2>
          </div>
        </div>

        <div className="step-list">
          {run.steps.map((step) => (
            <article className="step-card" key={step.id}>
              <div className="step-heading">
                <div>
                  <span className="step-number">Step {step.ordinal + 1}</span>
                  <h3>{step.stepId} · {step.functionName}</h3>
                  <code>{step.contractId}</code>
                </div>
                <StatusPill value={step.state} />
              </div>

              {step.failureMessage ? (
                <div className="failure-box">
                  <strong>{step.failureKind ?? "failure"}</strong>
                  <span>{step.failureMessage}</span>
                </div>
              ) : null}

              <div className="evidence-grid">
                <div>
                  <span className="field-label">Normalized result</span>
                  <JsonBlock value={step.result} />
                </div>
                <div>
                  <span className="field-label">Simulation evidence</span>
                  <JsonBlock value={step.evidence} />
                </div>
              </div>

              {step.assertions.length > 0 ? (
                <div className="assertion-list">
                  {step.assertions.map((assertion) => (
                    <div className="assertion-row" key={assertion.id}>
                      <StatusPill value={assertion.passed ? "pass" : "service_fail"} />
                      <code>{assertion.path}</code>
                      <span>{assertion.operator}</span>
                      <span>{assertion.reason}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
          {run.steps.length === 0 ? (
            <div className="empty-card">This run contains no completed step evidence.</div>
          ) : null}
        </div>
      </section>
    </>
  );
}
