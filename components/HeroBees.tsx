'use client'

import { useEffect, useRef } from 'react'

/**
 * Hero background canvas ported from design-refs/landing.html:
 * faint hex-comb grid that brightens near the cursor, a translucent
 * honeycomb in the top-right corner, and calm bees with fading trails
 * (2 on mobile, 4 on desktop — no cursor evasion).
 *
 * Renders absolutely positioned inside its nearest `position: relative`
 * ancestor, so it only ever covers the hero section.
 */
export default function HeroBees() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    const hero = cv.parentElement
    if (!ctx || !hero) return

    let W = 0
    let H = 0
    let dpr = 1
    function resize() {
      dpr = Math.min(devicePixelRatio || 1, 2)
      const r = hero!.getBoundingClientRect()
      W = r.width
      H = r.height
      cv!.width = W * dpr
      cv!.height = H * dpr
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    addEventListener('resize', resize)

    const mouse = { x: -9999, y: -9999 }
    function onMove(e: MouseEvent) {
      const r = cv!.getBoundingClientRect()
      mouse.x = e.clientX - r.left
      mouse.y = e.clientY - r.top
    }
    function onLeave() {
      mouse.x = -9999
      mouse.y = -9999
    }
    hero.addEventListener('mousemove', onMove)
    hero.addEventListener('mouseleave', onLeave)

    function hexPath(x: number, y: number, r: number, rot: number) {
      ctx!.beginPath()
      for (let i = 0; i < 6; i++) {
        const a = rot + (i * Math.PI) / 3
        i
          ? ctx!.lineTo(x + r * Math.cos(a), y + r * Math.sin(a))
          : ctx!.moveTo(x + r * Math.cos(a), y + r * Math.sin(a))
      }
      ctx!.closePath()
    }

    type Bee = {
      x: number; y: number; vx: number; vy: number
      s: number; a: number; t: number; ph: number
      trail: { x: number; y: number }[]
    }
    const isMobile = matchMedia('(max-width:820px)').matches
    const bees: Bee[] = []
    const N = isMobile ? 2 : 4
    for (let i = 0; i < N; i++)
      bees.push({
        x: Math.random() * 900,
        y: Math.random() * 500,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        s: 2.4 + Math.random() * 0.8,
        a: 0,
        t: Math.random() * 100,
        ph: Math.random() * 6.28,
        trail: [],
      })

    function drawBee(b: Bee) {
      ctx!.save()
      ctx!.translate(b.x, b.y)
      ctx!.rotate(b.a)
      const s = b.s
      const flap = Math.sin(b.t * 0.6) * 0.4 + 0.75
      ctx!.globalAlpha = 0.3
      ctx!.fillStyle = '#E8890C'
      hexPath(-0.4 * s, -2.6 * s * flap, 1.7 * s, 0.52)
      ctx!.fill()
      hexPath(1.1 * s, -2.6 * s * flap, 1.7 * s, 0.52)
      ctx!.fill()
      ctx!.globalAlpha = 0.85
      hexPath(0.6 * s, 0, 2.5 * s, Math.PI / 6)
      ctx!.fill()
      hexPath(-2.6 * s, 0, 1.4 * s, Math.PI / 6)
      ctx!.fill()
      ctx!.restore()
    }

    let raf = 0
    function frame() {
      ctx!.clearRect(0, 0, W, H)

      // faint comb grid — hero only, reacts to cursor
      const r = 34
      const dx = r * 1.5
      const dy = r * Math.sqrt(3)
      ctx!.lineWidth = 1
      for (let c = -1; c * dx < W + r; c++)
        for (let row = -1; row * dy < H + r; row++) {
          const x = c * dx
          const y = row * dy + (c % 2 ? dy / 2 : 0)
          let a = 0.055
          const d = Math.hypot(x - mouse.x, y - mouse.y)
          if (d < 140) a = 0.055 + (1 - d / 140) * 0.32
          ctx!.strokeStyle = '#C97F1E'
          ctx!.globalAlpha = a
          hexPath(x, y, r, 0)
          ctx!.stroke()
        }
      ctx!.globalAlpha = 1

      // decorative corner comb (translucent, top-right, off-canvas bleed)
      const R = 40
      const cdx = R * 1.5
      const cdy = R * Math.sqrt(3)
      const ox = W - cdx * 1.2
      const oy = -cdy * 0.3
      ;([[0, 0], [1, 0], [-1, 0], [0, 1], [1, 1], [1, -1], [0, -1]] as const).forEach(
        ([c, row], i) => {
          const x = ox + c * cdx
          const y = oy + row * cdy + (c % 2 ? cdy / 2 : 0)
          ctx!.globalAlpha = 0.16 - (i % 3) * 0.03
          ctx!.fillStyle = '#F2A33C'
          hexPath(x, y, R - 2, 0)
          ctx!.fill()
          ctx!.globalAlpha = 0.3
          ctx!.strokeStyle = '#C97F1E'
          ctx!.lineWidth = 1.6
          hexPath(x, y, R - 2, 0)
          ctx!.stroke()
        }
      )
      ctx!.globalAlpha = 1

      // calm bees — NO cursor evasion on landing
      bees.forEach((b) => {
        b.t++
        b.vx += Math.sin(b.t * 0.008 + b.ph) * 0.008
        b.vy += Math.cos(b.t * 0.007 + b.ph) * 0.008
        const sp = Math.hypot(b.vx, b.vy)
        const max = 0.38
        if (sp > max) {
          b.vx = (b.vx / sp) * max
          b.vy = (b.vy / sp) * max
        }
        b.x += b.vx
        b.y += b.vy
        const m = 40
        let w = false
        if (b.x < -m) { b.x = W + m; w = true }
        if (b.x > W + m) { b.x = -m; w = true }
        if (b.y < -m) { b.y = H + m; w = true }
        if (b.y > H + m) { b.y = -m; w = true }
        if (w) b.trail = []
        b.a = Math.atan2(b.vy, b.vx)
        b.trail.unshift({ x: b.x, y: b.y })
        if (b.trail.length > 20) b.trail.pop()
        if (b.trail.length > 2)
          for (let i = 1; i < b.trail.length; i++) {
            ctx!.strokeStyle = `rgba(232,137,12,${0.25 * (1 - i / b.trail.length)})`
            ctx!.lineWidth = 1.3 * (1 - i / b.trail.length) + 0.2
            ctx!.beginPath()
            ctx!.moveTo(b.trail[i - 1].x, b.trail[i - 1].y)
            ctx!.lineTo(b.trail[i].x, b.trail[i].y)
            ctx!.stroke()
          }
        drawBee(b)
      })
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      removeEventListener('resize', resize)
      hero.removeEventListener('mousemove', onMove)
      hero.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      aria-hidden="true"
    />
  )
}
