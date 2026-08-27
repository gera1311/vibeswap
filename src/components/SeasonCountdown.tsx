import React from 'react'

interface SeasonCountdownProps {
  target: number
}

function pad(value: number) {
  return value.toString().padStart(2, '0')
}

// Pre-season landing: only the "Comming Vibe ☀️" label and a live countdown to
// the season start. Nothing else is rendered before the season begins.
export default function SeasonCountdown({ target }: SeasonCountdownProps) {
  const [now, setNow] = React.useState(() => Math.floor(Date.now() / 1000))

  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const diff = Math.max(0, target - now)
  const days = Math.floor(diff / 86400)
  const hours = Math.floor((diff % 86400) / 3600)
  const minutes = Math.floor((diff % 3600) / 60)
  const seconds = diff % 60

  return (
    <div className="season-countdown">
      <h2 className="season-countdown-title">Coming Vibe ☀️</h2>
      <div className="season-countdown-grid">
        <div className="season-countdown-unit">
          <strong>{pad(days)}</strong>
          <span>days</span>
        </div>
        <div className="season-countdown-unit">
          <strong>{pad(hours)}</strong>
          <span>hours</span>
        </div>
        <div className="season-countdown-unit">
          <strong>{pad(minutes)}</strong>
          <span>min</span>
        </div>
        <div className="season-countdown-unit">
          <strong>{pad(seconds)}</strong>
          <span>sec</span>
        </div>
      </div>
    </div>
  )
}
