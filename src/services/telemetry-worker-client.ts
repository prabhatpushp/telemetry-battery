import {
  TELEMETRY_SNAPSHOT_CHUNK_SIZE,
  isTelemetryWorkerResponse,
} from '@/workers/telemetry-protocol'

import type { TelemetryEvent, TelemetrySnapshot } from '@/types/telemetry'
import type { LoadedTelemetry } from '@/lib/build-telemetry-data'
import type {
  SerializedTelemetryError,
  TelemetrySnapshotMetadata,
  TelemetryWorkerErrorCode,
  TelemetryWorkerRequest,
  TelemetryWorkerResponse,
} from '@/workers/telemetry-protocol'

const TELEMETRY_DATASET_URL = '/data/battery-telemetry.json'

type TelemetryClientErrorCode =
  | TelemetryWorkerErrorCode
  | 'invalid-response'
  | 'worker-failed'

type SnapshotChunkResponse = Extract<
  TelemetryWorkerResponse,
  { type: 'snapshot-chunk' }
>

type SnapshotReadyResponse = Extract<
  TelemetryWorkerResponse,
  { type: 'ready' }
>

type WorkerSession = {
  readonly worker: Worker
  readonly handleMessage: (event: MessageEvent<unknown>) => void
  readonly handleError: () => void
  readonly handleMessageError: () => void
}

type PendingLoad = {
  readonly requestId: number
  readonly session: WorkerSession
  readonly signal: AbortSignal
  readonly resolve: (telemetry: LoadedTelemetry) => void
  readonly reject: (error: Error) => void
  readonly handleAbort: () => void
  readonly chunks: Map<number, readonly TelemetryEvent[]>
  readonly eventIds: Set<string>
  readonly observedBatteryIds: Set<string>
  receivedEventCount: number
  firstTimestampMs: number | null
  lastTimestampMs: number | null
  isSettled: boolean
}

let nextRequestId = 0
let activeSession: WorkerSession | null = null
const pendingLoads = new Map<number, PendingLoad>()

export class TelemetryLoadError extends Error {
  readonly code: TelemetryClientErrorCode
  readonly retryable: boolean
  readonly statusCode: number | null

  constructor(
    code: TelemetryClientErrorCode,
    message: string,
    retryable: boolean,
    statusCode: number | null = null,
  ) {
    super(message)
    this.name = 'TelemetryLoadError'
    this.code = code
    this.retryable = retryable
    this.statusCode = statusCode
  }
}

function fromSerializedError(error: SerializedTelemetryError): TelemetryLoadError {
  return new TelemetryLoadError(
    error.code,
    error.message,
    error.retryable,
    error.statusCode,
  )
}

function createAbortError(): DOMException {
  return new DOMException('Telemetry load aborted.', 'AbortError')
}

function createInvalidResponseError(): TelemetryLoadError {
  return new TelemetryLoadError(
    'invalid-response',
    'Telemetry worker returned an invalid response.',
    true,
  )
}

function createWorkerFailure(message = 'Telemetry worker failed.'): TelemetryLoadError {
  return new TelemetryLoadError('worker-failed', message, true)
}

function getResponseRequestId(value: unknown): number | null {
  if (typeof value !== 'object' || value === null || !('requestId' in value)) {
    return null
  }

  const requestId = value.requestId
  return Number.isSafeInteger(requestId) && Number(requestId) >= 0
    ? Number(requestId)
    : null
}

function compareEvents(left: TelemetryEvent, right: TelemetryEvent): number {
  return (
    left.timestampMs - right.timestampMs || left.id.localeCompare(right.id)
  )
}

function addSnapshotChunk(
  pending: PendingLoad,
  response: SnapshotChunkResponse,
): boolean {
  if (pending.chunks.has(response.chunkIndex)) return false

  let previousEvent: TelemetryEvent | undefined

  for (const event of response.events) {
    if (pending.eventIds.has(event.id)) return false
    if (previousEvent && compareEvents(previousEvent, event) > 0) return false

    pending.eventIds.add(event.id)
    pending.observedBatteryIds.add(event.batteryId)
    pending.firstTimestampMs =
      pending.firstTimestampMs === null
        ? event.timestampMs
        : Math.min(pending.firstTimestampMs, event.timestampMs)
    pending.lastTimestampMs =
      pending.lastTimestampMs === null
        ? event.timestampMs
        : Math.max(pending.lastTimestampMs, event.timestampMs)
    previousEvent = event
  }

  pending.chunks.set(response.chunkIndex, response.events)
  pending.receivedEventCount += response.events.length
  return true
}

function hasMatchingBatteryIds(
  observedBatteryIds: ReadonlySet<string>,
  metadata: TelemetrySnapshotMetadata,
): boolean {
  return (
    observedBatteryIds.size === metadata.batteryIds.length &&
    metadata.batteryIds.every((batteryId) =>
      observedBatteryIds.has(batteryId),
    )
  )
}

function assembleSnapshot(
  pending: PendingLoad,
  response: SnapshotReadyResponse,
): TelemetrySnapshot | null {
  const { metadata } = response
  const expectedChunkCount = Math.ceil(
    metadata.eventCount / TELEMETRY_SNAPSHOT_CHUNK_SIZE,
  )

  if (
    response.chunkCount !== expectedChunkCount ||
    pending.chunks.size !== response.chunkCount ||
    pending.receivedEventCount !== metadata.eventCount ||
    pending.eventIds.size !== metadata.eventCount ||
    pending.firstTimestampMs !== metadata.firstTimestampMs ||
    pending.lastTimestampMs !== metadata.lastTimestampMs ||
    !hasMatchingBatteryIds(pending.observedBatteryIds, metadata)
  ) {
    return null
  }

  const events: TelemetryEvent[] = []
  let previousEvent: TelemetryEvent | undefined

  for (let chunkIndex = 0; chunkIndex < response.chunkCount; chunkIndex += 1) {
    const chunk = pending.chunks.get(chunkIndex)
    const expectedLength =
      chunkIndex === response.chunkCount - 1
        ? metadata.eventCount -
          chunkIndex * TELEMETRY_SNAPSHOT_CHUNK_SIZE
        : TELEMETRY_SNAPSHOT_CHUNK_SIZE

    if (!chunk || chunk.length !== expectedLength) return null

    const firstEvent = chunk[0]
    if (previousEvent && firstEvent && compareEvents(previousEvent, firstEvent) > 0) {
      return null
    }

    events.push(...chunk)
    previousEvent = chunk.at(-1)
  }

  return {
    events,
    batteryIds: metadata.batteryIds,
    eventCount: metadata.eventCount,
    batteryCount: metadata.batteryCount,
    firstTimestampMs: metadata.firstTimestampMs,
    lastTimestampMs: metadata.lastTimestampMs,
  }
}

function cleanupPendingLoad(pending: PendingLoad): void {
  if (pending.isSettled) return

  pending.isSettled = true
  pendingLoads.delete(pending.requestId)
  pending.signal.removeEventListener('abort', pending.handleAbort)
}

function disposeWorkerSession(session: WorkerSession): void {
  session.worker.removeEventListener('message', session.handleMessage)
  session.worker.removeEventListener('error', session.handleError)
  session.worker.removeEventListener('messageerror', session.handleMessageError)
  session.worker.terminate()

  if (activeSession === session) activeSession = null
}

function rejectWorkerSession(session: WorkerSession, error: Error): void {
  if (activeSession !== session) return

  const loads = [...pendingLoads.values()].filter(
    (pending) => pending.session === session,
  )

  for (const pending of loads) cleanupPendingLoad(pending)
  disposeWorkerSession(session)
  for (const pending of loads) pending.reject(error)
}

function resolvePendingLoad(
  pending: PendingLoad,
  telemetry: LoadedTelemetry,
): void {
  if (pending.isSettled) return

  cleanupPendingLoad(pending)
  disposeWorkerSession(pending.session)
  pending.resolve(telemetry)
}

function handleWorkerMessage(
  session: WorkerSession,
  event: MessageEvent<unknown>,
): void {
  if (activeSession !== session) return

  const requestId = getResponseRequestId(event.data)
  if (requestId === null) {
    rejectWorkerSession(session, createInvalidResponseError())
    return
  }

  const pending = pendingLoads.get(requestId)
  if (!pending || pending.session !== session) return

  if (!isTelemetryWorkerResponse(event.data)) {
    rejectWorkerSession(session, createInvalidResponseError())
    return
  }

  if (event.data.type === 'snapshot-chunk') {
    if (!addSnapshotChunk(pending, event.data)) {
      rejectWorkerSession(session, createInvalidResponseError())
    }
    return
  }

  if (event.data.type === 'failed') {
    rejectWorkerSession(session, fromSerializedError(event.data.error))
    return
  }

  const snapshot = assembleSnapshot(pending, event.data)
  if (!snapshot) {
    rejectWorkerSession(session, createInvalidResponseError())
    return
  }

  resolvePendingLoad(pending, {
    snapshot,
    overviewSummary: event.data.overviewSummary,
  })
}

function createWorkerSession(): WorkerSession {
  // Keep new URL directly inside new Worker so Vite emits the worker chunk.
  const worker = new Worker(
    new URL('../workers/telemetry.worker.ts', import.meta.url),
    { type: 'module' },
  )
  const handleMessage = (event: MessageEvent<unknown>): void => {
    handleWorkerMessage(session, event)
  }
  const handleError = (): void => {
    rejectWorkerSession(session, createWorkerFailure())
  }
  const handleMessageError = (): void => {
    rejectWorkerSession(
      session,
      createWorkerFailure('Telemetry worker response could not be read.'),
    )
  }

  const session = { worker, handleMessage, handleError, handleMessageError }

  try {
    worker.addEventListener('message', handleMessage)
    worker.addEventListener('error', handleError)
    worker.addEventListener('messageerror', handleMessageError)
  } catch (error) {
    worker.terminate()
    throw error
  }

  return session
}

export function loadTelemetry(signal: AbortSignal): Promise<LoadedTelemetry> {
  if (signal.aborted) return Promise.reject(createAbortError())

  const requestId = ++nextRequestId

  return new Promise((resolve, reject) => {
    if (activeSession) rejectWorkerSession(activeSession, createAbortError())

    let session: WorkerSession | null = null

    try {
      session = createWorkerSession()
    } catch {
      reject(
        createWorkerFailure('Telemetry worker could not be started.'),
      )
      return
    }

    if (!session) return

    activeSession = session

    const handleAbort = (): void => {
      rejectWorkerSession(session, createAbortError())
    }

    const pending: PendingLoad = {
      requestId,
      session,
      signal,
      resolve,
      reject,
      handleAbort,
      chunks: new Map(),
      eventIds: new Set(),
      observedBatteryIds: new Set(),
      receivedEventCount: 0,
      firstTimestampMs: null,
      lastTimestampMs: null,
      isSettled: false,
    }

    pendingLoads.set(requestId, pending)
    signal.addEventListener('abort', handleAbort, { once: true })

    if (signal.aborted) {
      handleAbort()
      return
    }

    const request: TelemetryWorkerRequest = {
      type: 'load',
      requestId,
      url: TELEMETRY_DATASET_URL,
    }

    try {
      session.worker.postMessage(request)
    } catch {
      rejectWorkerSession(
        session,
        createWorkerFailure('Telemetry worker could not be started.'),
      )
    }
  })
}
