export const dynamic = "force-dynamic";

import Link from "next/link";
import { StatusPill } from "../components/status-pill";
import {
  formatDate,
  formatPercent,
  getIncidents,
  getService,
  getServices,
  getSlo
} from "../lib/api";

export default async function OverviewPage() {
  const [services, incidents] = await Promise.all([getServices(), getIncidents()]);
  const serviceDetails = await Promise.all(services.map((service) => getService(service.id)));
  const checks = serviceDetails.flatMap((item) => item.service.checks);
  const checkRows = await Promise.all(
    checks.map(async (check) => ({
      check,
      slo: await getSlo(check.id)
    }))
  );
  const activeIncidents = incidents.filter((incident) => incident.state === "open");
  const passing = checks.filter((check) => check.lastRunState === "pass").length;

  return (
    <>
      <section className="page-heading">
        <div>
          <p className="eyebrow">Operational overview</p>
          <h1>Service reliability at a glance</h1>
          <p className="lede">
            Live synthetic check state, recent evidence, and active incidents across your Soroban
            services.
          </p>
        </div>
      </section>

      <section className="metric-grid">
        <article className="metric-card">
          <span>Services</span>
          <strong>{services.length}</strong>
        </article>
        <article className="metric-card">
          <span>Checks</span>
          <strong>{checks.length}</strong>
        </article>
        <article className="metric-card">
          <span>Last run passing</span>
          <strong>
            {passing}/{checks.length}
          </strong>
        </article>
        <article className="metric-card">
          <span>Active incidents</span>
          <strong>{activeIncidents.length}</strong>
        </article>
      </section>

      <section className="section-block">
        <div className="section-title">
          <div>
            <p className="eyebrow">Checks</p>
            <h2>Current check state</h2>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Service / check</th>
                <th>Network</th>
                <th>Schedule</th>
                <th>Operational state</th>
                <th>Last run</th>
                <th>SLI / target</th>
                <th>Coverage</th>
                <th>Error budget</th>
                <th>Observed</th>
              </tr>
            </thead>
            <tbody>
              {checkRows.map(({ check, slo }) => (
                <tr key={check.id}>
                  <td>
                    <Link href={`/checks/${encodeURIComponent(check.id)}`} className="table-link">
                      {check.serviceId} / {check.name}
                    </Link>
                  </td>
                  <td>{check.network}</td>
                  <td>{check.schedule}</td>
                  <td>
                    <StatusPill value={check.operationalState} />
                  </td>
                  <td>
                    <StatusPill value={check.lastRunState} />
                  </td>
                  <td>
                    {slo ? `${formatPercent(slo.observedSli)} / ${slo.target.toFixed(2)}%` : "—"}
                  </td>
                  <td>{slo ? formatPercent(slo.dataCoverage) : "—"}</td>
                  <td>
                    {slo?.errorBudgetConsumptionRatio === null || slo === null
                      ? "—"
                      : `${(slo.errorBudgetConsumptionRatio * 100).toFixed(1)}%`}
                  </td>
                  <td>{formatDate(check.lastRunFinishedAt)}</td>
                </tr>
              ))}
              {checkRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="empty">
                    No checks have been configured yet.
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
            <p className="eyebrow">Incidents</p>
            <h2>Active incidents</h2>
          </div>
          <Link href="/incidents" className="secondary-action">
            View incident history
          </Link>
        </div>
        <div className="card-list">
          {activeIncidents.map((incident) => (
            <article className="incident-card" key={incident.id}>
              <div>
                <StatusPill value={incident.state} />
                <h3>{incident.summary}</h3>
                <p>
                  {incident.serviceName ?? incident.serviceId} ·{" "}
                  {incident.checkName ?? incident.checkId}
                </p>
              </div>
              <div className="incident-meta">
                <span>Opened {formatDate(incident.openedAt)}</span>
                <span>{incident.failureCount} failures at open</span>
                <Link href={`/incidents/${encodeURIComponent(incident.id)}`}>Incident detail</Link>
              </div>
            </article>
          ))}
          {activeIncidents.length === 0 ? (
            <div className="empty-card">No active service incidents.</div>
          ) : null}
        </div>
      </section>
    </>
  );
}
