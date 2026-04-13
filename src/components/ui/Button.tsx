import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'gold' | 'ghost' | 'green' | 'purple' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  gold: 'bg-gradient-to-br from-bronze to-bronze-light text-ink-DEFAULT hover:brightness-110',
  ghost: 'bg-transparent border border-ink-border text-tx-mid hover:border-bronze/50 hover:text-tx-DEFAULT',
  green: 'bg-signal-green text-black',
  purple: 'bg-gradient-to-br from-signal-purple to-purple-600 text-white hover:brightness-110',
  danger: 'bg-signal-red/20 text-signal-red border border-signal-red/30',
};

export function Button({ variant = 'gold', fullWidth, className = '', children, ...props }: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 px-6 py-3 rounded-card
        font-sans text-[13px] font-semibold tracking-wide
        transition-all duration-150 cursor-pointer
        disabled:opacity-40 disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}
