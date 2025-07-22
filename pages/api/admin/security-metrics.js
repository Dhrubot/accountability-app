// pages/api/admin/security-metrics.js
import { securityManager } from '../../../lib/security'
import { requireAdmin } from '../../../lib/adminAuth'

export default async function handler(req, res) {
  try {
    const auth = await requireAdmin()(req, res)
    if (!auth) return

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const metrics = securityManager.getMetrics()
    
    res.status(200).json({
      requests: metrics.requests,
      errors: metrics.errors,
      blockedIPs: metrics.blockedIPs,
      threatLevel: metrics.threatLevel,
      requestsPerHour: metrics.requestsPerHour,
      errorRate: metrics.errorRate
    })
  } catch (error) {
    console.error('Security metrics error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}