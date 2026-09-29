"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ManualRunButton({ checkId }: { checkId: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "running" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function run() {
    setState("running");
    setMessage("");

    try {
      const response = await fetch(`/api/manual-run/${encodeURIComponent(checkId)}`, {
        method: "POST"
      });
      const body = (await response.json()) as {
        runId?: string;
        state?: string;
        message?: string;
      };

      if (!response.ok) {
        throw new Error(body.message ?? `HTTP ${response.status}`);
      }

      setState("done");
      setMessage(`Run ${body.runId ?? ""} completed as ${body.state ?? "unknown"}.`);
      router.refresh();
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <div className="manual-run">
      <button
        type="button"
        onClick={() => {
          void run();
        }}
        disabled={state === "running"}
      >
        {state === "running" ? "Running…" : "Run check now"}
      </button>
      {message ? (
        <span className={state === "error" ? "error-text" : "muted"}>{message}</span>
      ) : null}
    </div>
  );
}
