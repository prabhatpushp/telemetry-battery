import { useEffect, useMemo, useRef, useState } from 'react'

import {
  BATTERY_CHART_METRICS,
  buildBatteryChartPoints,
  getBatteryChartRenderPoints,
} from '@/lib/battery-telemetry-chart'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TELEMETRY_METRICS } from '@/lib/telemetry-policy'

import type {
  BatteryChartMetric,
  BatteryChartPoint,
} from '@/lib/battery-telemetry-chart'
import type { TelemetryEventRow } from '@/lib/telemetry-queries'
import type {
  KeyboardEvent,
  PointerEvent,
  WheelEvent,
} from 'react'

export type BatteryTelemetryChartProps = {
  readonly rows: readonly TelemetryEventRow[]
  readonly title?: string
}

type LayoutMode = 'combined' | 'separate'

type TimeView = {
  readonly from: number
  readonly to: number
}

type ChartSize = {
  readonly width: number
  readonly height: number
  readonly dpr: number
}

type PointerPosition = {
  readonly x: number
  readonly y: number
}

type Gesture =
  | {
      readonly type: 'pan'
      readonly pointerId: number
      readonly startX: number
      readonly startView: TimeView
      readonly plotWidth: number
    }
  | {
      readonly type: 'pinch'
      readonly distance: number
      readonly anchorTime: number
      readonly startView: TimeView
      readonly plotLeft: number
      readonly plotWidth: number
    }

type MetricStyle = {
  readonly colorVariable: string
  readonly fallback: string
  readonly shortLabel: string
}

type MetricScale = {
  readonly minimum: number
  readonly maximum: number
}

type Geometry = {
  readonly left: number
  readonly right: number
  readonly top: number
  readonly bottom: number
  readonly plotWidth: number
  readonly trackHeight: number
  readonly gap: number
}

const METRIC_STYLES: Readonly<Record<BatteryChartMetric, MetricStyle>> = {
  voltage: {
    colorVariable: '--chart-1',
    fallback: '#2563eb',
    shortLabel: 'Voltage',
  },
  current: {
    colorVariable: '--battery-status-discharging',
    fallback: '#dc2626',
    shortLabel: 'Current',
  },
  temperature: {
    colorVariable: '--battery-status-critical',
    fallback: '#c2410c',
    shortLabel: 'Temp',
  },
  stateOfCharge: {
    colorVariable: '--battery-status-charging',
    fallback: '#059669',
    shortLabel: 'SoC',
  },
  stateOfHealth: {
    colorVariable: '--battery-liquid-metric',
    fallback: '#7c3aed',
    shortLabel: 'SoH',
  },
  recordedPower: {
    colorVariable: '--chart-2',
    fallback: '#64748b',
    shortLabel: 'Power',
  },
}

const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
})

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function constrainView(view: TimeView, bounds: TimeView): TimeView {
  const totalSpan = Math.max(1, bounds.to - bounds.from)
  const span = clamp(view.to - view.from, totalSpan / 500, totalSpan)
  let from = view.from
  let to = from + span

  if (from < bounds.from) {
    from = bounds.from
    to = from + span
  }
  if (to > bounds.to) {
    to = bounds.to
    from = to - span
  }

  return { from, to }
}

function latestView(bounds: TimeView): TimeView {
  const span = Math.max(1, bounds.to - bounds.from)
  return { from: bounds.to - span * 0.25, to: bounds.to }
}

function chartGeometry(
  width: number,
  height: number,
  trackCount: number,
  isCombined: boolean,
): Geometry {
  const compact = width < 560
  const left = isCombined ? (compact ? 12 : 16) : compact ? 48 : 58
  const right = isCombined ? (compact ? 10 : 12) : compact ? 58 : 70
  const top = 12
  const bottom = 30
  const gap = isCombined ? 0 : compact ? 10 : 14
  const availableHeight = Math.max(
    1,
    height - top - bottom - gap * Math.max(0, trackCount - 1),
  )

  return {
    left,
    right,
    top,
    bottom,
    gap,
    plotWidth: Math.max(1, width - left - right),
    trackHeight: availableHeight / Math.max(1, trackCount),
  }
}

function readThemeColor(variable: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(variable)
    .trim()
  return value || fallback
}

function metricScale(
  points: readonly BatteryChartPoint[],
  metric: BatteryChartMetric,
): MetricScale {
  const values = points
    .map((point) => point[metric])
    .filter((value): value is number => value !== null)

  if (values.length === 0) return { minimum: 0, maximum: 1 }

  let minimum = Math.min(...values)
  let maximum = Math.max(...values)
  if (metric === 'current') {
    minimum = Math.min(0, minimum)
    maximum = Math.max(0, maximum)
  }

  const rawSpan = maximum - minimum
  const minimumSpan =
    metric === 'voltage'
      ? 0.08
      : metric === 'current'
        ? 4
        : metric === 'stateOfHealth'
          ? 3
          : metric === 'stateOfCharge'
            ? 12
            : metric === 'recordedPower'
              ? 20
              : 4
  const span = Math.max(rawSpan, minimumSpan)
  const center = (minimum + maximum) / 2
  return {
    minimum: center - span * 0.58,
    maximum: center + span * 0.58,
  }
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const safeRadius = Math.min(radius, width / 2, height / 2)
  context.beginPath()
  context.roundRect(x, y, width, height, safeRadius)
}

function formatMetric(metric: BatteryChartMetric, value: number): string {
  const definition = TELEMETRY_METRICS[metric]
  return `${value.toFixed(definition.decimals)} ${definition.unit}`
}

function drawTelemetryChart({
  canvas,
  enabledMetrics,
  layoutMode,
  pointer,
  points,
  size,
  view,
}: {
  readonly canvas: HTMLCanvasElement
  readonly enabledMetrics: readonly BatteryChartMetric[]
  readonly layoutMode: LayoutMode
  readonly pointer: PointerPosition | null
  readonly points: readonly BatteryChartPoint[]
  readonly size: ChartSize
  readonly view: TimeView
}): void {
  const context = canvas.getContext('2d')
  if (!context) return

  canvas.width = Math.max(1, Math.round(size.width * size.dpr))
  canvas.height = Math.max(1, Math.round(size.height * size.dpr))
  context.setTransform(size.dpr, 0, 0, size.dpr, 0, 0)

  const palette = {
    background: readThemeColor('--background', '#18181b'),
    foreground: readThemeColor('--foreground', '#fafafa'),
    muted: readThemeColor('--muted-foreground', '#a1a1aa'),
    border: readThemeColor('--border', '#3f3f46'),
    popover: readThemeColor('--popover', '#27272a'),
    popoverForeground: readThemeColor('--popover-foreground', '#fafafa'),
  }
  const metricColors = Object.fromEntries(
    BATTERY_CHART_METRICS.map((metric) => [
      metric,
      readThemeColor(
        METRIC_STYLES[metric].colorVariable,
        METRIC_STYLES[metric].fallback,
      ),
    ]),
  ) as Record<BatteryChartMetric, string>
  const isCombined = layoutMode === 'combined'
  const geometry = chartGeometry(
    size.width,
    size.height,
    isCombined ? 1 : enabledMetrics.length,
    isCombined,
  )
  const plotRight = geometry.left + geometry.plotWidth
  const viewSpan = Math.max(1, view.to - view.from)
  const xForTime = (timestampMs: number) =>
    geometry.left + ((timestampMs - view.from) / viewSpan) * geometry.plotWidth
  const scales = Object.fromEntries(
    enabledMetrics.map((metric) => [metric, metricScale(points, metric)]),
  ) as Record<BatteryChartMetric, MetricScale>
  const renderPoints = getBatteryChartRenderPoints(
    points,
    view.from,
    view.to,
  )

  context.fillStyle = palette.background
  context.fillRect(0, 0, size.width, size.height)
  context.font = '10px Inter, ui-sans-serif, system-ui'
  context.lineWidth = 1

  const trackTop = (index: number) =>
    geometry.top + index * (geometry.trackHeight + geometry.gap)

  for (let trackIndex = 0; trackIndex < (isCombined ? 1 : enabledMetrics.length); trackIndex += 1) {
    const top = trackTop(trackIndex)
    const bottom = top + geometry.trackHeight
    context.strokeStyle = palette.border
    context.globalAlpha = 0.5
    for (let lineIndex = 0; lineIndex <= 3; lineIndex += 1) {
      const y = top + (lineIndex / 3) * geometry.trackHeight
      context.beginPath()
      context.moveTo(geometry.left, y)
      context.lineTo(plotRight, y)
      context.stroke()
    }
    context.globalAlpha = 1

    if (!isCombined) {
      const metric = enabledMetrics[trackIndex]
      if (!metric) continue
      const scale = scales[metric]
      if (!scale) continue
      context.fillStyle = metricColors[metric]
      context.textAlign = 'left'
      context.textBaseline = 'top'
      context.font = '600 10px Inter, ui-sans-serif, system-ui'
      context.fillText(METRIC_STYLES[metric].shortLabel, 8, top + 3)
      context.textAlign = 'right'
      context.fillStyle = palette.muted
      context.font = '9px Inter, ui-sans-serif, system-ui'
      context.fillText(formatMetric(metric, scale.maximum), size.width - 8, top + 3)
      context.textBaseline = 'bottom'
      context.fillText(formatMetric(metric, scale.minimum), size.width - 8, bottom - 2)
    }
  }

  context.strokeStyle = palette.border
  context.fillStyle = palette.muted
  context.globalAlpha = 0.7
  context.font = '9px Inter, ui-sans-serif, system-ui'
  context.textBaseline = 'top'
  for (let tickIndex = 0; tickIndex <= 5; tickIndex += 1) {
    const ratio = tickIndex / 5
    const x = geometry.left + ratio * geometry.plotWidth
    context.beginPath()
    context.moveTo(x, geometry.top)
    context.lineTo(x, size.height - geometry.bottom)
    context.stroke()
    context.textAlign =
      tickIndex === 0 ? 'left' : tickIndex === 5 ? 'right' : 'center'
    context.fillText(
      timeFormatter.format(view.from + ratio * viewSpan),
      x,
      size.height - geometry.bottom + 9,
    )
  }
  context.globalAlpha = 1

  enabledMetrics.forEach((metric, metricIndex) => {
    const scale = scales[metric]
    if (!scale) return
    const top = isCombined ? geometry.top : trackTop(metricIndex)
    const toY = (value: number) =>
      top +
      (1 - (value - scale.minimum) / (scale.maximum - scale.minimum)) *
        geometry.trackHeight

    context.beginPath()
    context.save()
    context.rect(geometry.left, top, geometry.plotWidth, geometry.trackHeight)
    context.clip()
    context.beginPath()
    context.strokeStyle = metricColors[metric]
    context.lineWidth = 1.8
    context.lineJoin = 'round'
    context.lineCap = 'round'
    let hasSegment = false

    for (const point of renderPoints) {
      const value = point[metric]
      if (value === null) {
        hasSegment = false
        continue
      }
      const x = xForTime(point.timestampMs)
      const y = toY(value)
      if (hasSegment) context.lineTo(x, y)
      else context.moveTo(x, y)
      hasSegment = true
    }
    context.stroke()
    context.restore()

    if (metric === 'current' && scale.minimum < 0 && scale.maximum > 0) {
      context.save()
      context.strokeStyle = metricColors[metric]
      context.globalAlpha = 0.35
      context.setLineDash([4, 5])
      context.beginPath()
      context.moveTo(geometry.left, toY(0))
      context.lineTo(plotRight, toY(0))
      context.stroke()
      context.restore()
    }
  })

  if (
    !pointer ||
    pointer.x < geometry.left ||
    pointer.x > plotRight ||
    points.length === 0
  ) {
    return
  }

  const pointerTime =
    view.from + ((pointer.x - geometry.left) / geometry.plotWidth) * viewSpan
  const candidates = points.filter(
    (point) =>
      point.eventId !== null &&
      point.timestampMs >= view.from &&
      point.timestampMs <= view.to,
  )
  const nearest = candidates.reduce<BatteryChartPoint | null>(
    (closest, point) =>
      !closest ||
      Math.abs(point.timestampMs - pointerTime) <
        Math.abs(closest.timestampMs - pointerTime)
        ? point
        : closest,
    null,
  )
  if (!nearest) return

  const hoverX = xForTime(nearest.timestampMs)
  context.save()
  context.strokeStyle = palette.foreground
  context.globalAlpha = 0.28
  context.setLineDash([3, 4])
  context.beginPath()
  context.moveTo(hoverX, geometry.top)
  context.lineTo(hoverX, size.height - geometry.bottom)
  context.stroke()
  context.restore()

  enabledMetrics.forEach((metric, metricIndex) => {
    const value = nearest[metric]
    const scale = scales[metric]
    if (value === null || !scale) return
    const top = isCombined ? geometry.top : trackTop(metricIndex)
    const y =
      top +
      (1 - (value - scale.minimum) / (scale.maximum - scale.minimum)) *
        geometry.trackHeight
    context.beginPath()
    context.arc(hoverX, y, 3.5, 0, Math.PI * 2)
    context.fillStyle = metricColors[metric]
    context.fill()
    context.strokeStyle = palette.background
    context.lineWidth = 2
    context.stroke()
  })

  const tooltipWidth = 238
  const tooltipHeight = 48 + enabledMetrics.length * 20
  const tooltipX = clamp(
    hoverX + 14,
    geometry.left,
    plotRight - tooltipWidth,
  )
  const tooltipY = clamp(
    pointer.y - tooltipHeight / 2,
    geometry.top,
    size.height - geometry.bottom - tooltipHeight,
  )
  context.fillStyle = palette.popover
  context.strokeStyle = palette.border
  context.lineWidth = 1
  roundedRect(context, tooltipX, tooltipY, tooltipWidth, tooltipHeight, 7)
  context.fill()
  context.stroke()
  context.fillStyle = palette.popoverForeground
  context.textAlign = 'left'
  context.textBaseline = 'top'
  context.font = '600 10px Inter, ui-sans-serif, system-ui'
  context.fillText(
    `${timeFormatter.format(nearest.timestampMs)} UTC`,
    tooltipX + 10,
    tooltipY + 9,
  )
  context.fillStyle = palette.muted
  context.font = '9px Inter, ui-sans-serif, system-ui'
  context.fillText(
    `${nearest.eventId ?? ''} · ${nearest.status ?? ''}`,
    tooltipX + 10,
    tooltipY + 25,
  )

  enabledMetrics.forEach((metric, index) => {
    const value = nearest[metric]
    const rowY = tooltipY + 45 + index * 20
    context.fillStyle = metricColors[metric]
    context.textAlign = 'left'
    context.font = '600 9px Inter, ui-sans-serif, system-ui'
    context.fillText(METRIC_STYLES[metric].shortLabel, tooltipX + 10, rowY)
    context.fillStyle = palette.popoverForeground
    context.textAlign = 'right'
    context.font = '10px ui-monospace, SFMono-Regular, Consolas, monospace'
    context.fillText(
      value === null ? '—' : formatMetric(metric, value),
      tooltipX + tooltipWidth - 10,
      rowY,
    )
  })
}

export function BatteryTelemetryChart({
  rows,
  title,
}: BatteryTelemetryChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointerPositions = useRef(new Map<number, PointerPosition>())
  const gesture = useRef<Gesture | null>(null)
  const [selectedBatteryId, setSelectedBatteryId] = useState('')
  const [enabledMetrics, setEnabledMetrics] = useState<
    readonly BatteryChartMetric[]
  >(BATTERY_CHART_METRICS)
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('combined')
  const [requestedView, setRequestedView] = useState<TimeView | null>(null)
  const [pointer, setPointer] = useState<PointerPosition | null>(null)
  const [size, setSize] = useState<ChartSize>({
    width: 1,
    height: 1,
    dpr: 1,
  })
  const batteryIds = useMemo(
    () => [...new Set(rows.map((row) => row.event.batteryId))].sort(),
    [rows],
  )
  const activeBatteryId = batteryIds.includes(selectedBatteryId)
    ? selectedBatteryId
    : (batteryIds[0] ?? '')
  const points = useMemo(
    () => buildBatteryChartPoints(rows, activeBatteryId),
    [activeBatteryId, rows],
  )
  const realPoints = points.filter((point) => point.eventId !== null)
  const bounds: TimeView = {
    from: realPoints[0]?.timestampMs ?? 0,
    to: realPoints.at(-1)?.timestampMs ?? 1,
  }
  const view = constrainView(requestedView ?? bounds, bounds)
  const visibleCount = realPoints.filter(
    (point) => point.timestampMs >= view.from && point.timestampMs <= view.to,
  ).length

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const updateSize = () => {
      const rectangle = canvas.getBoundingClientRect()
      setSize({
        width: Math.max(1, rectangle.width),
        height: Math.max(1, rectangle.height),
        dpr: clamp(window.devicePixelRatio || 1, 1, 2),
      })
    }
    updateSize()
    const observer = new ResizeObserver(updateSize)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const preventViewportGesture = (event: Event) => event.preventDefault()
    canvas.addEventListener('wheel', preventViewportGesture, {
      passive: false,
    })
    canvas.addEventListener('touchmove', preventViewportGesture, {
      passive: false,
    })
    canvas.addEventListener('gesturestart', preventViewportGesture, {
      passive: false,
    })
    canvas.addEventListener('gesturechange', preventViewportGesture, {
      passive: false,
    })

    return () => {
      canvas.removeEventListener('wheel', preventViewportGesture)
      canvas.removeEventListener('touchmove', preventViewportGesture)
      canvas.removeEventListener('gesturestart', preventViewportGesture)
      canvas.removeEventListener('gesturechange', preventViewportGesture)
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const frame = requestAnimationFrame(() => {
      drawTelemetryChart({
        canvas,
        enabledMetrics,
        layoutMode,
        pointer,
        points,
        size,
        view,
      })
    })
    return () => cancelAnimationFrame(frame)
  }, [enabledMetrics, layoutMode, pointer, points, size, view])

  function setView(nextView: TimeView): void {
    setRequestedView(constrainView(nextView, bounds))
  }

  function toggleMetric(metric: BatteryChartMetric): void {
    setEnabledMetrics((current) => {
      if (current.includes(metric)) {
        return current.length === 1
          ? current
          : current.filter((item) => item !== metric)
      }
      return BATTERY_CHART_METRICS.filter(
        (item) => current.includes(item) || item === metric,
      )
    })
  }

  function localPoint(event: PointerEvent<HTMLCanvasElement>): PointerPosition {
    const rectangle = event.currentTarget.getBoundingClientRect()
    return {
      x: event.clientX - rectangle.left,
      y: event.clientY - rectangle.top,
    }
  }

  function beginPan(pointerId: number, point: PointerPosition): void {
    const geometry = chartGeometry(
      size.width,
      size.height,
      layoutMode === 'combined' ? 1 : enabledMetrics.length,
      layoutMode === 'combined',
    )
    gesture.current = {
      type: 'pan',
      pointerId,
      startX: point.x,
      startView: view,
      plotWidth: geometry.plotWidth,
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLCanvasElement>): void {
    if (realPoints.length < 2) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    const point = localPoint(event)
    pointerPositions.current.set(event.pointerId, point)

    if (pointerPositions.current.size === 1) {
      beginPan(event.pointerId, point)
      return
    }

    const positions = [...pointerPositions.current.values()].slice(0, 2)
    const first = positions[0]
    const second = positions[1]
    if (!first || !second) return
    const geometry = chartGeometry(
      size.width,
      size.height,
      layoutMode === 'combined' ? 1 : enabledMetrics.length,
      layoutMode === 'combined',
    )
    const centerX = (first.x + second.x) / 2
    const ratio = clamp(
      (centerX - geometry.left) / geometry.plotWidth,
      0,
      1,
    )
    gesture.current = {
      type: 'pinch',
      distance: Math.max(
        1,
        Math.hypot(second.x - first.x, second.y - first.y),
      ),
      anchorTime: view.from + ratio * (view.to - view.from),
      startView: view,
      plotLeft: geometry.left,
      plotWidth: geometry.plotWidth,
    }
  }

  function handlePointerMove(event: PointerEvent<HTMLCanvasElement>): void {
    if (pointerPositions.current.has(event.pointerId)) event.preventDefault()
    const point = localPoint(event)
    setPointer(point)
    if (!pointerPositions.current.has(event.pointerId)) return
    pointerPositions.current.set(event.pointerId, point)
    const activeGesture = gesture.current
    if (!activeGesture) return

    if (
      activeGesture.type === 'pan' &&
      activeGesture.pointerId === event.pointerId
    ) {
      const shift =
        -((point.x - activeGesture.startX) / activeGesture.plotWidth) *
        (activeGesture.startView.to - activeGesture.startView.from)
      setView({
        from: activeGesture.startView.from + shift,
        to: activeGesture.startView.to + shift,
      })
      return
    }

    if (activeGesture.type === 'pinch' && pointerPositions.current.size >= 2) {
      const positions = [...pointerPositions.current.values()].slice(0, 2)
      const first = positions[0]
      const second = positions[1]
      if (!first || !second) return
      const distance = Math.max(
        1,
        Math.hypot(second.x - first.x, second.y - first.y),
      )
      const centerX = (first.x + second.x) / 2
      const ratio = clamp(
        (centerX - activeGesture.plotLeft) / activeGesture.plotWidth,
        0,
        1,
      )
      const span =
        (activeGesture.startView.to - activeGesture.startView.from) *
        (activeGesture.distance / distance)
      setView({
        from: activeGesture.anchorTime - ratio * span,
        to: activeGesture.anchorTime + (1 - ratio) * span,
      })
    }
  }

  function handlePointerEnd(event: PointerEvent<HTMLCanvasElement>): void {
    event.preventDefault()
    pointerPositions.current.delete(event.pointerId)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    const remaining = [...pointerPositions.current.entries()][0]
    if (remaining) beginPan(remaining[0], remaining[1])
    else gesture.current = null
  }

  function handleWheel(event: WheelEvent<HTMLCanvasElement>): void {
    if (realPoints.length < 2) return
    event.preventDefault()
    const rectangle = event.currentTarget.getBoundingClientRect()
    const geometry = chartGeometry(
      size.width,
      size.height,
      layoutMode === 'combined' ? 1 : enabledMetrics.length,
      layoutMode === 'combined',
    )
    const span = view.to - view.from

    if (event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY) * 0.7) {
      const delta = Math.abs(event.deltaX) > 0 ? event.deltaX : event.deltaY
      const shift = (delta / geometry.plotWidth) * span
      setView({ from: view.from + shift, to: view.to + shift })
      return
    }

    const ratio = clamp(
      (event.clientX - rectangle.left - geometry.left) / geometry.plotWidth,
      0,
      1,
    )
    const anchor = view.from + ratio * span
    const nextSpan =
      span * Math.exp(clamp(event.deltaY, -240, 240) * 0.0018)
    setView({
      from: anchor - ratio * nextSpan,
      to: anchor + (1 - ratio) * nextSpan,
    })
  }

  function handleKeyDown(event: KeyboardEvent<HTMLCanvasElement>): void {
    const span = view.to - view.from
    if (
      (event.altKey || event.metaKey) &&
      (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
    ) {
      event.preventDefault()
      return
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      const shift = span * 0.12 * (event.key === 'ArrowLeft' ? -1 : 1)
      setView({ from: view.from + shift, to: view.to + shift })
    } else if (['+', '=', '-', '_'].includes(event.key)) {
      event.preventDefault()
      const nextSpan =
        span * (event.key === '+' || event.key === '=' ? 0.78 : 1.28)
      const center = (view.from + view.to) / 2
      setView({
        from: center - nextSpan / 2,
        to: center + nextSpan / 2,
      })
    } else if (event.key === '0' || event.key === 'Home') {
      event.preventDefault()
      setRequestedView(null)
    } else if (
      event.key.toLocaleLowerCase() === 'l' ||
      event.key === 'End'
    ) {
      event.preventDefault()
      setView(latestView(bounds))
    }
  }

  function handleBatteryChange(batteryId: string): void {
    setSelectedBatteryId(batteryId)
    setRequestedView(null)
    setPointer(null)
  }

  if (batteryIds.length === 0) {
    return (
      <Empty
        aria-label="Battery telemetry chart"
        className="h-[500px] border bg-background md:h-[560px]"
        role="status"
      >
        <EmptyHeader>
          <EmptyTitle>No telemetry history</EmptyTitle>
          <EmptyDescription>
            There are no battery observations available to chart.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <section
      aria-label="Battery telemetry chart"
      className="flex h-[500px] min-h-0 w-full flex-col overflow-hidden rounded-lg border bg-background md:h-[560px]"
    >
      <header className="flex min-h-11 shrink-0 flex-wrap items-center gap-2 border-b bg-background/95 px-2.5 py-1.5 md:flex-nowrap">
        <div className="flex min-w-28 flex-1 items-center border-r pr-2.5 md:max-w-44 md:shrink-0">
          {batteryIds.length > 1 ? (
            <Select
              onValueChange={handleBatteryChange}
              value={activeBatteryId}
            >
              <SelectTrigger
                aria-label="Battery"
                className="h-7 w-full px-2 text-xs font-semibold shadow-none"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start">
                {batteryIds.map((batteryId) => (
                  <SelectItem key={batteryId} value={batteryId}>
                    {batteryId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="truncate text-xs font-semibold">
              {title ?? activeBatteryId}
            </span>
          )}
        </div>

        <fieldset className="order-3 flex min-w-0 basis-full items-center gap-0.5 overflow-x-auto border-0 p-0 md:order-none md:flex-1 md:basis-auto">
          <legend className="sr-only">Visible telemetry metrics</legend>
          {BATTERY_CHART_METRICS.map((metric) => {
            const isEnabled = enabledMetrics.includes(metric)
            const color = readThemeColor(
              METRIC_STYLES[metric].colorVariable,
              METRIC_STYLES[metric].fallback,
            )
            return (
              <label
                className={`inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-md px-2 text-[11px] transition hover:bg-accent/70 hover:text-foreground ${isEnabled ? 'text-foreground' : 'text-muted-foreground'}`}
                key={metric}
              >
                <input
                  aria-label={`Toggle ${TELEMETRY_METRICS[metric].label}`}
                  checked={isEnabled}
                  className="size-3.5 rounded border-input bg-background"
                  onChange={() => toggleMetric(metric)}
                  style={{ accentColor: color }}
                  type="checkbox"
                />
                <span
                  aria-hidden="true"
                  className="h-0.5 w-4 rounded-full"
                  style={{ background: color }}
                />
                <span className="whitespace-nowrap font-semibold">
                  {METRIC_STYLES[metric].shortLabel}
                </span>
              </label>
            )
          })}
        </fieldset>

        <fieldset
          aria-label="Chart layout"
          className="inline-flex h-8 shrink-0 items-center gap-0.5 rounded-lg border bg-muted/40 p-0.5"
        >
          <legend className="sr-only">Chart layout</legend>
          {(
            [
              ['combined', 'Combined', 'Overlay enabled metrics using independent scales'],
              ['separate', 'Separate', 'Show each metric in a synchronized pane'],
            ] as const
          ).map(([value, label, title]) => (
            <label className="relative block shrink-0 cursor-pointer" key={value} title={title}>
              <input
                aria-label={title}
                checked={layoutMode === value}
                className="peer absolute inset-0 size-full cursor-pointer opacity-0"
                name="telemetry-layout"
                onChange={() => setLayoutMode(value)}
                type="radio"
                value={value}
              />
              <span className="flex h-6 items-center justify-center rounded-md px-2 text-[10px] font-semibold whitespace-nowrap text-muted-foreground transition peer-checked:bg-foreground peer-checked:text-background peer-focus-visible:outline-2 peer-focus-visible:outline-ring">
                {label}
              </span>
            </label>
          ))}
        </fieldset>

        <output className="sr-only" aria-live="polite">
          {realPoints.length} records, {visibleCount} visible
        </output>
      </header>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <canvas
          aria-label={
            layoutMode === 'combined'
              ? 'Interactive combined battery telemetry chart using independent metric scales. Drag to pan, use the wheel or pinch to zoom, and double-click to fit all data.'
              : 'Interactive battery telemetry chart with one synchronized pane per metric. Drag to pan, use the wheel or pinch to zoom, and double-click to fit all data.'
          }
          className="block size-full cursor-crosshair touch-none overscroll-none bg-background outline-none select-none focus-visible:shadow-[inset_0_0_0_1px_var(--ring)]"
          draggable={false}
          onContextMenu={(event) => event.preventDefault()}
          onDoubleClick={() => {
            const totalSpan = bounds.to - bounds.from
            const currentSpan = view.to - view.from
            if (currentSpan > totalSpan * 0.88) setView(latestView(bounds))
            else setRequestedView(null)
          }}
          onKeyDown={handleKeyDown}
          onPointerCancel={handlePointerEnd}
          onPointerDown={handlePointerDown}
          onPointerLeave={() => {
            if (pointerPositions.current.size === 0) setPointer(null)
          }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onWheel={handleWheel}
          ref={canvasRef}
          role="img"
          tabIndex={0}
        />
      </div>
    </section>
  )
}
