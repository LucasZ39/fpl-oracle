import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { getFplManager } from '../lib/api'

export default function ConnectFpl() {
  const { user, setFplId } = useAuth()
  const navigate = useNavigate()

  const [value, setValue] = useState(user?.fplId ? String(user.fplId) : '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ teamName: string; managerName: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setPreview(null)
    try {
      const id = parseInt(value, 10)
      if (!Number.isFinite(id) || id <= 0) throw new Error('Enter a valid FPL Team ID')
      const manager = await getFplManager(id)
      setPreview({ teamName: manager.teamName, managerName: manager.managerName })
      setFplId(id)
      setTimeout(() => navigate('/dashboard'), 600)
    } catch (err: any) {
      setError(err.message ?? 'Could not link team')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Connect your FPL team</h1>
        <p className="text-gray-400">
          Link your Fantasy Premier League team so we can pull your squad and tailor suggestions.
        </p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-gray-300 mb-2">Where do I find my Team ID?</h2>
        <ol className="text-sm text-gray-400 space-y-1.5 list-decimal list-inside">
          <li>Sign in at <span className="text-gray-200">fantasy.premierleague.com</span></li>
          <li>Click <span className="text-gray-200">Pick Team → View Gameweek History</span></li>
          <li>Your Team ID is the number in the URL: <code className="text-purple-300">/entry/<u>1234567</u>/history</code></li>
        </ol>
      </div>

      <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">FPL Team ID</label>
          <input
            type="number"
            inputMode="numeric"
            required
            value={value}
            onChange={e => setValue(e.target.value)}
            className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm focus:border-purple-600 focus:outline-none"
            placeholder="e.g. 1234567"
          />
        </div>

        {error && (
          <div className="text-sm text-red-400 bg-red-950/40 border border-red-900 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {preview && (
          <div className="text-sm text-emerald-300 bg-emerald-950/40 border border-emerald-900 rounded-lg px-3 py-2">
            Linked: <span className="font-semibold">{preview.teamName}</span> · {preview.managerName}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 transition-colors rounded-lg px-5 py-2.5 text-sm font-semibold"
        >
          {submitting ? 'Linking…' : user?.fplId ? 'Update team' : 'Link team'}
        </button>
      </form>
    </div>
  )
}
