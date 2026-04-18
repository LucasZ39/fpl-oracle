import express from 'express'
import cors from 'cors'

const app = express()
const PORT = 3000

app.use(cors())
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'backend' })
})

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`)
})