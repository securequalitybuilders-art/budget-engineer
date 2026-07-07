import { MessageSquare, FileText, PenTool, Activity, FileImage, DollarSign, type LucideIcon } from 'lucide-react'

export interface WorkflowStage {
  id: number
  label: string
  shortLabel: string
  description: string
  icon: LucideIcon
}

export const STAGES: WorkflowStage[] = [
  { id: 1, label: 'Brief', shortLabel: 'Brief', description: 'Describe your project in plain English. No CAD skills needed.', icon: MessageSquare },
  { id: 2, label: 'Concept', shortLabel: 'Concept', description: 'Review and compare AI-generated design options.', icon: FileText },
  { id: 3, label: 'Design', shortLabel: 'Design', description: 'View and edit 2D floor plans and 3D model.', icon: PenTool },
  { id: 4, label: 'Engineering', shortLabel: 'Engineering', description: 'Run compliance checks, structural analysis, and more.', icon: Activity },
  { id: 5, label: 'Docs & BIM', shortLabel: 'Docs & BIM', description: 'Generate drawings, elevations, and BIM exports.', icon: FileImage },
  { id: 6, label: 'Cost & Deliver', shortLabel: 'Cost & Deliver', description: 'View BOQ and export reports.', icon: DollarSign },
]
