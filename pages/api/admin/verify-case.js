// pages/api/admin/verify-case.js
import { supabaseAdmin, logAdminActivity } from '../../../lib/supabase'
import { requireAdmin, AdminAuth } from '../../../lib/adminAuth'
import { securityManager } from '../../../lib/security'

export default async function handler(req, res) {
  const ip = securityManager.getClientIP(req)

  try {
    // Authenticate admin with enhanced security
    const auth = await requireAdmin()(req, res)
    if (!auth) return

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    // Rate limiting for case verification to prevent abuse
    if (!securityManager.checkRateLimit(ip, 'case_verification', 30, 60000)) { // 30 per minute
      securityManager.updateMetrics('errors')
      return res.status(429).json({ error: 'Too many verification requests' })
    }

    const { caseId, action, notes, verificationMethod } = req.body

    // Enhanced input validation
    if (!caseId || !action) {
      return res.status(400).json({ error: 'Case ID and action required' })
    }

    // Sanitize inputs
    const sanitizedNotes = notes ? securityManager.sanitizeInput(notes) : null
    const sanitizedMethod = verificationMethod ? securityManager.sanitizeInput(verificationMethod) : null

    const validActions = ['verify', 'reject', 'mark_duplicate', 'mark_pending']
    if (!validActions.includes(action)) {
      return res.status(400).json({ error: 'Invalid action' })
    }

    // Map actions to verification statuses
    const statusMap = {
      verify: 'verified',
      reject: 'rejected',
      mark_duplicate: 'duplicate',
      mark_pending: 'pending'
    }

    const newStatus = statusMap[action]

    // Get case details before update for comprehensive logging
    const { data: existingCase, error: fetchError } = await supabaseAdmin
      .from('cases')
      .select('name, verification_status, created_at, user_id')
      .eq('id', caseId)
      .single()

    if (fetchError) {
      console.error('Case fetch error:', fetchError)
      await logAdminActivity('case_verification_fetch_error', {
        admin_id: auth.admin.id,
        details: {
          case_id: caseId,
          action,
          error_message: fetchError.message,
          ip_address: ip,
          timestamp: new Date().toISOString()
        }
      })
      return res.status(404).json({ error: 'Case not found' })
    }

    // Update case using admin client to bypass RLS
    const { data: updatedCase, error: updateError } = await supabaseAdmin
      .from('cases')
      .update({
        verification_status: newStatus,
        verification_method: sanitizedMethod,
        verification_notes: sanitizedNotes,
        verified_by: auth.admin.id, // Use ID for referential integrity
        verified_at: new Date().toISOString()
      })
      .eq('id', caseId)
      .select()

    if (updateError) {
      console.error('Case update error:', updateError)
      
      // Log update failures for debugging
      await logAdminActivity('case_verification_update_error', {
        admin_id: auth.admin.id,
        details: {
          case_id: caseId,
          action,
          error_message: updateError.message,
          ip_address: ip,
          timestamp: new Date().toISOString()
        }
      })
      
      securityManager.updateMetrics('errors')
      return res.status(500).json({ error: 'Failed to update case' })
    }

    // Comprehensive activity logging with full context
    await logAdminActivity(`case_${action}`, {
      admin_id: auth.admin.id,
      target_type: 'case',
      target_id: caseId,
      details: {
        case_name: existingCase.name,
        case_user_id: existingCase.user_id,
        previous_status: existingCase.verification_status,
        new_status: newStatus,
        notes: sanitizedNotes,
        verification_method: sanitizedMethod,
        admin_email: auth.admin.email,
        ip_address: ip,
        user_agent: req.headers['user-agent'],
        timestamp: new Date().toISOString()
      }
    })

    // Also log using AdminAuth for backward compatibility
    await AdminAuth.logActivity(
      auth.admin.id,
      `case_${action}`,
      'case',
      caseId,
      { 
        case_name: existingCase.name,
        notes: sanitizedNotes,
        verification_method: sanitizedMethod,
        previous_status: existingCase.verification_status,
        new_status: newStatus
      }
    )

    // Send security alert for sensitive actions
    if (action === 'verify' || action === 'reject') {
      await securityManager.sendAlert(
        `Case ${action}d by admin ${auth.admin.email}: ${existingCase.name}`,
        { 
          severity: 'low', 
          category: 'case_verification',
          case_id: caseId,
          admin_id: auth.admin.id
        }
      )
    }

    // Update success metrics
    securityManager.updateMetrics('case_verification_success')

    res.status(200).json({ 
      success: true, 
      case: updatedCase[0],
      message: `Case ${action}d successfully`,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Verify case error:', error)

    // Log system errors with full context
    await logAdminActivity('case_verification_system_error', {
      admin_id: req.adminAuth?.admin?.id || null,
      details: {
        error_message: error.message,
        stack_trace: error.stack,
        request_body: req.body,
        ip_address: ip,
        user_agent: req.headers['user-agent'],
        timestamp: new Date().toISOString()
      }
    })

    securityManager.updateMetrics('errors')
    res.status(500).json({ error: 'Internal server error' })
  }
}