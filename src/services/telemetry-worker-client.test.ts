import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals'

import { buildOverviewSummary } from '@/lib/build-overview-summary'

import type { TelemetryEvent, TelemetrySnapshot } from '@/types/telemetry'
import type { TelemetryWorkerRequest } from '@/workers/telemetry-protocol'

type ClientModule = typeof import('@/services/telemetry-worker-client')
type MockListener = (event: unknown) => void

class MockWorker {
  static instances: MockWorker[] = []
  static constructorError: Error | null = null
  static postMessageError: Error | null = null

  readonly postedMessages: unknown[] = []
  isTerminated = false

  private readonly listeners = new Map<string, Set<MockListener>>()

  constructor() {
    if (MockWorker.constructorError) throw MockWorker.constructorError
    MockWorker.instances.push(this)
  }

  addEventListener(type: string, listener: MockListener): void {
    const listeners = this.listeners.get(type) ?? new Set<MockListener>()
    listeners.add(listener)
    this.listeners.set(type, listeners)
  }

  removeEventListener(type: string, listener: MockListener): void {
    this.listeners.get(type)?.delete(listener)
  }

  postMessage(message: unknown): void {
    if (MockWorker.postMessageError) throw MockWorker.postMessageError
    this.postedMessages.push(message)
  }

  terminate(): void {
    this.isTerminated = true
  }

  emitMessage(data: unknown): void {
    this.emit('message', { data })
  }

  emit(type: 'message' | 'error' | 'messageerror', event: unknown = {}): void {
    for (const listener of this.listeners.get(type) ?? []) listener(event)
  }
}

const originalWorkerDescriptor = Object.getOwnPropertyDescriptor(
  globalThis,
  'Worker',
)

function createEvent(index: number): TelemetryEvent {
  return {
    id: `evt-${String(index).padStart(6, '0')}`,
    batteryId: 'BAT-001',
    timestamp: `2023-10-01T00:00:${String(index % 60).padStart(2, '0')}.000Z`,
    timestampMs: index,
    metrics: {
      voltage: 3.7,
      current: 5,
      temperature: 30,
      stateOfCharge: 70,
      stateOfHealth: 95,
    },
    status: 'charging',
  }
}

function createSnapshot(events: readonly TelemetryEvent[]): TelemetrySnapshot {
  return {
    events,
    batteryIds: events.length > 0 ? ['BAT-001'] : [],
    eventCount: events.length,
    batteryCount: events.length > 0 ? 1 : 0,
    firstTimestampMs: events.at(0)?.timestampMs ?? null,
    lastTimestampMs: events.at(-1)?.timestampMs ?? null,
  }
}

function getLoadRequest(worker: MockWorker): TelemetryWorkerRequest {
  return worker.postedMessages[0] as TelemetryWorkerRequest
}

async function importClient(): Promise<ClientModule> {
  return import('@/services/telemetry-worker-client')
}

beforeEach(() => {
  jest.resetModules()
  MockWorker.instances = []
  MockWorker.constructorError = null
  MockWorker.postMessageError = null
  Object.defineProperty(globalThis, 'Worker', {
    configurable: true,
    writable: true,
    value: MockWorker,
  })
})

afterAll(() => {
  if (originalWorkerDescriptor) {
    Object.defineProperty(globalThis, 'Worker', originalWorkerDescriptor)
  } else {
    Reflect.deleteProperty(globalThis, 'Worker')
  }
})

describe('loadTelemetry', () => {
  it('assembles bounded chunks atomically and terminates the completed worker', async () => {
    const client = await importClient()
    const controller = new AbortController()
    const events = Array.from({ length: 501 }, (_, index) =>
      createEvent(index + 1),
    )
    const snapshot = createSnapshot(events)
    const overviewSummary = buildOverviewSummary(snapshot)
    let isResolved = false
    const load = client.loadTelemetry(controller.signal).then((snapshot) => {
      isResolved = true
      return snapshot
    })
    const worker = MockWorker.instances[0]
    expect(worker).toBeDefined()
    const request = getLoadRequest(worker!)

    worker!.emitMessage({
      type: 'snapshot-chunk',
      requestId: request.requestId,
      chunkIndex: 1,
      events: events.slice(500),
    })
    worker!.emitMessage({
      type: 'snapshot-chunk',
      requestId: request.requestId,
      chunkIndex: 0,
      events: events.slice(0, 500),
    })
    await Promise.resolve()
    expect(isResolved).toBe(false)

    worker!.emitMessage({
      type: 'ready',
      requestId: request.requestId,
      chunkCount: 2,
      metadata: {
        batteryIds: ['BAT-001'],
        eventCount: events.length,
        batteryCount: 1,
        firstTimestampMs: 1,
        lastTimestampMs: 501,
      },
      overviewSummary,
    })

    await expect(load).resolves.toEqual({
      snapshot,
      overviewSummary,
    })
    expect(worker!.isTerminated).toBe(true)
  })

  it('ignores stale messages while a current request is pending', async () => {
    const client = await importClient()
    const controller = new AbortController()
    const load = client.loadTelemetry(controller.signal)
    const worker = MockWorker.instances[0]!
    const request = getLoadRequest(worker)

    worker.emitMessage({
      type: 'not-a-response',
      requestId: request.requestId + 1,
    })
    worker.emitMessage({
      type: 'ready',
      requestId: request.requestId,
      chunkCount: 0,
      metadata: {
        batteryIds: [],
        eventCount: 0,
        batteryCount: 0,
        firstTimestampMs: null,
        lastTimestampMs: null,
      },
      overviewSummary: buildOverviewSummary(createSnapshot([])),
    })

    await expect(load).resolves.toMatchObject({
      snapshot: { eventCount: 0 },
    })
  })

  it('rejects malformed current chunks and incomplete snapshots', async () => {
    const client = await importClient()
    const malformedController = new AbortController()
    const malformedLoad = client.loadTelemetry(malformedController.signal)
    const malformedWorker = MockWorker.instances[0]!
    const malformedRequest = getLoadRequest(malformedWorker)

    malformedWorker.emitMessage({
      type: 'snapshot-chunk',
      requestId: malformedRequest.requestId,
      chunkIndex: 0,
      events: [{ ...createEvent(1), metrics: null }],
    })

    await expect(malformedLoad).rejects.toMatchObject({
      code: 'invalid-response',
    })
    expect(malformedWorker.isTerminated).toBe(true)

    const incompleteController = new AbortController()
    const incompleteLoad = client.loadTelemetry(incompleteController.signal)
    const incompleteWorker = MockWorker.instances[1]!
    const incompleteRequest = getLoadRequest(incompleteWorker)

    incompleteWorker.emitMessage({
      type: 'ready',
      requestId: incompleteRequest.requestId,
      chunkCount: 1,
      metadata: {
        batteryIds: ['BAT-001'],
        eventCount: 1,
        batteryCount: 1,
        firstTimestampMs: 1,
        lastTimestampMs: 1,
      },
      overviewSummary: buildOverviewSummary(
        createSnapshot([createEvent(1)]),
      ),
    })

    await expect(incompleteLoad).rejects.toMatchObject({
      code: 'invalid-response',
    })
    expect(incompleteWorker.isTerminated).toBe(true)
  })

  it('hard-terminates on abort and creates a fresh worker on retry', async () => {
    const client = await importClient()
    const firstController = new AbortController()
    const firstLoad = client.loadTelemetry(firstController.signal)
    const firstWorker = MockWorker.instances[0]!

    firstController.abort()

    await expect(firstLoad).rejects.toMatchObject({ name: 'AbortError' })
    expect(firstWorker.isTerminated).toBe(true)

    const retryController = new AbortController()
    const retryLoad = client.loadTelemetry(retryController.signal)
    const retryWorker = MockWorker.instances[1]!
    const retryRequest = getLoadRequest(retryWorker)

    retryWorker.emitMessage({
      type: 'ready',
      requestId: retryRequest.requestId,
      chunkCount: 0,
      metadata: {
        batteryIds: [],
        eventCount: 0,
        batteryCount: 0,
        firstTimestampMs: null,
        lastTimestampMs: null,
      },
      overviewSummary: buildOverviewSummary(createSnapshot([])),
    })

    await expect(retryLoad).resolves.toMatchObject({
      snapshot: { eventCount: 0 },
    })
    expect(retryWorker).not.toBe(firstWorker)
  })

  it('converts worker construction and postMessage failures to rejections', async () => {
    const client = await importClient()
    MockWorker.constructorError = new Error('constructor failed')
    const constructionLoad = client.loadTelemetry(
      new AbortController().signal,
    )

    await expect(constructionLoad).rejects.toMatchObject({
      code: 'worker-failed',
      retryable: true,
    })

    MockWorker.constructorError = null
    MockWorker.postMessageError = new Error('post failed')
    const postLoad = client.loadTelemetry(new AbortController().signal)
    const worker = MockWorker.instances[0]!

    await expect(postLoad).rejects.toMatchObject({ code: 'worker-failed' })
    expect(worker.isTerminated).toBe(true)
  })

  it.each(['error', 'messageerror'] as const)(
    'rejects and terminates on worker %s events',
    async (eventType) => {
      const client = await importClient()
      const load = client.loadTelemetry(new AbortController().signal)
      const worker = MockWorker.instances[0]!

      worker.emit(eventType)

      await expect(load).rejects.toMatchObject({
        code: 'worker-failed',
        retryable: true,
      })
      expect(worker.isTerminated).toBe(true)
    },
  )
})
