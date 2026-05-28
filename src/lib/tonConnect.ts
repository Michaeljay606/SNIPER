import { TonConnectUI } from '@tonconnect/ui-react'

export const tonConnectUI = new TonConnectUI({
  manifestUrl: `${window.location.origin}/tonconnect-manifest.json`,
})
