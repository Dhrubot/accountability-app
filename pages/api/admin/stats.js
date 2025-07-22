// pages/api/admin/stats.js
import { supabaseAdmin } from '../../../lib/supabase'
import { requireAdmin } from '../../../lib/adminAuth'

export default async function handler(req, res) {
  try {
    // Use your existing requireAdmin middleware
    const auth = await requireAdmin()(req, res)
    if (!auth) return

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    // Get case statistics using admin client
    const { data: cases, error: casesError } = await supabaseAdmin
      .from('cases')
      .select('status, verification_status, created_at, name')
      .order('created_at', { ascending: false })

    if (casesError) {
      console.error('Supabase error:', casesError)
      return res.status(500).json({ error: 'Failed to fetch case stats' })
    }

    // Calculate statistics
    const stats = {
      total: cases.length,
      verified: cases.filter(c => c.verification_status === 'verified').length,
      pending: cases.filter(c => c.verification_status === 'pending').length,
      unverified: cases.filter(c => c.verification_status === 'unverified').length,
      missing: cases.filter(c => c.status === 'missing').length,
      injured: cases.filter(c => c.status === 'injured').length,
      deceased: cases.filter(c => c.status === 'deceased').length,
      safe: cases.filter(c => c.status === 'safe').length,
      recent: cases.slice(0, 10)
    }

    res.status(200).json(stats)
  } catch (error) {
    console.error('Admin stats error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}