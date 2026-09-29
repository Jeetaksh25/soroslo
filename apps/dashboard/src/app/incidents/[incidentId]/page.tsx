export const dynamic = "force-dynamic";

import Link from "next/link";
import { StatusPill } from "../../../components/status-pill";
import { formatDate, getIncident } from "../../../lib/api";

export default async function IncidentDetailPage({
  params
}: {
  params: Promise<{ incidentId: string }>;
}) {
  const { incidentId } = await params;
  const { incident, notifications } = await getIncident(incidentId);

  return (
    <>
      <section className="page-heading">
        <div>
          <Link href="/incidents" className="back-link">← Incidents</Link>
          <p className="eyebrow">Incident detail</p>
          <h1>{incident.summary}</h1>
          <div className="run-heading-meta">
            <StatusPill value={incident.state} />
            <span>{incident.checkId}</span>
          </div>
        </div>
      </section>

      <section className="detail-grid section-block compact">
        <div><span>Opened</span><strong>{formatDate(incident.openedAt)}</strong></div>
        <div><span>Recovered</span><strong>{formatDate(incident.recoveredAt)}</strong></div>
        <div><span>Failures at open</span><strong>{incident.failureCount}</strong></div>
        <div><span>Incident ID</span><strong><code>{incident.id}</code></strong></div>
      </section>

      <section className="section-block">
        <div className="section-title">
          <div>
            <p className="eyebrow">Evidence anchors</p>
            <h2>Opening and recovery runs</h2>
          </div>
        </div>
        <div className="card-list">
          <article className="incident-card">
            <div>
              <h3>Opening run</h3>
              <p>The run that crossed the configured failure threshold.</p>
            </div>
            <div className="incident-meta">
              <Link href={`/runs/${encodeURIComponent(incident.openingRunId)}`}>
                {incident.openingRunId}
              </Link>
            </div>
          </article>
          {incident.recoveryRunId ? (
            <article className="incident-card">
              <div>
                <h3>Recovery run</h3>
                <p>The run that satisfied the configured recovery threshold.</p>
              </div>
              <div className="incident-meta">
                <Link href={`/runs/${encodeURIComponent(incident.recoveryRunId)}`}>
                  {incident.recoveryRunId}
                </Link>
              </div>
            </article>
          ) : null}
        </div>
      </section>

      <section className="section-block">
        <div className="section-title">
          <div>
            <p className="eyebrow">Delivery history</p>
            <h2>Notification attempts</h2>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Channel</th>
                <th>Event</th>
                <th>Attempt</th>
                <th>State</th>
                <th>Started</th>
                <th>Response</th>
              </tr>
            </thead>
            <tbody>
              {notifications.map((attempt) => (
                <tr key={attempt.id}>
                  <td>{attempt.channelId}</td>
                  <td>{attempt.eventType}</td>
                  <td>{attempt.attempt}</td>
                  <td><StatusPill value={attempt.state} /></td>
                  <td>{formatDate(attempt.startedAt)}</td>
                  <td>{attempt.responseCode ?? attempt.errorClass ?? "—"}</td>
                </tr>
              ))}
              {notifications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty">
                    No notification attempts recorded for this incident.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
