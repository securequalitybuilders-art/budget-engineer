import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useProjectStore } from '@/stores/projectStore';
import { useUIStore } from '@/stores/uiStore';
import { BentoShell } from '@/components/layout/BentoShell';
import { Sidebar } from '@/components/layout/Sidebar';
import { PropertiesPanel } from '@/components/layout/PropertiesPanel';
import { BOQPanel } from '@/components/layout/BOQPanel';
import { TransactionPanel } from '@/components/layout/TransactionPanel';
import { AIChatPanel } from '@/components/layout/AIChatPanel';
import { Button } from '@/components/ui/Button';
import { Layers, Box, Ruler, FileSpreadsheet, Wand2, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export function Dashboard() {
  const { id } = useParams<{ id: string }>();
  const { loadProject, currentProject, currentBrief, currentDesigns, isLoading, generateDesigns, seed } = useProjectStore();
  const { setActiveStage } = useUIStore();
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    seed();
    if (id) {
      loadProject(id);
    }
  }, [id, loadProject, seed]);

  useEffect(() => {
    if (currentProject) {
      const stageMap: Record<typeof currentProject.status, number> = {
        draft: 1,
        concept: 2,
        design: 3,
        engineering: 4,
        costing: 5,
        tender: 6,
      };
      setActiveStage(stageMap[currentProject.status] || 1);
    }
  }, [currentProject, setActiveStage]);

  const handleGenerate = async () => {
    if (!id) return;
    setIsGenerating(true);
    try {
      await generateDesigns(id);
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading || !currentProject) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-[var(--border-default)] border-t-[var(--brand-accent)]" />
      </div>
    );
  }

  return (
    <BentoShell>
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex flex-1 overflow-hidden">
          {/* Main canvas area */}
          <div className="relative flex flex-1 flex-col overflow-hidden bg-[var(--bg-primary)]">
            {/* Toolbar */}
            <div className="absolute left-4 top-4 z-10 flex items-center gap-1 rounded-full glass px-2 py-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-[var(--brand-accent)]" aria-label="Select">
                <Box size={16} />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" aria-label="Wall tool">
                <Layers size={16} />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" aria-label="Measure">
                <Ruler size={16} />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" aria-label="AI design">
                <Wand2 size={16} />
              </Button>
            </div>

            {/* Canvas placeholder */}
            <div className="flex flex-1 flex-col items-center justify-center p-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center text-center"
              >
                <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] shadow-lg">
                  <Box size={40} className="text-[var(--brand-accent)]" />
                </div>
                <h2 className="font-display text-2xl font-bold">2D CAD / 3D BIM Canvas</h2>
                <p className="mt-2 max-w-md text-sm text-[var(--text-secondary)]">
                  This is the design workspace. In the next sprint we will wire the 2D CAD canvas (Design-Core + Maker.js) and the 3D BIM viewer (Three.js + xeokit).
                </p>
                <div className="mt-6 flex flex-col items-center gap-3">
                  <Button className="gap-2" onClick={handleGenerate} disabled={isGenerating || !currentBrief}>
                    {isGenerating ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Wand2 size={16} />
                    )}
                    {isGenerating ? 'Generating designs...' : currentDesigns.length > 0 ? 'Regenerate Design Options' : 'Generate Design Options'}
                  </Button>
                  {currentDesigns.length > 0 && (
                    <p className="text-xs text-[var(--text-muted)]">
                      {currentDesigns.length} design options generated from the brief.
                    </p>
                  )}
                  <Button variant="secondary" className="gap-2">
                    <FileSpreadsheet size={16} />
                    Import DXF
                  </Button>
                </div>
              </motion.div>
            </div>

            {/* BOQ toggle when closed */}
            <BOQPanel />
          </div>

          {/* Right sidebar */}
          <div className="flex flex-shrink-0">
            <PropertiesPanel />
            <TransactionPanel />
          </div>
        </div>
      </div>

      <AIChatPanel />
    </BentoShell>
  );
}
