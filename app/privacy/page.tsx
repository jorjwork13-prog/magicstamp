import Link from 'next/link'

export const metadata = { title: 'კონფიდენციალურობის პოლიტიკა — Taply' }

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-cream px-4 py-12">
      <div className="max-w-2xl mx-auto">

        <Link href="/" className="text-sm text-[#C97F1E] hover:underline mb-8 inline-block">
          ← მთავარი გვერდი
        </Link>

        <h1 className="text-3xl font-bold text-[#C97F1E] mb-2">
          კონფიდენციალურობის პოლიტიკა
        </h1>
        <p className="text-sm text-gray-400 mb-10">ბოლოს განახლდა: 13 ივნისი, 2026</p>

        <div className="space-y-8 text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">1. რა მონაცემებს ვაგროვებთ</h2>
            <p>
              Taply აგროვებს მინიმალურ მონაცემებს სერვისის გამართულად მუშაობისთვის:
            </p>
            <ul className="list-disc pl-5 mt-3 space-y-1 text-gray-600">
              <li><span className="font-medium text-gray-700">ბიზნეს-მფლობელები:</span> სახელი და ელ-ფოსტის მისამართი რეგისტრაციისას.</li>
              <li><span className="font-medium text-gray-700">კლიენტები (სტემპ-ბარათის მფლობელები):</span> სახელი და ტელეფონის ნომერი გაწევრიანებისას.</li>
              <li><span className="font-medium text-gray-700">ლოიალობის მონაცემები:</span> სტემპების რაოდენობა და ვიზიტების ისტორია.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">2. როგორ ვიყენებთ მონაცემებს</h2>
            <p>
              შეგროვებული მონაცემები გამოიყენება მხოლოდ ციფრული ლოიალობის სტემპ-ბარათების მართვისთვის.
              ჩვენ <span className="font-medium">არ</span> ვყიდით, <span className="font-medium">არ</span> ვიზიარებთ
              და <span className="font-medium">არ</span> ვიყენებთ თქვენს მონაცემებს სარეკლამო მიზნებისთვის
              ან სხვა ნებისმიერი მიზნით, გარდა სერვისის მიწოდებისა.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">3. სად ინახება მონაცემები</h2>
            <p>
              ყველა მონაცემი უსაფრთხოდ ინახება <span className="font-medium">Supabase</span>-ის
              ინფრასტრუქტურაზე, რომელიც აკმაყოფილებს მონაცემთა დაცვის საერთაშორისო სტანდარტებს.
              მონაცემებზე წვდომა შეზღუდულია და დაცულია ავთენტიფიკაციის მექანიზმებით.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">4. Google Wallet</h2>
            <p>
              კლიენტს შეუძლია სტემპ-ბარათი დაამატოს <span className="font-medium">Google Wallet</span>-ში.
              ამ შემთხვევაში Google-ის კონფიდენციალურობის პოლიტიკა ასევე ვრცელდება.
              Taply Google Wallet-ს იყენებს მხოლოდ ბარათის ვიზუალური ჩვენებისთვის
              და სტემპების განახლებისთვის.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">5. მონაცემების გაზიარება</h2>
            <p>
              ჩვენ <span className="font-medium">არ ვყიდით</span> და <span className="font-medium">არ გადავცემთ</span> თქვენს
              პერსონალურ მონაცემებს მესამე მხარეებს, გარდა ზემოაღნიშნული ტექნიკური პარტნიორებისა
              (Supabase, Google), რომლებიც საჭიროა სერვისის ფუნქციონირებისთვის.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">6. კონტაქტი</h2>
            <p>
              კონფიდენციალურობასთან დაკავშირებული კითხვებისთვის დაგვიკავშირდით:{' '}
              <a href="mailto:jorjwork13@gmail.com" className="text-[#C97F1E] hover:underline font-medium">
                jorjwork13@gmail.com
              </a>
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
