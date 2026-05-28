import React, { useRef } from 'react'

export function useLongPress(
  onLongPress: () => void,
  duration: number = 3000
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const start = () => {
    console.log('🖱️ Long press START');
    timerRef.current = setTimeout(() => {
      console.log('✅ Long press TIMEOUT REACHED');
      onLongPress();
    }, duration)
  }

  const cancel = () => {
    console.log('🛑 Long press CANCELLED');
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  return {
    onMouseDown: start,
    onMouseUp: cancel,
    onMouseLeave: cancel,
    onTouchStart: start,
    onTouchEnd: cancel,
    onPointerDown: start,
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  }
}
