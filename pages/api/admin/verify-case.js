// pages/api/admin/verify-case.js
import { supabase } from '../../../lib/supabase'
import { requireAdmin, AdminAuth } from '../../../lib/adminAuth'

export default async function handler(req, res) {
  try {
    const auth = await requireAdmin()(req, res)
    if (!auth) return

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const { caseId, action, notes, verificationMethod } = req.body

    if (!caseId || !action) {
      return res.status(400).json({ error: 'Case ID and action required' })
    }

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

    // Update case
    const { data: updatedCase, error: updateError } = await supabase
      .from('cases')
      .update({
        verification_status: newStatus,
        verification_method: verificationMethod || null,
        verification_notes: notes || null,
        verified_by: auth.admin.email,
        verified_at: new Date().toISOString()
      })
      .eq('id', caseId)
      .select()

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update case' })
    }

    // Log admin activity
    await AdminAuth.logActivity(
      auth.admin.id,
      `case_${action}`,
      'case',
      caseId,
      { 
        case_name: updatedCase[0]?.name,
        notes,
        verification_method: verificationMethod
      }
    )

    res.status(200).json({ 
      success: true, 
      case: updatedCase[0],
      message: `Case ${action}d successfully`
    })
  } catch (error) {
    console.error('Verify case error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}