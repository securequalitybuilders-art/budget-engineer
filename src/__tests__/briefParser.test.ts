import { describe, it, expect } from 'vitest'
import { parseBrief } from '@/ai/briefParser'

describe('briefParser location detection', () => {
  it('detects Harare as Zimbabwe', () => {
    const result = parseBrief('3-bedroom house in Harare', 'other')
    expect(result.location).toBe('zimbabwe')
  })

  it('detects Bulawayo as Zimbabwe', () => {
    const result = parseBrief('office block in Bulawayo', 'other')
    expect(result.location).toBe('zimbabwe')
  })

  it('detects Gweru as Zimbabwe', () => {
    const result = parseBrief('clinic in Gweru', 'other')
    expect(result.location).toBe('zimbabwe')
  })

  it('detects Mutare as Zimbabwe', () => {
    const result = parseBrief('school in Mutare', 'other')
    expect(result.location).toBe('zimbabwe')
  })

  it('detects Kitwe as Zambia', () => {
    const result = parseBrief('shop in Kitwe', 'other')
    expect(result.location).toBe('zambia')
  })

  it('detects Lusaka as Zambia', () => {
    const result = parseBrief('apartment in Lusaka', 'other')
    expect(result.location).toBe('zambia')
  })

  it('detects Gaborone as Botswana', () => {
    const result = parseBrief('house in Gaborone', 'other')
    expect(result.location).toBe('botswana')
  })

  it('detects Johannesburg as South Africa', () => {
    const result = parseBrief('office in Johannesburg', 'other')
    expect(result.location).toBe('south-africa')
  })

  it('detects Cape Town as South Africa', () => {
    const result = parseBrief('house in Cape Town', 'other')
    expect(result.location).toBe('south-africa')
  })

  it('detects multi-word "cape town" before substring "cape"', () => {
    const result = parseBrief('site in Cape Town region', 'other')
    expect(result.location).toBe('south-africa')
  })

  it('detects "victoria falls" as Zimbabwe', () => {
    const result = parseBrief('hotel near Victoria Falls', 'other')
    expect(result.location).toBe('zimbabwe')
  })

  it('falls back to default region when no city matched', () => {
    const result = parseBrief('3-bedroom house plot 45 nowhere', 'zimbabwe')
    expect(result.location).toBe('zimbabwe')
  })

  it('falls back to "other" when no city matched and no base provided', () => {
    const result = parseBrief('3-bedroom house', 'other')
    expect(result.location).toBe('other')
  })

  it('detects country alias "zim" as Zimbabwe', () => {
    const result = parseBrief('clinic in Zimbabwe', 'other')
    expect(result.location).toBe('zimbabwe')
  })

  it('detects country alias "rsa" as South Africa', () => {
    const result = parseBrief('office in RSA', 'other')
    expect(result.location).toBe('south-africa')
  })

  it('detects Durban as South Africa', () => {
    const result = parseBrief('flat in Durban', 'other')
    expect(result.location).toBe('south-africa')
  })

  it('detects Livingstone as Zambia', () => {
    const result = parseBrief('hotel in Livingstone', 'other')
    expect(result.location).toBe('zambia')
  })

  it('detects Francistown as Botswana', () => {
    const result = parseBrief('shop in Francistown', 'other')
    expect(result.location).toBe('botswana')
  })

  it('detects Pretoria as South Africa', () => {
    const result = parseBrief('house in Pretoria', 'other')
    expect(result.location).toBe('south-africa')
  })

  it('detects Bindura as Zimbabwe', () => {
    const result = parseBrief('school in Bindura', 'other')
    expect(result.location).toBe('zimbabwe')
  })
})
