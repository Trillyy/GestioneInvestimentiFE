import axios from 'axios'

const LOCAL_URL: string = import.meta.env.VITE_API_BASE_URL
const PROD_URL: string = import.meta.env.VITE_API_PROD_BASE_URL
const LOCAL_TOKEN: string = import.meta.env.VITE_API_TOKEN
const PROD_TOKEN: string = import.meta.env.VITE_API_PROD_TOKEN

export const SERVER_STORAGE_KEY = 'gi_server'
export type ServerEnv = 'local' | 'prod'

export function getServerConfig(env: ServerEnv) {
  return env === 'prod'
    ? { baseURL: PROD_URL, token: PROD_TOKEN }
    : { baseURL: LOCAL_URL, token: LOCAL_TOKEN }
}

export const apiClient = axios.create({
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const env = (localStorage.getItem(SERVER_STORAGE_KEY) ?? 'local') as ServerEnv
  const { baseURL, token } = getServerConfig(env)
  config.baseURL = baseURL
  config.headers['X-API-Token'] = token
  return config
})
