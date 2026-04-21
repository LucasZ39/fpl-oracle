import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import playersRouter from './routes/player'
import fixturesRouter from './routes/fixture'
import predictionsRouter from './routes/predictions'

const app = express()
const PORT = 3000

app.use(cors({
  origin: ['http://localhost:5173', 'fpl-oracle-two.vercel.apphttps://fpl-oracle-two.vercel.app/']
}))
app.use(express.json())
app.use('/api/predictions', predictionsRouter)

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'backend' })
})

app.use('/api/players', playersRouter)
app.use('/api/fixtures', fixturesRouter)

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`)
})