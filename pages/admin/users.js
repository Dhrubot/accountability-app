// pages/admin/users.js - Admin Users Management Page
import { useState, useEffect } from 'react'
import Head from 'next/head'
import AdminLayout from '../../components/admin/AdminLayout'
import { 
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ShieldCheckIcon,
  UserIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline'

export default function AdminUsers() {
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedAdmin, setSelectedAdmin] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    fetchAdmins()
    getCurrentUser()
  }, [])

  const getCurrentUser = async () => {
    try {
      const response = await fetch('/api/admin/verify', { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setCurrentUser(data.admin)
      }
    } catch (error) {
      console.error('Failed to get current user:', error)
    }
  }

  const fetchAdmins = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/manage-admins', {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setAdmins(data.admins || [])
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to fetch admin users')
      }
    } catch (error) {
      setError('Network error. Please try again.')
      console.error('Fetch admins error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateAdmin = async (formData) => {
    try {
      const response = await fetch('/api/admin/manage-admins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setShowCreateModal(false)
        fetchAdmins() // Refresh the list
        return { success: true }
      } else {
        const errorData = await response.json()
        return { success: false, error: errorData.error }
      }
    } catch (error) {
      return { success: false, error: 'Network error' }
    }
  }

  const handleUpdateRole = async (userId, newRole) => {
    try {
      const response = await fetch('/api/admin/manage-admins', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ userId, newRole })
      })

      if (response.ok) {
        fetchAdmins() // Refresh the list
        return { success: true }
      } else {
        const errorData = await response.json()
        return { success: false, error: errorData.error }
      }
    } catch (error) {
      return { success: false, error: 'Network error' }
    }
  }

  const handleDeactivateAdmin = async (userId, adminEmail) => {
    if (!confirm(`Are you sure you want to deactivate ${adminEmail}?`)) {
      return
    }

    try {
      const response = await fetch('/api/admin/manage-admins', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ userId })
      })

      if (response.ok) {
        fetchAdmins() // Refresh the list
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to deactivate admin')
      }
    } catch (error) {
      setError('Network error')
    }
  }

  const getRoleColor = (role) => {
    switch (role) {
      case 'super_admin':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'admin':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'moderator':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getRoleIcon = (role) => {
    switch (role) {
      case 'super_admin':
        return <ShieldCheckIcon className="w-4 h-4" />
      case 'admin':
        return <UserIcon className="w-4 h-4" />
      case 'moderator':
        return <CheckCircleIcon className="w-4 h-4" />
      default:
        return <UserIcon className="w-4 h-4" />
    }
  }

  if (loading) {
    return (
      <AdminLayout requireFreshAuth={true}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading admin users...</span>
        </div>
      </AdminLayout>
    )
  }

  return (
    <>
      <Head>
        <title>Admin Users - Onushondhan</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <AdminLayout requireFreshAuth={true}>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Users</h1>
              <p className="text-gray-600">Manage administrator accounts and permissions</p>
            </div>
            
            {/* Only show create button for admins and super admins */}
            {currentUser && ['admin', 'super_admin'].includes(currentUser.role) && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <PlusIcon className="w-5 h-5" />
                <span>Add Admin</span>
              </button>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mr-2" />
                <p className="text-red-700">{error}</p>
                <button
                  onClick={() => setError('')}
                  className="ml-auto text-red-500 hover:text-red-700"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Admin List */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Administrator Accounts ({admins.length})
              </h2>
            </div>

            {admins.length === 0 ? (
              <div className="text-center py-8">
                <UserIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No admin users found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Sign In
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {admins.map((admin) => (
                      <tr key={admin.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold">
                                {admin.email[0].toUpperCase()}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {admin.email}
                              </div>
                              {currentUser?.id === admin.id && (
                                <div className="text-xs text-blue-600 font-medium">
                                  (You)
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getRoleColor(admin.role)}`}>
                            {getRoleIcon(admin.role)}
                            <span className="ml-1 capitalize">{admin.role.replace('_', ' ')}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            admin.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {admin.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {admin.lastSignInAt 
                            ? new Date(admin.lastSignInAt).toLocaleDateString()
                            : 'Never'
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(admin.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                          {/* Edit Role Button */}
                          {currentUser && ['admin', 'super_admin'].includes(currentUser.role) && 
                           currentUser.id !== admin.id && (
                            <RoleEditButton
                              admin={admin}
                              currentUserRole={currentUser.role}
                              onUpdateRole={handleUpdateRole}
                            />
                          )}
                          
                          {/* Deactivate Button */}
                          {currentUser && ['admin', 'super_admin'].includes(currentUser.role) && 
                           currentUser.id !== admin.id && admin.isActive && (
                            <button
                              onClick={() => handleDeactivateAdmin(admin.id, admin.email)}
                              className="text-red-600 hover:text-red-900 transition-colors"
                              title="Deactivate Admin"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Create Admin Modal */}
        {showCreateModal && (
          <CreateAdminModal
            currentUserRole={currentUser?.role}
            onClose={() => setShowCreateModal(false)}
            onSubmit={handleCreateAdmin}
          />
        )}
      </AdminLayout>
    </>
  )
}

// Role Edit Component
function RoleEditButton({ admin, currentUserRole, onUpdateRole }) {
  const [isEditing, setIsEditing] = useState(false)
  const [selectedRole, setSelectedRole] = useState(admin.role)
  const [loading, setLoading] = useState(false)

  const availableRoles = currentUserRole === 'super_admin' 
    ? ['moderator', 'admin', 'super_admin']
    : ['moderator', 'admin']

  const handleSubmit = async () => {
    if (selectedRole === admin.role) {
      setIsEditing(false)
      return
    }

    setLoading(true)
    const result = await onUpdateRole(admin.id, selectedRole)
    
    if (result.success) {
      setIsEditing(false)
    } else {
      alert(result.error || 'Failed to update role')
      setSelectedRole(admin.role) // Reset
    }
    setLoading(false)
  }

  if (!isEditing) {
    return (
      <button
        onClick={() => setIsEditing(true)}
        className="text-blue-600 hover:text-blue-900 transition-colors"
        title="Edit Role"
      >
        <PencilIcon className="w-4 h-4" />
      </button>
    )
  }

  return (
    <div className="flex items-center space-x-2">
      <select
        value={selectedRole}
        onChange={(e) => setSelectedRole(e.target.value)}
        className="text-xs border border-gray-300 rounded px-2 py-1"
        disabled={loading}
      >
        {availableRoles.map(role => (
          <option key={role} value={role}>
            {role.replace('_', ' ')}
          </option>
        ))}
      </select>
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="text-green-600 hover:text-green-900 disabled:opacity-50"
      >
        <CheckCircleIcon className="w-4 h-4" />
      </button>
      <button
        onClick={() => {
          setIsEditing(false)
          setSelectedRole(admin.role)
        }}
        disabled={loading}
        className="text-red-600 hover:text-red-900 disabled:opacity-50"
      >
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  )
}

// Create Admin Modal
function CreateAdminModal({ currentUserRole, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    role: 'moderator'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const availableRoles = currentUserRole === 'super_admin' 
    ? ['moderator', 'admin', 'super_admin']
    : ['moderator', 'admin']

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)
    const result = await onSubmit({
      email: formData.email,
      password: formData.password,
      role: formData.role
    })

    if (result.success) {
      onClose()
    } else {
      setError(result.error || 'Failed to create admin')
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Create Admin User</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPassword ? (
                  <EyeSlashIcon className="w-4 h-4 text-gray-400" />
                ) : (
                  <EyeIcon className="w-4 h-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              required
              value={formData.confirmPassword}
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              {availableRoles.map(role => (
                <option key={role} value={role}>
                  {role.replace('_', ' ').toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Admin'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}