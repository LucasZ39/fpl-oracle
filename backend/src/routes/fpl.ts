import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma'
import { getManager, getManagerPicks, getCurrentGameweek } from '../lib/fplClient'
import { getPredictions } from '../lib/mlClient'

const router = Router()

function parseId(value: string | undefined): number | null {
  const n = parseInt(value ?? '', 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

async function resolveGameweek(query: any): Promise<number> {
  const requested = parseInt(query.gw, 10)
  if (Number.isFinite(requested) && requested > 0) return requested
  try {
    return await getCurrentGameweek()
  } catch {
    return 38
  }
}

// GET /api/fpl/team/:id — manager summary
router.get('/team/:id', async (req: Request, res: Response) => {
  const id = parseId(req.params.id)
  if (!id) return res.status(400).json({ error: 'Invalid manager id' })
  try {
    const manager = await getManager(id)
    res.json({
      id: manager.id,
      teamName: manager.name,
      managerName: `${manager.player_first_name} ${manager.player_last_name}`.trim(),
      overallPoints: manager.summary_overall_points,
      overallRank: manager.summary_overall_rank,
      gameweekPoints: manager.summary_event_points,
      gameweekRank: manager.summary_event_rank,
      currentEvent: manager.current_event,
      bank: manager.last_deadline_bank ?? 0,
      teamValue: manager.last_deadline_value ?? 0,
      totalTransfers: manager.last_deadline_total_transfers ?? 0
    })
  } catch (err: any) {
    res.status(404).json({ error: 'Manager not found or FPL API unavailable' })
  }
})

// GET /api/fpl/squad/:id?gw=N — full squad with player details
router.get('/squad/:id', async (req: Request, res: Response) => {
  const id = parseId(req.params.id)
  if (!id) return res.status(400).json({ error: 'Invalid manager id' })

  try {
    const gw = await resolveGameweek(req.query)
    const picks = await getManagerPicks(id, gw)

    const playerIds = picks.picks.map(p => p.element)
    const players = await prisma.player.findMany({
      where: { id: { in: playerIds } },
      include: { team: true }
    })
    const playerMap = new Map(players.map(p => [p.id, p]))

    const squad = picks.picks.map(pick => {
      const p = playerMap.get(pick.element)
      return {
        playerId: pick.element,
        position: pick.position,
        slotPosition: pick.position <= 11 ? 'starter' : 'bench',
        multiplier: pick.multiplier,
        isCaptain: pick.is_captain,
        isViceCaptain: pick.is_vice_captain,
        webName: p?.webName ?? `Player ${pick.element}`,
        positionType: p?.position ?? null,
        teamName: p?.team?.name ?? null,
        teamShortName: p?.team?.shortName ?? null,
        price: p?.price ?? null,
        ownership: p?.ownership ?? null
      }
    })

    res.json({
      gameweek: gw,
      activeChip: picks.active_chip,
      bank: picks.entry_history.bank,
      teamValue: picks.entry_history.value,
      points: picks.entry_history.points,
      pointsOnBench: picks.entry_history.points_on_bench,
      transfers: picks.entry_history.event_transfers,
      transfersCost: picks.entry_history.event_transfers_cost,
      squad
    })
  } catch (err: any) {
    res.status(502).json({ error: 'Failed to fetch squad', detail: err?.message })
  }
})

// GET /api/fpl/suggestions/:id?gw=N — transfer suggestions
router.get('/suggestions/:id', async (req: Request, res: Response) => {
  const id = parseId(req.params.id)
  if (!id) return res.status(400).json({ error: 'Invalid manager id' })

  try {
    const gw = await resolveGameweek(req.query)
    const [picks, predictions] = await Promise.all([
      getManagerPicks(id, gw),
      getPredictions(gw).catch(() => [] as any[])
    ])

    const predMap = new Map<number, any>()
    for (const p of predictions) predMap.set(p.playerId, p)

    const allPlayers = await prisma.player.findMany({ include: { team: true } })
    const playerMap = new Map(allPlayers.map(p => [p.id, p]))

    const bank = picks.entry_history.bank
    const ownedIds = new Set(picks.picks.map(p => p.element))

    type Candidate = {
      playerId: number
      webName: string
      teamShortName: string | null
      position: number
      price: number
      ownership: number
      predictedPts: number
    }

    const byPosition: Record<number, Candidate[]> = { 1: [], 2: [], 3: [], 4: [] }
    for (const player of allPlayers) {
      const pred = predMap.get(player.id)
      if (!pred) continue
      const cand: Candidate = {
        playerId: player.id,
        webName: player.webName,
        teamShortName: player.team?.shortName ?? null,
        position: player.position,
        price: player.price,
        ownership: player.ownership,
        predictedPts: pred.predicted_pts
      }
      byPosition[player.position]?.push(cand)
    }
    for (const k of Object.keys(byPosition)) {
      byPosition[Number(k)].sort((a, b) => b.predictedPts - a.predictedPts)
    }

    const suggestions: any[] = []
    for (const pick of picks.picks) {
      const owned = playerMap.get(pick.element)
      if (!owned) continue
      const ownedPred = predMap.get(pick.element)
      const ownedPts = ownedPred?.predicted_pts ?? 0
      const maxPrice = owned.price + bank
      const pool = byPosition[owned.position] ?? []
      const upgrade = pool.find(c =>
        !ownedIds.has(c.playerId) &&
        c.price <= maxPrice &&
        c.predictedPts > ownedPts + 0.5
      )
      if (!upgrade) continue
      suggestions.push({
        out: {
          playerId: owned.id,
          webName: owned.webName,
          teamShortName: owned.team?.shortName ?? null,
          position: owned.position,
          price: owned.price,
          predictedPts: Math.round(ownedPts * 10) / 10
        },
        in: {
          playerId: upgrade.playerId,
          webName: upgrade.webName,
          teamShortName: upgrade.teamShortName,
          position: upgrade.position,
          price: upgrade.price,
          predictedPts: Math.round(upgrade.predictedPts * 10) / 10,
          ownership: upgrade.ownership
        },
        priceDelta: upgrade.price - owned.price,
        pointsDelta: Math.round((upgrade.predictedPts - ownedPts) * 10) / 10
      })
    }

    suggestions.sort((a, b) => b.pointsDelta - a.pointsDelta)

    res.json({
      gameweek: gw,
      bank,
      suggestions: suggestions.slice(0, 8)
    })
  } catch (err: any) {
    res.status(502).json({ error: 'Failed to build suggestions', detail: err?.message })
  }
})

export default router
