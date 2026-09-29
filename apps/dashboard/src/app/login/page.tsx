"use client";

import { useState, type FormEvent } from "react";

export default function LoginPage() {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token })
      });

      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        throw new Error(body.message ?? "Authentication failed");
      }

      const next = new URLSearchParams(window.location.search).get("next");
      window.location.assign(next?.startsWith("/") ? next : "/");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      setSubmitting(false);
    }
  }

  return (
    <section className="login-shell">
      <div className="login-card">
        <p className="eyebrow">Administrator access</p>
        <h1>SoroSLO</h1>
        <p className="lede">Enter the administrator bearer token configured for this deployment.</p>
        <form
          onSubmit={(event) => {
            void submit(event);
          }}
        >
          <label htmlFor="token">Administrator token</label>
          <input
            id="token"
            name="token"
            type="password"
            autoComplete="current-password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            required
          />
          <button type="submit" disabled={submitting}>
            {submitting ? "Authenticating…" : "Open dashboard"}
          </button>
          {error ? <p className="error-text">{error}</p> : null}
        </form>
      </div>
    </section>
  );
}
