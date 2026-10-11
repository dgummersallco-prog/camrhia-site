'use client'

import { useEffect } from 'react'

export default function RecruitCapture() {
  useEffect(() => {
    try {
      const code = new URLSearchParams(window.location.search).get('recruit')
      if (code) window.localStorage.setItem('camrhia_recruit', code.slice(0, 40))
    } catch {}
  }, [])
  return null
}
