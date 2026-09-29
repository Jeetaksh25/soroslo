interface StatusPillProps {
  value: string | null;
}

export function StatusPill({ value }: StatusPillProps) {
  const label = value ?? "unknown";
  const tone =
    label === "pass" || label === "healthy" || label === "met" || label === "recovered"
      ? "good"
      : label === "service_fail" || label === "incident_open" || label === "breached" || label === "open"
        ? "bad"
        : "warn";

  return <span className={`status status-${tone}`}>{label.replaceAll("_", " ")}</span>;
}
