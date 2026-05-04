const FPL_BASE = 'https://fantasy.premierleague.com/api'

export interface FplBootstrapEvent {
  id: number
  is_current: boolean
  is_next: boolean
  finished: boolean
}

export interface FplManager {
  id: number
  name: string
  player_first_name: string
  player_last_name: string
  summary_overall_points: number
  summary_overall_rank: number
  summary_event_points: number
  summary_event_rank: number
  current_event: number
  last_deadline_bank: number
  last_deadline_value: number
  last_deadline_total_transfers: number
}

export interface FplPick {
  element: number
  position: number
  multiplier: number
  is_captain: boolean
  is_vice_captain: boolean
}

export interface FplPicksResponse {
  active_chip: string | null
  picks: FplPick[]
  entry_history: {
    event: number
    points: number
    total_points: number
    rank: number
    overall_rank: number
    bank: number
    value: number
    event_transfers: number
    event_transfers_cost: number
    points_on_bench: number
  }
}

async function fplFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${FPL_BASE}${path}`, {
    headers: { 'User-Agent': 'fpl-oracle/1.0' }
  })
  if (!res.ok) throw new Error(`FPL API error ${res.status} on ${path}`)
  return res.json() as Promise<T>
}

export async function getManager(managerId: number) {
  return fplFetch<FplManager>(`/entry/${managerId}/`)
}

export async function getManagerPicks(managerId: number, gameweek: number) {
  return fplFetch<FplPicksResponse>(`/entry/${managerId}/event/${gameweek}/picks/`)
}

export async function getCurrentGameweek(): Promise<number> {
  const data = await fplFetch<{ events: FplBootstrapEvent[] }>(`/bootstrap-static/`)
  const current = data.events.find(e => e.is_current)
  if (current) return current.id
  const next = data.events.find(e => e.is_next)
  if (next) return Math.max(1, next.id - 1)
  return 1
}
