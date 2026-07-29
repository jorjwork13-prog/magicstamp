export type ReferralLeader = {
  id:    string
  name:  string
  count: number
}

/** Top referrers for the business, most referrals first. */
export default function ReferralLeaderboard({ leaders }: { leaders: ReferralLeader[] }) {
  const total = leaders.reduce((sum, l) => sum + l.count, 0)

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <h2 className="text-lg font-semibold text-dtext">მოწვევების ლიდერბორდი</h2>
        <span className="bg-honey text-ink text-xs font-bold px-2 py-0.5 rounded-full">
          {total}
        </span>
      </div>

      {leaders.length === 0 ? (
        <div className="text-center py-10 text-dmuted">
          <p className="text-4xl mb-3">🤝</p>
          <p className="text-sm">ჯერ არცერთი მოწვევა</p>
        </div>
      ) : (
        <ul className="divide-y divide-dline/50">
          {leaders.map((leader, i) => (
            <li key={leader.id} className="flex items-center gap-3 py-3 text-sm">
              <span className="w-6 shrink-0 text-xs text-dmuted tabular-nums">{i + 1}.</span>
              <span className="flex-1 min-w-0 font-medium text-dtext truncate">{leader.name}</span>
              <span className="shrink-0 text-dmuted tabular-nums whitespace-nowrap">
                {leader.count} მოწვევა
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
