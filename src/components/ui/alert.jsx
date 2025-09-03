import React from "react";
import clsx from "clsx";

export function Alert({ variant = "default", className = "", children }) {
  const base = "w-full rounded-lg border p-4";
  const styles = variant === "destructive"
    ? "border-red-200 bg-red-50 text-red-700"
    : "border-slate-200 bg-slate-50 text-slate-700";
  return <div role="alert" className={clsx(base, styles, className)}>{children}</div>;
}

export function AlertTitle({ className = "", children }) {
  return <div className={clsx("font-semibold mb-1", className)}>{children}</div>;
}

export function AlertDescription({ className = "", children }) {
  return <div className={clsx("text-sm leading-relaxed", className)}>{children}</div>;
}

export default Alert;