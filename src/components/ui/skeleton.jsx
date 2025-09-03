import React from 'react'
import clsx from 'clsx'

export function Skeleton({ className = '' }) {
  return <div className={clsx('animate-pulse rounded-md bg-slate-200', className)} />
}

export default Skeleton