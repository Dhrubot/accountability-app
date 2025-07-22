// pages/api/testimonies.js - New API with caching for testimonies
import { supabase } from '../../lib/supabase'
import { securityManager } from '../../lib/security'

// Cache for testimonies data
let testimoniesCache = new Map()
let testimoniesCacheTimestamps = new Map()
const TESTIMONIES_CACHE_DURATION = 5 * 60 * 1000 // 5 minutes for testimonies
const CASE_TESTIMONIES_CACHE_DURATION = 10 * 60 * 1000 // 10 minutes for specific case testimonies

// Helper function to generate cache key for testimonies
function generateTestimoniesCacheKey(params) {
  const { caseId, page, limit } = params
  return `testimonies_${caseId || 'all'}_${page}_${limit}`
}

// Helper function to check if cache is valid
function isTestimoniesCacheValid(key, duration = TESTIMONIES_CACHE_DURATION) {
  const timestamp = testimoniesCacheTimestamps.get(key)
  return timestamp && (Date.now() - timestamp < duration)
}

// Helper function to set cache
function setTestimoniesCache(key, data, duration = TESTIMONIES_CACHE_DURATION) {
  testimoniesCache.set(key, data)
  testimoniesCacheTimestamps.set(key, Date.now())
  
  // Auto-cleanup expired entries
  setTimeout(() => {
    if (!isTestimoniesCacheValid(key, duration)) {
      testimoniesCache.delete(key)
      testimoniesCacheTimestamps.delete(key)
    }
  }, duration + 1000)
}

// Helper function to invalidate testimonies cache
function invalidateTestimoniesCache(caseId = null) {
  if (caseId) {
    // Invalidate specific case testimonies
    for (const key of testimoniesCache.keys()) {
      if (key.includes(`testimonies_${caseId}_`)) {
        testimoniesCache.delete(key)
        testimoniesCacheTimestamps.delete(key)
      }
    }
  } else {
    // Invalidate all testimonies cache
    testimoniesCache.clear()
    testimoniesCacheTimestamps.clear()
  }
  console.log(`Testimonies cache invalidated for case ${caseId || 'all'}`)
}

export default async function handler(req, res) {
  const ip = securityManager.getClientIP(req)
  
  try {
    securityManager.updateMetrics('requests')

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    if (!securityManager.checkRateLimit(ip, 'testimonies')) {
      securityManager.updateMetrics('errors')
      return res.status(429).json({ error: 'Rate limit exceeded' })
    }

    const { caseId, page = 1, limit = 20 } = req.query
    
    // Generate cache key
    const cacheKey = generateTestimoniesCacheKey({ caseId, page, limit })
    const cacheDuration = caseId ? CASE_TESTIMONIES_CACHE_DURATION : TESTIMONIES_CACHE_DURATION
    
    // Check cache first
    if (isTestimoniesCacheValid(cacheKey, cacheDuration)) {
      const cachedData = testimoniesCache.get(cacheKey)
      return res.status(200).json({
        ...cachedData,
        cached: true,
        cacheAge: Math.round((Date.now() - testimoniesCacheTimestamps.get(cacheKey)) / 1000)
      })
    }
    
    let query = supabase
      .from('testimonies')
      .select(`
        id,
        testimony,
        submitter_name,
        relationship_to_person,
        created_at,
        case_id,
        cases!inner (
          id,
          name,
          verification_status
        )
      `)
      .in('cases.verification_status', ['verified', 'pending'])
      .order('created_at', { ascending: false })

    if (caseId) {
      query = query.eq('case_id', caseId)
    }

    const offset = (parseInt(page) - 1) * parseInt(limit)
    query = query.range(offset, offset + parseInt(limit) - 1)

    const { data, error } = await query

    if (error) {
      console.error('Testimonies database error:', error)
      securityManager.updateMetrics('errors')
      return res.status(500).json({ error: 'Failed to fetch testimonies' })
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('testimonies')
      .select('*', { count: 'exact', head: true })
      .in('cases.verification_status', ['verified', 'pending'])

    if (caseId) {
      countQuery = countQuery.eq('case_id', caseId)
    }

    const { count: totalCount } = await countQuery

    const response = { 
      testimonies: data || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount || 0,
        pages: Math.ceil((totalCount || 0) / parseInt(limit))
      }
    }
    
    // Cache the response
    setTestimoniesCache(cacheKey, response, cacheDuration)

    res.status(200).json(response)

  } catch (error) {
    console.error('Testimonies API error:', error)
    securityManager.updateMetrics('errors')
    res.status(500).json({ error: 'Internal server error' })
  }
}

// Export cache invalidation function for use in admin APIs
export { invalidateTestimoniesCache }
