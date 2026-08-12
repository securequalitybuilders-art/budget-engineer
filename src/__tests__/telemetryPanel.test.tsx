// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import 'fake-indexeddb/auto'
import { db } from '@/db/db'
import { telemetryEventId, telemetryClient, listTelemetryEvents } from '@/lib/observability/langfuseClient'
import { logRAG } from '@/lib/observability/telemetry'
import { TelemetryPanel } from '@/components/observability/TelemetryPanel'
import { TelemetryStudio } from '@/pages/studio/TelemetryStudio'

const PID = 'p-telemetry-panel'

async function seedEvents() {
  await db.telemetryEvents.clear()
  await telemetryClient.trace({
    id: telemetryEventId('evt'),
    type: 'hybrid-search',
    projectId: PID,
    query: 'minimum ceiling height',
    latencyMs: 12,
    payload: {},
    createdAt: '2026-08-12T10:00:00.000Z',
  })
  await logRAG({
    query: 'ventilation requirements',
    projectId: PID,
    jurisdiction: 'zimbabwe',
    engineUsed: 'local-rules',
    fellBack: true,
    fallbackReason: 'no-api-key',
    latencyMs: 45,
    confidence: 0.4,
    rerankThreshold: 0.7,
    hitCount: 1,
    needsClarification: true,
  })
  await telemetryClient.trace({
    id: telemetryEventId('evt'),
    type: 'tool-call',
    projectId: PID,
    query: 'calculate bricks',
    latencyMs: 7,
    payload: { tool: 'calculate_brick_quantity', ok: true },
    createdAt: '2026-08-12T12:00:00.000Z',
  })
}

beforeEach(async () => {
  await db.telemetryEvents.clear()
})

afterEach(() => {
  cleanup()
})

describe('TelemetryPanel', () => {
  it('shows the empty state when no events exist', async () => {
    render(<TelemetryPanel projectId={PID} />)
    expect(await screen.findByText(/No telemetry events yet/)).toBeTruthy()
    expect(screen.getByText('Events')).toBeTruthy()
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(2)
  })

  it('renders summary stats and the event feed from the db', async () => {
    await seedEvents()
    render(<TelemetryPanel projectId={PID} />)
    expect(await screen.findByText('3')).toBeTruthy()
    expect(screen.getAllByText('Hybrid search').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('RAG analysis').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Tool call').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Poor retrieval').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('“ventilation requirements”')).toBeTruthy()
    expect(screen.getByText(/engineUsed=.*local-rules/)).toBeTruthy()
  })

  it('filters to the current project only', async () => {
    await seedEvents()
    await telemetryClient.trace({
      id: telemetryEventId('evt'),
      type: 'agent-node',
      projectId: 'other-project',
      payload: { node: 'researcher' },
      createdAt: '2026-08-12T13:00:00.000Z',
    })
    render(<TelemetryPanel projectId={PID} />)
    await screen.findByText('3')
    expect(screen.queryByText('Agent node')).toBeNull()
  })

  it('Refresh reloads and Clear empties the feed', async () => {
    await seedEvents()
    render(<TelemetryPanel projectId={PID} />)
    await screen.findByText('3')
    fireEvent.click(screen.getByText('Clear'))
    await waitFor(async () => {
      expect(await listTelemetryEvents({ projectId: PID })).toHaveLength(0)
    })
    expect(await screen.findByText(/No telemetry events yet/)).toBeTruthy()
  })
})

describe('TelemetryStudio', () => {
  it('renders the studio header and panel for a project', async () => {
    await seedEvents()
    render(
      <MemoryRouter initialEntries={[`/project/${PID}/studio/telemetry`]}>
        <Routes>
          <Route path="/project/:id/studio/telemetry" element={<TelemetryStudio />} />
        </Routes>
      </MemoryRouter>
    )
    expect(await screen.findByRole('heading', { name: 'Telemetry' })).toBeTruthy()
    expect(screen.getByText(/Langfuse-style observability/)).toBeTruthy()
    expect(await screen.findByText('3')).toBeTruthy()
  })
})
