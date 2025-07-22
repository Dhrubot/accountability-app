// pages/api/cases.js
import { supabase } from '../../lib/supabase'
import { securityManager } from '../../lib/security'

export default async function handler(req, res) {
  const ip = securityManager.getClientIP(req)
  
  try {
    securityManager.updateMetrics('requests')

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    if (!securityManager.checkRateLimit(ip, 'search')) {
      securityManager.updateMetrics('errors')
      return res.status(429).json({ error: 'Rate limit exceeded' })
    }

    const { search, status, page = 1, limit = 20 } = req.query
    
    let query = supabase
      .from('cases')
      .select('*')
      .in('verification_status', ['verified', 'pending'])
      .order('created_at', { ascending: false })

    if (search) {
      const cleanSearch = securityManager.sanitizeInput(search)
      query = query.ilike('name', `%${cleanSearch}%`)
    }

    if (status && ['missing', 'injured', 'deceased', 'safe'].includes(status)) {
      query = query.eq('status', status)
    }

    const offset = (parseInt(page) - 1) * parseInt(limit)
    query = query.range(offset, offset + parseInt(limit) - 1)

    const { data, error } = await query

    if (error) {
      console.error('Database error:', error)
      securityManager.updateMetrics('errors')
      return res.status(500).json({ error: 'Failed to fetch cases' })
    }

    res.status(200).json({ cases: data })

  } catch (error) {
    console.error('API error:', error)
    securityManager.updateMetrics('errors')
    res.status(500).json({ error: 'Internal server error' })
  }
}