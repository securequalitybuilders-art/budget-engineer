// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup, screen, fireEvent } from '@testing-library/react'
import { AiBriefPanel } from '@/components/ai/AiBriefPanel'
import { useAiSettingsStore } from '@/stores/aiSettingsStore'

describe('AiBriefPanel — remote LLM provider selection', () => {
  beforeEach(() => {
    useAiSettingsStore.setState({ engine: 'local-rules', apiKeys: {} })
  })
  afterEach(() => {
    cleanup()
    useAiSettingsStore.setState({ engine: 'local-rules', apiKeys: {} })
  })

  it('renders local-rules plus all 4 free-tier providers', () => {
    render(<AiBriefPanel />)
    expect(screen.getByText('Rules (instant)')).toBeTruthy()
    for (const label of ['Google Gemini', 'Groq', 'GitHub Models', 'OpenRouter']) {
      expect(screen.getByText(label)).toBeTruthy()
    }
  })

  it('defaults to local rules engine', () => {
    render(<AiBriefPanel />)
    expect(useAiSettingsStore.getState().engine).toBe('local-rules')
    expect(screen.getByText('Rules (instant)').className).toContain('bg-cyan-700')
  })

  it('shows an API key block when a remote provider is selected', () => {
    render(<AiBriefPanel />)
    fireEvent.click(screen.getByText('Google Gemini'))
    expect(useAiSettingsStore.getState().engine).toBe('gemini')
    expect(screen.getByText(/Google Gemini — free tier/)).toBeTruthy()
    expect(screen.getByText('Add API key')).toBeTruthy()
    expect(screen.getByText('Get a free key →')).toBeTruthy()
  })

  it('saves an API key to the settings store', () => {
    render(<AiBriefPanel />)
    fireEvent.click(screen.getByText('Groq'))
    fireEvent.click(screen.getByText('Add API key'))
    const input = screen.getByPlaceholderText(/Paste your Groq API key/)
    fireEvent.change(input, { target: { value: 'gsk_abc123' } })
    fireEvent.click(screen.getByText('Save key'))
    expect(useAiSettingsStore.getState().apiKeys['groq']).toBe('gsk_abc123')
    expect(screen.getByText('API key saved ✓')).toBeTruthy()
  })

  it('persists the selected engine in the store when switching', () => {
    render(<AiBriefPanel />)
    fireEvent.click(screen.getByText('OpenRouter'))
    expect(useAiSettingsStore.getState().engine).toBe('openrouter')
  })

  it('keeps WebLLM disabled (not installed)', () => {
    render(<AiBriefPanel />)
    const webllmBtn = screen.getByText(/WebLLM/)
    expect(webllmBtn).toBeTruthy()
    expect(webllmBtn).toHaveProperty('disabled', true)
  })
})
