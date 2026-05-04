import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { getFplManager, getFplSquad, type SquadPlayer } from '../lib/api'

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

function fmtRank(n: number | undefined) {
  if (!n) return '—'
  return n.toLocaleString()
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
    </div>
  )
}

function SquadRow({ p }: { p: SquadPlayer }) {
  const pos = p.positionType
  return (
    <Link
      to={`/players/${p.playerId}`}
      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800/50 transition-colors"
    >
      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${pos ? POSITION_COLORS[pos] : 'bg-gray-700'} text-white w-9 text-center`}>
        {pos ? POSITION_LABELS[pos] : '—'}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">
          {p.webName}
          {p.isCaptain && <span className="ml-1.5 text-[10px] bg-purple-600 text-white rounded px-1 py-0.5">C</span>}
          {p.isViceCaptain && <span className="ml-1.5 text-[10px] bg-gray-700 text-white rounded px-1 py-0.5">VC</span>}
        </div>
        <div className="text-xs text-gray-500">{p.teamShortName ?? '—'}</div>
      </div>
      <div className="text-sm text-gray-300 w-16 text-right">
        {p.price != null ? fmtMoney(p.price) : '—'}
      </div>
    </Link>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const fplId = user?.fplId

  const managerQ = useQuery({
    queryKey: ['fpl-manager', fplId],
    queryFn: () => getFplManager(fplId!),
    enabled: !!fplId
  })

  const squadQ = useQuery({
    queryKey: ['fpl-squad', fplId, managerQ.data?.currentEvent],
    queryFn: () => getFplSquad(fplId!, managerQ.data?.currentEvent),
    enabled: !!fplId && !!managerQ.data
  })

  if (!fplId) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
        <h2 className="text-xl font-semibold mb-2">Link your FPL team</h2>
        <p className="text-gray-400 mb-4">Connect your team to see your dashboard.</p>
        <Link to="/connect" className="inline-block bg-purple-600 hover:bg-purple-500 transition-colors rounded-lg px-5 py-2 text-sm font-semibold">
          Connect FPL Team
        </Link>
      </div>
    )
  }

  if (managerQ.isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-12 bg-gray-800 rounded w-1/2" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-gray-800 rounded-xl" />)}
        </div>
        <div className="h-96 bg-gray-800 rounded-xl" />
      </div>
    )
  }

  if (managerQ.isError || !managerQ.data) {
    return (
      <div className="bg-red-900/30 border border-red-800 rounded-xl p-6 text-center">
        <p className="text-red-400">Couldn’t load your FPL team.</p>
        <Link to="/connect" className="text-purple-400 mt-2 inline-block">Re-link team →</Link>
      </div>
    )
  }

  const m = managerQ.data
  const squad = squadQ.data?.squad ?? []
  const starters = squad.filter(p => p.slotPosition === 'starter')
  const bench = squad.filter(p => p.slotPosition === 'bench')

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">{m.teamName}</h1>
          <p className="text-gray-400 text-sm">{m.managerName} · GW{m.currentEvent}</p>
        </div>
        <Link to="/connect" className="text-xs text-gray-400 hover:text-white">Change team →</Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="GW Points"
          value={String(m.gameweekPoints ?? 0)}
          sub={`Rank ${fmtRank(m.gameweekRank)}`}
        />
        <StatCard
          label="Total Points"
          value={String(m.overallPoints ?? 0)}
          sub={`Rank ${fmtRank(m.overallRank)}`}
        />
        <StatCard
          label="Bank"
          value={fmtMoney(m.bank)}
        />
        <StatCard
          label="Squad Value"
          value={fmtMoney(m.teamValue)}
          sub={`${m.totalTransfers} transfers`}
        />
      </div>

      {squadQ.isLoading && (
        <div className="h-72 bg-gray-800 rounded-xl animate-pulse" />
      )}

      {squadQ.isError && (
        <div className="bg-red-900/30 border border-red-800 rounded-xl p-6 text-center">
          <p className="text-red-400">Couldn’t load squad picks for this gameweek yet.</p>
        </div>
      )}

      {squadQ.data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Starting XI</h2>
              <span className="text-xs text-gray-500">{starters.length} players</span>
            </div>
            <div className="space-y-1">
              {starters.map(p => <SquadRow key={p.playerId} p={p} />)}
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Bench</h2>
              <span className="text-xs text-gray-500">{squadQ.data.pointsOnBench} pts left on bench</span>
            </div>
            <div className="space-y-1">
              {bench.map(p => <SquadRow key={p.playerId} p={p} />)}
            </div>

            {squadQ.data.activeChip && (
              <div className="mt-4 text-xs bg-purple-950/40 border border-purple-900 text-purple-300 rounded-lg px-3 py-2">
                Active chip: {squadQ.data.activeChip}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-purple-950 to-gray-900 border border-purple-900 rounded-2xl p-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h3 className="text-lg font-semibold">Looking for upgrades?</h3>
          <p className="text-sm text-gray-400">See ML-driven transfer suggestions for your squad.</p>
        </div>
        <Link
          to="/suggestions"
          className="bg-purple-600 hover:bg-purple-500 transition-colors rounded-lg px-5 py-2 text-sm font-semibold"
        >
          View Suggestions →
        </Link>
      </div>
    </div>
  )
}
