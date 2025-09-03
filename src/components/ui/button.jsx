import React from 'react'
import clsx from 'clsx'

const variants = {
  default: 'bg-slate-800 text-white hover:bg-slate-900',
  outline: 'border border-slate-300 text-slate-700 hover:bg-slate-50',
  ghost: 'text-slate-700 hover:bg-slate-100',
}

const sizes = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4',
  lg: 'h-11 px-6 text-lg',
  icon: 'h-9 w-9 p-0 justify-center',
}

export function Button({ variant = 'default', size = 'md', className = '', ...props }) {
  return (
    <button
      className={clsx(
        'inline-flex items-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none',
        variants[variant] || variants.default,
        sizes[size] || sizes.md,
        className
      )}
      {...props}
    />
  )
}

export default Button