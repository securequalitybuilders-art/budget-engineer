import { ShieldCheck, FileSpreadsheet, FolderOpen, ShoppingCart, BarChart3, Flag, Wallet, Scale, TrendingUp, Camera, Bot, Activity, Pen, Layers, ArrowRight } from 'lucide-react'
import type { ReactNode } from 'react'

export interface StudioLink {
  to: string
  label: string
  icon: ReactNode
  description: string
  severity?: 'info' | 'warning' | 'critical'
}

function iconForStudio(studio: string): ReactNode {
  switch (studio) {
    case 'assurance': return <ShieldCheck size={12} />
    case 'delivery': return <FileSpreadsheet size={12} />
    case 'handover': return <FolderOpen size={12} />
    case 'procurement': return <ShoppingCart size={12} />
    case 'project-controls': return <BarChart3 size={12} />
    case 'milestones': return <Flag size={12} />
    case 'closeout': return <Wallet size={12} />
    case 'wipaa': return <Scale size={12} />
    case 'market-index': return <TrendingUp size={12} />
    case 'site-photos': return <Camera size={12} />
    case 'agent': return <Bot size={12} />
    case 'telemetry': return <Activity size={12} />
    case 'plotter': return <Pen size={12} />
    case 'full-set': return <Layers size={12} />
    default: return <ArrowRight size={12} />
  }
}

export function buildStudioLink(
  projectId: string,
  studio: string,
  label: string,
  description: string,
  severity?: 'info' | 'warning' | 'critical',
): StudioLink {
  return {
    to: `/project/${projectId}/studio/${studio}`,
    label,
    icon: iconForStudio(studio),
    description,
    severity,
  }
}
