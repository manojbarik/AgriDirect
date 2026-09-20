import { afterEach, describe, expect, it, vi } from 'vitest'
import MockAdapter from 'axios-mock-adapter'
import axios from 'axios'
import type { AxiosError } from 'axios'
import { apiClient, clearTokens, getAccessToken, getRefreshToken, setTokens } from '../src/api/api-client'

let mock: MockAdapter | null = null
let globalMock: MockAdapter | null = null

function client() {
  mock = new MockAdapter(apiClient)
  return mock
}

function globalClient() {
  globalMock = new MockAdapter(axios)
  return globalMock
}

afterEach(() => {
  mock?.restore()
  mock = null
  globalMock?.restore()
  globalMock = null
})

describe('token store', () => {
  it('persists access and refresh tokens to localStorage', () => {
    setTokens('a1', 'r1')
    expect(getAccessToken()).toBe('a1')
    expect(getRefreshToken()).toBe('r1')
  })

  it('clears every token', () => {
    setTokens('a1', 'r1')
    clearTokens()
    expect(getAccessToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
  })
})

describe('request interceptor', () => {
  it('attaches the Bearer token when present', async () => {
    const m = client()
    setTokens('a1', 'r1')
    let authorization: string | undefined
    m.onGet('/auth/me').reply((config) => {
      authorization = config.headers?.Authorization
      return [200, {}]
    })
    await apiClient.get('/auth/me')
    expect(authorization).toBe('Bearer a1')
  })

  it('sends requests without Authorization when no token is stored', async () => {
    const m = client()
    clearTokens()
    let authorization = 'unset'
    m.onGet('/health').reply((config) => {
      authorization = (config.headers?.Authorization as string) ?? ''
      return [200, {}]
    })
    await apiClient.get('/health')
    expect(authorization).toBe('')
  })
})

describe('response interceptor', () => {
  it('refreshes and retries a 401 once', async () => {
    const m = client()
    const ax = globalClient()
    setTokens('expired', 'r1')
    ax.onPost(/\/auth\/refresh$/).reply(200, { tokens: { access_token: 'fresh', refresh_token: 'r2' } })
    m.onGet('/auth/me').replyOnce(401).onGet('/auth/me').reply(200, { id: 'u1' })

    const { data } = await apiClient.get('/auth/me')
    expect(data).toEqual({ id: 'u1' })
    expect(getAccessToken()).toBe('fresh')
    expect(getRefreshToken()).toBe('r2')
  })

  it('clears tokens and emits auth-expired when the refresh fails', async () => {
    const m = client()
    const ax = globalClient()
    setTokens('expired', 'bad-refresh')
    ax.onPost(/\/auth\/refresh$/).reply(401, { detail: 'invalid refresh token' })
    m.onGet('/auth/me').reply(401)

    const expired = new Promise<void>((resolve) => {
      window.addEventListener('marketplace:auth-expired', () => resolve(), { once: true })
    })

    await expect(apiClient.get('/auth/me')).rejects.toThrow()
    await expired
    expect(getAccessToken()).toBeNull()
    expect(getRefreshToken()).toBeNull()
  })

  it('does not attempt a refresh for token endpoints', async () => {
    const m = client()
    setTokens('expired', 'r1')
    const refreshSpy = vi.fn(() => [200, {}])
    m.onPost('/auth/refresh').reply((config) => {
      refreshSpy(config)
      return [200, {}]
    })
    m.onPost('/auth/login').reply(401)

    await expect(apiClient.post('/auth/login', {})).rejects.toSatisfy((err: AxiosError) => err.response?.status === 401)
    expect(refreshSpy).not.toHaveBeenCalled()
  })
})