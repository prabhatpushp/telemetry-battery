import { describe, expect, it } from '@jest/globals'

import {
  TELEMETRY_SNAPSHOT_CHUNK_SIZE,
  isTelemetryWorkerRequest,
  isTelemetryWorkerResponse,
} from '@/workers/telemetry-protocol'
import { buildOverviewSummary } from '@/lib/build-overview-summary'

import type { TelemetryEvent, TelemetrySnapshot } from '@/types/telemetry'

const event: TelemetryEvent = {
  id: 'evt-000001',
  batteryId: 'BAT-001',
  timestamp: '2023-10-01T00:00:00.000Z',
  timestampMs: 1,
  metrics: {
    voltage: 3.7,
    current: 5,
    temperature: 30,
    stateOfCharge: 70,
    stateOfHealth: 95,
  },
  status: 'charging',
}

const snapshot: TelemetrySnapshot = {
  events: [event],
  batteryIds: ['BAT-001'],
  eventCount: 1,
  batteryCount: 1,
  firstTimestampMs: 1,
  lastTimestampMs: 1,
}

const overviewSummary = buildOverviewSummary(snapshot)
const emptyOverviewSummary = buildOverviewSummary({
  events: [],
  batteryIds: [],
  eventCount: 0,
  batteryCount: 0,
  firstTimestampMs: null,
  lastTimestampMs: null,
})

describe('telemetry worker protocol', () => {
  it('accepts the expected load request', () => {
    expect(
      isTelemetryWorkerRequest({
        type: 'load',
        requestId: 1,
        url: '/data/battery-telemetry.json',
      }),
    ).toBe(true)
  })

  it('deeply validates bounded snapshot chunks', () => {
    expect(
      isTelemetryWorkerResponse({
        type: 'snapshot-chunk',
        requestId: 1,
        chunkIndex: 0,
        events: [event],
      }),
    ).toBe(true)

    expect(
      isTelemetryWorkerResponse({
        type: 'snapshot-chunk',
        requestId: 1,
        chunkIndex: 0,
        events: [{ ...event, metrics: { ...event.metrics, voltage: 'bad' } }],
      }),
    ).toBe(false)

    expect(
      isTelemetryWorkerResponse({
        type: 'snapshot-chunk',
        requestId: 1,
        chunkIndex: 0,
        events: Array.from(
          { length: TELEMETRY_SNAPSHOT_CHUNK_SIZE + 1 },
          () => event,
        ),
      }),
    ).toBe(false)
  })

  it('deeply validates ready metadata', () => {
    expect(
      isTelemetryWorkerResponse({
        type: 'ready',
        requestId: 1,
        chunkCount: 1,
        metadata: {
          batteryIds: ['BAT-001'],
          eventCount: 1,
          batteryCount: 1,
          firstTimestampMs: 1,
          lastTimestampMs: 1,
        },
        overviewSummary,
      }),
    ).toBe(true)

    expect(
      isTelemetryWorkerResponse({
        type: 'ready',
        requestId: 1,
        chunkCount: 1,
        metadata: {
          batteryIds: ['BAT-001', 'BAT-001'],
          eventCount: 1,
          batteryCount: 2,
          firstTimestampMs: 1,
          lastTimestampMs: 1,
        },
        overviewSummary,
      }),
    ).toBe(false)

    expect(
      isTelemetryWorkerResponse({
        type: 'ready',
        requestId: 1,
        chunkCount: 0,
        metadata: {
          batteryIds: [],
          eventCount: 0,
          batteryCount: 0,
          firstTimestampMs: 1,
          lastTimestampMs: null,
        },
        overviewSummary: emptyOverviewSummary,
      }),
    ).toBe(false)
  })

  it('rejects malformed failures', () => {
    expect(
      isTelemetryWorkerResponse({
        type: 'failed',
        requestId: 1,
        error: {
          code: 'unexpected-code',
          message: 'Nope',
          retryable: false,
          statusCode: null,
        },
      }),
    ).toBe(false)
  })
})
