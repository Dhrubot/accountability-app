// pages/api/admin/cases.js - Enhanced with caching and better error handling
import { supabaseAdmin, logAdminActivity } from '../../../lib/supabase'
import { requireAdmin } from '../../../lib/adminAuth'

// Cache for cases data
let casesCache = new Map()
let cacheTimestamps = new Map()
const CASES_CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const CASE_DETAIL_CACHE_DURATION = 10 * 60 * 1000 // 10 minutes for individual cases
const SEARCH_CACHE_DURATION = 3 * 60 * 1000 // 3 minutes for search results

let invalidatePublicCasesCache, invalidateTestimoniesCache
try {
  const publicCasesModule = require('../cases.js')
  invalidatePublicCasesCache = publicCasesModule.invalidatePublicCasesCache
} catch (error) {
  invalidatePublicCasesCache = () => {}
}
try {
  const testimoniesModule = require('../testimonies.js')
  invalidateTestimoniesCache = testimoniesModule.invalidateTestimoniesCache
} catch (error) {
  invalidateTestimoniesCache = () => {}
}

// Helper function to generate cache key
function generateCacheKey(params) {
  const { filter, page, limit, search, sortBy, sortOrder, dateFrom, dateTo } = params
  return `cases_${filter || 'all'}_${page}_${limit}_${search || ''}_${sortBy}_${sortOrder}_${dateFrom || ''}_${dateTo || ''}`
}

// Helper function to check if cache is valid
function isCacheValid(key, duration = CASES_CACHE_DURATION) {
  const timestamp = cacheTimestamps.get(key)
  return timestamp && (Date.now() - timestamp < duration)
}

// Helper function to set cache
function setCache(key, data, duration = CASES_CACHE_DURATION) {
  casesCache.set(key, data)
  cacheTimestamps.set(key, Date.now())
  
  // Auto-cleanup expired entries after setting new cache
  setTimeout(() => {
    if (!isCacheValid(key, duration)) {
      casesCache.delete(key)
      cacheTimestamps.delete(key)
    }
  }, duration + 1000)
}

// Helper function to invalidate related caches
function invalidateCasesCache(caseId = null) {
  if (caseId) {
    // Invalidate specific case cache
    casesCache.delete(`case_${caseId}`)
    cacheTimestamps.delete(`case_${caseId}`)
  }
  
  // Invalidate all cases list caches
  for (const key of casesCache.keys()) {
    if (key.startsWith('cases_')) {
      casesCache.delete(key)
      cacheTimestamps.delete(key)
    }
  }
  // Invalidate public and testimonies caches
  if (invalidatePublicCasesCache) invalidatePublicCasesCache()
  if (invalidateTestimoniesCache) invalidateTestimoniesCache(caseId)
}

export default async function handler(req, res) {
  try {
    // Use cached auth for regular case viewing
    const auth = await requireAdmin()(req, res)
    if (!auth) return

    switch (req.method) {
      case 'GET':
        await handleGetCases(req, res, auth)
        break
      case 'POST':
        await handleCreateCase(req, res, auth)
        break
      case 'PUT':
        await handleUpdateCase(req, res, auth)
        break
      case 'DELETE':
        await handleDeleteCase(req, res, auth)
        break
      default:
        res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Admin cases error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleGetCases(req, res, auth) {
  const { 
    filter, 
    page = 1, 
    limit = 20, 
    search,
    sortBy = 'created_at',
    sortOrder = 'desc',
    dateFrom,
    dateTo
  } = req.query

  const cacheKey = generateCacheKey({ filter, page, limit, search, sortBy, sortOrder, dateFrom, dateTo })

  if (isCacheValid(cacheKey)) {
    const cachedData = casesCache.get(cacheKey)
    return res.status(200).json(cachedData)
  }

  try {
    // Use supabaseAdmin for bypassing RLS
    let query = supabaseAdmin
      .from('cases')
      .select(`
        *,
        testimonies:testimonies(count)
      `)

    // Apply filters
    if (filter && filter !== 'all') {
      if (['verified', 'pending', 'unverified', 'rejected', 'duplicate'].includes(filter)) {
        query = query.eq('verification_status', filter)
      } else if (['missing', 'injured', 'deceased', 'safe'].includes(filter)) {
        query = query.eq('status', filter)
      }
    }

    // Search functionality
    if (search) {
      query = query.or(`name.ilike.%${search}%,student_id.ilike.%${search}%,fathers_name.ilike.%${search}%`)
    }

    // Date range filtering
    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo)
    }

    // Sorting
    const validSortFields = ['created_at', 'updated_at', 'name', 'age', 'verification_status']
    if (validSortFields.includes(sortBy)) {
      query = query.order(sortBy, { ascending: sortOrder === 'asc' })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit)
    query = query.range(offset, offset + parseInt(limit) - 1)

    const { data: cases, error, count } = await query

    if (error) {
      console.error('Cases fetch error:', error)
      return res.status(500).json({ error: 'Failed to fetch cases' })
    }

    // Get total count for pagination
    const { count: totalCount } = await supabaseAdmin
      .from('cases')
      .select('*', { count: 'exact', head: true })

    // Log activity for audit
    await logAdminActivity('cases_viewed', {
      details: { 
        filter, 
        search, 
        page: parseInt(page),
        total_results: cases?.length || 0
      }
    })

    const response = { 
      cases: cases || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount || 0,
        pages: Math.ceil((totalCount || 0) / parseInt(limit))
      }
    }

    setCache(cacheKey, response)

    res.status(200).json(response)
  } catch (error) {
    console.error('Get cases error:', error)
    res.status(500).json({ error: 'Failed to fetch cases' })
  }
}

async function handleCreateCase(req, res, auth) {
  // Only allow admins to create cases directly
  if (!['admin', 'super_admin'].includes(auth.admin.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' })
  }

  const caseData = req.body
  
  try {
    const { data: newCase, error } = await supabaseAdmin
      .from('cases')
      .insert({
        ...caseData,
        verification_status: 'pending',
        verified_by: auth.admin.id,
        created_at: new Date().toISOString()
      })
      .select()

    if (error) {
      console.error('Case creation error:', error)
      return res.status(500).json({ error: 'Failed to create case' })
    }

    await logAdminActivity('case_created', {
      target_type: 'case',
      target_id: newCase[0].id,
      details: { case_name: newCase[0].name }
    })

    invalidateCasesCache()

    res.status(201).json({ case: newCase[0] })
  } catch (error) {
    console.error('Create case error:', error)
    res.status(500).json({ error: 'Failed to create case' })
  }
}

async function handleUpdateCase(req, res, auth) {
  const { id, ...updateData } = req.body

  if (!id) {
    return res.status(400).json({ error: 'Case ID required' })
  }

  try {
    const { data: updatedCase, error } = await supabaseAdmin
      .from('cases')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
        verified_by: auth.admin.id
      })
      .eq('id', id)
      .select()

    if (error) {
      console.error('Case update error:', error)
      return res.status(500).json({ error: 'Failed to update case' })
    }

    await logAdminActivity('case_updated', {
      target_type: 'case',
      target_id: id,
      details: { case_name: updatedCase[0]?.name, updated_fields: Object.keys(updateData) }
    })

    invalidateCasesCache(id)

    res.status(200).json({ case: updatedCase[0] })
  } catch (error) {
    console.error('Update case error:', error)
    res.status(500).json({ error: 'Failed to update case' })
  }
}

async function handleDeleteCase(req, res, auth) {
  // Only allow admins to delete cases
  if (!['admin', 'super_admin'].includes(auth.admin.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' })
  }

  const { id } = req.body

  if (!id) {
    return res.status(400).json({ error: 'Case ID required' })
  }

  try {
    // Get case details before deletion
    const { data: caseToDelete } = await supabaseAdmin
      .from('cases')
      .select('name')
      .eq('id', id)
      .single()

    const { error } = await supabaseAdmin
      .from('cases')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Case deletion error:', error)
      return res.status(500).json({ error: 'Failed to delete case' })
    }

    await logAdminActivity('case_deleted', {
      target_type: 'case',
      target_id: id,
      details: { case_name: caseToDelete?.name }
    })

    invalidateCasesCache(id)

    res.status(200).json({ success: true, message: 'Case deleted successfully' })
  } catch (error) {
    console.error('Delete case error:', error)
    res.status(500).json({ error: 'Failed to delete case' })
  }
}