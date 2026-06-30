import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand-accent)] focus:ring-offset-2 focus:ring-offset-[var(--bg-primary)]',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-[var(--brand-accent)] text-[var(--brand-primary-dark)]',
        brand:
          'border-transparent bg-[var(--brand-primary)] text-white',
        secondary:
          'border-transparent bg-[var(--bg-tertiary)] text-[var(--text-secondary)]',
        outline: 'border-[var(--border-default)] text-[var(--text-secondary)]',
        success: 'border-transparent bg-emerald-500/10 text-emerald-400',
        warning: 'border-transparent bg-amber-500/10 text-amber-400',
        danger: 'border-transparent bg-red-500/10 text-red-400',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
