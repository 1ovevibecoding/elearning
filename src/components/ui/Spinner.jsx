import { Loader2 } from "lucide-react";

export function Spinner({ label }) {
  return (
    <span className="spinner-row">
      <Loader2 size={15} className="spin" /> {label}
    </span>
  );
}
