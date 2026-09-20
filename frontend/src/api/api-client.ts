import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

const ACCESS_TOKEN_KEY = 'marketplace:access-token'
const REFRESH_TOKEN_KEY = 'marketplace:refresh-token'

export const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY)
export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY)

export const setTokens = (accessToken: string, refreshToken: string) => {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
}

export const clearTokens = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

const AUTH_FLOW_PREFIXES = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/otp']

function isAuthFlowUrl(url: string | undefined): boolean {
  if (!url) return false
  return AUTH_FLOW_PREFIXES.some((prefix) => url.startsWith(prefix))
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? ''

export const apiClient = axios.create({
  baseURL: `${apiBaseUrl}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 8000,
})

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

interface RetriableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableRequestConfig | undefined
    const refreshToken = getRefreshToken()
    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      refreshToken &&
      !isAuthFlowUrl(original.url)
    ) {
      original._retry = true
      try {
        const { data } = await axios.post(
          `${apiBaseUrl}/api/v1/auth/refresh`,
          { refresh_token: refreshToken },
          { headers: { 'Content-Type': 'application/json' } },
        )
        setTokens(data.tokens.access_token, data.tokens.refresh_token)
        original.headers.Authorization = `Bearer ${data.tokens.access_token}`
        return apiClient(original)
      } catch {
        clearTokens()
        window.dispatchEvent(new CustomEvent('marketplace:auth-expired'))
      }
    }
    if (error.response?.status === 401) {
      clearTokens()
    }
    return Promise.reject(error)
  },
)