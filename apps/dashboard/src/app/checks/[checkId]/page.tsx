export const dynamic = "force-dynamic";

import Link from "next/link";
import { ManualRunButton } from "../../../components/manual-run-button";
import { StatusPill } from "../../../components/status-pill";
import { formatDate, formatPercent, getCheck, getSlo } from "../../../lib/api";

export default async function CheckPage({ params }: { params: Promise<{ checkId: string }> }) {
  const { checkId: encodedCheckId } = await params;
  const checkId = decodeURIComponent(encodedCheckId);
  const [detail, slo] = await Promise.all([getCheck(checkId), getSlo(checkId)]);

  return (
    <>
      <section className="page-heading split-heading">
        <div>
          <Link href="/" className="back-link">
            ← Overview
          </Link>
          <p className="eyebrow">Check detail</p>
          <h1>{detail.check.name}</h1>
          <p className="lede">
            {detail.check.serviceId} · {detail.check.network} · every {detail.check.schedule}
          </p>
        </div>
        <ManualRunButton checkId={detail.check.id} />
      </section>

      <section className="metric-grid">
        <article className="metric-card">
          <span>Operational state</span>
          <strong className="metric-status">
            <StatusPill value={detail.check.operationalState} />
          </strong>
        </article>
        <article className="metric-card">
          <span>Last run</span>
          <strong className="metric-status">
            <StatusPill value={detail.check.lastRunState} />
          </strong>
        </article>
        <article className="metric-card">
          <span>Observed SLI</span>
          <strong>{formatPercent(slo?.observedSli ?? null)}</strong>
        </article>
        <article className="metric-card">
          <span>SLO status</span>
          <strong className="metric-status">
            <StatusPill value={slo?.status ?? "not configured"} />
          </strong>
        </article>
      </section>

      {slo ? (
        <section className="section-block">
          <div className="section-title">
            <div>
              <p className="eyebrow">Reliability objective</p>
              <h2>Rolling SLO window</h2>
            </div>
            <StatusPill value={slo.status} />
          </div>
          <div className="detail-grid">
            <div>
              <span>Target</span>
              <strong>{slo.target.toFixed(2)}%</strong>
            </div>
            <div>
              <span>Eligible runs</span>
              <strong>{slo.eligibleRuns}</strong>
            </div>
            <div>
              <span>Passing runs</span>
              <strong>{slo.passingRuns}</strong>
            </div>
            <div>
              <span>Service failures</span>
              <strong>{slo.serviceFailures}</strong>
            </div>
            <div>
              <span>Observer errors</span>
              <strong>{slo.observerErrors}</strong>
            </div>
            <div>
              <span>Data coverage</span>
              <strong>{formatPercent(slo.dataCoverage)}</strong>
            </div>
            <div>
              <span>Error budget used</span>
              <strong>
                {slo.errorBudgetConsumptionRatio === null
                  ? "—"
                  : `${(slo.errorBudgetConsumptionRatio * 100).toFixed(1)}%`}
              </strong>
            </div>
            <div>
              <span>Window</span>
              <strong>
                {formatDate(slo.windowStart)} → {formatDate(slo.windowEnd)}
              </strong>
            </div>
          </div>
        </section>
      ) : null}

      <section className="section-block">
        <div className="section-title">
          <div>
            <p className="eyebrow">Evidence</p>
            <h2>Recent runs</h2>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>State</th>
                <th>Finished</th>
                <th>Ledger</th>
                <th>RPC fingerprint</th>
                <th>Run</th>
              </tr>
            </thead>
            <tbody>
              {detail.recentRuns.map((run) => (
                <tr key={run.id}>
                  <td>
                    <StatusPill value={run.state} />
                  </td>
                  <td>{formatDate(run.finishedAt)}</td>
                  <td>{run.observedLedger ?? "—"}</td>
                  <td>
                    <code>{run.rpcEndpointFingerprint ?? "—"}</code>
                  </td>
                  <td>
                    <Link className="table-link" href={`/runs/${encodeURIComponent(run.id)}`}>
                      Inspect
                    </Link>
                  </td>
                </tr>
              ))}
              {detail.recentRuns.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty">
                    No run evidence yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section-block">
        <div className="section-title">
          <div>
            <p className="eyebrow">History</p>
            <h2>Incidents</h2>
          </div>
        </div>
        <div className="card-list">
          {detail.incidents.map((incident) => (
            <article className="incident-card" key={incident.id}>
              <div>
                <StatusPill value={incident.state} />
                <h3>{incident.summary}</h3>
                <p>Opened {formatDate(incident.openedAt)}</p>
              </div>
              <div className="incident-meta">
                <span>Recovered {formatDate(incident.recoveredAt)}</span>
                <Link href={`/runs/${encodeURIComponent(incident.openingRunId)}`}>Opening run</Link>
              </div>
            </article>
          ))}
          {detail.incidents.length === 0 ? (
            <div className="empty-card">No incidents for this check.</div>
          ) : null}
        </div>
      </section>
    </>
  );
}
