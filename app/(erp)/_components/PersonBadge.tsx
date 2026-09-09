const BADGE_HUES = ["#a6875a", "#5b7d6b", "#7d5b6b", "#4a6b7d", "#8a6a3a"];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

function hueFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return BADGE_HUES[hash % BADGE_HUES.length];
}

export default function PersonBadge({ name, subline }: { name: string; subline?: string }) {
  return (
    <div className="person-badge">
      <span className="person-badge-mark" style={{ background: hueFor(name) }}>{initials(name)}</span>
      <div>
        <strong>{name}</strong>
        {subline && <small>{subline}</small>}
      </div>
    </div>
  );
}
