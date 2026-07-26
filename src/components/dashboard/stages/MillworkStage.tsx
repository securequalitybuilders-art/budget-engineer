import { LayoutPanelTop } from 'lucide-react'
import { motion } from 'framer-motion'

export function MillworkStage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center text-center"
      >
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] shadow-lg">
          <LayoutPanelTop size={40} className="text-[var(--brand-accent)]" />
        </div>
        <h2 className="font-display text-2xl font-bold text-[var(--text-primary)]">Primary Millwork &amp; Fixtures</h2>
        <p className="mt-2 max-w-md text-sm text-[var(--text-secondary)]">
          Base and wall cabinet installation, sink fitting, backsplash.
        </p>
      </motion.div>
    </div>
  )
}
