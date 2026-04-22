import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { fmtKey } from '../lib/utils'

export function useAutoSave(userId, date, block, value) {
  const [status, setStatus] = useState('idle') // idle | saving | saved | error
  const timerRef = useRef(null)
  const isFirstRender = useRef(true)

  const save = useCallback(async () => {
    if (!userId || !date || !block) return
    setStatus('saving')
    const dateKey = fmtKey(date)
    const { error } = await supabase
      .from('daily_logs')
      .upsert(
        { user_id: userId, date: dateKey, [block]: value },
        { onConflict: 'user_id,date' }
      )
    setStatus(error ? 'error' : 'saved')
    if (!error) setTimeout(() => setStatus('idle'), 2000)
  }, [userId, date, block, value])

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(save, 500)
    return () => clearTimeout(timerRef.current)
  }, [value, save])

  return status
}
