import {useState} from 'react'
import { useQuery } from '@tanstack/react-query'
import { getDifferentials } from '../lib/api'
import { Link } from 'react-router-dom'

const CURRENT_GW = 38

const POSITION_LABELS: Record<number, string> = {
  1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD'
}

const POSITION_COLORS: Record<number, string> = {
  1: 'bg-yellow-500',
  2: 'bg-blue-500',
  3: 'bg-green-500',
  4: 'bg-red-500'
}

function SkeletonCard() {
  return (
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 animate-pulse">
      <div className="h-4 bg-gray-700 rounded w-1/3 mb-3" />
      <div className="h-8 bg-gray-700 rounded w-1/2 mb-3" />
      <div className="h-3 bg-gray-700 rounded w-2/3 mb-2" />
      <div className="h-3 bg-gray-700 rounded w-1/2" />
    </div>
  )
}

export default function Home() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['differentials', CURRENT_GW],
    queryFn: () => getDifferentials(CURRENT_GW)
  })

  const [posFilter, setPosFilter] = useState<number | null>(null)

  const filtered = data
    ? posFilter ? data.filter((p: any) => p.position === posFilter) : data
    : []

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Differential Picks</h1>
        <p className="text-gray-400">
          Gameweek {CURRENT_GW} — high predicted points, low ownership
        </p>
      </div>

      {/* position filters */}
      <div className="flex gap-2 mb-6">
        {[null, 1, 2, 3, 4].map(pos => (
          <button
            key={pos ?? 'all'}
            onClick={() => setPosFilter(pos)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              posFilter === pos
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {pos === null ? 'All' : POSITION_LABELS[pos]}
          </button>
        ))}
      </div>

      {isError && (
        <div className="bg-red-900/30 border border-red-800 rounded-xl p-6 text-center">
          <p className="text-red-400">Failed to load differentials. Is the backend running?</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : filtered.map((player: any) => (
              <Link
                to={`/players/${player.playerId}`}
                key={player.playerId}
                className="bg-gray-900 rounded-xl p-5 border border-gray-800 hover:border-purple-600 transition-colors block"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${POSITION_COLORS[player.position]} text-white`}>
                    {POSITION_LABELS[player.position]}
                  </span>
                  <span className="text-xs text-gray-500">{player.ownership}% owned</span>
                </div>

                <div className="text-2xl font-bold mb-1">
                  {player.predicted_pts} pts
                </div>
                <div className="text-xs text-gray-500 mb-3">
                  80% CI: {player.q10} — {player.q90}
                </div>

                <div className="space-y-1">
                  {player.explanation?.slice(0, 3).map((e: any) => (
                    <div key={e.feature} className="flex justify-between text-xs">
                      <span className="text-gray-400">{e.feature.replace(/_/g, ' ')}</span>
                      <span className={e.contribution > 0 ? 'text-green-400' : 'text-red-400'}>
                        {e.contribution > 0 ? '+' : ''}{e.contribution}
                      </span>
                    </div>
                  ))}
                </div>
              </Link>
            ))}
      </div>

      {!isLoading && filtered.length === 0 && (
        <div className="text-center text-gray-500 py-12">
          No differentials found for this position.
        </div>
      )}
    </div>
  )
}