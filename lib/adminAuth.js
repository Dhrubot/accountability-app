// lib/adminAuth.js
import { supabase, supabaseAdmin } from './supabase'

export class AdminAuth {
  // Create admin user (now creates in Supabase Auth + admin_roles)
  static async createAdmin(email, password, role = 'moderator') {
    try {
      // Use admin client for creating users
      if (!supabaseAdmin) {
        throw new Error('Service role key not configured')
      }

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      })

      if (authError) {
        throw new Error(`Failed to create auth user: ${authError.message}`)
      }

      // Create admin role using admin client
      const { data: roleData, error: roleError } = await supabaseAdmin
        .from('admin_roles')
        .insert({
          user_id: authData.user.id,
          role,
          is_active: true
        })
        .select()

      if (roleError) {
        throw new Error(`Failed to create admin role: ${roleError.message}`)
      }

      return {
        id: authData.user.id,
        email: authData.user.email,
        role: roleData[0].role
      }
    } catch (error) {
      throw error
    }
  }

  // Login admin (now uses Supabase Auth)
  static async login(email, password, ipAddress, userAgent) {
    try {
      // Sign in with Supabase Auth (client-side)
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (authError) {
        throw new Error('Invalid credentials')
      }

      // Check if user has admin role using admin client (to bypass RLS)
      const { data: adminRole, error: roleError } = await supabaseAdmin
        .from('admin_roles')
        .select('role')
        .eq('user_id', authData.user.id)
        .eq('is_active', true)
        .single()

      if (roleError || !adminRole) {
        // Sign out the user since they're not an admin
        await supabase.auth.signOut()
        throw new Error('No admin access')
      }

      // Log activity using admin client
      await this.logActivity(
        authData.user.id, 
        'login', 
        'system', 
        null, 
        { ip_address: ipAddress, user_agent: userAgent }
      )

      return {
        admin: {
          id: authData.user.id,
          email: authData.user.email,
          role: adminRole.role
        },
        token: authData.session.access_token,
        expiresAt: authData.session.expires_at
      }
    } catch (error) {
      throw error
    }
  }

  // Verify session (now uses Supabase Auth)
  static async verifySession(token) {
    if (!token) return null

    try {
      // Verify the JWT token
      const { data: { user }, error: userError } = await supabase.auth.getUser(token)
      
      if (userError || !user) {
        return null
      }

      // Check admin role using admin client (bypasses RLS)
      const { data: adminRole, error: roleError } = await supabaseAdmin
        .from('admin_roles')
        .select('role, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()

      if (roleError || !adminRole) {
        return null
      }

      return {
        admin: {
          id: user.id,
          email: user.email,
          role: adminRole.role
        },
        session: { token, user_id: user.id }
      }
    } catch (error) {
      return null
    }
  }

  // Logout (now uses Supabase Auth)
  static async logout(token = null) {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      // Ignore logout errors
    }
  }

  // Log admin activity using admin client
  static async logActivity(adminId, action, targetType = null, targetId = null, details = {}) {
    try {
      await supabaseAdmin
        .from('admin_activity')
        .insert({
          admin_id: adminId,
          action,
          target_type: targetType,
          target_id: targetId,
          details,
          ip_address: details.ip_address || null
        })
    } catch (error) {
      console.error('Failed to log activity:', error)
    }
  }

  // Check if user has permission (unchanged)
  static hasPermission(userRole, requiredRole) {
    const roleHierarchy = {
      moderator: 1,
      admin: 2,
      super_admin: 3
    }

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
  }

  // Helper method to make someone admin
  static async makeAdmin(email, role = 'moderator') {
    try {
      if (!supabaseAdmin) {
        throw new Error('Service role key not configured')
      }

      // Find user by email using admin client
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
      
      if (listError) {
        throw new Error(`Failed to list users: ${listError.message}`)
      }

      const user = users.find(u => u.email === email)
      if (!user) {
        throw new Error('User not found')
      }

      // Insert or update admin role using admin client
      const { data, error } = await supabaseAdmin
        .from('admin_roles')
        .upsert({
          user_id: user.id,
          role,
          is_active: true
        }, {
          onConflict: 'user_id'
        })
        .select()

      if (error) {
        throw new Error(`Failed to assign admin role: ${error.message}`)
      }

      return {
        id: user.id,
        email: user.email,
        role: data[0].role
      }
    } catch (error) {
      throw error
    }
  }

  // Get list of all admins
  static async getAdminList() {
    try {
      if (!supabaseAdmin) {
        throw new Error('Service role key not configured')
      }

      // Get all admin roles with user information
      const { data: adminRoles, error: roleError } = await supabaseAdmin
        .from('admin_roles')
        .select('user_id, role, is_active, created_at')
        .eq('is_active', true)

      if (roleError) {
        throw new Error(`Failed to fetch admin roles: ${roleError.message}`)
      }

      // Get user details for each admin
      const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers()
      
      if (usersError) {
        throw new Error(`Failed to fetch user details: ${usersError.message}`)
      }

      // Combine admin roles with user information
      const adminList = adminRoles.map(adminRole => {
        const user = users.find(u => u.id === adminRole.user_id)
        return {
          id: adminRole.user_id,
          email: user?.email || 'Unknown',
          role: adminRole.role,
          isActive: adminRole.is_active, 
          createdAt: adminRole.created_at, 
          lastSignInAt: user?.last_sign_in_at || null 
        }
      }).filter(admin => admin.email !== 'Unknown') 

      return adminList
    } catch (error) {
      throw error
    }
  }
}

// Middleware for protecting admin routes (unchanged - this is perfect)
export function requireAdmin(requiredRole = 'moderator') {
  return async (req, res, next) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '') || 
                   req.cookies?.adminToken

      if (!token) {
        return res.status(401).json({ error: 'No authentication token' })
      }

      const auth = await AdminAuth.verifySession(token)
      if (!auth) {
        return res.status(401).json({ error: 'Invalid or expired session' })
      }

      if (!AdminAuth.hasPermission(auth.admin.role, requiredRole)) {
        return res.status(403).json({ error: 'Insufficient permissions' })
      }

      req.admin = auth.admin
      req.session = auth.session

      if (next) next()
      return auth
    } catch (error) {
      return res.status(500).json({ error: 'Authentication error' })
    }
  }
}