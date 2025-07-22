// pages/api/admin/metrics.js
import { securityManager } from '../../lib/security'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Basic auth check (implement proper admin auth in production)
  const authHeader = req.headers.authorization
  if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_API_KEY}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const metrics = securityManager.getMetrics()
  res.status(200).json(metrics)
}