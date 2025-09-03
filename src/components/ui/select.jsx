import React, { createContext, useContext, useMemo, useState, useEffect } from "react";
import clsx from "clsx";

const SelectContext = createContext(null);

export function Select({ value, onValueChange, defaultValue, children, className = "" }) {
  const [internal, setInternal] = useState(defaultValue || value || "");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState({}); // { value: label }

  const currentValue = value !== undefined ? value : internal;
  const setValue = (v) => {
    if (onValueChange) onValueChange(v);
    else setInternal(v);
  };

  const registerItem = (val, label) => {
    setItems((prev) => ({ ...prev, [val]: label }));
  };

  const ctx = useMemo(() => ({ value: currentValue, setValue, open, setOpen, items, registerItem }), [currentValue, open, items]);

  return (
    <SelectContext.Provider value={ctx}>
      <div className={clsx("relative inline-block min-w-[220px]", className)}>{children}</div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ className = "", children }) {
  const ctx = useContext(SelectContext);
  return (
    <button
      type="button"
      onClick={() => ctx.setOpen(!ctx.open)}
      className={clsx(
        "w-full flex items-center justify-between rounded-lg border border-slate-300 bg-white/90 px-3 py-2 text-left text-sm",
        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
        className
      )}
    >
      <div className="flex-1 truncate">{children}</div>
      <svg className="w-4 h-4 text-slate-500 ml-2" viewBox="0 0 20 20" fill="currentColor"><path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"/></svg>
    </button>
  );
}

export function SelectValue({ placeholder = "Select...", className = "" }) {
  const ctx = useContext(SelectContext);
  const label = ctx.items[ctx.value];
  return <span className={clsx("text-slate-700", className)}>{label || <span className="text-slate-400">{placeholder}</span>}</span>;
}

export function SelectContent({ className = "", children }) {
  const ctx = useContext(SelectContext);
  if (!ctx.open) return null;
  return (
    <div className={clsx("absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg", className)}>
      <div className="py-1 max-h-60 overflow-y-auto">{children}</div>
    </div>
  );
}

export function SelectItem({ value, className = "", children }) {
  const ctx = useContext(SelectContext);
  useEffect(() => {
    if (value !== undefined) ctx.registerItem(value, typeof children === 'string' ? children : String(children));
  }, [value, children]);

  const selected = ctx.value === value;
  return (
    <div
      role="option"
      aria-selected={selected}
      onClick={() => { ctx.setValue(value); ctx.setOpen(false); }}
      className={clsx(
        "px-3 py-2 text-sm cursor-pointer",
        selected ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50",
        className
      )}
    >
      {children}
    </div>
  );
}

export default Select;