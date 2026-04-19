import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { getPlayer } from '../lib/api'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

const POSITION_LABELS: Record<number, string> = {
  1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD'
}

export default function PlayerDetail() {
  const { id } = useParams()
  const { data: player, isLoading, isError } = useQuery({
    queryKey: ['player', id],
    queryFn: () => getPlayer(Number(id))
  })

  if (isLoading) return (
    <div className="animate-pulse space-y-4">
      <div className="h-10 bg-gray-800 rounded w-1/3" />
      <div className="h-48 bg-gray-800 rounded" />
      <div className="h-48 bg-gray-800 rounded" />
    </div>
  )

  if (isError || !player) return (
    <div className="bg-red-900/30 border border-red-800 rounded-xl p-6 text-center">
      <p className="text-red-400">Player not found.</p>
      <Link to="/" className="text-purple-400 mt-2 block">← Back to home</Link>
    </div>
  )

  const formData = [...(player.stats || [])].reverse().map((s: any) => ({
    gw: `GW${s.gameweekId}`,
    points: s.points,
    minutes: s.minutes
  }))

  return (
    <div className="space-y-6">
      {/* back link */}
      <Link to="/" className="text-purple-400 text-sm hover:underline">← Back to differentials</Link>

      {/* header */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-1">{player.webName}</h1>
            <p className="text-gray-400">
              {player.team?.name} · {POSITION_LABELS[player.position]} · £{(player.price / 10).toFixed(1)}m
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-purple-400">{player.ownership}%</div>
            <div className="text-xs text-gray-500">ownership</div>
          </div>
        </div>
      </div>

      {/* form chart */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <h2 className="text-lg font-semibold mb-4">Recent form</h2>
        {formData.length === 0 ? (
          <p className="text-gray-500 text-sm">No stats available.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={formData}>
              <XAxis dataKey="gw" tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151' }}
                labelStyle={{ color: '#e5e7eb' }}
              />
              <ReferenceLine y={6} stroke="#7c3aed" strokeDasharray="3 3" />
              <Line
                type="monotone"
                dataKey="points"
                stroke="#a78bfa"
                strokeWidth={2}
                dot={{ fill: '#7c3aed', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* stats table */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <h2 className="text-lg font-semibold mb-4">Last 10 gameweeks</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800">
                <th className="text-left py-2">GW</th>
                <th className="text-right py-2">Pts</th>
                <th className="text-right py-2">Mins</th>
                <th className="text-right py-2">Goals</th>
                <th className="text-right py-2">Assists</th>
                <th className="text-right py-2">Bonus</th>
              </tr>
            </thead>
            <tbody>
              {[...(player.stats || [])].reverse().map((s: any) => (
                <tr key={s.gameweekId} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="py-2 text-gray-400">GW{s.gameweekId}</td>
                  <td className="py-2 text-right font-bold">{s.points}</td>
                  <td className="py-2 text-right text-gray-400">{s.minutes}</td>
                  <td className="py-2 text-right text-gray-400">{s.goals}</td>
                  <td className="py-2 text-right text-gray-400">{s.assists}</td>
                  <td className="py-2 text-right text-gray-400">{s.bonus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}