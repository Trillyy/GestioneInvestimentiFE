import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/gestioneinvestimenti'
const API_TOKEN = import.meta.env.VITE_API_TOKEN ?? ''

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Token': API_TOKEN,
  },
})
