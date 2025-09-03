import React from "react";
import clsx from "clsx";

export function Progress({ value = 0, className = "" }) {
  const clamped = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className={clsx("w-full h-2 rounded-full bg-slate-200 overflow-hidden", className)}>
      <div
        className="h-full bg-blue-600 transition-all"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export default Progress;