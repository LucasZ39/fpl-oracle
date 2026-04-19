import { Router, Request, Response } from 'express'
import { getPredictions, getDifferentials } from '../lib/mlClient'
import prisma from '../lib/prisma'

const router = Router()

// GET /api/predictions/gameweek/:gw
router.get('/gameweek/:gw', async (req: Request, res: Response) => {
  try {
    const gw = parseInt(req.params.gw as string)
    if (isNaN(gw)) return res.status(400).json({ error: 'gw must be a number' })

    const predictions = await getPredictions(gw)

    // log predictions to database
    for (const p of predictions) {
      await prisma.predictionsLog.upsert({
        where: { id: 0 },
        create: {
          playerId: p.playerId,
          gameweekId: gw,
          predictedPts: p.predicted_pts,
          q10: p.q10,
          q90: p.q90,
          modelVersion: 'v1'
        },
        update: {}
      }).catch(() => {})
    }

    res.json(predictions)
  } catch (err) {
    res.status(503).json({ error: 'ML service unavailable' })
  }
})

// GET /api/differentials?gameweek=N
router.get('/differentials', async (req: Request, res: Response) => {
  try {
    const gw = parseInt(req.query.gameweek as string)
    if (isNaN(gw)) return res.status(400).json({ error: 'gameweek must be a number' })

    const differentials = await getDifferentials(gw)
    res.json(differentials)
  } catch (err) {
    res.status(503).json({ error: 'ML service unavailable' })
  }
})

export default router