import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 relative">
      <div className="text-center max-w-lg">
        <div className="text-5xl font-bold text-[#185FA5] mb-6 tracking-tight">
          MagicStamp
        </div>
        <h1 className="text-2xl font-semibold text-gray-800 mb-4 leading-snug">
          ციფრული ლოიალობის ბარათი თქვენი ბიზნესისთვის
        </h1>
        <p className="text-gray-500 mb-10 text-base leading-relaxed">
          შეცვალეთ ქაღალდის ბარათები ციფრული გადაწყვეტილებით — სწრაფად, მარტივად, უფასოდ.
        </p>
        <Link
          href="/register"
          className="inline-block bg-[#185FA5] text-white rounded-lg px-10 py-3.5 text-base font-semibold hover:bg-[#134d87] active:bg-[#0f3d6b] transition"
        >
          დაიწყეთ უფასოდ
        </Link>
        <p className="mt-5 text-sm text-gray-400">
          უკვე გაქვთ ანგარიში?{' '}
          <Link href="/login" className="text-[#185FA5] hover:underline font-medium">
            შესვლა
          </Link>
        </p>
      </div>
      <footer className="absolute bottom-6 left-0 right-0 flex justify-center gap-4 text-xs text-gray-400">
        <Link href="/privacy" className="hover:text-[#185FA5] transition">კონფიდენციალურობა</Link>
        <span>·</span>
        <Link href="/terms" className="hover:text-[#185FA5] transition">პირობები</Link>
      </footer>
    </div>
  )
}
