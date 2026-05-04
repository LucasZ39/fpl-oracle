import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { getFplManager, getFplSuggestions, type Suggestion } from '../lib/api'

const POSITION_LABELS: Record<number, string> = {
  1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD'
}

const POSITION_COLORS: Record<number, string> = {
  1: 'bg-yellow-500',
  2: 'bg-blue-500',
  3: 'bg-green-500',
  4: 'bg-red-500'
}

function fmtMoney(tenths: number) {
  return `£${(tenths / 10).toFixed(1)}m`
}

function PriceDelta({ delta }: { delta: number }) {
  if (delta === 0) return <span className="text-gray-500 text-xs">no cost change</span>
  const sign = delta > 0 ? '+' : ''
  const color = delta > 0 ? 'text-amber-400' : 'text-emerald-400'
  return (
    <span className={`text-xs ${color}`}>
      {sign}{(delta / 10).toFixed(1)}m
    </span>
  )
}

function SuggestionCard({ s }: { s: Suggestion }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-purple-700 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${POSITION_COLORS[s.in.position]} text-white`}>
          {POSITION_LABELS[s.in.position]}
        </span>
        <div className="text-right">
          <div className="text-emerald-400 text-lg font-bold">+{s.pointsDelta} pts</div>
          <PriceDelta delta={s.priceDelta} />
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <Link
          to={`/players/${s.out.playerId}`}
          className="bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2.5 hover:bg-red-950/50 transition-colors"
        >
          <div className="text-[10px] uppercase text-red-400 mb-0.5">Out</div>
          <div className="text-sm font-semibold truncate">{s.out.webName}</div>
          <div className="text-xs text-gray-500 flex justify-between mt-0.5">
            <span>{s.out.teamShortName ?? '—'}</span>
            <span>{fmtMoney(s.out.price)} · {s.out.predictedPts}</span>
          </div>
        </Link>

        <div className="text-purple-400 text-lg font-bold">→</div>

        <Link
          to={`/players/${s.in.playerId}`}
          className="bg-emerald-950/30 border border-emerald-900/50 rounded-lg px-3 py-2.5 hover:bg-emerald-950/50 transition-colors"
        >
          <div className="text-[10px] uppercase text-emerald-400 mb-0.5">In</div>
          <div className="text-sm font-semibold truncate">{s.in.webName}</div>
          <div className="text-xs text-gray-500 flex justify-between mt-0.5">
            <span>{s.in.teamShortName ?? '—'}</span>
            <span>{fmtMoney(s.in.price)} · {s.in.predictedPts}</span>
          </div>
        </Link>
      </div>

      <div className="text-[11px] text-gray-500 mt-3">
        {s.in.ownership.toFixed(1)}% ownership
      </div>
    </div>
  )
}

export default function Suggestions() {
  const { user } = useAuth()
  const fplId = user?.fplId

  const managerQ = useQuery({
    queryKey: ['fpl-manager', fplId],
    queryFn: () => getFplManager(fplId!),
    enabled: !!fplId
  })

  const sugQ = useQuery({
    queryKey: ['fpl-suggestions', fplId, managerQ.data?.currentEvent],
    queryFn: () => getFplSuggestions(fplId!, managerQ.data?.currentEvent),
    enabled: !!fplId && !!managerQ.data
  })

  if (!fplId) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
        <h2 className="text-xl font-semibold mb-2">Link your FPL team first</h2>
        <p className="text-gray-400 mb-4">We need your squad to suggest improvements.</p>
        <Link to="/connect" className="inline-block bg-purple-600 hover:bg-purple-500 transition-colors rounded-lg px-5 py-2 text-sm font-semibold">
          Connect FPL Team
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Transfer Suggestions</h1>
        <p className="text-gray-400">
          Upgrades within your budget, ranked by predicted points gain.
          {sugQ.data && <> Bank: <span className="text-white">{fmtMoney(sugQ.data.bank)}</span>.</>}
        </p>
      </div>

      {sugQ.isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-44 bg-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {sugQ.isError && (
        <div className="bg-red-900/30 border border-red-800 rounded-xl p-6 text-center">
          <p className="text-red-400">Couldn’t build suggestions right now.</p>
          <p className="text-xs text-gray-500 mt-1">The ML service may be warming up — try again in a moment.</p>
        </div>
      )}

      {sugQ.data && sugQ.data.suggestions.length === 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
          <p className="text-gray-300 font-semibold">Your squad is already optimised 🎯</p>
          <p className="text-sm text-gray-500 mt-1">
            No upgrades clear our predicted-points threshold within your current budget.
          </p>
        </div>
      )}

      {sugQ.data && sugQ.data.suggestions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sugQ.data.suggestions.map((s, i) => <SuggestionCard key={i} s={s} />)}
        </div>
      )}
    </div>
  )
}
