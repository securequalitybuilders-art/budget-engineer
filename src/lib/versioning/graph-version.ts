import type { BuildingGraph } from '../../domain/building'
import { uuid } from '../utils'
import { diffBuildingGraphs, formatGraphDiff, type BuildingGraphDiff } from './building-graph-diff'

export interface GraphVersionLabel {
  major: number
  minor: number
}

export interface GraphVersion {
  id: string
  projectId: string
  label: GraphVersionLabel
  name: string
  description: string
  graph: BuildingGraph
  diff: BuildingGraphDiff | null
  parentVersionId: string | null
  tags: string[]
  createdAt: string
}

export interface GraphVersionHistory {
  projectId: string
  versions: GraphVersion[]
  currentVersionId: string | null
}

export function createInitialVersion(
  graph: BuildingGraph,
  name?: string,
  description?: string,
  tags?: string[],
): GraphVersion {
  return {
    id: uuid(),
    projectId: graph.meta.projectId,
    label: { major: 1, minor: 0 },
    name: name ?? 'Initial design',
    description: description ?? '',
    graph: JSON.parse(JSON.stringify(graph)),
    diff: null,
    parentVersionId: null,
    tags: tags ?? [],
    createdAt: new Date().toISOString(),
  }
}

export function createVersionFrom(
  previous: GraphVersion,
  graph: BuildingGraph,
  name?: string,
  description?: string,
  bump: 'major' | 'minor' = 'minor',
  tags?: string[],
): GraphVersion {
  const label = { ...previous.label }
  if (bump === 'major') {
    label.major += 1
    label.minor = 0
  } else {
    label.minor += 1
  }

  const diff = diffBuildingGraphs(previous.graph, graph)

  return {
    id: uuid(),
    projectId: graph.meta.projectId,
    label,
    name: name ?? `v${label.major}.${label.minor}`,
    description: description ?? '',
    graph: JSON.parse(JSON.stringify(graph)),
    diff,
    parentVersionId: previous.id,
    tags: tags ?? [],
    createdAt: new Date().toISOString(),
  }
}

export interface VersionHistoryManager {
  history: GraphVersionHistory
  addVersion: (version: GraphVersion) => void
  getVersion: (versionId: string) => GraphVersion | undefined
  getCurrentVersion: () => GraphVersion | undefined
  setCurrentVersion: (versionId: string) => void
  getVersionsByTag: (tag: string) => GraphVersion[]
  getVersionChain: () => GraphVersion[]
  getVersionSummary: (versionId: string) => string
}

export function createVersionHistoryManager(
  projectId: string,
  initialVersions?: GraphVersion[],
): VersionHistoryManager {
  const history: GraphVersionHistory = {
    projectId,
    versions: initialVersions ?? [],
    currentVersionId: initialVersions?.[initialVersions.length - 1]?.id ?? null,
  }

  return {
    history,

    addVersion(version) {
      history.versions.push(version)
      history.currentVersionId = version.id
    },

    getVersion(versionId) {
      return history.versions.find((v) => v.id === versionId)
    },

    getCurrentVersion() {
      if (!history.currentVersionId) return undefined
      return history.versions.find((v) => v.id === history.currentVersionId)
    },

    setCurrentVersion(versionId) {
      if (history.versions.some((v) => v.id === versionId)) {
        history.currentVersionId = versionId
      }
    },

    getVersionsByTag(tag) {
      return history.versions.filter((v) => v.tags.includes(tag))
    },

    getVersionChain() {
      const sorted = [...history.versions].sort((a, b) => {
        if (a.label.major !== b.label.major) return a.label.major - b.label.major
        return a.label.minor - b.label.minor
      })
      return sorted
    },

    getVersionSummary(versionId) {
      const v = history.versions.find((x) => x.id === versionId)
      if (!v) return 'Version not found'
      let summary = `v${v.label.major}.${v.label.minor}: ${v.name}`
      if (v.description) summary += ` — ${v.description}`
      if (v.tags.length > 0) summary += ` [${v.tags.join(', ')}]`
      if (v.diff) summary += `\n${formatGraphDiff(v.diff)}`
      return summary
    },
  }
}
