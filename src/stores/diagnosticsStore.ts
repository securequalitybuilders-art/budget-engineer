import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

export interface LogEntry {
  id: string
  level: 'info' | 'warn' | 'error'
  message: string
  timestamp: string
  stack?: string
}

interface DiagnosticsState {
  log: LogEntry[]
  buildVersion: string
  buildTime: string
  addLog: (level: LogEntry['level'], message: string, stack?: string) => void
  clearLog: () => void
  getExportableState: () => string
}

function makeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

const now = new Date().toISOString()

export const useDiagnosticsStore = create<DiagnosticsState>()(
  immer(
    persist(
      (set, get) => ({
        log: [],
        buildVersion: '1.2.0',
        buildTime: now,

        addLog: (level, message, stack) =>
          set((s) => {
            s.log.push({
              id: makeId(),
              level,
              message,
              timestamp: new Date().toISOString(),
              stack,
            })
            if (s.log.length > 200) s.log = s.log.slice(-200)
          }),

        clearLog: () =>
          set((s) => {
            s.log = []
          }),

        getExportableState: () => {
          const s = get()
          return JSON.stringify(
            {
              buildVersion: s.buildVersion,
              buildTime: s.buildTime,
              logCount: s.log.length,
              log: s.log.slice(-50),
              userAgent: navigator.userAgent,
              timestamp: new Date().toISOString(),
            },
            null,
            2,
          )
        },
      }),
      {
        name: 'budget-engineer-diag',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({ log: state.log.slice(-100), buildVersion: state.buildVersion, buildTime: state.buildTime }),
      },
    ),
  ),
)

const diag = useDiagnosticsStore.getState
const origOnError = window.onerror
window.onerror = (msg, source, line, col, err) => {
  diag().addLog('error', `${msg} (${source}:${line}:${col})`, err?.stack)
  origOnError?.call(window, msg, source, line, col, err)
}

const origOnUnhandled = window.onunhandledrejection
window.onunhandledrejection = (ev) => {
  diag().addLog('error', `Unhandled promise rejection: ${ev.reason}`, ev.reason?.stack)
  origOnUnhandled?.call(window, ev)
}
