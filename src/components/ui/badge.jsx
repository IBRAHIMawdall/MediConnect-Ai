import React from 'react'
import clsx from 'clsx'

export function Badge({ variant = 'default', className = '', ...props }) {
  const base = 'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium'
  const styles = {
    default: 'bg-slate-100 text-slate-800',
    secondary: 'bg-slate-100 text-slate-700',
    outline: 'border border-slate-300 text-slate-700',
  }
  return <span className={clsx(base, styles[variant] || styles.default, className)} {...props} />
}

export default Badge