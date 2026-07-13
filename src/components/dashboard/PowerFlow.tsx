import type { CSSProperties, ReactNode } from 'react'

import './PowerFlow.css'

type PowerFlowProps = {
  readonly chargingKilowatts: number
  readonly dischargingKilowatts: number
}

type FlowSide = 'left' | 'right'

type EnergyPathsOptions = {
  readonly side: FlowSide
  readonly gradientId: string
  readonly glowId: string
  readonly maskId: string
  readonly level: number
}

type SegmentRailOptions = {
  readonly side: FlowSide
  readonly color: string
  readonly glowId: string
  readonly railGradient: string
  readonly level: number
}

type MetricOptions = {
  readonly side: FlowSide
  readonly label: string
  readonly value: string
  readonly color: string
  readonly glow: string
}

const FLOW_OFFSETS = [
  -92, -72, -56, -43, -32, -22, -13, -5, 4, 13, 23, 35, 49, 67, 90,
] as const

const MAX_RAIL_POWER_KILOWATTS = 2.2

const DOT_GLYPHS: Readonly<Record<string, readonly string[]>> = {
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '10000', '11110', '00001', '00001', '11110'],
  '6': ['01110', '10000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00001', '01110'],
  '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  '.': ['0', '0', '0', '0', '0', '0', '1'],
}

function renderDotMatrix(
  text: string,
  color: string,
  glow: string,
  className: string,
): ReactNode {
  const cell = 8
  const gap = 1
  const widths = [...text].map(
    (character) => DOT_GLYPHS[character]?.[0]?.length ?? 0,
  )
  const totalColumns =
    widths.reduce((sum, width) => sum + width, 0) + gap * (text.length - 1)
  const dots: ReactNode[] = []
  let cursor = 0

  ;[...text].forEach((character, characterIndex) => {
    const glyph = DOT_GLYPHS[character]
    if (!glyph) return

    glyph.forEach((row, rowIndex) => {
      ;[...row].forEach((value, columnIndex) => {
        if (value !== '1') return

        dots.push(
          <circle
            cx={(cursor + columnIndex) * cell + cell / 2}
            cy={rowIndex * cell + cell / 2}
            key={`${characterIndex}-${rowIndex}-${columnIndex}`}
            r="2.55"
          />,
        )
      })
    })
    cursor += (widths[characterIndex] ?? 0) + gap
  })

  return (
    <svg
      aria-label={text}
      className={className}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      style={{ color, filter: `drop-shadow(0 0 4px ${glow})` }}
      viewBox={`0 0 ${totalColumns * cell} ${7 * cell}`}
    >
      <g fill="currentColor">{dots}</g>
    </svg>
  )
}

function renderDotMatrixGroup(
  text: string,
  centerX: number,
  top: number,
  color: string,
): ReactNode {
  const cellX = 9.4
  const cellY = 10.1
  const gap = 1
  const widths = [...text].map(
    (character) => DOT_GLYPHS[character]?.[0]?.length ?? 0,
  )
  const totalColumns =
    widths.reduce((sum, width) => sum + width, 0) + gap * (text.length - 1)
  const startX = centerX - (totalColumns * cellX) / 2
  const dots: ReactNode[] = []
  let cursor = 0

  ;[...text].forEach((character, characterIndex) => {
    const glyph = DOT_GLYPHS[character]
    if (!glyph) return

    glyph.forEach((row, rowIndex) => {
      ;[...row].forEach((value, columnIndex) => {
        if (value !== '1') return

        dots.push(
          <circle
            cx={startX + (cursor + columnIndex) * cellX + cellX / 2}
            cy={top + rowIndex * cellY + cellY / 2}
            key={`center-${characterIndex}-${rowIndex}-${columnIndex}`}
            r="2.95"
          />,
        )
      })
    })
    cursor += (widths[characterIndex] ?? 0) + gap
  })

  return (
    <g fill={color} filter="url(#power-lime-glow)">
      {dots}
    </g>
  )
}

function renderEnergyPaths({
  side,
  gradientId,
  glowId,
  maskId,
  level,
}: EnergyPathsOptions): ReactNode {
  const isLeft = side === 'left'
  const strength = Math.max(0, Math.min(1, level))
  const phases = [0, Math.PI / 2, Math.PI, Math.PI * 1.5, 0]

  return (
    <g aria-hidden="true" mask={`url(#${maskId})`}>
      {FLOW_OFFSETS.map((offset, index) => {
        const yFar = 342 + offset * 0.27
        const yRail = 342 + offset * 0.88
        const yBend = 342 + offset * 0.78
        const yInner = 340 + offset * 0.68
        const makePath = (phase: number) => {
          const waveA = Math.sin(index * 0.79 + phase) * 4.2
          const waveB = Math.cos(index * 0.63 + phase) * 3.6
          const waveC = Math.sin(index * 0.47 + phase + 1.1) * 3.8

          return isLeft
            ? `M 38 ${yFar + waveA * 0.16} C 128 ${yFar + waveA}, 206 ${yFar - waveB}, 281 ${yRail + waveB * 0.38} C 334 ${yRail + waveC}, 430 ${yBend - waveA}, 550 ${yInner + waveB * 0.28}`
            : `M 1162 ${yFar + waveA * 0.16} C 1072 ${yFar + waveA}, 994 ${yFar - waveB}, 919 ${yRail + waveB * 0.38} C 866 ${yRail + waveC}, 770 ${yBend - waveA}, 650 ${yInner + waveB * 0.28}`
        }
        const frames = phases.map(makePath)
        const firstFrame = frames[0] ?? ''
        const pathValues = frames.join(';')
        const duration = `${5.2 + (index % 6) * 0.38}s`
        const begin = `${-(index * 0.41 + (index % 3) * 0.3)}s`
        const edgeWeight = Math.max(0.18, 1 - Math.abs(offset) / 132)
        const lineOpacity = edgeWeight * (0.28 + strength * 0.72)
        const glowWidth = 3.4 + strength * 3.2
        const coreWidth = 0.72 + strength * 0.72
        const indicatorStyle = {
          '--power-indicator-delay': `${-(index * 0.43 + (isLeft ? 0 : 0.8))}s`,
          '--power-indicator-speed': `${3.45 + (index % 4) * 0.36}s`,
          '--power-indicator-travel': isLeft ? '-100' : '100',
        } as CSSProperties

        return (
          <g
            key={`${side}-${offset}`}
            opacity={lineOpacity}
            style={{ transition: 'opacity 180ms linear' }}
          >
            <path
              className="power-liquid-flow-glow"
              d={firstFrame}
              filter={`url(#${glowId})`}
              opacity=".11"
              stroke={`url(#${gradientId})`}
              strokeWidth={glowWidth}
            >
              <animate
                attributeName="d"
                begin={begin}
                dur={duration}
                repeatCount="indefinite"
                values={pathValues}
              />
            </path>
            <path
              className="power-liquid-flow-core"
              d={firstFrame}
              opacity=".56"
              stroke={`url(#${gradientId})`}
              strokeWidth={coreWidth}
            >
              <animate
                attributeName="d"
                begin={begin}
                dur={duration}
                repeatCount="indefinite"
                values={pathValues}
              />
            </path>
            {index % 2 === 0 && (
              <path
                className="power-flow-indicator"
                d={firstFrame}
                filter={`url(#${glowId})`}
                opacity={0.3 + strength * 0.42}
                pathLength="100"
                stroke={`url(#${gradientId})`}
                strokeWidth={1.05 + strength * 1.15}
                style={indicatorStyle}
              >
                <animate
                  attributeName="d"
                  begin={begin}
                  dur={duration}
                  repeatCount="indefinite"
                  values={pathValues}
                />
              </path>
            )}
          </g>
        )
      })}
    </g>
  )
}

function renderSegmentRail({
  side,
  color,
  glowId,
  railGradient,
  level,
}: SegmentRailOptions): ReactNode {
  const isLeft = side === 'left'
  const clampedLevel = Math.max(0, Math.min(1, level))
  const fillY = 460 - 342 * clampedLevel
  const fillClipId = `power-${side}-rail-fill`
  const surfaceClipId = `power-${side}-rail-surface`
  const waveGradientId = `power-${side}-rail-wave`
  const path = isLeft
    ? 'M 330 118 A 308 308 0 0 0 281 460'
    : 'M 831 118 A 316 316 0 0 1 884 460'
  const waveStart = 180
  const waveEnd = 1020
  const waveLength = 32
  const waveAmplitude = 3
  const surfacePhases = isLeft ? [0, 8, 16, 24, 32] : [32, 24, 16, 8, 0]
  const surfaceLineFrames = surfacePhases.map((phase) => {
    const points: string[] = []

    for (let x = waveStart; x <= waveEnd; x += 4) {
      const y =
        Math.sin(((x - waveStart + phase) / waveLength) * Math.PI * 2) *
        waveAmplitude
      points.push(`${x === waveStart ? 'M' : 'L'} ${x} ${y.toFixed(2)}`)
    }

    return points.join(' ')
  })
  const surfaceFillFrames = surfaceLineFrames.map(
    (line) => `${line} V 500 H ${waveStart} Z`,
  )
  const firstSurfaceFill = surfaceFillFrames[0] ?? ''
  const firstSurfaceLine = surfaceLineFrames[0] ?? ''
  const surfaceLineValues = surfaceLineFrames.join(';')
  const surfaceFillValues = surfaceFillFrames.join(';')
  const surfaceDuration = isLeft ? '4.8s' : '5.25s'
  const surfaceBegin = isLeft ? '-.8s' : '-2.1s'

  return (
    <g aria-hidden="true">
      <defs>
        <clipPath clipPathUnits="userSpaceOnUse" id={fillClipId}>
          <path
            d={firstSurfaceFill}
            fill="white"
            transform={`translate(0 ${fillY})`}
          >
            <animate
              attributeName="d"
              begin={surfaceBegin}
              dur={surfaceDuration}
              repeatCount="indefinite"
              values={surfaceFillValues}
            />
          </path>
        </clipPath>
        <clipPath clipPathUnits="userSpaceOnUse" id={surfaceClipId}>
          <path
            d={path}
            fill="none"
            stroke="white"
            strokeLinecap="round"
            strokeWidth="25"
          />
        </clipPath>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id={waveGradientId}
          x1="0"
          x2="0"
          y1={isLeft ? '500' : '50'}
          y2={isLeft ? '610' : '160'}
        >
          <stop offset="0" stopColor={color} stopOpacity="0" />
          <stop offset=".3" stopColor={color} stopOpacity=".06" />
          <stop offset=".5" stopColor="var(--power-rail-highlight)" stopOpacity=".58" />
          <stop offset=".7" stopColor={color} stopOpacity=".24" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
          <animate
            attributeName="y1"
            begin={isLeft ? '-1.1s' : '-2.3s'}
            dur={isLeft ? '3.8s' : '4.2s'}
            repeatCount="indefinite"
            values={isLeft ? '500;50' : '50;500'}
          />
          <animate
            attributeName="y2"
            begin={isLeft ? '-1.1s' : '-2.3s'}
            dur={isLeft ? '3.8s' : '4.2s'}
            repeatCount="indefinite"
            values={isLeft ? '610;160' : '160;610'}
          />
        </linearGradient>
      </defs>

      <path
        d={path}
        fill="none"
        opacity=".86"
        stroke="var(--power-dial-deep)"
        strokeLinecap="round"
        strokeWidth="35"
      />
      <path
        d={path}
        fill="none"
        stroke="var(--power-dial-outer)"
        strokeLinecap="round"
        strokeWidth="31"
      />
      <path
        d={path}
        fill="none"
        stroke="var(--power-dial-deep)"
        strokeLinecap="round"
        strokeWidth="27"
      />
      <path
        d={path}
        fill="none"
        pathLength="360"
        stroke="var(--power-rail-inactive)"
        strokeDasharray="22 5"
        strokeLinecap="butt"
        strokeOpacity=".82"
        strokeWidth="13"
      />
      <path
        clipPath={`url(#${fillClipId})`}
        d={path}
        fill="none"
        filter={`url(#${glowId})`}
        stroke={color}
        strokeLinecap="round"
        strokeOpacity=".16"
        strokeWidth="25"
      />
      <path
        className="power-rail-glow"
        clipPath={`url(#${fillClipId})`}
        d={path}
        fill="none"
        filter={`url(#${glowId})`}
        pathLength="360"
        stroke={`url(#${railGradient})`}
        strokeDasharray="22 5"
        strokeLinecap="butt"
        strokeWidth="13"
      />
      <path
        clipPath={`url(#${fillClipId})`}
        d={path}
        fill="none"
        filter={`url(#${glowId})`}
        pathLength="360"
        stroke={`url(#${waveGradientId})`}
        strokeDasharray="22 5"
        strokeLinecap="butt"
        strokeWidth="7"
      />
      <g
        clipPath={`url(#${surfaceClipId})`}
        transform={`translate(0 ${fillY})`}
      >
        <path
          d={firstSurfaceLine}
          fill="none"
          filter={`url(#${glowId})`}
          opacity=".86"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.2"
        >
          <animate
            attributeName="d"
            begin={surfaceBegin}
            dur={surfaceDuration}
            repeatCount="indefinite"
            values={surfaceLineValues}
          />
        </path>
        <path
          d={firstSurfaceLine}
          fill="none"
          opacity=".34"
          stroke="var(--power-rail-highlight)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth=".75"
        >
          <animate
            attributeName="d"
            begin={surfaceBegin}
            dur={surfaceDuration}
            repeatCount="indefinite"
            values={surfaceLineValues}
          />
        </path>
      </g>
      <path
        d={path}
        fill="none"
        pathLength="360"
        stroke="var(--power-rail-highlight)"
        strokeDasharray="22 5"
        strokeLinecap="butt"
        strokeOpacity=".14"
        strokeWidth="1.1"
      />
    </g>
  )
}

function renderGaugeTicks(): ReactNode {
  return (
    <g aria-hidden="true">
      {Array.from({ length: 45 }, (_, index) => {
        const angle = -132 + index * 6
        const isMajor = index % 5 === 0

        return (
          <line
            key={angle}
            opacity=".72"
            stroke={
              isMajor ? 'var(--power-tick-major)' : 'var(--power-tick-minor)'
            }
            strokeLinecap="round"
            strokeWidth={isMajor ? '2.3' : '1.55'}
            transform={`rotate(${angle} 600 313)`}
            x1="600"
            x2="600"
            y1="135"
            y2={isMajor ? '116' : '120'}
          />
        )
      })}
    </g>
  )
}

function renderMetric({
  side,
  label,
  value,
  color,
  glow,
}: MetricOptions): ReactNode {
  const isRight = side === 'right'

  return (
    <div
      className={`absolute top-[20.6%] z-10 flex w-[19%] flex-col ${isRight ? 'right-[8.6%] items-end text-right' : 'left-[7.1%] items-start text-left'}`}
    >
      <div className="-translate-y-[clamp(2px,.65vw,8px)] text-[clamp(8px,1.42vw,18px)] font-medium tracking-[-.025em] text-[var(--power-label)] [text-shadow:0_1px_2px_var(--power-text-shadow)]">
        {label}
      </div>
      {renderDotMatrix(
        value,
        color,
        glow,
        'mt-[5%] h-auto w-[49%] min-w-[54px]',
      )}
      <div className="mt-[6%] text-[clamp(8px,1.32vw,17px)] tracking-wide text-[var(--power-label-soft)]">
        kW
      </div>
    </div>
  )
}

function renderPowerFlowGraphic(
  chargeLevel: number,
  dischargeLevel: number,
  netWatts: number,
): ReactNode {
  const netText = `${netWatts >= 0 ? '+' : '-'}${Math.abs(netWatts)}`

  return (
    <svg
      aria-label="Animated power flow visualization showing charging and discharging energy"
      className="absolute inset-0 z-[2] h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      viewBox="0 0 1200 600"
    >
      <defs>
        <filter
          colorInterpolationFilters="sRGB"
          height="260%"
          id="power-green-glow"
          width="260%"
          x="-80%"
          y="-80%"
        >
          <feGaussianBlur result="blur" stdDeviation="4.8" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter
          colorInterpolationFilters="sRGB"
          height="260%"
          id="power-amber-glow"
          width="260%"
          x="-80%"
          y="-80%"
        >
          <feGaussianBlur result="blur" stdDeviation="4.6" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter
          colorInterpolationFilters="sRGB"
          height="260%"
          id="power-lime-glow"
          width="260%"
          x="-80%"
          y="-80%"
        >
          <feGaussianBlur result="blur" stdDeviation="4" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter height="220%" id="power-soft-blur" width="160%" x="-30%" y="-60%">
          <feGaussianBlur stdDeviation="13" />
        </filter>
        <filter height="170%" id="power-dial-shadow" width="160%" x="-30%" y="-30%">
          <feDropShadow
            dx="0"
            dy="6"
            floodColor="var(--power-dial-shadow)"
            floodOpacity=".52"
            stdDeviation="5"
          />
        </filter>

        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="power-green-flow"
          x1="42"
          x2="448"
          y1="0"
          y2="0"
        >
          <stop offset="0" stopColor="var(--power-charge-flow-a)" stopOpacity="0" />
          <stop offset=".2" stopColor="var(--power-charge-flow-a)" stopOpacity=".3" />
          <stop offset=".6" stopColor="var(--power-charge-flow-b)" stopOpacity=".72" />
          <stop offset="1" stopColor="var(--power-charge-flow-c)" stopOpacity=".95" />
        </linearGradient>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="power-amber-flow"
          x1="1158"
          x2="752"
          y1="0"
          y2="0"
        >
          <stop offset="0" stopColor="var(--power-discharge-flow-a)" stopOpacity="0" />
          <stop offset=".2" stopColor="var(--power-discharge-flow-a)" stopOpacity=".28" />
          <stop offset=".6" stopColor="var(--power-discharge-flow-b)" stopOpacity=".7" />
          <stop offset="1" stopColor="var(--power-discharge-flow-c)" stopOpacity=".93" />
        </linearGradient>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="power-left-field-fade"
          x1="38"
          x2="449"
          y1="0"
          y2="0"
        >
          <stop offset="0" stopColor="black" />
          <stop offset=".16" stopColor="#303030" />
          <stop offset=".42" stopColor="#c7c7c7" />
          <stop offset=".7" stopColor="white" />
          <stop offset="1" stopColor="white" />
        </linearGradient>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="power-right-field-fade"
          x1="1162"
          x2="751"
          y1="0"
          y2="0"
        >
          <stop offset="0" stopColor="black" />
          <stop offset=".16" stopColor="#303030" />
          <stop offset=".42" stopColor="#c7c7c7" />
          <stop offset=".7" stopColor="white" />
          <stop offset="1" stopColor="white" />
        </linearGradient>
        <mask
          height="300"
          id="power-left-flow-mask"
          maskUnits="userSpaceOnUse"
          width="580"
          x="20"
          y="180"
        >
          <rect
            fill="url(#power-left-field-fade)"
            height="300"
            width="580"
            x="20"
            y="180"
          />
        </mask>
        <mask
          height="300"
          id="power-right-flow-mask"
          maskUnits="userSpaceOnUse"
          width="580"
          x="600"
          y="180"
        >
          <rect
            fill="url(#power-right-field-fade)"
            height="300"
            width="580"
            x="600"
            y="180"
          />
        </mask>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="power-green-haze"
          x1="30"
          x2="455"
          y1="0"
          y2="0"
        >
          <stop offset="0" stopColor="var(--power-charge-haze-a)" stopOpacity="0" />
          <stop offset=".42" stopColor="var(--power-charge-haze-b)" stopOpacity=".1" />
          <stop offset=".82" stopColor="var(--power-charge-haze-c)" stopOpacity=".26" />
          <stop offset="1" stopColor="var(--power-charge-haze-d)" stopOpacity=".08" />
        </linearGradient>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="power-amber-haze"
          x1="1170"
          x2="745"
          y1="0"
          y2="0"
        >
          <stop offset="0" stopColor="var(--power-discharge-haze-a)" stopOpacity="0" />
          <stop offset=".42" stopColor="var(--power-discharge-haze-b)" stopOpacity=".09" />
          <stop offset=".82" stopColor="var(--power-discharge-haze-c)" stopOpacity=".24" />
          <stop offset="1" stopColor="var(--power-discharge-haze-d)" stopOpacity=".07" />
        </linearGradient>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="power-green-rail"
          x1="0"
          x2="0"
          y1="126"
          y2="465"
        >
          <stop offset="0" stopColor="var(--power-charge-rail-a)" />
          <stop offset=".22" stopColor="var(--power-charge-rail-b)" />
          <stop offset=".76" stopColor="var(--power-charge-rail-c)" />
          <stop offset="1" stopColor="var(--power-charge-rail-d)" />
        </linearGradient>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id="power-amber-rail"
          x1="0"
          x2="0"
          y1="126"
          y2="465"
        >
          <stop offset="0" stopColor="var(--power-discharge-rail-a)" />
          <stop offset=".22" stopColor="var(--power-discharge-rail-b)" />
          <stop offset=".76" stopColor="var(--power-discharge-rail-c)" />
          <stop offset="1" stopColor="var(--power-discharge-rail-d)" />
        </linearGradient>

        <radialGradient cx="39%" cy="28%" id="power-dial-face" r="78%">
          <stop offset="0" stopColor="var(--power-dial-face-a)" />
          <stop offset=".56" stopColor="var(--power-dial-face-b)" />
          <stop offset="1" stopColor="var(--power-dial-face-c)" />
        </radialGradient>
        <linearGradient id="power-dial-rim" x1="0" x2="1" y1="0" y2="0">
          <stop stopColor="var(--power-dial-mid)" />
          <stop offset=".24" stopColor="var(--power-dial-line)" />
          <stop offset=".5" stopColor="var(--power-dial-mid)" />
          <stop offset=".76" stopColor="var(--power-dial-line)" />
          <stop offset="1" stopColor="var(--power-dial-mid)" />
        </linearGradient>
        <radialGradient id="power-hub-glow">
          <stop offset="0" stopColor="var(--power-dial-mid)" stopOpacity=".62" />
          <stop offset=".56" stopColor="var(--power-dial-outer)" stopOpacity=".18" />
          <stop offset="1" stopColor="var(--power-dial-deep)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="600" cy="313" fill="url(#power-hub-glow)" r="274" />
      <path
        className="power-energy-haze"
        d="M 24 225 C 180 222, 315 258, 458 308 C 336 351, 212 441, 24 448 Z"
        fill="url(#power-green-haze)"
        filter="url(#power-soft-blur)"
        style={{ opacity: 0.12 + chargeLevel * 0.28 }}
      />
      <path
        className="power-energy-haze"
        d="M 1176 225 C 1020 222, 885 258, 742 308 C 864 351, 988 441, 1176 448 Z"
        fill="url(#power-amber-haze)"
        filter="url(#power-soft-blur)"
        style={{ opacity: 0.12 + dischargeLevel * 0.28 }}
      />

      <g>
        <circle
          cx="600"
          cy="313"
          fill="var(--power-dial-deep)"
          filter="url(#power-dial-shadow)"
          opacity=".94"
          r="206"
        />
        <circle
          cx="600"
          cy="313"
          fill="var(--power-dial-outer)"
          r="201"
          stroke="var(--power-dial-deep)"
          strokeWidth="3"
        />
        <circle
          cx="600"
          cy="313"
          fill="none"
          r="190"
          stroke="var(--power-dial-mid)"
          strokeWidth="18"
        />
        <circle
          cx="600"
          cy="313"
          fill="none"
          r="200"
          stroke="var(--power-dial-line)"
          strokeOpacity=".32"
          strokeWidth="1.4"
        />
        {renderGaugeTicks()}
        <circle
          cx="600"
          cy="313"
          fill="none"
          pathLength="360"
          r="164"
          stroke="var(--power-dial-deep)"
          strokeDasharray="278 82"
          strokeLinecap="round"
          strokeWidth="24"
          transform="rotate(131 600 313)"
        />
        <circle
          cx="600"
          cy="313"
          fill="none"
          pathLength="360"
          r="164"
          stroke="url(#power-dial-rim)"
          strokeDasharray="278 82"
          strokeLinecap="round"
          strokeWidth="17"
          transform="rotate(131 600 313)"
        />
        <circle
          cx="600"
          cy="313"
          fill="none"
          pathLength="360"
          r="164"
          stroke="var(--power-dial-line)"
          strokeDasharray="278 82"
          strokeLinecap="round"
          strokeOpacity=".42"
          strokeWidth="1.4"
          transform="rotate(131 600 313)"
        />
      </g>

      {renderEnergyPaths({
        side: 'left',
        gradientId: 'power-green-flow',
        glowId: 'power-green-glow',
        maskId: 'power-left-flow-mask',
        level: chargeLevel,
      })}
      {renderEnergyPaths({
        side: 'right',
        gradientId: 'power-amber-flow',
        glowId: 'power-amber-glow',
        maskId: 'power-right-flow-mask',
        level: dischargeLevel,
      })}
      {renderSegmentRail({
        side: 'left',
        color: 'var(--power-charge-rail-color)',
        glowId: 'power-green-glow',
        railGradient: 'power-green-rail',
        level: chargeLevel,
      })}
      {renderSegmentRail({
        side: 'right',
        color: 'var(--power-discharge-rail-color)',
        glowId: 'power-amber-glow',
        railGradient: 'power-amber-rail',
        level: dischargeLevel,
      })}

      <g>
        <circle
          cx="600"
          cy="313"
          fill="url(#power-dial-face)"
          r="151"
          stroke="var(--power-dial-deep)"
          strokeWidth="5"
        />
        <circle
          cx="600"
          cy="313"
          fill="none"
          r="147"
          stroke="var(--power-dial-line)"
          strokeOpacity=".58"
          strokeWidth="1.5"
        />
      </g>

      {renderDotMatrixGroup(
        netText,
        593,
        255,
        netWatts >= 0
          ? 'var(--power-net-readout)'
          : 'var(--power-discharge-readout)',
      )}
      <text
        fill="var(--power-foreground)"
        fontFamily="Inter, ui-sans-serif, system-ui"
        fontSize="33"
        fontWeight="300"
        opacity=".86"
        textAnchor="middle"
        x="595"
        y="381"
      >
        W
      </text>
    </svg>
  )
}

export function PowerFlow({
  chargingKilowatts,
  dischargingKilowatts,
}: PowerFlowProps) {
  const netWatts = Math.round(
    (chargingKilowatts - dischargingKilowatts) * 1000,
  )
  const chargeLevel = chargingKilowatts / MAX_RAIL_POWER_KILOWATTS
  const dischargeLevel = dischargingKilowatts / MAX_RAIL_POWER_KILOWATTS

  return (
    <section
      aria-label="Power flow control panel"
      className="power-instrument-panel relative w-full max-w-[1200px] overflow-hidden"
    >
      <span
        aria-hidden="true"
        className="power-screw left-[2.1%] top-[3.9%]"
      />
      <span
        aria-hidden="true"
        className="power-screw right-[2.1%] top-[3.9%]"
      />
      <span
        aria-hidden="true"
        className="power-screw bottom-[3.5%] left-[2.1%]"
      />
      <span
        aria-hidden="true"
        className="power-screw bottom-[3.5%] right-[2.1%]"
      />

      {renderMetric({
        side: 'left',
        label: 'CHARGING',
        value: chargingKilowatts.toFixed(2),
        color: 'var(--power-charge-readout)',
        glow: 'var(--power-charge-readout-glow)',
      })}
      {renderMetric({
        side: 'right',
        label: 'DISCHARGING',
        value: dischargingKilowatts.toFixed(2),
        color: 'var(--power-discharge-readout)',
        glow: 'var(--power-discharge-readout-glow)',
      })}
      {renderPowerFlowGraphic(chargeLevel, dischargeLevel, netWatts)}
    </section>
  )
}
