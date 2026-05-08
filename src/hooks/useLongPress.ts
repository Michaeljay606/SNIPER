import React, { useRef } from 'react'

export function useLongPress(
  onLongPress: () => void,
  duration: number = 3000
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const start = () => {
    timerRef.current = setTimeout(onLongPress, duration)
  }

  const cancel = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  return {
    onPointerDown: start,
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  }
}
