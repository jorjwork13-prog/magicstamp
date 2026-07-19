import Link from 'next/link'
import TaplyLogo from '@/components/TaplyLogo'
import HeroBees from '@/components/HeroBees'
import s from './page.module.css'

const STAMP_TOTAL = 10
const STAMP_FILLED = 8

const STEPS = [
  {
    n: 1,
    title: 'კლიენტი QR-ს ასკანერებს',
    text: 'ერთხელ — და ბარათი უკვე მის Wallet-შია',
  },
  {
    n: 2,
    title: 'ყოველ ვიზიტზე — სტემპი',
    text: 'შენ ასკანერებ, ბარათი თავისით ახლდება',
  },
  {
    n: 3,
    title: 'სავსე ბარათი = ჯილდო',
    text: 'კლიენტი ბრუნდება. ყოველთვის.',
  },
]

const PLANS = [
  { name: 'Starter', price: '₾99', hot: false },
  { name: 'Growth', price: '₾189', hot: true },
  { name: 'Pro', price: '₾229', hot: false },
]

export default function HomePage() {
  return (
    <div className={s.page}>
      {/* ---------- HERO ---------- */}
      <div className={s.hero}>
        <HeroBees />

        <nav className={s.nav}>
          <div className={s.lg}>
            <TaplyLogo size={30} />
            <span>Taply</span>
          </div>
          <div className={s.navR}>
            <a className={s.ghost} href="#pricing">ფასები</a>
            <Link className={s.solid} href="/login">შესვლა</Link>
          </div>
        </nav>

        <div className={s.heroIn}>
          <div className={s.heroTxt}>
            <h1 className={s.h1}>
              ლოიალობის ბარათი,
              <br />
              რომელიც <em>ტელეფონშია</em>
            </h1>
            <p className={s.sub}>
              შენი კლიენტი ქაღალდის ბარათს კარგავს. ციფრული ბარათი Apple და
              Google Wallet-ში ცხოვრობს — და კლიენტი ბრუნდება.
            </p>
            <div className={s.ctaRow}>
              <Link className={s.cta} href="/register">დაიწყე უფასოდ</Link>
              <Link className={s.cta2} href="/join/demo">ნახე დემო</Link>
            </div>
            <p className={s.trust}>🍯 კაფე · სალონი · ბარბერშოპი · სპორტდარბაზი</p>
          </div>

          <div className={s.heroVis}>
            <div className={s.phone}>
              <div className={s.scr}>
                <div className={s.pass}>
                  <div className={s.passRow}>
                    <span className={s.biz}>კაფე „ვერა&quot;</span>
                    <span className={s.tp}>Taply</span>
                  </div>
                </div>
                <div className={s.stamps}>
                  {Array.from({ length: STAMP_TOTAL }, (_, i) => {
                    const filled = i < STAMP_FILLED
                    return (
                      <div key={i} className={s.st}>
                        <svg viewBox="0 0 100 100">
                          <polygon
                            points="50,12 83,31 83,69 50,88 17,69 17,31"
                            fill={filled ? '#F2A33C' : 'none'}
                            stroke={filled ? '#F2A33C' : '#E3D9C6'}
                            strokeWidth="9"
                            strokeLinejoin="round"
                          />
                          {filled && <circle cx="50" cy="50" r="10" fill="#FFFDF8" />}
                        </svg>
                      </div>
                    )
                  })}
                </div>
                <div className={s.reward}>კიდევ 2 ყავა — და ერთი საჩუქრად 🎁</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- HOW IT WORKS ---------- */}
      <section className={s.section}>
        <h2 className={s.secT}>როგორ მუშაობს</h2>
        <div className={s.steps}>
          {STEPS.map((step) => (
            <div key={step.n} className={s.step}>
              <div className={s.stepN}>
                <svg width="40" height="40" viewBox="0 0 100 100">
                  <polygon
                    points="50,12 83,31 83,69 50,88 17,69 17,31"
                    fill="none"
                    stroke="#F2A33C"
                    strokeWidth="8"
                    strokeLinejoin="round"
                  />
                  <text
                    x="50"
                    y="63"
                    textAnchor="middle"
                    fontSize="38"
                    fontWeight="700"
                    fill="#2B2118"
                  >
                    {step.n}
                  </text>
                </svg>
              </div>
              <b>{step.title}</b>
              <p>{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- PRICING ---------- */}
      <section className={s.section} id="pricing">
        <h2 className={s.secT}>ფასები</h2>
        <div className={s.price}>
          {PLANS.map((plan) => (
            <div key={plan.name} className={`${s.pl} ${plan.hot ? s.plHot : ''}`}>
              <div className={s.nm}>{plan.name}</div>
              <div className={s.pr}>
                {plan.price}
                <small>/თვე</small>
              </div>
              <Link className={plan.hot ? s.cta : s.cta2} href="/register">
                არჩევა
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- FOOTER ---------- */}
      <footer className={s.footer}>
        <div className={s.lg} style={{ justifyContent: 'center' }}>
          <TaplyLogo size={22} />
          <span>Taply</span>
        </div>
        <div style={{ marginTop: 8 }}>Taply © 2026 · taply.ge · Instagram @taplyapp</div>
        <div className={s.footerLinks}>
          <Link href="/privacy">კონფიდენციალურობა</Link>
          <span>·</span>
          <Link href="/terms">პირობები</Link>
        </div>
      </footer>
    </div>
  )
}
