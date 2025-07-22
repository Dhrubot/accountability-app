// lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Client for frontend (anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  }
})

// Admin client for backend operations (service role key)
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

// Helper function to get authenticated user
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  return user
}

// Helper function to check if user is admin
export const checkAdminStatus = async (userId = null) => {
  try {
    const targetUserId = userId || (await getCurrentUser())?.id
    if (!targetUserId) return null

    const { data: adminRole, error } = await supabase
      .from('admin_roles')
      .select('role, is_active')
      .eq('user_id', targetUserId)
      .eq('is_active', true)
      .single()

    if (error || !adminRole) return null

    return {
      userId: targetUserId,
      role: adminRole.role,
      isActive: adminRole.is_active
    }
  } catch (error) {
    console.error('Check admin status error:', error)
    return null
  }
}