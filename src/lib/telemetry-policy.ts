import type { TelemetryEvent, TelemetryStatus } from '@/types/telemetry'

export const TELEMETRY_METRIC_KEYS = [
  'stateOfCharge',
  'stateOfHealth',
  'voltage',
  'current',
  'temperature',
  'recordedPower',
] as const

export type TelemetryMetricKey = (typeof TELEMETRY_METRIC_KEYS)[number]

export type TelemetryMetricDefinition = {
  readonly label: string
  readonly unit: string
  readonly decimals: number
}

export const TELEMETRY_METRICS: Readonly<
  Record<TelemetryMetricKey, TelemetryMetricDefinition>
> = {
  stateOfCharge: { label: 'State of charge', unit: '%', decimals: 1 },
  stateOfHealth: { label: 'State of health', unit: '%', decimals: 1 },
  voltage: { label: 'Voltage', unit: 'V', decimals: 2 },
  current: { label: 'Current', unit: 'A', decimals: 2 },
  temperature: { label: 'Temperature', unit: '°C', decimals: 1 },
  recordedPower: { label: 'Recorded power', unit: 'W', decimals: 2 },
}

export type ReviewPriority = 'critical' | 'low' | 'metric' | 'none'

export const REVIEW_PRIORITY_LABELS: Readonly<Record<ReviewPriority, string>> = {
  critical: 'Critical charge',
  low: 'Low charge',
  metric: 'Metric review',
  none: 'No rule match',
}

export const TELEMETRY_STATUS_LABELS: Readonly<
  Record<TelemetryStatus, string>
> = {
  charging: 'Charging',
  discharging: 'Discharging',
  idle: 'Idle',
}

export type ReviewReasonCode =
  | 'critical-charge'
  | 'low-charge'
  | 'high-temperature'
  | 'low-health'

export type ReviewReasonDefinition = {
  readonly label: string
  readonly priority: Exclude<ReviewPriority, 'none'>
}

export const REVIEW_REASON_DEFINITIONS: Readonly<
  Record<ReviewReasonCode, ReviewReasonDefinition>
> = {
  'critical-charge': { label: 'Critical charge', priority: 'critical' },
  'low-charge': { label: 'Low charge', priority: 'low' },
  'high-temperature': { label: 'High temperature', priority: 'metric' },
  'low-health': { label: 'Health below 85%', priority: 'metric' },
}

export type TelemetryAssessment = {
  readonly priority: ReviewPriority
  readonly reasonCodes: readonly ReviewReasonCode[]
}

export function recordedPowerWatts(event: TelemetryEvent): number {
  return event.metrics.voltage * event.metrics.current
}

export function getTelemetryMetricValue(
  event: TelemetryEvent,
  metric: TelemetryMetricKey,
): number {
  switch (metric) {
    case 'stateOfCharge':
      return event.metrics.stateOfCharge
    case 'stateOfHealth':
      return event.metrics.stateOfHealth
    case 'voltage':
      return event.metrics.voltage
    case 'current':
      return event.metrics.current
    case 'temperature':
      return event.metrics.temperature
    case 'recordedPower':
      return recordedPowerWatts(event)
  }
}

export function assessTelemetryEvent(
  event: TelemetryEvent,
): TelemetryAssessment {
  const reasonCodes: ReviewReasonCode[] = []

  if (event.metrics.stateOfCharge < 10) {
    reasonCodes.push('critical-charge')
  } else if (event.metrics.stateOfCharge < 20) {
    reasonCodes.push('low-charge')
  }

  if (event.metrics.temperature >= 40) {
    reasonCodes.push('high-temperature')
  }

  if (event.metrics.stateOfHealth < 85) {
    reasonCodes.push('low-health')
  }

  const priority = reasonCodes.includes('critical-charge')
    ? 'critical'
    : reasonCodes.includes('low-charge')
      ? 'low'
      : reasonCodes.length > 0
        ? 'metric'
        : 'none'

  return { priority, reasonCodes }
}
