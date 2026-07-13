export type BoxPlotDatum = {
  readonly color: string
  readonly count: number
  readonly label: string
  readonly maximum: number
  readonly median: number
  readonly minimum: number
  readonly p10: number
  readonly p25: number
  readonly p75: number
  readonly p90: number
}

export type DistributionBoxPlotProps = {
  readonly ariaLabel: string
  readonly data: readonly BoxPlotDatum[]
  readonly formatValue: (value: number) => string
}

const WIDTH = 720
const LEFT = 104
const RIGHT = 30
const TOP = 14
const ROW_HEIGHT = 52
const BOTTOM = 30

export function DistributionBoxPlot({
  ariaLabel,
  data,
  formatValue,
}: DistributionBoxPlotProps) {
  if (data.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No data</p>
  }

  const observedMinimum = Math.min(...data.map((item) => item.minimum))
  const observedMaximum = Math.max(...data.map((item) => item.maximum))
  const padding = Math.max((observedMaximum - observedMinimum) * 0.04, 0.01)
  const minimum = observedMinimum - padding
  const maximum = observedMaximum + padding
  const plotWidth = WIDTH - LEFT - RIGHT
  const height = TOP + data.length * ROW_HEIGHT + BOTTOM
  const toX = (value: number) =>
    LEFT + ((value - minimum) / (maximum - minimum)) * plotWidth

  return (
    <svg
      aria-label={ariaLabel}
      className="block h-auto w-full"
      role="img"
      viewBox={`0 0 ${WIDTH} ${height}`}
    >
      {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
        const x = LEFT + ratio * plotWidth
        const value = minimum + ratio * (maximum - minimum)
        return (
          <g key={ratio}>
            <line
              stroke="var(--border)"
              strokeDasharray="3 5"
              x1={x}
              x2={x}
              y1={TOP}
              y2={height - BOTTOM}
            />
            <text
              fill="var(--muted-foreground)"
              fontSize="10"
              textAnchor={ratio === 0 ? 'start' : ratio === 1 ? 'end' : 'middle'}
              x={x}
              y={height - 8}
            >
              {formatValue(value)}
            </text>
          </g>
        )
      })}

      {data.map((item, index) => {
        const centerY = TOP + index * ROW_HEIGHT + ROW_HEIGHT / 2
        const boxTop = centerY - 10
        return (
          <g key={item.label}>
            <title>{`${item.label}: minimum ${formatValue(item.minimum)}, P10 ${formatValue(item.p10)}, median ${formatValue(item.median)}, P90 ${formatValue(item.p90)}, maximum ${formatValue(item.maximum)}, ${item.count} events`}</title>
            <text
              dominantBaseline="middle"
              fill="var(--foreground)"
              fontSize="11"
              fontWeight="600"
              x="4"
              y={centerY - 5}
            >
              {item.label}
            </text>
            <text
              dominantBaseline="middle"
              fill="var(--muted-foreground)"
              fontSize="9"
              x="4"
              y={centerY + 10}
            >
              {item.count.toLocaleString()} events
            </text>
            <line
              stroke={item.color}
              strokeWidth="1.5"
              x1={toX(item.minimum)}
              x2={toX(item.maximum)}
              y1={centerY}
              y2={centerY}
            />
            <line
              stroke={item.color}
              strokeWidth="1.5"
              x1={toX(item.minimum)}
              x2={toX(item.minimum)}
              y1={centerY - 6}
              y2={centerY + 6}
            />
            <line
              stroke={item.color}
              strokeWidth="1.5"
              x1={toX(item.maximum)}
              x2={toX(item.maximum)}
              y1={centerY - 6}
              y2={centerY + 6}
            />
            <rect
              fill={item.color}
              fillOpacity="0.18"
              height="20"
              stroke={item.color}
              width={Math.max(1, toX(item.p75) - toX(item.p25))}
              x={toX(item.p25)}
              y={boxTop}
            />
            <line
              stroke={item.color}
              strokeWidth="3"
              x1={toX(item.median)}
              x2={toX(item.median)}
              y1={boxTop}
              y2={boxTop + 20}
            />
            <circle cx={toX(item.p10)} cy={centerY} fill={item.color} r="2.5" />
            <circle cx={toX(item.p90)} cy={centerY} fill={item.color} r="2.5" />
          </g>
        )
      })}
    </svg>
  )
}
