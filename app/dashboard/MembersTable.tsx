'use client'

import { useState } from 'react'
import StampGrid from '@/components/StampGrid'

type Member = {
  id: string
  name: string
  phone: string
  stamp_count: number
  created_at: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ka-GE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function MembersTable({
  members,
  maxStamps,
}: {
  members: Member[]
  maxStamps: number
}) {
  const [search, setSearch] = useState('')

  const filtered = members.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.phone.includes(search)
  )

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-dtext">წევრები</h2>
          <span className="bg-honey text-ink text-xs font-bold px-2 py-0.5 rounded-full">
            {members.length}
          </span>
        </div>

        <input
          type="search"
          placeholder="ძებნა სახელით ან ტელეფონით..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-dline bg-dbg2 text-dtext placeholder:text-dmuted rounded-lg px-3 py-1.5 text-sm outline-none focus:border-honey focus:ring-1 focus:ring-honey w-full sm:w-60 transition"
        />
      </div>

      {/* Empty state */}
      {members.length === 0 ? (
        <div className="text-center py-16 text-dmuted">
          <p className="text-5xl mb-4">📋</p>
          <p className="text-sm">ჯერ არცერთი წევრი — გააზიარეთ QR კოდი</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-dmuted text-sm">
          "{search}" — არავინ მოიძებნა
        </div>
      ) : (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dline text-left text-xs text-dmuted uppercase tracking-wider">
                <th className="pb-3 px-1 font-medium">სახელი</th>
                <th className="pb-3 px-1 font-medium">ტელეფონი</th>
                <th className="pb-3 px-1 font-medium">სტემპები</th>
                <th className="pb-3 px-1 font-medium whitespace-nowrap">გაწევრიანება</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((member) => (
                <tr
                  key={member.id}
                  className="border-b border-dline/50 hover:bg-dbg transition-colors"
                >
                  <td className="py-3 px-1 font-medium text-dtext">
                    {member.name}
                  </td>
                  <td className="py-3 px-1 text-dmuted tabular-nums">
                    {member.phone}
                  </td>
                  <td className="py-3 px-1 min-w-[120px]">
                    <div className="flex items-center gap-2">
                      <div style={{ width: 'fit-content' }}>
                        <StampGrid count={member.stamp_count} max={maxStamps} circleSize={10} gap={2} animateLastFilled colorByProgress />
                      </div>
                      <span className="text-xs text-dmuted tabular-nums whitespace-nowrap">
                        {member.stamp_count}/{maxStamps}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-1 text-dmuted whitespace-nowrap">
                    {formatDate(member.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
