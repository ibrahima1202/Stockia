import { WifiOff } from 'lucide-react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

export function OfflineIndicator() {
  const { isOnline } = useOnlineStatus()

  if (isOnline) return null

  return (
    <div className="fixed top-16 lg:top-3 right-3 z-50 flex items-center gap-1.5 bg-slate-900 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg">
      <WifiOff className="h-3.5 w-3.5" />
      Hors ligne
    </div>
  )
}
