import React from 'react'
import clsx from 'clsx'

export function Card({ className = '', ...props }) {
  return <div className={clsx('rounded-xl border border-slate-200 bg-white', className)} {...props} />
}

export function CardHeader({ className = '', ...props }) {
  return <div className={clsx('p-4', className)} {...props} />
}

export function CardContent({ className = '', ...props }) {
  return <div className={clsx('p-4', className)} {...props} />
}

export function CardTitle({ className = '', ...props }) {
  return <h3 className={clsx('text-lg font-semibold', className)} {...props} />
}

export default Card