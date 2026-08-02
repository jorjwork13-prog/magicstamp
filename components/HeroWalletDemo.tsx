import WalletPassCard from '@/components/WalletPassCard'
import s from './HeroWalletDemo.module.css'

/**
 * Hero visual: an iPhone frame that loops the Apple Wallet add-flow —
 * double-tap the side button, the wallet sheet slides up with our pass,
 * „დაემატა ✓", back to the resting 3/5 card.
 *
 * Server component on purpose: the whole loop is one CSS timeline (see
 * HeroWalletDemo.module.css), so the hero ships no extra JavaScript and
 * prefers-reduced-motion falls back to the plain resting card.
 */
export default function HeroWalletDemo() {
  return (
    <div className={s.wrap}>
      <div className={s.phone}>
        <div className={s.screen}>
          <div className={s.scrim} aria-hidden="true" />
          <div className={s.label} aria-hidden="true">
            WALLET
          </div>

          {/* passes already in the wallet, peeking out behind ours */}
          <div className={`${s.stub} ${s.stub2}`} aria-hidden="true" />
          <div className={`${s.stub} ${s.stub1}`} aria-hidden="true" />

          <div className={s.cardPos}>
            <div className={s.cardAnim}>
              <WalletPassCard
                businessName="კაფე ვერა"
                theme="honey"
                stampCount={3}
                maxStamps={5}
                passId="hero"
                qrValue="https://taply.ge"
                passIdText="TPL-7Q4M-92KE"
                subtitle="ყავის ბარათი · თბილისი"
              />
            </div>
          </div>

          <div className={s.toastWrap} aria-hidden="true">
            <div className={s.toast}>
              <span className={s.check}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M5 12.5 10 17.5 19 7"
                    stroke="#2B2118"
                    strokeWidth="3.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              დაემატა
            </div>
          </div>
        </div>

        <div className={s.island} aria-hidden="true" />

        {/* double-click the side button — the gesture that opens Wallet */}
        <div className={s.tapZone} aria-hidden="true">
          <div className={s.sideBtn} />
          <div className={`${s.ripple} ${s.r1}`} />
          <div className={`${s.ripple} ${s.r2}`} />
        </div>
      </div>
    </div>
  )
}
