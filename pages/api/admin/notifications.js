// pages/api/admin/notifications.js - New endpoint for admin notifications
import { supabaseAdmin, logAdminActivity } from '../../../lib/supabase'
import { requireAdmin } from '../../../lib/adminAuth'

export default async function handler(req, res) {
  try {
    const auth = await requireAdmin()(req, res)
    if (!auth) return

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const notifications = await fetchNotifications(auth.admin.role)

    res.status(200).json({ notifications })
  } catch (error) {
    console.error('Notifications error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

async function fetchNotifications(adminRole) {
  try {
    const notifications = []
    
    // Get pending cases that need verification
    const { data: pendingCases, error: pendingError } = await supabaseAdmin
      .from('cases')
      .select('id, name, created_at')
      .eq('verification_status', 'unverified')
      .order('created_at', { ascending: true })
      .limit(5)

    if (!pendingError && pendingCases?.length > 0) {
      notifications.push({
        id: 'pending_cases',
        type: 'info',
        title: `${pendingCases.length} cases need verification`,
        message: `${pendingCases.length} new cases are waiting for verification`,
        actionUrl: '/admin/cases?filter=unverified',
        priority: 'medium',
        timestamp: pendingCases[0].created_at
      })
    }

    // Get recent security alerts (for admins only)
    if (['admin', 'super_admin'].includes(adminRole)) {
      const { data: securityAlerts, error: alertsError } = await supabaseAdmin
        .from('security_logs')
        .select('event_type, severity, created_at')
        .in('severity', ['warning', 'error', 'critical'])
        .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()) // Last 2 hours
        .limit(3)

      if (!alertsError && securityAlerts?.length > 0) {
        const criticalAlerts = securityAlerts.filter(alert => alert.severity === 'critical')
        
        if (criticalAlerts.length > 0) {
          notifications.push({
            id: 'security_critical',
            type: 'error',
            title: 'Critical security alerts',
            message: `${criticalAlerts.length} critical security events detected`,
            actionUrl: '/admin/security',
            priority: 'high',
            timestamp: criticalAlerts[0].created_at
          })
        } else {
          notifications.push({
            id: 'security_warnings',
            type: 'warning',
            title: 'Security warnings',
            message: `${securityAlerts.length} security warnings in the last 2 hours`,
            actionUrl: '/admin/security',
            priority: 'medium',
            timestamp: securityAlerts[0].created_at
          })
        }
      }
    }

    // Get potential duplicates
    const { data: duplicates, error: duplicatesError } = await supabaseAdmin
      .from('potential_duplicates')
      .select('id, similarity_score, created_at')
      .eq('status', 'pending')
      .limit(3)

    if (!duplicatesError && duplicates?.length > 0) {
      notifications.push({
        id: 'potential_duplicates',
        type: 'warning',
        title: `${duplicates.length} potential duplicates found`,
        message: 'Cases that might be duplicates need review',
        actionUrl: '/admin/cases?filter=duplicates',
        priority: 'low',
        timestamp: duplicates[0].created_at
      })
    }

    // Sort by priority and timestamp
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    notifications.sort((a, b) => {
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
      if (priorityDiff !== 0) return priorityDiff
      return new Date(b.timestamp) - new Date(a.timestamp)
    })

    return notifications.slice(0, 10) // Limit to 10 notifications
  } catch (error) {
    console.error('Fetch notifications error:', error)
    return []
  }
}