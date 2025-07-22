// pages/api/stats.js
import { supabase } from '../../lib/supabase'
import { securityManager } from '../../lib/security'

export default async function handler(req, res) {
  const ip = securityManager.getClientIP(req)
  
  try {
    securityManager.updateMetrics('requests')

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    if (!securityManager.checkRateLimit(ip, 'general')) {
      securityManager.updateMetrics('errors')
      return res.status(429).json({ error: 'Rate limit exceeded' })
    }

    // Get total counts by status
    const { data: statusCounts, error: statusError } = await supabase
      .from('cases')
      .select('status, verification_status')

    if (statusError) {
      console.error('Database error:', statusError)
      securityManager.updateMetrics('errors')
      return res.status(500).json({ error: 'Failed to fetch statistics' })
    }

    // Calculate statistics
    const stats = {
      total: statusCounts.length,
      missing: statusCounts.filter(c => c.status === 'missing').length,
      injured: statusCounts.filter(c => c.status === 'injured').length,
      deceased: statusCounts.filter(c => c.status === 'deceased').length,
      safe: statusCounts.filter(c => c.status === 'safe').length,
      verified: statusCounts.filter(c => c.verification_status === 'verified').length,
      pending: statusCounts.filter(c => c.verification_status === 'pending').length,
      unverified: statusCounts.filter(c => c.verification_status === 'unverified').length
    }

    res.status(200).json(stats)

  } catch (error) {
    console.error('API error:', error)
    securityManager.updateMetrics('errors')
    res.status(500).json({ error: 'Internal server error' })
  }
}