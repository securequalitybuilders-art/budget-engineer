// Must be the FIRST import: installs an in-memory IndexedDB global in Node so the
// persisted RAG index survives across MCP tool calls within a process.
import 'fake-indexeddb/auto'

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import {
  boqSummary,
  escrowSummary,
  listProjects,
  loadProject,
  milestoneSummary,
  projectSummary,
  runComplianceAnalysis,
  searchCodes,
} from './domain-tools'

const server = new McpServer({
  name: 'budget-engineer-domain',
  version: '1.0.0',
})

function text(content: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(content, null, 2) }] }
}

function failure(message: string) {
  return { content: [{ type: 'text' as const, text: message }], isError: true }
}

server.registerTool(
  'list_projects',
  {
    description: 'List Budget Engineer projects available as local .beproj exports in the export directory (env BE_EXPORT_DIR, default ./exports).',
    inputSchema: {
      dir: z.string().optional().describe('Export directory override. Defaults to env BE_EXPORT_DIR or ./exports.'),
    },
  },
  async ({ dir }) => {
    const projects = listProjects(dir)
    return text({ count: projects.length, projects })
  },
)

server.registerTool(
  'get_project',
  {
    description: 'Load a single project package from a local .beproj export and return its overview + entity counts.',
    inputSchema: {
      projectId: z.string().describe('The project id (matches ProjectExportPackage.project.id).'),
      dir: z.string().optional().describe('Export directory override.'),
    },
  },
  async ({ projectId, dir }) => {
    const pkg = loadProject(projectId, dir)
    if (!pkg) return failure(`No .beproj export found for project "${projectId}". Run list_projects to see available ids.`)
    return text(projectSummary(pkg))
  },
)

server.registerTool(
  'get_milestones',
  {
    description: 'Summarise project milestones from a local export: totals, release states, categories, planned/actual cost.',
    inputSchema: {
      projectId: z.string().describe('The project id.'),
      dir: z.string().optional().describe('Export directory override.'),
    },
  },
  async ({ projectId, dir }) => {
    const pkg = loadProject(projectId, dir)
    if (!pkg) return failure(`No .beproj export found for project "${projectId}".`)
    return text(milestoneSummary(pkg))
  },
)

server.registerTool(
  'get_escrow',
  {
    description: 'Summarise escrow agreements + escrow milestones from a local export: statuses, held/released amounts.',
    inputSchema: {
      projectId: z.string().describe('The project id.'),
      dir: z.string().optional().describe('Export directory override.'),
    },
  },
  async ({ projectId, dir }) => {
    const pkg = loadProject(projectId, dir)
    if (!pkg) return failure(`No .beproj export found for project "${projectId}".`)
    return text(escrowSummary(pkg))
  },
)

server.registerTool(
  'get_boq',
  {
    description: 'Summarise bill-of-quantities from a local export: line items per category, line totals, summary totals.',
    inputSchema: {
      projectId: z.string().describe('The project id.'),
      dir: z.string().optional().describe('Export directory override.'),
    },
  },
  async ({ projectId, dir }) => {
    const pkg = loadProject(projectId, dir)
    if (!pkg) return failure(`No .beproj export found for project "${projectId}".`)
    return text(boqSummary(pkg))
  },
)

server.registerTool(
  'search_codes',
  {
    description: 'Semantic + keyword hybrid search over the built-in Zimbabwe Model Building By-Laws 1977 corpus. Returns code sections with scores.',
    inputSchema: {
      query: z.string().describe('Natural-language or keyword query, e.g. "minimum ceiling height of a habitable room".'),
      k: z.number().int().min(1).max(20).optional().describe('Number of results. Default 5.'),
      minScore: z.number().min(0).max(1).optional().describe('Minimum hybrid score. Default 0.01.'),
    },
  },
  async ({ query, k, minScore }) => {
    const results = await searchCodes({ query, k, minScore })
    return text({ query, count: results.length, results })
  },
)

server.registerTool(
  'analyze_compliance',
  {
    description: 'Run the local-rules compliance engine against the query using the built-in by-laws corpus. Returns structured rule findings (no LLM required).',
    inputSchema: {
      query: z.string().describe('Compliance question, e.g. "what is the maximum building height on a corner stand?".'),
      jurisdiction: z.enum(['zimbabwe', 'south-africa']).optional().describe('Jurisdiction for the compliance report. Default zimbabwe.'),
    },
  },
  async ({ query, jurisdiction }) => {
    const report = await runComplianceAnalysis({ query, jurisdiction })
    return text(report)
  },
)

const transport = new StdioServerTransport()
await server.connect(transport)
