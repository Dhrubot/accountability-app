// pages/api/public-data.js - Combined endpoint for public users to reduce function calls
import { supabase } from '../../lib/supabase'
import { securityManager } from '../../lib/security'

// Combined cache for public data
let publicCache = new Map()
let publicCacheTimestamps = new Map()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

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

    const { search, status, page = 1, limit = 20, fresh = 'false' } = req.query
    const useFresh = fresh === 'true'
    
    // Generate cache key based on parameters
    const cacheKey = `${search || 'all'}_${status || 'all'}_${page}_${limit}`
    
    // Check cache unless fresh data is requested
    if (!useFresh && isCacheValid(cacheKey)) {
      const cachedData = publicCache.get(cacheKey)
      return res.status(200).json({
        ...cachedData,
        cached: true,
        cacheAge: Math.round((Date.now() - publicCacheTimestamps.get(cacheKey)) / 1000)
      })
    }

    // Fetch both cases and stats in parallel
    const [casesData, statsData] = await Promise.all([
      fetchCases({ search, status, page: parseInt(page), limit: parseInt(limit) }),
      fetchStats()
    ])

    const publicData = {
      cases: casesData.cases,
      totalPages: casesData.totalPages,
      currentPage: casesData.currentPage,
      stats: statsData
    }

    // Update cache
    setCache(cacheKey, publicData)

    res.status(200).json({
      ...publicData,
      cached: false
    })

  } catch (error) {
    console.error('Public data error:', error)
    securityManager.updateMetrics('errors')
    res.status(500).json({ error: 'Failed to fetch data' })
  }
}

// Helper function to check if cache is valid
function isCacheValid(key) {
  const timestamp = publicCacheTimestamps.get(key)
  return timestamp && (Date.now() - timestamp < CACHE_DURATION)
}

// Helper function to set cache
function setCache(key, data) {
  publicCache.set(key, data)
  publicCacheTimestamps.set(key, Date.now())
  
  // Auto-cleanup expired entries
  for (const [cacheKey, timestamp] of publicCacheTimestamps.entries()) {
    if (Date.now() - timestamp > CACHE_DURATION) {
      publicCache.delete(cacheKey)
      publicCacheTimestamps.delete(cacheKey)
    }
  }
}

// Fetch cases (from cases.js)
async function fetchCases({ search, status, page, limit }) {
  let query = supabase
    .from('cases')
    .select('*')
    .eq('verification_status', 'verified')
    .order('created_at', { ascending: false })

  if (search) {
    const cleanSearch = securityManager.sanitizeInput(search)
    query = query.ilike('name', `%${cleanSearch}%`)
  }

  if (status) {
    query = query.eq('status', status)
  }

  // Get total count for pagination
  const { count } = await supabase
    .from('cases')
    .select('*', { count: 'exact', head: true })
    .eq('verification_status', 'verified')

  // Apply pagination
  const offset = (page - 1) * limit
  query = query.range(offset, offset + limit - 1)

  const { data: cases, error } = await query

  if (error) {
    throw new Error('Failed to fetch cases')
  }

  return {
    cases: cases || [],
    totalPages: Math.ceil((count || 0) / limit),
    currentPage: page
  }
}

// Fetch stats (from stats.js)
async function fetchStats() {
  try {
    // Get case counts by status - only verified cases for public
    const { data: cases, error: casesError } = await supabase
      .from('cases')
      .select('status, verification_status')
      .eq('verification_status', 'verified')

    if (casesError) {
      throw new Error('Failed to fetch case stats')
    }

    // Calculate stats
    const total = cases.length
    const missing = cases.filter(c => c.status === 'missing').length
    const injured = cases.filter(c => c.status === 'injured').length
    const deceased = cases.filter(c => c.status === 'deceased').length
    const safe = cases.filter(c => c.status === 'safe').length
    const verified = total // All are verified for public view
    const pending = 0 // Don't show pending count to public

    return {
      total,
      missing,
      injured,
      deceased,
      safe,
      verified,
      pending
    }
  } catch (error) {
    console.error('Stats fetch error:', error)
    // Return fallback stats
    return {
      total: 0,
      missing: 0,
      injured: 0,
      deceased: 0,
      safe: 0,
      verified: 0,
      pending: 0
    }
  }
}
