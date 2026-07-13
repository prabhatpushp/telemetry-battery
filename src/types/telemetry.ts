export type TelemetryStatus = 'charging' | 'discharging' | 'idle'

export type TelemetryMetrics = {
  readonly voltage: number
  readonly current: number
  readonly temperature: number
  readonly stateOfCharge: number
  readonly stateOfHealth: number
}

export type TelemetryEvent = {
  readonly id: string
  readonly batteryId: string
  readonly timestamp: string
  readonly timestampMs: number
  readonly metrics: TelemetryMetrics
  readonly status: TelemetryStatus
}

export type TelemetrySnapshot = {
  readonly events: readonly TelemetryEvent[]
  readonly batteryIds: readonly string[]
  readonly eventCount: number
  readonly batteryCount: number
  readonly firstTimestampMs: number | null
  readonly lastTimestampMs: number | null
}
