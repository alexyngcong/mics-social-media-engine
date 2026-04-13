import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  accentColor?: string;
  clickable?: boolean;
}

export function Card({ children, accentColor, clickable, className = '', style, ...props }: CardProps) {
  return (
    <div
      className={`
        bg-ink-card border border-ink-border rounded-card p-4 mb-2
        transition-all duration-200
        ${clickable ? 'cursor-pointer hover:border-bronze/40 hover:bg-ink-el' : ''}
        ${className}
      `}
      style={{
        ...(accentColor ? { borderLeft: `3px solid ${accentColor}` } : {}),
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
