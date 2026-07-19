'use client'

import { useEffect, useRef } from 'react'

/**
 * Full-viewport auth background ported from design-refs/v2.html:
 * cursor-reactive hex grid, large honeycomb corner (top-right) with an
 * open entrance cell, and hexagon bees with fading contrails that
 * periodically fly home to rest inside the hive, evade the cursor, and
 * come back out.
 *
 * Day cycle follows real local time (v2's "auto" mode) — morning 6-11,
 * noon 11-17, evening 17-21, night 21-6. Each mode also themes the auth
 * card via CSS variables (--boxbg/--boxline/--boxtxt/--fldbg and
 * --logo-hole-bg) set on <html>, so the card cross-fades with its own
 * CSS transitions.
 *
 * Mobile (≤820px): max 3 bees, no cursor logic.
 * prefers-reduced-motion: static hex grid + corner comb only, no bees.
 */

const INK = '#2B2118'

type Mode = {
  bg: string; comb: string; combA: number; bee: string; trail: string
  count: number; speed: number; wander: number
  boxbg: string; boxline: string; boxtxt: string; fldbg: string; hole: string
}

const MODES: Record<string, Mode> = {
  morning: { bg: '#FBF3E0', comb: '#C97F1E', combA: 0.10, bee: '#D98F28', trail: 'rgba(217,143,40,',
             count: 6, speed: 0.55, wander: 0.010, boxbg: 'rgba(255,253,248,.93)', boxline: '#E3D9C6', boxtxt: INK, fldbg: '#fff', hole: '#FFFDF8' },
  noon:    { bg: '#F7F1E5', comb: '#C97F1E', combA: 0.11, bee: '#E8890C', trail: 'rgba(232,137,12,',
             count: 10, speed: 1.05, wander: 0.028, boxbg: 'rgba(255,253,248,.93)', boxline: '#E3D9C6', boxtxt: INK, fldbg: '#fff', hole: '#FFFDF8' },
  evening: { bg: '#EFDFC4', comb: '#A8651A', combA: 0.13, bee: '#B36F12', trail: 'rgba(179,111,18,',
             count: 5, speed: 0.42, wander: 0.008, boxbg: 'rgba(255,250,240,.94)', boxline: '#DCC9A8', boxtxt: INK, fldbg: '#fff', hole: '#FFFDF8' },
  night:   { bg: '#2B2118', comb: '#F2A33C', combA: 0.10, bee: '#F2A33C', trail: 'rgba(242,163,60,',
             count: 3, speed: 0.25, wander: 0.005, boxbg: 'rgba(43,33,24,.88)', boxline: 'rgba(242,163,60,.28)', boxtxt: '#F7F1E5', fldbg: 'rgba(255,253,248,.08)', hole: '#2B2118' },
}

function autoMode(): string {
  const h = new Date().getHours()
  if (h >= 6 && h < 11) return 'morning'
  if (h >= 11 && h < 17) return 'noon'
  if (h >= 17 && h < 21) return 'evening'
  return 'night'
}

const CARD_VARS = ['--boxbg', '--boxline', '--boxtxt', '--fldbg', '--logo-hole-bg'] as const

export default function LoginBees() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return

    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
    const isMobile = matchMedia('(max-width:820px)').matches

    let W = 0
    let H = 0
    let dpr = 1
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      W = window.innerWidth
      H = window.innerHeight
      cv!.width = W * dpr
      cv!.height = H * dpr
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (reducedMotion) staticFrame()
    }

    const mouse = { x: -9999, y: -9999 }
    function onMove(e: MouseEvent) {
      mouse.x = e.clientX
      mouse.y = e.clientY
    }
    function onLeave() {
      mouse.x = -9999
      mouse.y = -9999
    }

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
      state: 'fly' | 'home' | 'rest'
      stateT: number
    }

    /* compact hexagon bee — one chubby hex body + small head, single color */
    function drawBee(b: Bee, P: Mode) {
      ctx!.save()
      ctx!.translate(b.x, b.y)
      ctx!.rotate(b.a)
      const s = b.s
      const flap = Math.sin(b.t * 0.6) * 0.4 + 0.75
      ctx!.globalAlpha = 0.35
      ctx!.fillStyle = P.bee
      hexPath(-0.4 * s, -2.6 * s * flap, 1.7 * s, 0.52)
      ctx!.fill()
      hexPath(1.1 * s, -2.6 * s * flap, 1.7 * s, 0.52)
      ctx!.fill()
      ctx!.globalAlpha = 1
      ctx!.fillStyle = P.bee
      hexPath(0.6 * s, 0, 2.5 * s, Math.PI / 6)
      ctx!.fill()
      hexPath(-2.6 * s, 0, 1.4 * s, Math.PI / 6)
      ctx!.fill()
      ctx!.restore()
    }

    function drawHive(P: Mode) {
      // Large honeycomb corner — part of a big comb tucked into top-right,
      // extending past the edges so it reads as a cutaway of something bigger.
      const R = 34
      const dx = R * 1.5
      const dy = R * Math.sqrt(3)
      const ox = W - dx * 1.6
      const oy = -dy * 0.25
      const cells: [number, number][] = [
        [0, 0], [1, 0], [2, 0], [-1, 0],
        [0, 1], [1, 1], [2, 1],
        [-1, -1], [0, -1], [1, -1], [2, -1],
        [2, 2], [1, 2],
      ]
      ctx!.save()
      cells.forEach(([c, r], i) => {
        const x = ox + c * dx
        const y = oy + r * dy + (c % 2 ? dy / 2 : 0)
        // filled cells with slight depth variation = honey-filled comb
        ctx!.globalAlpha = 0.85 - (i % 3) * 0.13
        ctx!.fillStyle = P.bee
        hexPath(x, y, R - 2, 0)
        ctx!.fill()
        ctx!.globalAlpha = 0.9
        ctx!.strokeStyle = P.comb
        ctx!.lineWidth = 2.5
        hexPath(x, y, R - 2, 0)
        ctx!.stroke()
      })
      // entrance cell — darker, open (bees fly into this one)
      const entX = ox - dx
      const entY = oy + dy / 2 + dy // cell at col -1, row 1
      ctx!.globalAlpha = 1
      ctx!.fillStyle = P.bg
      hexPath(entX, entY, R - 6, 0)
      ctx!.fill()
      ctx!.strokeStyle = P.comb
      ctx!.lineWidth = 2.5
      hexPath(entX, entY, R - 6, 0)
      ctx!.stroke()
      ctx!.restore()
      return { x: entX, y: entY }
    }

    function drawComb(P: Mode) {
      const r = 30
      const dx = r * 1.5
      const dy = r * Math.sqrt(3)
      ctx!.lineWidth = 1
      for (let c = -1; c * dx < W + r; c++)
        for (let row = -1; row * dy < H + r; row++) {
          const x = c * dx
          const y = row * dy + (c % 2 ? dy / 2 : 0)
          let a = P.combA
          const d = Math.hypot(x - mouse.x, y - mouse.y)
          if (d < 150) a = P.combA + (1 - d / 150) * 0.5
          ctx!.strokeStyle = P.comb
          ctx!.globalAlpha = a
          hexPath(x, y, r, 0)
          ctx!.stroke()
        }
      ctx!.globalAlpha = 1
    }

    let realMode = autoMode()
    let P = MODES[realMode]
    let bees: Bee[] = []

    function spawn(n: number) {
      bees = []
      for (let i = 0; i < n; i++) {
        bees.push({
          x: Math.random() * W || Math.random() * 900,
          y: Math.random() * H || Math.random() * 480,
          vx: Math.random() - 0.5,
          vy: Math.random() - 0.5,
          s: 2.6 + Math.random() * 1.1,
          a: 0,
          t: Math.random() * 100,
          ph: Math.random() * 6.28,
          trail: [],
          state: 'fly',
          stateT: 400 + Math.random() * 900,
        })
      }
    }

    const root = document.documentElement
    function applyMode(name: string) {
      realMode = name
      P = MODES[name]
      spawn(isMobile ? Math.min(P.count, 3) : P.count)
      root.style.setProperty('--boxbg', P.boxbg)
      root.style.setProperty('--boxline', P.boxline)
      root.style.setProperty('--boxtxt', P.boxtxt)
      root.style.setProperty('--fldbg', P.fldbg)
      root.style.setProperty('--logo-hole-bg', P.hole)
    }

    function staticFrame() {
      ctx!.fillStyle = P.bg
      ctx!.fillRect(0, 0, W, H)
      drawComb(P)
      drawHive(P)
    }

    let raf = 0
    function frame() {
      ctx!.fillStyle = P.bg
      ctx!.fillRect(0, 0, W, H)
      drawComb(P)
      const hive = drawHive(P)

      bees.forEach((b) => {
        b.t++
        b.stateT--

        if (b.state === 'fly' && b.stateT <= 0) b.state = 'home'
        if (b.state === 'home') {
          const dx = hive.x - b.x
          const dy = hive.y - b.y
          const d = Math.hypot(dx, dy)
          b.vx += (dx / d) * 0.06
          b.vy += (dy / d) * 0.06
          if (d < 14) {
            b.state = 'rest'
            b.stateT = 180 + Math.random() * 300
            b.trail = []
          }
        } else if (b.state === 'rest') {
          b.x = hive.x
          b.y = hive.y
          if (--b.stateT <= 0) {
            b.state = 'fly'
            b.stateT = 400 + Math.random() * 900
            b.vx = (Math.random() - 0.5) * 2
            b.vy = Math.random() * 1.5
          }
        } else {
          b.vx += Math.sin(b.t * P.wander + b.ph) * 0.015
          b.vy += Math.cos(b.t * P.wander * 0.9 + b.ph) * 0.015
        }

        if (b.state !== 'rest') {
          if (mouse.x > -999) {
            const dx = b.x - mouse.x
            const dy = b.y - mouse.y
            const d = Math.hypot(dx, dy)
            if (d < 130 && d > 0.1) {
              b.vx += (dx / d) * 0.18
              b.vy += (dy / d) * 0.18
            }
          }
          const sp = Math.hypot(b.vx, b.vy)
          const max = P.speed * (b.state === 'home' ? 1.4 : 1)
          if (sp > max) {
            b.vx = (b.vx / sp) * max
            b.vy = (b.vy / sp) * max
          }
          b.x += b.vx
          b.y += b.vy
          const m = 50
          let wrapped = false
          if (b.x < -m) { b.x = W + m; wrapped = true }
          if (b.x > W + m) { b.x = -m; wrapped = true }
          if (b.y < -m) { b.y = H + m; wrapped = true }
          if (b.y > H + m) { b.y = -m; wrapped = true }
          if (wrapped) b.trail = [] // no cross-screen streaks
          b.a = Math.atan2(b.vy, b.vx)

          b.trail.unshift({ x: b.x, y: b.y })
          if (b.trail.length > 26) b.trail.pop()
        }

        if (b.trail.length > 2) {
          for (let i = 1; i < b.trail.length; i++) {
            ctx!.strokeStyle = P.trail + 0.35 * (1 - i / b.trail.length) + ')'
            ctx!.lineWidth = 1.6 * (1 - i / b.trail.length) + 0.3
            ctx!.beginPath()
            ctx!.moveTo(b.trail[i - 1].x, b.trail[i - 1].y)
            ctx!.lineTo(b.trail[i].x, b.trail[i].y)
            ctx!.stroke()
          }
        }

        if (b.state !== 'rest') drawBee(b, P)
      })
      raf = requestAnimationFrame(frame)
    }

    applyMode(autoMode())
    resize()
    addEventListener('resize', resize)

    // follow the clock while the page stays open
    const clock = setInterval(() => {
      const m = autoMode()
      if (m !== realMode) applyMode(m)
    }, 60_000)

    if (!isMobile && !reducedMotion) {
      addEventListener('mousemove', onMove)
      document.documentElement.addEventListener('mouseleave', onLeave)
    }

    if (reducedMotion) {
      staticFrame()
    } else {
      raf = requestAnimationFrame(frame)
    }

    return () => {
      cancelAnimationFrame(raf)
      clearInterval(clock)
      removeEventListener('resize', resize)
      removeEventListener('mousemove', onMove)
      document.documentElement.removeEventListener('mouseleave', onLeave)
      CARD_VARS.forEach((v) => root.style.removeProperty(v))
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      aria-hidden="true"
    />
  )
}
