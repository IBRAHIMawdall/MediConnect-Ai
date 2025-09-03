import React, { createContext, useContext, useState } from "react";
import clsx from "clsx";

const SidebarCtx = createContext(null);

export function SidebarProvider({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <SidebarCtx.Provider value={{ open, setOpen }}>{children}</SidebarCtx.Provider>
  );
}

export function SidebarTrigger({ className = "", children, ...props }) {
  const { open, setOpen } = useContext(SidebarCtx);
  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className={clsx("rounded-md border border-slate-200 bg-white px-3 py-2 text-sm", className)}
      {...props}
    >
      {children || <span>Menu</span>}
    </button>
  );
}

export function Sidebar({ className = "", children }) {
  const { open } = useContext(SidebarCtx);
  return (
    <aside className={clsx(
      "w-72 shrink-0 bg-white/80 backdrop-blur-sm hidden md:block",
      className
    )}>
      {children}
      {/* Mobile overlay */}
      <div className={clsx(
        "fixed inset-0 z-40 md:hidden transition-opacity",
        open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      )}>
        <div className="absolute inset-0 bg-black/30" />
        <div className={clsx(
          "absolute left-0 top-0 h-full w-72 bg-white shadow-xl p-4",
          open ? "translate-x-0" : "-translate-x-full",
          "transition-transform"
        )}>
          {children}
        </div>
      </div>
    </aside>
  );
}

export function SidebarHeader({ className = "", children }) {
  return <div className={clsx("p-4", className)}>{children}</div>;
}
export function SidebarContent({ className = "", children }) {
  return <div className={clsx("p-2", className)}>{children}</div>;
}
export function SidebarGroup({ className = "", children }) {
  return <div className={clsx("mb-4", className)}>{children}</div>;
}
export function SidebarGroupLabel({ className = "", children }) {
  return <div className={clsx("px-2 text-xs text-slate-500 uppercase", className)}>{children}</div>;
}
export function SidebarGroupContent({ className = "", children }) {
  return <div className={clsx("mt-2", className)}>{children}</div>;
}
export function SidebarMenu({ className = "", children }) {
  return <ul className={clsx("space-y-1", className)}>{children}</ul>;
}
export function SidebarMenuItem({ className = "", children }) {
  return <li className={clsx(className)}>{children}</li>;
}
export function SidebarMenuButton({ className = "", asChild = false, children }) {
  const Comp = asChild ? React.Fragment : 'button';
  return (
    asChild ? children : <button className={clsx("w-full text-left", className)}>{children}</button>
  );
}

export default Sidebar;