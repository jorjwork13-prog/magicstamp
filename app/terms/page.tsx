import Link from 'next/link'

export const metadata = { title: 'მომსახურების პირობები — MagicStamp' }

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white px-4 py-12">
      <div className="max-w-2xl mx-auto">

        <Link href="/" className="text-sm text-[#185FA5] hover:underline mb-8 inline-block">
          ← მთავარი გვერდი
        </Link>

        <h1 className="text-3xl font-bold text-[#185FA5] mb-2">
          მომსახურების პირობები
        </h1>
        <p className="text-sm text-gray-400 mb-10">ბოლოს განახლდა: 13 ივნისი, 2026</p>

        <div className="space-y-8 text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">1. სერვისის აღწერა</h2>
            <p>
              MagicStamp არის ციფრული ლოიალობის სტემპ-ბარათების სერვისი ბიზნესებისთვის.
              სერვისი საშუალებას აძლევს ბიზნეს-მფლობელებს შექმნან ციფრული სტემპ-ბარათი
              და მართონ კლიენტების ლოიალობის პროგრამა ქაღალდის ბარათების გარეშე.
              კლიენტებს შეუძლიათ სტემპები Google Wallet-ში შეინახონ.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">2. დასაშვები გამოყენება</h2>
            <p>სერვისის გამოყენებით თქვენ ეთანხმებით, რომ:</p>
            <ul className="list-disc pl-5 mt-3 space-y-1 text-gray-600">
              <li>გამოიყენებთ სერვისს მხოლოდ კანონიერი ბიზნეს-მიზნებისთვის.</li>
              <li>არ შეიყვანთ სხვა პირის მონაცემებს მათი თანხმობის გარეშე.</li>
              <li>არ შეეცდებით სისტემის გაყალბებას, ბოტებით ან ავტომატური საშუალებებით სტემპების მოპოვებას.</li>
              <li>პასუხისმგებელნი ხართ თქვენი ანგარიშის უსაფრთხოებაზე.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">3. სერვისი „როგორც არის"</h2>
            <p>
              MagicStamp გთავაზობთ სერვისს <span className="font-medium">„როგორც არის"</span> და{' '}
              <span className="font-medium">„როგორც ხელმისაწვდომია"</span> პრინციპით.
              ჩვენ ვცდილობთ უზრუნველვყოთ სერვისის მაქსიმალური ხელმისაწვდომობა,
              თუმცა ვერ ვიძლევით გარანტიას შეუფერხებელ, შეცდომისგან თავისუფალ მუშაობაზე.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">4. ფასი და გამოწერა</h2>
            <p>
              სერვისი ამჟამად ხელმისაწვდომია <span className="font-medium">უფასოდ</span> ადრეული
              ბეტა-პერიოდში. სამომავლოდ შეიძლება შემოღებულ იქნეს გადახდილი გეგმები.
              ამ შემთხვევაში მომხმარებლები წინასწარ იქნებიან გაფრთხილებულნი.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">5. პასუხისმგებლობის შეზღუდვა</h2>
            <p>
              MagicStamp და მისი მფლობელები არ არიან პასუხისმგებელნი რაიმე პირდაპირ, არაპირდაპირ
              ან შემთხვევით ზარალზე, რომელიც გამოწვეულია სერვისის გამოყენებით ან
              გამოყენების შეუძლებლობით. სერვისის გამოყენება ხდება მომხმარებლის სრული
              პასუხისმგებლობით.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">6. ცვლილებები პირობებში</h2>
            <p>
              ჩვენ ვიტოვებთ უფლებას შევიტანოთ ცვლილებები ამ პირობებში ნებისმიერ დროს.
              მნიშვნელოვანი ცვლილებების შემთხვევაში მომხმარებლები შეატყობინებენ
              ელ-ფოსტით ან სერვისის მეშვეობით.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">7. კონტაქტი</h2>
            <p>
              კითხვებისთვის დაგვიკავშირდით:{' '}
              <a href="mailto:jorjwork13@gmail.com" className="text-[#185FA5] hover:underline font-medium">
                jorjwork13@gmail.com
              </a>
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
