'use client'

import { useState } from 'react'
import Link from 'next/link'
import s from '@/app/page.module.css'

const STARTER_PRICE = 99
const GROWTH_BASE = 189
const GROWTH_EXTRA_PER_LOCATION = 79
const MAX_LOCATIONS = 5
const YEARLY_DISCOUNT = 0.15

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
            ₾{growthPrice}
            <small>/თვე</small>
          </div>
          <input
            type="range"
            min={1}
            max={MAX_LOCATIONS}
            step={1}
            value={locations}
            onChange={(e) => setLocations(Number(e.target.value))}
            className={s.plSlider}
            aria-label="ლოკაციების რაოდენობა"
          />
          <div className={s.plSliderLabel}>{locations} ლოკაცია</div>
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
          <div className={s.pr}>ინდივიდუალური</div>
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
