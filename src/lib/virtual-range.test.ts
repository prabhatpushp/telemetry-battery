import { describe, expect, it } from '@jest/globals'

import { getVirtualRange } from '@/lib/virtual-range'

describe('getVirtualRange', () => {
  it('renders the visible window with bounded overscan and spacer heights', () => {
    expect(
      getVirtualRange({
        itemCount: 25_000,
        itemSize: 50,
        overscan: 5,
        scrollOffset: 5_000,
        viewportSize: 500,
      }),
    ).toEqual({
      startIndex: 95,
      endIndex: 115,
      paddingBefore: 4_750,
      paddingAfter: 1_244_250,
    })
  })

  it('keeps empty and initial ranges inside collection bounds', () => {
    expect(
      getVirtualRange({
        itemCount: 0,
        itemSize: 0,
        overscan: 8,
        scrollOffset: -10,
        viewportSize: 0,
      }),
    ).toEqual({
      startIndex: 0,
      endIndex: 0,
      paddingBefore: 0,
      paddingAfter: 0,
    })
  })
})
