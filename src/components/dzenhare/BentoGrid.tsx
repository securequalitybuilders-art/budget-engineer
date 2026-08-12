import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { usePrefersReducedMotion } from './motion';

export interface BentoItem {
  id: string;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  /** Tailwind grid classes e.g. `md:col-span-2` */
  className?: string;
  content: React.ReactNode;
}

/**
 * Asymmetric bento grid with 50ms staggered scroll reveal (Framer Motion),
 * hover lift + accent border. The first item is typically `md:col-span-2`.
 */
export function BentoGrid({ items, className }: { items: BentoItem[]; className?: string }) {
  const reduce = usePrefersReducedMotion();
  return (
    <div className={cn('grid grid-cols-1 gap-4 md:grid-cols-3', className)}>
      {items.map((item, i) => (
        <motion.div
          key={item.id}
          initial={reduce ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.3, ease: 'easeOut', delay: i * 0.05 }}
          className={cn(
            'group flex flex-col rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-5 shadow-card',
            'transition-all duration-200 hover:-translate-y-0.5 hover:border-gold/40 hover:shadow-gold',
            item.className,
          )}
        >
          {item.icon && (
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-forest/10 text-forest dark:bg-forest/30 dark:text-gold">
              {item.icon}
            </div>
          )}
          <h3 className="text-[15px] font-bold text-[var(--text-primary)]">{item.title}</h3>
          {item.subtitle && (
            <p className="mt-0.5 text-[13px] text-[var(--text-secondary)]">{item.subtitle}</p>
          )}
          <div className="mt-3 flex-1 text-[13px] leading-relaxed text-[var(--text-secondary)]">
            {item.content}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
