// pages/api/admin/export.js
import { supabase } from '../../../lib/supabase'
import { requireAdmin } from '../../../lib/adminAuth'

export default async function handler(req, res) {
  try {
    const auth = await requireAdmin()(req, res)
    if (!auth) return

    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    const { filter = 'verified' } = req.query

    let query = supabase.from('cases').select('*')
    
    if (filter === 'verified') {
      query = query.eq('verification_status', 'verified')
    } else if (filter === 'all') {
      // Export all cases
    }

    const { data: cases, error } = await query.order('created_at', { ascending: false })

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch cases for export' })
    }

    // Generate CSV
    const headers = [
      'Name', 'Age', 'Gender', 'Status', 'Student ID', 'Class', 'Section', 
      'Father Name', 'Mother Name', 'Contact Phone', 'Last Seen Location', 
      'Last Seen Time', 'Hospital', 'Verification Status', 'Verified By', 
      'Verified At', 'Submitted At'
    ]

    const csvRows = [
      headers.join(','),
      ...cases.map(case_ => [
        `"${case_.name || ''}"`,
        case_.age || '',
        case_.gender || '',
        case_.status || '',
        `"${case_.student_id || ''}"`,
        `"${case_.class_grade || ''}"`,
        `"${case_.section || ''}"`,
        `"${case_.fathers_name || ''}"`,
        `"${case_.mothers_name || ''}"`,
        `"${case_.contact_phone || ''}"`,
        `"${case_.last_seen_location || ''}"`,
        case_.last_seen_time || '',
        `"${case_.hospital_facility || ''}"`,
        case_.verification_status || '',
        `"${case_.verified_by || ''}"`,
        case_.verified_at || '',
        case_.created_at || ''
      ].join(','))
    ]

    const csvContent = csvRows.join('\n')

    // Log export activity
    await AdminAuth.logActivity(
      auth.admin.id,
      'data_export',
      'system',
      null,
      { 
        filter,
        record_count: cases.length,
        export_type: 'csv'
      }
    )

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="voices-of-uttara-${filter}-${new Date().toISOString().split('T')[0]}.csv"`)
    res.status(200).send(csvContent)
  } catch (error) {
    console.error('Export error:', error)
    res.status(500).json({ error: 'Export failed' })
  }
}