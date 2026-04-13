import type { ReactNode } from 'react';

export function Label({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <div
      className="text-[10px] font-bold tracking-widest uppercase mb-1.5"
      style={{ color: color || '#6A6478' }}
    >
      {children}
    </div>
  );
}

export function StepLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-[10px] font-bold tracking-[.1em] text-bronze mb-3">
      {children}
    </div>
  );
}
