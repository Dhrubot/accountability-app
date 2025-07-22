// pages/api/admin/cache-control.js - New endpoint for cache management (dev only)
import { invalidateAdminCache, refreshAdminStatus, debugAdminCache, clearAdminCache } from '../../../lib/supabase'
import { requireAdmin } from '../../../lib/adminAuth'

export default async function handler(req, res) {
  // Only available in development
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ error: 'Not found' })
  }

  try {
    const auth = await requireAdmin('admin')(req, res)
    if (!auth) return

    switch (req.method) {
      case 'GET':
        // Get cache stats
        const stats = debugAdminCache()
        res.status(200).json({ success: true, cache: stats })
        break

      case 'POST':
        const { action, userId } = req.body

        switch (action) {
          case 'invalidate':
            if (userId) {
              invalidateAdminCache(userId)
              res.status(200).json({ success: true, message: `Cache invalidated for user ${userId}` })
            } else {
              return res.status(400).json({ error: 'User ID required for invalidation' })
            }
            break

          case 'refresh':
            if (userId) {
              const refreshedStatus = await refreshAdminStatus(userId)
              res.status(200).json({ success: true, status: refreshedStatus })
            } else {
              return res.status(400).json({ error: 'User ID required for refresh' })
            }
            break

          case 'clear':
            clearAdminCache()
            res.status(200).json({ success: true, message: 'Cache cleared' })
            break

          default:
            res.status(400).json({ error: 'Invalid action' })
        }
        break

      default:
        res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Cache control error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}