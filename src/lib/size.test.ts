import { describe, expect, it } from 'vitest'
import { aspectRatioForGemini, calculateImageSize } from './size'

describe('calculateImageSize', () => {
  it('uses common 16:9 display resolutions for the built-in tiers', () => {
    expect(calculateImageSize('1K', '16:9')).toBe('1280x720')
    expect(calculateImageSize('2K', '16:9')).toBe('2560x1440')
    expect(calculateImageSize('4K', '16:9')).toBe('3840x2160')
  })

  it('uses matching portrait presets for common ratios', () => {
    expect(calculateImageSize('2K', '9:16')).toBe('1440x2560')
    expect(calculateImageSize('2K', '2:3')).toBe('1440x2160')
    expect(calculateImageSize('2K', '3:4')).toBe('1536x2048')
  })

  it('falls back to budget-based sizing for custom ratios', () => {
    expect(calculateImageSize('2K', '5:4')).toBe('2288x1824')
  })
})

describe('aspectRatioForGemini', () => {
  it('常用比例的预设像素尺寸映射到对应 aspectRatio', () => {
    expect(aspectRatioForGemini('1024x1024')).toBe('1:1')
    expect(aspectRatioForGemini('1024x1536')).toBe('2:3')
    expect(aspectRatioForGemini('1536x1024')).toBe('3:2')
    expect(aspectRatioForGemini('768x1024')).toBe('3:4')
    expect(aspectRatioForGemini('1024x768')).toBe('4:3')
    expect(aspectRatioForGemini('1280x720')).toBe('16:9')
    expect(aspectRatioForGemini('720x1280')).toBe('9:16')
    expect(aspectRatioForGemini('1280x544')).toBe('21:9')
    expect(aspectRatioForGemini('1440x2160')).toBe('2:3')
    expect(aspectRatioForGemini('2304x3456')).toBe('2:3')
  })

  it('auto 与无法匹配的宽高返回 null', () => {
    expect(aspectRatioForGemini('auto')).toBeNull()
    expect(aspectRatioForGemini('')).toBeNull()
    expect(aspectRatioForGemini('1000x1000')).toBe('1:1')
    // 7:5 = 1.4,距 4:3(1.333)与 3:2(1.5)都超过 2.5% 容差
    expect(aspectRatioForGemini('1400x1000')).toBeNull()
  })
})
