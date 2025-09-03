import React from 'react'
import clsx from 'clsx'

export function Input({ className = '', ...props }) {
  return (
    <input
      className={clsx(
        'h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500',
        className
      )}
      {...props}
    />
  )
}

export default Input