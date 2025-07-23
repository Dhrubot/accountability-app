// pages/api/admin/dashboard-data.js - Combined endpoint to reduce function calls
import { supabaseAdmin, logAdminActivity } from '../../../lib/supabase'
import { requireAdmin } from '../../../lib/adminAuth'
import { securityManager } from '../../../lib/security'

// Combined cache for dashboard data
let dashboardCache = null
let dashboardCacheTime = null
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export default async function handler(req, res) {
  try {
    const auth = await requireAdmin()(req, res)
    if (!auth) return

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const { fresh = 'false' } = req.query
    const useFresh = fresh === 'true'

    // Check cache unless fresh data is requested
    if (!useFresh && dashboardCache && dashboardCacheTime && (Date.now() - dashboardCacheTime < CACHE_DURATION)) {
      return res.status(200).json({
        ...dashboardCache,
        cached: true,
        cacheAge: Math.round((Date.now() - dashboardCacheTime) / 1000)
      })
    }

    // Fetch all dashboard data in parallel
    const [stats, securityMetrics] = await Promise.all([
      fetchStats(),
      fetchSecurityMetrics()
    ])

    const dashboardData = {
      stats,
      security: securityMetrics,
      recent: stats.recent || []
    }

    // Update cache
    dashboardCache = dashboardData
    dashboardCacheTime = Date.now()

    // Log activity
    await logAdminActivity('dashboard_viewed', {
      details: { fresh_data: useFresh, combined_endpoint: true }
    })

    res.status(200).json({
      ...dashboardData,
      cached: false
    })
  } catch (error) {
    console.error('Dashboard data error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Fetch stats (copied from stats.js)
async function fetchStats() {
  try {
    // Get case counts by status
    const { data: cases, error: casesError } = await supabaseAdmin
      .from('cases')
      .select('status, verification_status, created_at')

    if (casesError) {
      console.error('Cases fetch error:', casesError)
      throw new Error('Failed to fetch case stats')
    }

    // Calculate stats
    const total = cases.length
    const missing = cases.filter(c => c.status === 'missing').length
    const injured = cases.filter(c => c.status === 'injured').length
    const deceased = cases.filter(c => c.status === 'deceased').length
    const safe = cases.filter(c => c.status === 'safe').length
    const verified = cases.filter(c => c.verification_status === 'verified').length
    const pending = cases.filter(c => c.verification_status === 'pending').length

    // Get recent cases (last 10)
    const { data: recentCases, error: recentError } = await supabaseAdmin
      .from('cases')
      .select('id, name, status, verification_status, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    if (recentError) {
      console.error('Recent cases fetch error:', recentError)
    }

    return {
      total,
      missing,
      injured,
      deceased,
      safe,
      verified,
      pending,
      recent: recentCases || []
    }
  } catch (error) {
    console.error('Stats fetch error:', error)
    throw error
  }
}

// Fetch security metrics (copied from security-metrics.js)
async function fetchSecurityMetrics() {
  try {
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Get security logs
    const { data: securityLogs, error: logsError } = await supabaseAdmin
      .from('security_logs')
      .select('*')
      .gte('created_at', oneDayAgo.toISOString())
      .order('created_at', { ascending: false })

    if (logsError) {
      console.error('Security logs fetch error:', logsError)
    }

    // Get admin activity
    const { data: adminActivity, error: activityError } = await supabaseAdmin
      .from('admin_activity')
      .select('*')
      .gte('created_at', oneDayAgo.toISOString())
      .order('created_at', { ascending: false })

    if (activityError) {
      console.error('Admin activity fetch error:', activityError)
    }

    // Calculate metrics
    const logs = securityLogs || []
    const activity = adminActivity || []

    const requests = logs.filter(log => log.event_type === 'request').length
    const errors = logs.filter(log => log.event_type === 'error').length
    const blockedIPs = new Set(logs.filter(log => log.event_type === 'blocked_ip').map(log => log.ip_address)).size
    const requestsLastHour = logs.filter(log => new Date(log.created_at) > oneHourAgo).length

    // Determine threat level
    let threatLevel = 'LOW'
    const errorRate = requests > 0 ? (errors / requests) * 100 : 0
    
    if (errorRate > 20 || blockedIPs > 10) {
      threatLevel = 'HIGH'
    } else if (errorRate > 10 || blockedIPs > 5) {
      threatLevel = 'MEDIUM'
    }

    return {
      requests,
      errors,
      blockedIPs,
      threatLevel,
      requestsPerHour: requestsLastHour,
      errorRate: Math.round(errorRate * 100) / 100,
      recentActivity: activity.slice(0, 10),
      recentLogs: logs.slice(0, 10)
    }
  } catch (error) {
    console.error('Security metrics fetch error:', error)
    // Return fallback data
    return {
      requests: 0,
      errors: 0,
      blockedIPs: 0,
      threatLevel: 'UNKNOWN',
      requestsPerHour: 0,
      errorRate: 0,
      recentActivity: [],
      recentLogs: [],
      error: 'Failed to fetch security metrics'
    }
  }
}
