import React, { createContext, useContext, useMemo, useState } from "react";
import clsx from "clsx";

const TabsContext = createContext(null);

export function Tabs({ value, onValueChange, defaultValue, className = "", children }) {
  const [internal, setInternal] = useState(defaultValue || value || "");
  const currentValue = value !== undefined ? value : internal;
  const setValue = onValueChange || setInternal;

  const ctx = useMemo(() => ({ value: currentValue, setValue }), [currentValue, setValue]);

  return (
    <TabsContext.Provider value={ctx}>
      <div className={clsx("w-full", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className = "", children }) {
  return (
    <div className={clsx("inline-flex items-center gap-2 rounded-lg bg-slate-100 p-1", className)}>
      {children}
    </div>
  );
}

export function TabsTrigger({ value, className = "", children }) {
  const ctx = useContext(TabsContext);
  const active = ctx?.value === value;
  return (
    <button
      type="button"
      aria-selected={active}
      data-state={active ? "active" : "inactive"}
      onClick={() => ctx?.setValue(value)}
      className={clsx(
        "px-3 py-2 text-sm font-medium rounded-md transition-colors",
        active ? "bg-white text-slate-900 shadow" : "text-slate-600 hover:text-slate-900",
        className
      )}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, className = "", children }) {
  const ctx = useContext(TabsContext);
  const active = ctx?.value === value;
  return (
    <div hidden={!active} className={clsx(className)}>
      {active ? children : null}
    </div>
  );
}

export default Tabs;