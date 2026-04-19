const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export async function getPlayers() {
  const res = await fetch(`${API_URL}/api/players`)
  if (!res.ok) throw new Error('Failed to fetch players')
  return res.json()
}

export async function getPlayer(id: number) {
  const res = await fetch(`${API_URL}/api/players/${id}`)
  if (!res.ok) throw new Error('Failed to fetch player')
  return res.json()
}

export async function getDifferentials(gameweek: number) {
  const res = await fetch(`${API_URL}/api/predictions/differentials?gameweek=${gameweek}`)
  if (!res.ok) throw new Error('Failed to fetch differentials')
  return res.json()
}

export async function getFixtures(gameweek: number) {
  const res = await fetch(`${API_URL}/api/fixtures?gameweek=${gameweek}`)
  if (!res.ok) throw new Error('Failed to fetch fixtures')
  return res.json()
}