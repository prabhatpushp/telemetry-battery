import {
  TelemetryDataError,
} from '@/lib/build-telemetry-model'
import { buildTelemetryData } from '@/lib/build-telemetry-data'
import {
  TELEMETRY_SNAPSHOT_CHUNK_SIZE,
  isTelemetryWorkerRequest,
} from '@/workers/telemetry-protocol'

import type { LoadedTelemetry } from '@/lib/build-telemetry-data'
import type {
  SerializedTelemetryError,
  TelemetrySnapshotMetadata,
  TelemetryWorkerErrorCode,
  TelemetryWorkerRequest,
  TelemetryWorkerResponse,
} from '@/workers/telemetry-protocol'

const LOAD_TIMEOUT_MS = 30_000

type TelemetryWorkerScope = {
  onmessage: ((event: MessageEvent<unknown>) => void) | null
  postMessage: (message: TelemetryWorkerResponse) => void
}

const workerScope = globalThis as unknown as TelemetryWorkerScope

function isRetryableStatus(statusCode: number): boolean {
  return statusCode === 408 || statusCode === 429 || statusCode >= 500
}

function postFailure(
  requestId: number,
  code: TelemetryWorkerErrorCode,
  message: string,
  retryable: boolean,
  statusCode: number | null = null,
): void {
  const error: SerializedTelemetryError = {
    code,
    message,
    retryable,
    statusCode,
  }

  workerScope.postMessage({ type: 'failed', requestId, error })
}

function postRequestFailure(requestId: number, isTimeout: boolean): void {
  postFailure(
    requestId,
    isTimeout ? 'timeout' : 'request-failed',
    isTimeout
      ? 'Telemetry request timed out.'
      : 'Telemetry data could not be requested.',
    true,
  )
}

function postTelemetry(requestId: number, telemetry: LoadedTelemetry): void {
  const { overviewSummary, snapshot } = telemetry
  const chunkCount = Math.ceil(
    snapshot.events.length / TELEMETRY_SNAPSHOT_CHUNK_SIZE,
  )

  for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex += 1) {
    const startIndex = chunkIndex * TELEMETRY_SNAPSHOT_CHUNK_SIZE
    workerScope.postMessage({
      type: 'snapshot-chunk',
      requestId,
      chunkIndex,
      events: snapshot.events.slice(
        startIndex,
        startIndex + TELEMETRY_SNAPSHOT_CHUNK_SIZE,
      ),
    })
  }

  const metadata: TelemetrySnapshotMetadata = {
    batteryIds: snapshot.batteryIds,
    eventCount: snapshot.eventCount,
    batteryCount: snapshot.batteryCount,
    firstTimestampMs: snapshot.firstTimestampMs,
    lastTimestampMs: snapshot.lastTimestampMs,
  }

  workerScope.postMessage({
    type: 'ready',
    requestId,
    chunkCount,
    metadata,
    overviewSummary,
  })
}

async function handleLoad(request: TelemetryWorkerRequest): Promise<void> {
  let response: Response
  let timeoutSignal: AbortSignal | null = null

  try {
    timeoutSignal = AbortSignal.timeout(LOAD_TIMEOUT_MS)
    response = await fetch(request.url, { signal: timeoutSignal })
  } catch {
    postRequestFailure(request.requestId, timeoutSignal?.aborted === true)
    return
  }

  if (!response.ok) {
    postFailure(
      request.requestId,
      'request-failed',
      'Telemetry data could not be requested.',
      isRetryableStatus(response.status),
      response.status,
    )
    return
  }

  let payload: unknown

  try {
    payload = await response.json()
  } catch {
    if (timeoutSignal.aborted) {
      postRequestFailure(request.requestId, true)
    } else {
      postFailure(
        request.requestId,
        'invalid-json',
        'Telemetry data is not valid JSON.',
        false,
      )
    }
    return
  }

  let telemetry: LoadedTelemetry

  try {
    telemetry = buildTelemetryData(payload)
  } catch (error) {
    const code =
      error instanceof TelemetryDataError ? error.code : 'invalid-dataset'

    postFailure(
      request.requestId,
      code,
      'Telemetry data failed validation.',
      false,
    )
    return
  }

  try {
    postTelemetry(request.requestId, telemetry)
  } catch {
    postFailure(
      request.requestId,
      'request-failed',
      'Telemetry data could not be delivered.',
      true,
    )
  }
}

workerScope.onmessage = (event) => {
  if (!isTelemetryWorkerRequest(event.data)) return
  void handleLoad(event.data)
}
