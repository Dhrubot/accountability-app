// pages/api/admin/cases.js
import { supabase } from '../../../lib/supabase'
import { requireAdmin, AdminAuth } from '../../../lib/adminAuth'

export default async function handler(req, res) {
  try {
    const auth = await requireAdmin()(req, res)
    if (!auth) return

    if (req.method === 'GET') {
      const { filter, page = 1, limit = 20, search } = req.query
      
      let query = supabase
        .from('cases')
        .select('*')
        .order('created_at', { ascending: false })

      // Apply filters
      if (filter && filter !== 'all') {
        if (['verified', 'pending', 'unverified'].includes(filter)) {
          query = query.eq('verification_status', filter)
        } else if (['missing', 'injured', 'deceased', 'safe'].includes(filter)) {
          query = query.eq('status', filter)
        }
      }

      if (search) {
        query = query.ilike('name', `%${search}%`)
      }

      const offset = (parseInt(page) - 1) * parseInt(limit)
      query = query.range(offset, offset + parseInt(limit) - 1)

      const { data: cases, error } = await query

      if (error) {
        return res.status(500).json({ error: 'Failed to fetch cases' })
      }

      res.status(200).json({ cases })
    } else {
      res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Admin cases error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}