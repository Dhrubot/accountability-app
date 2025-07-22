// components/admin/AdminLayout.js - Enhanced with cache control
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { 
  HomeIcon,
  UsersIcon,
  ShieldCheckIcon,
  DocumentChartBarIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  BellIcon,
  CogIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

export default function AdminLayout({ children, requireFreshAuth = false }) {
  const [admin, setAdmin] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [authError, setAuthError] = useState(null)
  const [notifications, setNotifications] = useState([])
  const router = useRouter()

  useEffect(() => {
    checkAuth(requireFreshAuth)
    // Check for notifications
    checkNotifications()
  }, [requireFreshAuth])

  const checkAuth = async (useFresh = false) => {
    try {
      // Use fresh auth for sensitive operations
      const url = useFresh ? '/api/admin/verify?fresh=true' : '/api/admin/verify'
      
      const response = await fetch(url, {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setAdmin(data.admin)
        setAuthError(null)
        
        // Store in localStorage for quick access
        localStorage.setItem('adminInfo', JSON.stringify(data.admin))
      } else {
        const errorData = await response.json()
        setAuthError(errorData.error)
        
        // Clear stored admin info
        localStorage.removeItem('adminInfo')
        
        // Redirect to login if not authenticated
        if (response.status === 401) {
          router.push('/admin/login')
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      setAuthError('Network error')
      
      // Try to use cached admin info if available
      const cachedAdmin = localStorage.getItem('adminInfo')
      if (cachedAdmin && !useFresh) {
        try {
          setAdmin(JSON.parse(cachedAdmin))
        } catch (e) {
          localStorage.removeItem('adminInfo')
          router.push('/admin/login')
        }
      } else {
        router.push('/admin/login')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const checkNotifications = async () => {
    try {
      // This would check for pending cases, security alerts, etc.
      const response = await fetch('/api/admin/notifications', {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
      }
    } catch (error) {
      // Fail silently for notifications
      console.warn('Failed to fetch notifications:', error)
    }
  }

  const handleLogout = async () => {
    try {
      setIsLoading(true)
      await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'include'
      })
      
      // Clear all stored data
      localStorage.removeItem('adminInfo')
      setAdmin(null)
      
      router.push('/admin/login')
    } catch (error) {
      console.error('Logout failed:', error)
      // Force logout even if API fails
      localStorage.removeItem('adminInfo')
      setAdmin(null)
      router.push('/admin/login')
    } finally {
      setIsLoading(false)
    }
  }

  const refreshAuth = () => {
    setIsLoading(true)
    checkAuth(true) // Force fresh auth
  }

  const navigation = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: HomeIcon },
    { name: 'Cases', href: '/admin/cases', icon: UsersIcon },
    { name: 'Security', href: '/admin/security', icon: ShieldCheckIcon },
    { name: 'Analytics', href: '/admin/analytics', icon: DocumentChartBarIcon },
  ]

  // Add admin management for admins and super admins
  if (admin?.role && ['admin', 'super_admin'].includes(admin.role)) {
    navigation.push({
      name: 'Admin Users',
      href: '/admin/users',
      icon: CogIcon
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {requireFreshAuth ? 'Verifying permissions...' : 'Loading...'}
          </p>
        </div>
      </div>
    )
  }

  // Show auth error if present
  if (authError) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full mx-4">
          <div className="flex items-center mb-4">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-500 mr-2" />
            <h2 className="text-lg font-semibold text-red-700">Authentication Error</h2>
          </div>
          <p className="text-gray-600 mb-6">{authError}</p>
          <div className="flex space-x-3">
            <button
              onClick={refreshAuth}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
            <button
              onClick={() => router.push('/admin/login')}
              className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Login Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Show fresh auth warning if enabled */}
      {requireFreshAuth && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
          <div className="flex items-center justify-center">
            <ShieldCheckIcon className="w-5 h-5 text-yellow-600 mr-2" />
            <p className="text-sm text-yellow-700">
              This page requires fresh authentication for security.
            </p>
          </div>
        </div>
      )}

      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-40 md:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)}></div>
        <div className="relative flex flex-col w-64 bg-white h-full">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Admin Panel</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-md text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          <nav className="flex-1 px-4 py-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = router.pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex flex-col bg-white border-r border-gray-200 shadow-lg">
          {/* Logo */}
          <div className="flex items-center px-6 py-4 border-b border-gray-200">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-700 rounded-lg flex items-center justify-center mr-3">
              <span className="text-white font-bold">V</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Admin Panel</h2>
              <p className="text-xs text-gray-500">Voices of Uttara</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = router.pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Admin info */}
          <div className="px-4 py-4 border-t border-gray-200">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">
                  {admin?.email?.[0]?.toUpperCase()}
                </span>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">{admin?.email}</p>
                <div className="flex items-center">
                  <p className="text-xs text-gray-500 capitalize">{admin?.role}</p>
                  {requireFreshAuth && (
                    <div className="ml-2 w-2 h-2 bg-green-500 rounded-full" title="Fresh authentication verified"></div>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="mt-3 w-full flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={isLoading}
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5 mr-3" />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="md:pl-64">
        {/* Top bar */}
        <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
              >
                <Bars3Icon className="w-6 h-6" />
              </button>
              <div className="ml-4 md:ml-0">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">System Operational</span>
                  {requireFreshAuth && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                      Fresh Auth
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button className="p-2 text-gray-400 hover:text-gray-600 relative">
                <BellIcon className="w-6 h-6" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                    {notifications.length > 9 ? '9+' : notifications.length}
                  </span>
                )}
              </button>

              {/* Refresh auth button for sensitive pages */}
              {requireFreshAuth && (
                <button
                  onClick={refreshAuth}
                  className="text-sm text-yellow-600 hover:text-yellow-800 font-medium"
                  disabled={isLoading}
                >
                  Refresh Auth
                </button>
              )}

              {/* Quick actions */}
              <Link
                href="/"
                target="_blank"
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                View Site
              </Link>

              {/* Mobile admin info */}
              <div className="md:hidden flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">
                    {admin?.email?.[0]?.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  )
}