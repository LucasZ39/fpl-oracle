import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma'

const router = Router()

// GET /api/players — all players
router.get('/', async (req: Request, res: Response) => {
  try {
    const players = await prisma.player.findMany({
      include: { team: true },
      orderBy: { ownership: 'desc' },
      take: 100
    })
    res.json(players)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch players' })
  }
})

// GET /api/players/:id — one player
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const player = await prisma.player.findUnique({
      where: { id: parseInt(req.params.id as string) },
      include: { team: true, stats: { orderBy: { gameweekId: 'desc' }, take: 10 } }
    })
    if (!player) return res.status(404).json({ error: 'Player not found' })
    res.json(player)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch player' })
  }
})

export default router