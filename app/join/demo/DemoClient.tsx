'use client'

import { useState } from 'react'
import Link from 'next/link'
import TaplyLogo from '@/components/TaplyLogo'
import WalletPassCard from '@/components/WalletPassCard'
import { CARD_THEMES, CARD_THEME_SPECS, type CardTheme } from '@/lib/card-themes'

const CHIP_DOTS: Record<CardTheme, string> = {
  honey: '#F2A33C',
  ink: '#2B2118',
  cream: '#FFFDF8',
}

const COMPARE_ROWS = [
  { label: 'კლიენტი ბრუნდება?', none: 'შემთხვევით', paper: 'ხანდახან', taply: 'მიზეზი აქვს' },
  { label: 'ბარათი იკარგება?', none: '—', paper: 'მუდმივად', taply: 'ვერ დაკარგავს' },
  { label: 'ბეჭდვის ხარჯი', none: '₾0', paper: '₾200+ წელიწადში', taply: '₾0' },
  { label: 'ვინ ბრუნდება — იცი?', none: 'არა', paper: 'არა', taply: 'ხედავ ყველას' },
  { label: 'დაყენება', none: '—', paper: 'ბეჭდვა და დარიგება', taply: '2 წუთი' },
  { label: 'კლიენტს რა სჭირდება', none: '—', paper: 'ბარათი თან იქონიოს', taply: 'მხოლოდ ტელეფონი' },
]

/* Hexagon bullet icons for the "what the client sees" cards, matching the
   brand mark geometry used across design-refs. */
function HexFilled({ hole }: { hole: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 100 100" aria-hidden="true" className="shrink-0">
      <polygon points="50,12 83,31 83,69 50,88 17,69 17,31" fill="#F2A33C" stroke="#F2A33C" strokeWidth="12" strokeLinejoin="round" />
      <circle cx="50" cy="50" r="11" fill={hole} />
    </svg>
  )
}

function HexOutline() {
  return (
    <svg width="24" height="24" viewBox="0 0 100 100" aria-hidden="true" className="shrink-0">
      <polygon points="50,14 81,32 81,68 50,86 19,68 19,32" fill="none" stroke="#C97F1E" strokeWidth="9" strokeLinejoin="round" />
      <circle cx="50" cy="50" r="13" fill="#C97F1E" />
    </svg>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-xs text-muted tracking-[0.12em]">{children}</div>
  )
}

export default function DemoClient() {
  const [theme, setTheme] = useState<CardTheme>('honey')

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-[480px] mx-auto">

        {/* 1 · header + personal opener */}
        <div className="pt-6 px-5 flex flex-col gap-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TaplyLogo size={26} />
              <span className="text-xl font-bold tracking-tight text-ink">Taply</span>
            </div>
            <span className="font-mono text-[11px] text-muted">taply.ge</span>
          </div>
          <div className="bg-cream2 border border-line rounded-2xl px-[18px] py-4 flex gap-3 items-start">
            <span className="text-[22px] leading-none">👋</span>
            <p className="text-[15px] leading-relaxed text-ink">
              <strong>კარგია, რომ დაინტერესდი.</strong>{' '}
              <span className="text-[#6E5F49]">
                აქ ნახავ, როგორი იქნება შენი ლოიალობის ბარათი — შენთვის და შენი კლიენტისთვის.
              </span>
            </p>
          </div>
        </div>

        {/* 2 · live card preview */}
        <div className="pt-4 px-5 flex justify-center">
          <WalletPassCard
            businessName="კაფე ვერა"
            theme={theme}
            stampCount={7}
            maxStamps={10}
            passId="demo"
            qrValue="https://taply.ge"
            passIdText="TPL-7Q4M-92KE"
            subtitle="ყავის ბარათი · თბილისი"
          />
        </div>

        {/* theme switcher as selling moment */}
        <div className="pt-4 px-5 flex flex-col gap-2.5">
          <div className="text-center text-sm font-semibold text-[#6E5F49]">
            3 სხვადასხვა დიზაინის ბარათი
          </div>
          <div className="flex gap-2">
            {CARD_THEMES.map((key) => {
              const active = key === theme
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTheme(key)}
                  aria-pressed={active}
                  className={`flex-1 min-h-[52px] rounded-full border-2 flex flex-col items-center justify-center gap-0.5 transition cursor-pointer ${
                    active
                      ? 'bg-ink border-ink text-cream'
                      : 'bg-cream2 border-line text-ink hover:border-honey'
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-sm font-bold">
                    <span
                      className="w-3 h-3 rounded-full border border-ink/20 inline-block"
                      style={{ background: CHIP_DOTS[key] }}
                    />
                    {CARD_THEME_SPECS[key].labelKa}
                  </span>
                  <span className={`font-mono text-[9px] uppercase tracking-wider ${active ? 'text-cream/60' : 'text-muted'}`}>
                    {CARD_THEME_SPECS[key].label}
                  </span>
                </button>
              )
            })}
          </div>
          <div className="text-center text-xs text-muted">
            ფერი, ლოგო და ჯილდო — ყველაფერი შენს ბრენდზე ეწყობა
          </div>
        </div>

        {/* 3 · what the client sees */}
        <div className="pt-10 px-5 flex flex-col gap-4">
          <SectionLabel>რას ხედავს შენი კლიენტი</SectionLabel>
          <div className="flex flex-col gap-2.5">
            <div className="bg-cream2 border border-line rounded-[14px] px-4 py-3.5 flex gap-3 items-center">
              <HexFilled hole="#FFFDF8" />
              <p className="text-sm leading-normal text-ink">
                <strong>ბარათი მის ტელეფონშია</strong> — ვერ დაკარგავს. ყოველ გადახდაზე შენს
                ბრენდს ხედავს.
              </p>
            </div>
            <div className="bg-cream2 border border-line rounded-[14px] px-4 py-3.5 flex gap-3 items-center">
              <HexOutline />
              <p className="text-sm leading-normal text-ink">
                <strong>ხედავს, რამდენი დარჩა ჯილდომდე</strong> — „კიდევ 3 ყავა“ — ეს აიძულებს
                დაბრუნებას.
              </p>
            </div>
          </div>
        </div>

        {/* 4 · what YOU see (dashboard glimpse) */}
        <div className="pt-10 px-5 flex flex-col gap-4">
          <SectionLabel>რას ხედავ შენ</SectionLabel>
          <p className="text-[15px] leading-relaxed text-[#6E5F49]">
            პირველად გეცოდინება, ვინ არიან შენი მუდმივი კლიენტები — სახელით და ვიზიტებით.
          </p>
          <div className="bg-ink rounded-[18px] px-[18px] pt-[18px] pb-4 flex flex-col gap-3.5 shadow-[0_18px_36px_rgba(43,33,24,0.25)]">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold text-cream">კაფე ვერა — ეს თვე</span>
              <span className="font-mono text-[10px] text-[#7A6C55]">TAPLY DASHBOARD</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { num: '184', label: 'წევრი' },
                { num: '61%', label: 'დაბრუნდა' },
                { num: '23', label: 'ჯილდო გაიცა' },
              ].map((s) => (
                <div key={s.label} className="bg-honey/10 border border-honey/25 rounded-xl px-3 py-2.5">
                  <div className="font-mono text-[22px] text-honey">{s.num}</div>
                  <div className="text-[11px] text-[#A8987D] mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              {[
                { name: 'ნინო კ.', note: '9/10 · ხვალ-ზეგ დაბრუნდება', warn: false },
                { name: 'გიორგი მ.', note: 'კვირაში 4-ჯერ · შენი მუდმივი', warn: false },
                { name: 'თამარ ბ.', note: '2 კვირაა არ ჩანს — შეახსენე', warn: true },
              ].map((m) => (
                <div key={m.name} className="flex items-center justify-between bg-[#342917] rounded-[10px] px-3 py-2">
                  <span className="text-[13px] font-semibold text-cream">{m.name}</span>
                  <span className={`text-xs ${m.warn ? 'text-[#E8952B]' : 'text-[#A8987D]'}`}>{m.note}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 5 · three-way comparison */}
        <div className="pt-11 px-5 flex flex-col gap-4">
          <SectionLabel>შეადარე</SectionLabel>
          <div className="bg-cream2 border border-line rounded-[18px] overflow-hidden">
            <div className="grid grid-cols-[1.1fr_0.85fr_0.85fr_0.95fr] border-b border-line">
              <div className="py-3 pl-3.5 pr-2" />
              <div className="py-3 px-1.5 text-[11px] font-bold text-muted leading-tight flex items-end">
                არანაირი ლოიალობის პროგრამა
              </div>
              <div className="py-3 px-1.5 text-[11px] font-bold text-muted leading-tight flex items-end border-l border-[#EFE6D4]">
                ქაღალდის ბარათები
              </div>
              <div className="py-3 px-2 bg-[#FBF0DC] border-l-2 border-honey flex items-end gap-1.5">
                <svg width="14" height="14" viewBox="0 0 100 100" aria-hidden="true" className="shrink-0 mb-px">
                  <polygon points="50,12 83,31 83,69 50,88 17,69 17,31" fill="#F2A33C" stroke="#F2A33C" strokeWidth="12" strokeLinejoin="round" />
                  <circle cx="50" cy="50" r="11" fill="#FBF0DC" />
                </svg>
                <span className="text-[13px] font-extrabold text-ink">Taply</span>
              </div>
            </div>
            {COMPARE_ROWS.map((row, i) => (
              <div
                key={row.label}
                className={`grid grid-cols-[1.1fr_0.85fr_0.85fr_0.95fr] ${i < COMPARE_ROWS.length - 1 ? 'border-b border-[#EFE6D4]' : ''}`}
              >
                <div className="py-[11px] pl-3.5 pr-2 text-xs font-bold text-ink leading-snug flex items-center">
                  {row.label}
                </div>
                <div className="py-[11px] px-1.5 text-xs text-muted leading-snug flex items-center">
                  {row.none}
                </div>
                <div className="py-[11px] px-1.5 text-xs text-muted leading-snug border-l border-[#EFE6D4] flex items-center">
                  {row.paper}
                </div>
                <div className="py-[11px] px-2 text-xs font-bold text-ink leading-snug bg-[#FBF0DC] border-l-2 border-honey flex items-center">
                  {row.taply}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 6 · the offer */}
        <div className="pt-11 px-5">
          <div className="relative overflow-hidden bg-honey rounded-[20px] px-[22px] py-[26px] flex flex-col gap-[18px]">
            <svg width="260" height="260" viewBox="0 0 100 100" aria-hidden="true" className="absolute -right-20 -bottom-20 opacity-[0.18]">
              <polygon points="50,14 81,32 81,68 50,86 19,68 19,32" fill="none" stroke="#2B2118" strokeWidth="6" strokeLinejoin="round" />
            </svg>
            <div className="flex items-baseline gap-3">
              <span className="font-mono text-[56px] font-bold text-ink leading-none">10</span>
              <span className="text-[22px] font-extrabold text-ink leading-tight">პირველი პარტნიორი</span>
            </div>
            <p className="relative text-[15px] leading-relaxed text-ink">
              ამ უბანში მხოლოდ 10 ბიზნესს ვეძებ. თითოეული იღებს:
            </p>
            <div className="relative flex flex-col gap-[9px]">
              <div className="flex gap-2.5 items-center">
                <span className="w-2 h-2 bg-ink rounded-full shrink-0" />
                <span className="text-[15px] font-semibold text-ink">2 თვე უფასოდ</span>
              </div>
              <div className="flex gap-2.5 items-center">
                <span className="w-2 h-2 bg-ink rounded-full shrink-0" />
                <span className="text-[15px] font-semibold text-ink">
                  შემდეგ <span className="font-mono text-[19px] font-bold">₾69</span>/თვე სამუდამოდ —{' '}
                  <s className="opacity-55">₾99</s>-ის ნაცვლად
                </span>
              </div>
            </div>
            <p className="relative bg-ink/10 rounded-xl px-3.5 py-[11px] text-[13px] leading-normal text-ink">
              დამფუძნებლის ფასი სამუდამოდ გრჩება. მე-11 ბიზნესი უკვე სრულ ფასს იხდის.
            </p>
          </div>
        </div>

        {/* 7 · closing CTAs */}
        <div className="pt-10 px-5 pb-3 flex flex-col gap-3.5">
          <p className="text-center text-[15px] font-semibold text-[#6E5F49] leading-normal">
            ორ წუთში დაყენდება — შენს ნაცვლად მე გავაკეთებ.
          </p>
          <Link
            href="/register"
            className="min-h-[54px] rounded-[14px] bg-ink text-cream text-[17px] font-bold flex items-center justify-center hover:bg-comb hover:text-ink transition"
          >
            დაიწყე უფასოდ
          </Link>
          <a
            href="https://instagram.com/taplyapp"
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[54px] rounded-[14px] border-2 border-line bg-cream2 text-ink text-[17px] font-bold flex items-center justify-center hover:border-comb hover:text-comb transition"
          >
            დამიკავშირდი
          </a>
        </div>

        {/* footer */}
        <div className="flex items-center justify-between px-5 pt-[22px] pb-9">
          <div className="flex items-center gap-2">
            <TaplyLogo size={18} />
            <span className="text-sm font-bold text-ink">Taply · თაფლი</span>
          </div>
          <span className="font-mono text-xs text-muted">taply.ge</span>
        </div>

      </div>
    </div>
  )
}
