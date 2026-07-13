export type VirtualRangeOptions = {
  readonly itemCount: number
  readonly itemSize: number
  readonly overscan: number
  readonly scrollOffset: number
  readonly viewportSize: number
}

export type VirtualRange = {
  readonly startIndex: number
  readonly endIndex: number
  readonly paddingBefore: number
  readonly paddingAfter: number
}

export function getVirtualRange({
  itemCount,
  itemSize,
  overscan,
  scrollOffset,
  viewportSize,
}: VirtualRangeOptions): VirtualRange {
  const safeItemCount = Math.max(0, Math.trunc(itemCount))
  const safeItemSize = Math.max(1, itemSize)
  const safeOverscan = Math.max(0, Math.trunc(overscan))
  const startIndex = Math.max(
    0,
    Math.floor(Math.max(0, scrollOffset) / safeItemSize) - safeOverscan,
  )
  const endIndex = Math.min(
    safeItemCount,
    Math.ceil((Math.max(0, scrollOffset) + Math.max(0, viewportSize)) / safeItemSize) +
      safeOverscan,
  )

  return {
    startIndex,
    endIndex,
    paddingBefore: startIndex * safeItemSize,
    paddingAfter: Math.max(0, (safeItemCount - endIndex) * safeItemSize),
  }
}
