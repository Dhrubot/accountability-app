// pages/api/admin/manage-admins.js - New endpoint for admin management
import { AdminAuth, requireAdmin } from '../../../lib/adminAuth'
import { logAdminActivity } from '../../../lib/supabase'

export default async function handler(req, res) {
  try {
    // Require admin level for admin management
    const auth = await requireAdmin('admin')(req, res)
    if (!auth) return

    switch (req.method) {
      case 'GET':
        // Get list of admins
        try {
          const adminList = await AdminAuth.getAdminList()
          res.status(200).json({ success: true, admins: adminList })
        } catch (error) {
          console.error('Get admin list error:', error)
          res.status(500).json({ error: 'Failed to fetch admin list' })
        }
        break

      case 'POST':
        // Create new admin
        const { email, password, role } = req.body
        
        if (!email || !password) {
          return res.status(400).json({ error: 'Email and password required' })
        }

        // Super admin required for creating admins/super_admins
        if (role === 'super_admin' && auth.admin.role !== 'super_admin') {
          return res.status(403).json({ error: 'Only super admins can create super admins' })
        }

        try {
          const newAdmin = await AdminAuth.createAdmin(email, password, role || 'moderator', auth.admin.id)
          res.status(201).json({ success: true, admin: newAdmin })
        } catch (error) {
          console.error('Create admin error:', error)
          res.status(500).json({ error: error.message })
        }
        break

      case 'PUT':
        // Update admin role
        const { userId, newRole } = req.body
        
        if (!userId || !newRole) {
          return res.status(400).json({ error: 'User ID and new role required' })
        }

        // Super admin required for promoting to super_admin
        if (newRole === 'super_admin' && auth.admin.role !== 'super_admin') {
          return res.status(403).json({ error: 'Only super admins can promote to super admin' })
        }

        try {
          const updatedRole = await AdminAuth.updateAdminRole(userId, newRole, auth.admin.id)
          res.status(200).json({ success: true, role: updatedRole })
        } catch (error) {
          console.error('Update admin role error:', error)
          res.status(500).json({ error: error.message })
        }
        break

      case 'DELETE':
        // Deactivate admin
        const { userId: deactivateUserId } = req.body
        
        if (!deactivateUserId) {
          return res.status(400).json({ error: 'User ID required' })
        }

        // Can't deactivate yourself
        if (deactivateUserId === auth.admin.id) {
          return res.status(400).json({ error: 'Cannot deactivate your own account' })
        }

        try {
          const deactivatedRole = await AdminAuth.deactivateAdmin(deactivateUserId, auth.admin.id)
          res.status(200).json({ success: true, role: deactivatedRole })
        } catch (error) {
          console.error('Deactivate admin error:', error)
          res.status(500).json({ error: error.message })
        }
        break

      default:
        res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Admin management error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}