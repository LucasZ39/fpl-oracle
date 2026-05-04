const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`)
  if (!res.ok) {
    let detail = ''
    try { detail = (await res.json())?.error ?? '' } catch {}
    throw new Error(detail || `Request failed: ${res.status}`)
  }
  return res.json() as Promise<T>
}

export async function getPlayers() {
  return getJson<any[]>('/api/players')
}

export async function getPlayer(id: number) {
  return getJson<any>(`/api/players/${id}`)
}

export async function getDifferentials(gameweek: number) {
  return getJson<any[]>(`/api/predictions/differentials?gameweek=${gameweek}`)
}

export async function getFixtures(gameweek: number) {
  return getJson<any[]>(`/api/fixtures?gameweek=${gameweek}`)
}

export type ManagerSummary = {
  id: number
  teamName: string
  managerName: string
  overallPoints: number
  overallRank: number
  gameweekPoints: number
  gameweekRank: number
  currentEvent: number
  bank: number
  teamValue: number
  totalTransfers: number
}

export async function getFplManager(id: number) {
  return getJson<ManagerSummary>(`/api/fpl/team/${id}`)
}

export type SquadPlayer = {
  playerId: number
  position: number
  slotPosition: 'starter' | 'bench'
  multiplier: number
  isCaptain: boolean
  isViceCaptain: boolean
  webName: string
  positionType: number | null
  teamName: string | null
  teamShortName: string | null
  price: number | null
  ownership: number | null
}

export type SquadResponse = {
  gameweek: number
  activeChip: string | null
  bank: number
  teamValue: number
  points: number
  pointsOnBench: number
  transfers: number
  transfersCost: number
  squad: SquadPlayer[]
}

export async function getFplSquad(id: number, gw?: number) {
  const q = gw ? `?gw=${gw}` : ''
  return getJson<SquadResponse>(`/api/fpl/squad/${id}${q}`)
}

export type Suggestion = {
  out: {
    playerId: number
    webName: string
    teamShortName: string | null
    position: number
    price: number
    predictedPts: number
  }
  in: {
    playerId: number
    webName: string
    teamShortName: string | null
    position: number
    price: number
    predictedPts: number
    ownership: number
  }
  priceDelta: number
  pointsDelta: number
}

export type SuggestionsResponse = {
  gameweek: number
  bank: number
  suggestions: Suggestion[]
}

export async function getFplSuggestions(id: number, gw?: number) {
  const q = gw ? `?gw=${gw}` : ''
  return getJson<SuggestionsResponse>(`/api/fpl/suggestions/${id}${q}`)
}
