const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000'
const ML_API_KEY = process.env.ML_API_KEY || 'dev-key'

const mlHeaders = {
  'x-api-key': ML_API_KEY,
  'Content-Type': 'application/json'
}

export async function getPredictions(gameweekId: number) {
  const res = await fetch(`${ML_SERVICE_URL}/predict/gameweek/${gameweekId}`, {
    headers: mlHeaders
  })
  if (!res.ok) throw new Error(`ML service error: ${res.status}`)
  return res.json()
}

export async function getDifferentials(gameweekId: number) {
  const res = await fetch(`${ML_SERVICE_URL}/differentials?gameweek_id=${gameweekId}`, {
    headers: mlHeaders
  })
  if (!res.ok) throw new Error(`ML service error: ${res.status}`)
  return res.json()
}