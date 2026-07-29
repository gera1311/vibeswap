import React from 'react'

export default function SunSphere() {
  return (
    <div className="sun-sphere-container">
      <div className="css-sun">
        <div className="sun-core" />
        <div className="sun-glow" />
        <div className="sun-ring sun-ring-1" />
        <div className="sun-ring sun-ring-2" />
        <div className="sun-ring sun-ring-3" />
      </div>
    </div>
  )
}
