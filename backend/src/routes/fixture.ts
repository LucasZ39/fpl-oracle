import { Router, Request, Response } from 'express'
import prisma from '../lib/prisma'

const router = Router()

// GET /api/fixtures?gameweek=N
router.get('/', async (req: Request, res: Response) => {
  try {
    const gameweekId = parseInt(req.query.gameweek as string)
    if (isNaN(gameweekId)) {
      return res.status(400).json({ error: 'gameweek must be a number' })
    }
    const fixtures = await prisma.fixture.findMany({
      where: { gameweekId },
      include: { homeTeam: true, awayTeam: true }
    })
    res.json(fixtures)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch fixtures' })
  }
})

export default router