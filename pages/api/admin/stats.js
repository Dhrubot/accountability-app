// pages/api/admin/stats.js - Enhanced with caching and more detailed stats
import { supabaseAdmin, logAdminActivity } from '../../../lib/supabase'
import { requireAdmin } from '../../../lib/adminAuth'

// Simple in-memory cache for stats (use Redis in production)
let statsCache = null
let statsCacheTime = null
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
    if (!useFresh && statsCache && statsCacheTime && (Date.now() - statsCacheTime < CACHE_DURATION)) {
      return res.status(200).json({
        ...statsCache,
        cached: true,
        cacheAge: Math.round((Date.now() - statsCacheTime) / 1000)
      })
    }

    // Fetch fresh stats
    const stats = await fetchStats()

    // Update cache
    statsCache = stats
    statsCacheTime = Date.now()

    // Log activity
    await logAdminActivity('stats_viewed', {
      details: { fresh_data: useFresh }
    })

    res.status(200).json({
      ...stats,
      cached: false
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

async function fetchStats() {
  try {
    // Get all cases with minimal data for statistics
    const { data: cases, error: casesError } = await supabaseAdmin
      .from('cases')
      .select('status, verification_status, created_at, name, age')
      .order('created_at', { ascending: false })

    if (casesError) {
      console.error('Supabase cases error:', casesError)
      throw new Error('Failed to fetch case stats')
    }

    // Get testimonies count
    const { count: testimoniesCount, error: testimoniesError } = await supabaseAdmin
      .from('testimonies')
      .select('*', { count: 'exact', head: true })

    if (testimoniesError) {
      console.error('Supabase testimonies error:', testimoniesError)
    }

    // Get admin activity count for today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const { count: todayActivity, error: activityError } = await supabaseAdmin
      .from('admin_activity')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString())

    if (activityError) {
      console.error('Supabase activity error:', activityError)
    }

    // Calculate time-based statistics
    const now = new Date()
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const stats = {
      // Basic counts
      total: cases.length,
      testimonies: testimoniesCount || 0,
      todayActivity: todayActivity || 0,
      
      // Verification status
      verified: cases.filter(c => c.verification_status === 'verified').length,
      pending: cases.filter(c => c.verification_status === 'pending').length,
      unverified: cases.filter(c => c.verification_status === 'unverified').length,
      rejected: cases.filter(c => c.verification_status === 'rejected').length,
      duplicate: cases.filter(c => c.verification_status === 'duplicate').length,
      
      // Person status
      missing: cases.filter(c => c.status === 'missing').length,
      injured: cases.filter(c => c.status === 'injured').length,
      deceased: cases.filter(c => c.status === 'deceased').length,
      safe: cases.filter(c => c.status === 'safe').length,
      
      // Time-based statistics
      recent24h: cases.filter(c => new Date(c.created_at) > last24h).length,
      recent7d: cases.filter(c => new Date(c.created_at) > last7d).length,
      recent30d: cases.filter(c => new Date(c.created_at) > last30d).length,
      
      // Age demographics (for cases with age data)
      demographics: {
        children: cases.filter(c => c.age && c.age < 13).length,
        teens: cases.filter(c => c.age && c.age >= 13 && c.age < 18).length,
        adults: cases.filter(c => c.age && c.age >= 18).length,
        unknown_age: cases.filter(c => !c.age).length
      },
      
      // Recent cases (last 10)
      recentCases: cases.slice(0, 10).map(c => ({
        id: c.id,
        name: c.name,
        status: c.status,
        verification_status: c.verification_status,
        created_at: c.created_at
      })),
      
      // Verification rate
      verificationRate: cases.length > 0 ? 
        Math.round((cases.filter(c => c.verification_status === 'verified').length / cases.length) * 100) : 0,
      
      // Generated timestamp
      generatedAt: new Date().toISOString()
    }

    return stats
  } catch (error) {
    console.error('Fetch stats error:', error)
    throw error
  }
}