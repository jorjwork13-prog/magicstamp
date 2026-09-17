import { NextRequest, NextResponse } from 'next/server'
import { paletteFor, renderStampPng } from '@/lib/stamp-graphic'

// Bundled fonts read from disk and sharp — this route cannot run on the edge.
export const runtime = 'nodejs'

/**
 * Google Wallet hero image. Drawn by the same renderer as the Apple strip —
 * the "პროგრესი N / M" row above the honeycomb, in the card-theme colours —
 * so Apple and Google customers see the same card. Google's recommended hero
 * size, 1032x336, has nearly the same aspect ratio as Apple's 375x123pt strip,
 * so it's the same picture at a different resolution.
 *
 * `theme` picks the card-theme palette. Without it — including hero URLs
 * already stored on passes from before the param existed — the palette is
 * derived from `bg`, as for a business with no theme.
 */
const WIDTH  = 1032
const HEIGHT = 336

function resolveBg(param: string | null): string {
  if (!param) return '#185FA5'
  const hex = param.startsWith('#') ? param : `#${param}`
  return /^#[0-9A-Fa-f]{6}$/.test(hex) ? hex : '#185FA5'
}

function intParam(value: string | null, fallback: number): number {
  const n = parseInt(value ?? '', 10)
  return Number.isFinite(n) ? n : fallback
}

export async function GET(req: NextRequest) {
  const sp    = req.nextUrl.searchParams
  const count = Math.max(0, intParam(sp.get('count'), 0))
  const max   = Math.max(1, intParam(sp.get('max'), 10))

  const png = await renderStampPng({
    count,
    max,
    width:   WIDTH,
    height:  HEIGHT,
    palette: paletteFor(sp.get('theme'), resolveBg(sp.get('bg'))),
  })

  return new NextResponse(new Uint8Array(png), {
    headers: {
      'Content-Type':  'image/png',
      // Each unique count+max+bg+theme combo is its own immutable URL.
      'Cache-Control': 'public, max-age=86400, immutable',
    },
  })
}
