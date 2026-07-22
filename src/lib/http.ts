import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import { apiConfig } from './apiConfig'
import { getStorage, setStorage, removeStorage } from './storage'

// ── Storage keys ─────────────────────────────────────────────────────────────

const STORAGE_TOKEN = 'pcr_token'
const STORAGE_USER_ID = 'pcr_user_id'
const STORAGE_CHANNEL_ID = 'pcr_channel_id'
const STORAGE_CHANNEL_NAME = 'pcr_channel_name'
const STORAGE_SESSION_EXPIRED = 'pcr_session_expired'

// ── Axios instance ────────────────────────────────────────────────────────────

const instance: AxiosInstance = axios.create({
  baseURL: apiConfig.dotnetApiBase,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ── Request interceptor — inject auth headers ─────────────────────────────────

instance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const url = config.url ?? ''
    const isDotnetApi = !url.startsWith('http') || url.startsWith(apiConfig.dotnetApiBase)

    if (isDotnetApi) {
      const token = getStorage<string>(STORAGE_TOKEN)
      const userId = getStorage<string>(STORAGE_USER_ID)
      const channelId = getStorage<string>(STORAGE_CHANNEL_ID)

      if (token) config.headers.Authorization = `Bearer ${token}`
      if (userId) config.headers['userId'] = userId
      if (channelId) config.headers['Channel-Id'] = channelId
    }

    return config
  },
  (error) => Promise.reject(error),
)

// ── Response interceptor — centralised error handling ────────────────────────

function handleUnauthorized() {
  removeStorage(STORAGE_TOKEN)
  removeStorage(STORAGE_USER_ID)
  removeStorage(STORAGE_CHANNEL_ID)
  removeStorage(STORAGE_CHANNEL_NAME)
  setStorage(STORAGE_SESSION_EXPIRED, 'true', 'session')
  window.location.href = '/login'
}

instance.interceptors.response.use(
  (response: AxiosResponse) => {
    const summary = (response.data as Record<string, unknown>)?.summary as Record<string, unknown> | undefined
    if (summary?.id === 3) {
      handleUnauthorized()
    }
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      handleUnauthorized()
      return Promise.reject(error)
    }
    const msg: string = error.response?.data?.message ?? ''
    if (error.response?.status === 500 && msg.toLowerCase().includes('invalid or expired session token')) {
      handleUnauthorized()
      return Promise.reject(error)
    }
    return Promise.reject(error)
  },
)

// ── Public service ────────────────────────────────────────────────────────────

export const http = {
  async get<T>(prefix: string, url: string, config?: AxiosRequestConfig): Promise<T> {
    const r = await instance.get<T>(prefix + url, config)
    return r.data
  },

  async post<T>(prefix: string, url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const r = await instance.post<T>(prefix + url, data, config)
    return r.data
  },

  async put<T>(prefix: string, url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const r = await instance.put<T>(prefix + url, data, config)
    return r.data
  },

  async patch<T>(prefix: string, url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const r = await instance.patch<T>(prefix + url, data, config)
    return r.data
  },

  async delete<T>(prefix: string, url: string, config?: AxiosRequestConfig): Promise<T> {
    const r = await instance.delete<T>(prefix + url, config)
    return r.data
  },
}

// ── Session helpers (call these after login/logout) ───────────────────────────

export const session = {
  set(token: string, userId: string, channelId: string,channelName:string) {
    setStorage(STORAGE_TOKEN, token)
    setStorage(STORAGE_USER_ID, userId)
    setStorage(STORAGE_CHANNEL_ID, channelId)
    setStorage(STORAGE_CHANNEL_NAME, channelName)
  },

  setChannel(channelId: string,channelName:string) {
    setStorage(STORAGE_CHANNEL_ID, channelId)
    setStorage(STORAGE_CHANNEL_NAME, channelName)
  },

  clear() {
    removeStorage(STORAGE_TOKEN)
    removeStorage(STORAGE_USER_ID)
    removeStorage(STORAGE_CHANNEL_ID)
    removeStorage(STORAGE_CHANNEL_NAME)
  },
}
