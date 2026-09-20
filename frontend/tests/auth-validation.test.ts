import { describe, expect, it } from 'vitest'
import { AxiosError } from 'axios'
import { apiErrorMessage, normalizePhone, phoneError } from '../src/api/auth'

describe('normalizePhone', () => {
  it('adds a leading plus when missing', () => {
    expect(normalizePhone('919850012345')).toBe('+919850012345')
  })

  it('strips spaces dashes parens and dots', () => {
    expect(normalizePhone('+91 98500-12345')).toBe('+919850012345')
    expect(normalizePhone('(91) 98500.12345')).toBe('+919850012345')
  })

  it('keeps an existing plus sign', () => {
    expect(normalizePhone('+91 98500 12345')).toBe('+919850012345')
  })
})

describe('phoneError', () => {
  it('accepts a valid Indian mobile with spaces and dashes', () => {
    expect(phoneError('+91 98500 12345')).toBeNull()
    expect(phoneError('919850012345')).toBeNull()
  })

  it('rejects a missing phone', () => {
    expect(phoneError('')).toMatch(/Enter your phone number/)
  })

  it('rejects letters', () => {
    expect(phoneError('+91 abcd 12345')).toMatch(/valid phone number/)
  })

  it('rejects a too-short number', () => {
    expect(phoneError('+1 123')).toMatch(/valid phone number/)
  })

  it('normalizes a bare 10-digit number as E.164 before validation', () => {
    expect(normalizePhone('9850012345')).toBe('+9850012345')
  })

  it('accepts digits without a leading plus once normalized', () => {
    expect(phoneError('919850012345')).toBeNull()
  })
})

describe('apiErrorMessage', () => {
  it('returns the string detail for axios errors', () => {
    const error = new AxiosError('Request failed')
    error.response = { data: { detail: 'No active account' } } as never
    expect(apiErrorMessage(error)).toBe('No active account')
  })

  it('joins pydantic-style array details with msg fields', () => {
    const error = new AxiosError('Request failed')
    error.response = {
      data: { detail: [{ msg: 'field required' }, { msg: 'value too long' }] },
    } as never
    expect(apiErrorMessage(error)).toBe('field required. value too long')
  })

  it('falls back to the network error message', () => {
    const error = new AxiosError('Network Error')
    error.response = { data: { detail: {} } } as never
    expect(apiErrorMessage(error)).toContain('Network Error')
  })

  it('handles a missing axios response', () => {
    const error = new AxiosError('timeout')
    expect(apiErrorMessage(error)).toBe('timeout')
  })

  it('shows a helpful message when the backend is unreachable', () => {
    const error = new AxiosError('Network Error')
    error.code = 'ERR_NETWORK'
    expect(apiErrorMessage(error)).toContain('Unable to reach the server')
  })

  it('surfaces a Retry-After countdown for rate-limited 429 responses', () => {
    const error = new AxiosError('Request failed')
    error.response = {
      status: 429,
      data: { detail: 'Too many requests. Please try again later.' },
      headers: { 'retry-after': '23' },
    } as never
    expect(apiErrorMessage(error)).toContain('23')
    expect(apiErrorMessage(error)).toMatch(/Too many requests\. Try again in 23s\./)
  })

  it('falls back to the detail string for 429 without Retry-After', () => {
    const error = new AxiosError('Request failed')
    error.response = { status: 429, data: { detail: 'Too many requests. Please try again later.' } } as never
    expect(apiErrorMessage(error)).toContain('Too many requests')
  })

  it('handles non-axios errors', () => {
    expect(apiErrorMessage(new Error('boom'))).toBe('boom')
    expect(apiErrorMessage('oops')).toBe('Something went wrong')
  })
})