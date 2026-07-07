import { FileText, LayoutGrid, Boxes, Activity, Calculator, MessageSquare, type LucideIcon } from 'lucide-react'

export interface JourneyStep {
  id: number
  label: string
  description: string
  icon: LucideIcon
}

export const JOURNEY_STEPS: JourneyStep[] = [
  { id: 1, label: 'Describe your project', description: 'Write a plain-English brief in the AI panel. No CAD skills needed.', icon: MessageSquare },
  { id: 2, label: 'Review design options', description: 'The AI generates up to 3 options. Pick one to explore.', icon: FileText },
  { id: 3, label: 'View 2D floor plan', description: 'See your design as a CAD drawing. Pan, zoom, and inspect.', icon: LayoutGrid },
  { id: 4, label: 'View 3D BIM model', description: 'Switch to the 3D viewer for a realistic preview of your building.', icon: Boxes },
  { id: 5, label: 'Run engineering checks', description: 'Check clashes, solar orientation, and MEP estimates.', icon: Activity },
  { id: 6, label: 'Get BOQ & export', description: 'See your cost breakdown and export CSV or a PDF report.', icon: Calculator },
]
