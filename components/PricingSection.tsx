'use client'

import { useState } from 'react'
import Link from 'next/link'
import s from '@/app/page.module.css'

const STARTER_PRICE = 99
const GROWTH_BASE = 189
const GROWTH_EXTRA_PER_LOCATION = 79
const MAX_LOCATIONS = 5
const YEARLY_DISCOUNT = 0.15

/* keeps the bee centered over each hexagon — must match .locCell/.locCells in page.module.css */
const CELL = 40
const CELL_GAP = 6

const FEATURES = {
  starter: ['1 ლოკაცია', 'შეუზღუდავი ბარათი', '3 მზა თემა', 'საბაზისო ანალიტიკა'],
  growth: ['5 ლოკაციამდე', 'საკუთარი ბრენდი ბარათზე', 'რეფერალები', 'სრული ანალიტიკა'],
  network: [
    '6+ ლოკაცია',
    'პირადი დაყენება',
    'პრიორიტეტული მხარდაჭერა',
    'დაბრენდული NFC სტიკერები',
  ],
}

function applyDiscount(price: number, yearly: boolean) {
  return yearly ? Math.round(price * (1 - YEARLY_DISCOUNT)) : price
}

function Bee() {
  return (
    <svg viewBox="0 0 36 40" className={s.beeSvg} aria-hidden="true">
      <g className={s.beeWingL}>
        <polygon points="8,12 13.2,15 13.2,21 8,24 2.8,21 2.8,15" fill="var(--honey)" opacity="0.35" />
      </g>
      <g className={s.beeWingR}>
        <polygon points="28,12 33.2,15 33.2,21 28,24 22.8,21 22.8,15" fill="var(--honey)" opacity="0.35" />
      </g>
      <polygon
        points="18,6 22.33,8.5 22.33,13.5 18,16 13.67,13.5 13.67,8.5"
        fill="var(--honey)"
        stroke="var(--comb)"
        strokeWidth="1"
      />
      <polygon
        points="18,17.5 25.36,21.75 25.36,30.25 18,34.5 10.64,30.25 10.64,21.75"
        fill="var(--honey)"
        stroke="var(--comb)"
        strokeWidth="1"
      />
    </svg>
  )
}

function LocationPicker({
  value,
  onChange,
}: {
  value: number
  onChange: (n: number) => void
}) {
  return (
    <div className={s.locPicker}>
      <div
        className={s.locBee}
        style={{ left: `${(value - 1) * (CELL + CELL_GAP) + CELL / 2}px` }}
      >
        <div className={s.locBeeBob}>
          <Bee />
        </div>
      </div>
      <div className={s.locCells}>
        {Array.from({ length: MAX_LOCATIONS }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            className={s.locCell}
            aria-label={`${n} ლოკაცია`}
            aria-pressed={n === value}
            onClick={() => onChange(n)}
          >
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <polygon
                points="50,10 85,30 85,70 50,90 15,70 15,30"
                fill={n <= value ? 'var(--honey)' : 'none'}
                stroke={n <= value ? 'var(--honey)' : 'var(--line)'}
                strokeWidth="7"
                strokeLinejoin="round"
              />
              <text
                x="50"
                y="63"
                textAnchor="middle"
                fontSize="36"
                fontWeight="700"
                fill={n <= value ? 'var(--ink)' : 'var(--muted)'}
              >
                {n}
              </text>
            </svg>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function PricingSection() {
  const [yearly, setYearly] = useState(false)
  const [locations, setLocations] = useState(1)

  const starterPrice = applyDiscount(STARTER_PRICE, yearly)
  const growthPrice = applyDiscount(
    GROWTH_BASE + (locations - 1) * GROWTH_EXTRA_PER_LOCATION,
    yearly,
  )

  return (
    <section className={s.section} id="pricing">
      <h2 className={s.secT}>ფასები</h2>

      <div className={s.periodToggle}>
        <div className={s.periodTrack}>
          <button
            type="button"
            className={!yearly ? `${s.periodBtn} ${s.periodBtnActive}` : s.periodBtn}
            onClick={() => setYearly(false)}
          >
            თვიური
          </button>
          <button
            type="button"
            className={yearly ? `${s.periodBtn} ${s.periodBtnActive}` : s.periodBtn}
            onClick={() => setYearly(true)}
          >
            წლიური −15%
          </button>
        </div>
      </div>

      <div className={s.founderBanner}>
        <span>
          პირველი <strong>10 პარტნიორი</strong>: 2 თვე უფასოდ, შემდეგ{' '}
          <strong>₾69/თვე სამუდამოდ</strong>
        </span>
      </div>

      <div className={s.price}>
        <div className={s.pl}>
          <div className={s.nm}>დამწყები</div>
          <div className={s.plSub}>ერთი ადგილისთვის</div>
          <div className={s.pr}>
            ₾{starterPrice}
            <small>/თვე</small>
          </div>
          <ul className={s.plFeatures}>
            {FEATURES.starter.map((f) => (
              <li key={f}>✓ {f}</li>
            ))}
          </ul>
          <Link className={s.cta2} href="/register">
            დაიწყე უფასოდ
          </Link>
        </div>

        <div className={`${s.pl} ${s.plHot}`}>
          <div className={s.plBadge}>პოპულარული</div>
          <div className={s.nm}>მზარდი</div>
          <div className={s.plSub}>რამდენიმე ლოკაცია</div>
          <div className={s.pr}>
            ₾<span key={growthPrice} className={s.prPop}>{growthPrice}</span>
            <small>/თვე</small>
          </div>
          <LocationPicker value={locations} onChange={setLocations} />
          <div className={s.locHint}>
            {locations === 1
              ? 'აირჩიე ლოკაციების რაოდენობა'
              : `${locations} ლოკაცია · +₾${GROWTH_EXTRA_PER_LOCATION} ყოველ დამატებულზე`}
          </div>
          <ul className={s.plFeatures}>
            {FEATURES.growth.map((f) => (
              <li key={f}>✓ {f}</li>
            ))}
          </ul>
          <Link className={s.cta} href="/register">
            დაიწყე უფასოდ
          </Link>
        </div>

        <div className={s.pl}>
          <div className={s.nm}>ქსელი</div>
          <div className={s.plSub}>ფრანჩაიზი / ქსელი</div>
          <div className={`${s.pr} ${s.prText}`}>ინდივიდუალური</div>
          <ul className={s.plFeatures}>
            {FEATURES.network.map((f) => (
              <li key={f}>✓ {f}</li>
            ))}
          </ul>
          <a
            className={s.cta2}
            href="https://instagram.com/taplyapp"
            target="_blank"
            rel="noopener noreferrer"
          >
            დამიკავშირდი
          </a>
        </div>
      </div>
    </section>
  )
}
