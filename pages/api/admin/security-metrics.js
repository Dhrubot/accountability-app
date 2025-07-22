// pages/api/admin/security-metrics.js - Enhanced with real data
import { supabaseAdmin, logAdminActivity } from '../../../lib/supabase'
import { requireAdmin } from '../../../lib/adminAuth'

// Cache for security metrics
let securityMetricsCache = null
let securityMetricsCacheTime = null
const SECURITY_CACHE_DURATION = 2 * 60 * 1000 // 2 minutes (more frequent updates)

export default async function handler(req, res) {
  try {
    // Require admin level access for security metrics
    const auth = await requireAdmin('admin')(req, res)
    if (!auth) return

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const { fresh = 'false' } = req.query
    const useFresh = fresh === 'true'

    // Check cache unless fresh data is requested
    if (!useFresh && securityMetricsCache && securityMetricsCacheTime && 
        (Date.now() - securityMetricsCacheTime < SECURITY_CACHE_DURATION)) {
      return res.status(200).json({
        ...securityMetricsCache,
        cached: true,
        cacheAge: Math.round((Date.now() - securityMetricsCacheTime) / 1000)
      })
    }

    // Fetch fresh security metrics
    const metrics = await fetchSecurityMetrics()

    // Update cache
    securityMetricsCache = metrics
    securityMetricsCacheTime = Date.now()

    // Log activity
    await logAdminActivity('security_metrics_viewed', {
      details: { fresh_data: useFresh }
    })

    res.status(200).json({
      ...metrics,
      cached: false
    })
  } catch (error) {
    console.error('Security metrics error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

async function fetchSecurityMetrics() {
  try {
    const now = new Date()
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Get security logs for the last 24 hours
    const { data: securityLogs, error: logsError } = await supabaseAdmin
      .from('security_logs')
      .select('event_type, severity, created_at, details')
      .gte('created_at', last24h.toISOString())
      .order('created_at', { ascending: false })

    if (logsError) {
      console.error('Security logs fetch error:', logsError)
    }

    // Get admin activity for monitoring
    const { data: adminActivity, error: activityError } = await supabaseAdmin
      .from('admin_activity')
      .select('action, created_at, details')
      .gte('created_at', last24h.toISOString())

    if (activityError) {
      console.error('Admin activity fetch error:', activityError)
    }

    // Get failed login attempts from logs
    const failedLogins = (securityLogs || []).filter(log => 
      log.event_type === 'admin_login_failed' || 
      log.event_type === 'admin_login_rate_limited'
    )

    // Get unique IPs from security logs
    const uniqueIPs = new Set()
    const suspiciousIPs = new Set()
    
    (securityLogs || []).forEach(log => {
      if (log.details?.ip_address) {
        uniqueIPs.add(log.details.ip_address)
        
        // Mark IP as suspicious if multiple failed attempts
        if (log.severity === 'warning' || log.severity === 'error') {
          suspiciousIPs.add(log.details.ip_address)
        }
      }
    })

    // Calculate metrics
    const totalLogs = (securityLogs || []).length
    const criticalEvents = (securityLogs || []).filter(log => log.severity === 'critical').length
    const warningEvents = (securityLogs || []).filter(log => log.severity === 'warning').length
    const errorEvents = (securityLogs || []).filter(log => log.severity === 'error').length

    // Threat level calculation
    let threatLevel = 'low'
    if (criticalEvents > 0) threatLevel = 'critical'
    else if (errorEvents > 5 || warningEvents > 10) threatLevel = 'high'
    else if (errorEvents > 2 || warningEvents > 5) threatLevel = 'medium'

    // Recent security events (last 10)
    const recentEvents = (securityLogs || []).slice(0, 10).map(log => ({
      type: log.event_type,
      severity: log.severity,
      timestamp: log.created_at,
      ip: log.details?.ip_address || 'unknown'
    }))

    const metrics = {
      // Basic security metrics
      totalEvents: totalLogs,
      criticalEvents,
      warningEvents,
      errorEvents,
      failedLogins: failedLogins.length,
      uniqueIPs: uniqueIPs.size,
      suspiciousIPs: suspiciousIPs.size,
      
      // Threat assessment
      threatLevel,
      threatScore: criticalEvents * 10 + errorEvents * 3 + warningEvents * 1,
      
      // Activity metrics
      adminLogins: (adminActivity || []).filter(a => a.action === 'admin_login').length,
      adminActions: (adminActivity || []).length,
      
      // Rate calculations (per hour for last 24h)
      eventsPerHour: Math.round(totalLogs / 24),
      failedLoginsPerHour: Math.round(failedLogins.length / 24),
      
      // System status indicators
      systemStatus: {
        authentication: failedLogins.length < 10 ? 'healthy' : 'warning',
        database: 'healthy', // This would need actual database health checks
        api: 'healthy' // This would need actual API health checks
      },
      
      // Recent events for dashboard
      recentEvents,
      
      // Security recommendations
      recommendations: generateSecurityRecommendations({
        failedLogins: failedLogins.length,
        suspiciousIPs: suspiciousIPs.size,
        criticalEvents,
        threatLevel
      }),
      
      generatedAt: now.toISOString()
    }

    return metrics
  } catch (error) {
    console.error('Fetch security metrics error:', error)
    
    // Return fallback metrics on error
    return {
      totalEvents: 0,
      criticalEvents: 0,
      warningEvents: 0,
      errorEvents: 0,
      failedLogins: 0,
      uniqueIPs: 0,
      suspiciousIPs: 0,
      threatLevel: 'unknown',
      threatScore: 0,
      adminLogins: 0,
      adminActions: 0,
      eventsPerHour: 0,
      failedLoginsPerHour: 0,
      systemStatus: {
        authentication: 'unknown',
        database: 'unknown',
        api: 'unknown'
      },
      recentEvents: [],
      recommendations: ['Unable to fetch security data. Please check system logs.'],
      error: 'Failed to fetch security metrics',
      generatedAt: new Date().toISOString()
    }
  }
}