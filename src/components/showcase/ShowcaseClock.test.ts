import { describe, expect, it } from 'vitest'
import { formatShowcaseTime } from './ShowcaseClock'

describe('Showcase scenario clock', () => {
  it('displays scenario time in Shenzhen regardless of the viewer’s timezone', () => {
    expect(formatShowcaseTime(Date.parse('2026-08-15T10:00:00+08:00'))).toBe('08月15日 10:00')
    expect(formatShowcaseTime(Date.parse('2026-09-03T10:00:00+08:00'))).toBe('09月03日 10:00')
    expect(formatShowcaseTime(Date.parse('2026-09-18T09:00:00+08:00'))).toBe('09月18日 09:00')
  })
})
