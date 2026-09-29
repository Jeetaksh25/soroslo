export const dynamic = "force-dynamic";

import Link from "next/link";
import { StatusPill } from "../../components/status-pill";
import { formatDate, getIncidents } from "../../lib/api";

export default async function IncidentsPage() {
  const incidents = await getIncidents();

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Incident history</p>
          <h1>Service incidents</h1>
          <p className="lede">
            Incident state is driven only by service-failure/pass thresholds; observer errors do not open or recover incidents.
          </p>
        </div>
      </section>

      <section className="section-block">
        <div className="card-list">
          {incidents.map((incident) => (
            <article className="incident-card" key={incident.id}>
              <div>
                <StatusPill value={incident.state} />
                <h3>{incident.summary}</h3>
                <p>{incident.serviceName ?? incident.serviceId} · {incident.checkName ?? incident.checkId}</p>
              </div>
              <div className="incident-meta">
                <span>Opened {formatDate(incident.openedAt)}</span>
                <span>Recovered {formatDate(incident.recoveredAt)}</span>
                <Link href={`/runs/${encodeURIComponent(incident.openingRunId)}`}>Opening evidence</Link>
                {incident.recoveryRunId ? (
                  <Link href={`/runs/${encodeURIComponent(incident.recoveryRunId)}`}>Recovery evidence</Link>
                ) : null}
              </div>
            </article>
          ))}
          {incidents.length === 0 ? <div className="empty-card">No incidents recorded.</div> : null}
        </div>
      </section>
    </>
  );
}
