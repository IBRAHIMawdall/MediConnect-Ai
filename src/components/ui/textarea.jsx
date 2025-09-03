import React from "react";
import clsx from "clsx";

export function Textarea({ className = "", ...props }) {
  return (
    <textarea
      className={clsx(
        "w-full rounded-lg border border-slate-300 bg-white/90 px-3 py-2 text-sm text-slate-900 placeholder-slate-400",
        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export default Textarea;