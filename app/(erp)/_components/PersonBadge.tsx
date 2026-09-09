import { hueFor, initialsFor } from "../../../modules/shared/identity";

export default function PersonBadge({ name, subline }: { name: string; subline?: string }) {
  return (
    <div className="person-badge">
      <span className="person-badge-mark" style={{ background: hueFor(name) }}>{initialsFor(name)}</span>
      <div>
        <strong>{name}</strong>
        {subline && <small>{subline}</small>}
      </div>
    </div>
  );
}
