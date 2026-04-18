import { createContext, useContext, useState } from 'react'
import { SERVER_STORAGE_KEY, type ServerEnv } from '@/api/client'

interface ServerContextValue {
  server: ServerEnv
  setServer: (env: ServerEnv) => void
}

const ServerContext = createContext<ServerContextValue | null>(null)

export function ServerProvider({ children }: { children: React.ReactNode }) {
  const [server, setServerState] = useState<ServerEnv>(
    () => (localStorage.getItem(SERVER_STORAGE_KEY) as ServerEnv) ?? 'local',
  )

  function setServer(env: ServerEnv) {
    localStorage.setItem(SERVER_STORAGE_KEY, env)
    setServerState(env)
  }

  return (
    <ServerContext.Provider value={{ server, setServer }}>
      {children}
    </ServerContext.Provider>
  )
}

export function useServer() {
  const ctx = useContext(ServerContext)
  if (!ctx) throw new Error('useServer must be used within ServerProvider')
  return ctx
}
