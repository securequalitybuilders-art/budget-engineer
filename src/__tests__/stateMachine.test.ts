import { describe, it, expect, vi } from 'vitest'
import { createStateMachine, type NodeDefinition } from '@/engine/agents/stateMachine'

interface TestState {
  count: number
  log: string[]
}

const init = (count = 0): TestState => ({ count, log: [] })

const plain = (name: string): NodeDefinition<TestState, void> => ({
  name,
  run: async (state) => ({
    state: { count: state.count + 1, log: [...state.log, name] },
  }),
})

describe('createStateMachine', () => {
  it('runs a linear chain following fixed edges', async () => {
    const machine = createStateMachine<TestState, void>({
      nodes: { a: plain('a'), b: plain('b') },
      start: 'a',
      end: 'z',
      edges: { a: 'b', b: 'z' },
    })
    const res = await machine.run(init(), undefined)
    expect(res.interrupted).toBe(false)
    expect(res.steps).toBe(2)
    expect(res.state.log).toEqual(['a', 'b'])
  })

  it('honours an explicit next over fixed edges', async () => {
    const a: NodeDefinition<TestState, void> = {
      name: 'a',
      run: async (state) => ({
        state: { count: state.count + 1, log: [...state.log, 'a'] },
        next: 'b',
      }),
    }
    const machine = createStateMachine<TestState, void>({
      nodes: { a, b: plain('b'), c: plain('c') },
      start: 'a',
      end: 'z',
      edges: { a: 'c', b: 'c', c: 'z' },
    })
    const res = await machine.run(init(), undefined)
    expect(res.state.log).toEqual(['a', 'b', 'c'])
  })

  it('routes via conditionalEdges based on the outcome state', async () => {
    const setCount = (name: string, count: number): NodeDefinition<TestState, void> => ({
      name,
      run: async (state) => ({
        state: { count, log: [...state.log, name] },
      }),
    })
    const machine = createStateMachine<TestState, void>({
      nodes: { a: setCount('a', 5), b: plain('b') },
      start: 'a',
      end: 'z',
      edges: { b: 'z' },
      conditionalEdges: { a: (s) => (s.count > 3 ? 'b' : 'z') },
    })
    const routed = await machine.run(init(), undefined)
    expect(routed.state.log).toEqual(['a', 'b'])
    expect(routed.steps).toBe(2)

    const machineEnd = createStateMachine<TestState, void>({
      nodes: { a: setCount('a', 1), b: plain('b') },
      start: 'a',
      end: 'z',
      edges: { b: 'z' },
      conditionalEdges: { a: (s) => (s.count > 3 ? 'b' : 'z') },
    })
    const ended = await machineEnd.run(init(), undefined)
    expect(ended.state.log).toEqual(['a'])
    expect(ended.steps).toBe(1)
  })

  it('interrupts the run and returns the interrupt payload', async () => {
    const gate: NodeDefinition<TestState, void> = {
      name: 'gate',
      run: async (state) => ({
        state: { count: state.count + 1, log: [...state.log, 'gate'] },
        next: 'done',
        interrupt: { reason: 'validation-required', message: 'human approval', payload: { key: 1 } },
      }),
    }
    const machine = createStateMachine<TestState, void>({
      nodes: { gate, done: plain('done') },
      start: 'gate',
      end: 'z',
      edges: { done: 'z' },
    })
    const res = await machine.run(init(), undefined)
    expect(res.interrupted).toBe(true)
    expect(res.node).toBe('done')
    expect(res.interrupt?.reason).toBe('validation-required')
    expect(res.interrupt?.message).toBe('human approval')
    expect(res.interrupt?.payload).toEqual({ key: 1 })
    expect(res.state.count).toBe(1)
  })

  it('auto-pauses on interruptBefore entry nodes', async () => {
    const machine = createStateMachine<TestState, void>({
      nodes: { a: plain('a'), hitl: plain('hitl'), b: plain('b') },
      start: 'a',
      end: 'z',
      edges: { a: 'hitl', b: 'z' },
      interruptBefore: ['hitl'],
    })
    const res = await machine.run(init(), undefined)
    expect(res.interrupted).toBe(true)
    expect(res.node).toBe('hitl')
    expect(res.interrupt?.reason).toBe('validation-required')
    expect(res.state.log).toEqual(['a'])
  })

  it('retries a throwing node with the error message and continues on success', async () => {
    let attempts = 0
    const flaky: NodeDefinition<TestState, void> = {
      name: 'flaky',
      run: async (state) => {
        attempts += 1
        if (attempts === 1) throw new Error('transient failure')
        return { state: { count: state.count + 1, log: [...state.log, 'flaky'] } }
      },
    }
    const retry = vi.fn(async (state: TestState, _ctx: void, node: string, error: string) => {
      expect(node).toBe('flaky')
      expect(error).toBe('transient failure')
      return state
    })
    const machine = createStateMachine<TestState, void>({
      nodes: { flaky, done: plain('done') },
      start: 'flaky',
      end: 'z',
      edges: { flaky: 'done', done: 'z' },
      maxRetries: 1,
      retry,
    })
    const res = await machine.run(init(), undefined)
    expect(retry).toHaveBeenCalledTimes(1)
    expect(res.state.log).toEqual(['flaky', 'done'])
  })

  it('surfaces a node error on step and continues on the error edge', async () => {
    const boom: NodeDefinition<TestState, void> = {
      name: 'boom',
      run: async () => {
        throw new Error('boom')
      },
    }
    const machine = createStateMachine<TestState, void>({
      nodes: { boom, b: plain('b') },
      start: 'boom',
      end: 'z',
      edges: { boom: 'b', b: 'z' },
      maxRetries: 0,
    })
    const step = await machine.step('boom', init(), undefined)
    expect(step.error).toBe('boom')
    expect(step.node).toBe('b')
    expect(step.done).toBe(false)
    expect(step.state.log).toEqual([])

    const res = await machine.run(init(), undefined)
    expect(res.state.log).toEqual(['b'])
  })

  it('throws when the step limit is exceeded', async () => {
    const machine = createStateMachine<TestState, void>({
      nodes: { loop: plain('loop') },
      start: 'loop',
      end: 'z',
      edges: { loop: 'loop' },
      maxSteps: 3,
    })
    await expect(machine.run(init(), undefined)).rejects.toThrow('Exceeded 3 step limit')
  })

  it('awaits an async onStep with node, state and stepCount', async () => {
    const seen: Array<{ node: string; count: number }> = []
    const onStep = vi.fn(async ({ node, stepCount }) => {
      await Promise.resolve()
      seen.push({ node, count: stepCount })
    })
    const machine = createStateMachine<TestState, void>({
      nodes: { a: plain('a'), b: plain('b') },
      start: 'a',
      end: 'z',
      edges: { a: 'b', b: 'z' },
    })
    await machine.run(init(), undefined, { onStep })
    expect(onStep).toHaveBeenCalledTimes(2)
    expect(seen).toEqual([
      { node: 'b', count: 1 },
      { node: 'z', count: 2 },
    ])
  })
})
