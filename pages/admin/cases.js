// pages/admin/cases.js
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import AdminLayout from '../../components/admin/AdminLayout'
import { 
  CheckCircleIcon,
  XMarkIcon,
  ClockIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  FunnelIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'

export default function AdminCases() {
  const [cases, setCases] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedCase, setSelectedCase] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Get filter from URL query on initial load only
    const { filter: urlFilter } = router.query
    if (urlFilter && urlFilter !== filter) {
      setFilter(urlFilter)
    }
  }, [router.query.filter]) // Only depend on the specific filter parameter

  useEffect(() => {
    // Fetch cases when filter or search changes
    fetchCases()
  }, [filter, search])

  const fetchCases = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter !== 'all') params.append('filter', filter)
      if (search) params.append('search', search)

      const response = await fetch(`/api/admin/cases?${params}`, {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setCases(data.cases || [])
      }
    } catch (error) {
      console.error('Failed to fetch cases:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle filter change and update URL
  const handleFilterChange = (newFilter) => {
    setFilter(newFilter)
    // Update URL without causing a page reload
    const url = newFilter === 'all' 
      ? '/admin/cases' 
      : `/admin/cases?filter=${newFilter}`
    router.push(url, undefined, { shallow: true })
  }

  const handleAction = async (caseId, action, notes = '', verificationMethod = '') => {
    setActionLoading(true)
    try {
      const response = await fetch('/api/admin/verify-case', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          caseId,
          action,
          notes,
          verificationMethod
        })
      })

      if (response.ok) {
        await fetchCases() // Refresh the list
        setShowModal(false)
        setSelectedCase(null)
      } else {
        const error = await response.json()
        alert(`Action failed: ${error.error}`)
      }
    } catch (error) {
      console.error('Action failed:', error)
      alert('Action failed. Please try again.')
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      missing: 'bg-amber-100 text-amber-800 border-amber-200',
      injured: 'bg-orange-100 text-orange-800 border-orange-200',
      deceased: 'bg-red-100 text-red-800 border-red-200',
      safe: 'bg-green-100 text-green-800 border-green-200'
    }
    return `px-2 py-1 rounded-full text-xs font-medium border ${badges[status] || 'bg-gray-100 text-gray-800 border-gray-200'}`
  }

  const getVerificationBadge = (status) => {
    const badges = {
      verified: 'bg-green-100 text-green-800 border-green-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      unverified: 'bg-gray-100 text-gray-800 border-gray-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      duplicate: 'bg-purple-100 text-purple-800 border-purple-200'
    }
    return `px-2 py-1 rounded-full text-xs font-medium border ${badges[status] || 'bg-gray-100 text-gray-800 border-gray-200'}`
  }

  const CaseModal = ({ case_, onClose, onAction }) => {
    const [notes, setNotes] = useState('')
    const [verificationMethod, setVerificationMethod] = useState('')

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Case Details</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* Case Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <p className="text-gray-900 font-semibold">{case_.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Age</label>
                <p className="text-gray-900">{case_.age || 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <span className={getStatusBadge(case_.status)}>{case_.status}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Student ID</label>
                <p className="text-gray-900">{case_.student_id || 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Class/Section</label>
                <p className="text-gray-900">{case_.class_grade ? `${case_.class_grade}${case_.section ? ` - ${case_.section}` : ''}` : 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Contact Phone</label>
                <p className="text-gray-900">{case_.contact_phone || 'Not provided'}</p>
              </div>
            </div>

            {/* Family Information */}
            {(case_.fathers_name || case_.mothers_name) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Family Information</label>
                <div className="bg-gray-50 rounded-lg p-3">
                  {case_.fathers_name && <p><strong>Father:</strong> {case_.fathers_name}</p>}
                  {case_.mothers_name && <p><strong>Mother:</strong> {case_.mothers_name}</p>}
                </div>
              </div>
            )}

            {/* Description */}
            {case_.description && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-900">{case_.description}</p>
                </div>
              </div>
            )}

            {/* Submitter Information */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Submitted By</label>
              <div className="bg-blue-50 rounded-lg p-3">
                <p><strong>Name:</strong> {case_.submitter_name}</p>
                <p><strong>Relationship:</strong> {case_.submitter_relationship}</p>
                <p><strong>Contact:</strong> {case_.submitter_contact}</p>
                <p><strong>Submitted:</strong> {new Date(case_.created_at).toLocaleString()}</p>
              </div>
            </div>

            {/* Verification Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Verification Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Add notes about verification process..."
              />
            </div>

            {/* Verification Method */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Verification Method
              </label>
              <select
                value={verificationMethod}
                onChange={(e) => setVerificationMethod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select method</option>
                <option value="student_id_verification">Student ID Verification</option>
                <option value="family_contact">Family Contact</option>
                <option value="hospital_record">Hospital Record</option>
                <option value="photo_identification">Photo Identification</option>
                <option value="witness_testimony">Witness Testimony</option>
                <option value="school_record">School Record</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
            <button
              onClick={() => onAction(case_.id, 'reject', notes, verificationMethod)}
              disabled={actionLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <XMarkIcon className="w-4 h-4" />
              <span>Reject</span>
            </button>
            <button
              onClick={() => onAction(case_.id, 'mark_duplicate', notes, verificationMethod)}
              disabled={actionLoading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <DocumentDuplicateIcon className="w-4 h-4" />
              <span>Duplicate</span>
            </button>
            <button
              onClick={() => onAction(case_.id, 'mark_pending', notes, verificationMethod)}
              disabled={actionLoading}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <ClockIcon className="w-4 h-4" />
              <span>Pending</span>
            </button>
            <button
              onClick={() => onAction(case_.id, 'verify', notes, verificationMethod)}
              disabled={actionLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <CheckCircleIcon className="w-4 h-4" />
              <span>Verify</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <AdminLayout>
      <Head>
        <title>Cases Management - Admin</title>
      </Head>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Cases Management</h1>
            <p className="text-gray-600">Review and verify submitted cases</p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <FunnelIcon className="w-5 h-5 text-gray-400" />
                <select
                  value={filter}
                  onChange={(e) => handleFilterChange(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Cases</option>
                  <option value="unverified">Unverified</option>
                  <option value="pending">Pending</option>
                  <option value="verified">Verified</option>
                  <option value="rejected">Rejected</option>
                  <option value="missing">Missing</option>
                  <option value="injured">Injured</option>
                  <option value="deceased">Deceased</option>
                  <option value="safe">Safe</option>
                </select>
              </div>
            </div>

            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 w-64"
              />
            </div>
          </div>
        </div>

        {/* Cases List */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : cases.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No cases found matching your criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Verification
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {cases.map((case_) => (
                    <tr key={case_.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{case_.name}</div>
                          <div className="text-sm text-gray-500">
                            Age: {case_.age || 'N/A'} | Class: {case_.class_grade || 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={getStatusBadge(case_.status)}>
                          {case_.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={getVerificationBadge(case_.verification_status)}>
                          {case_.verification_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {case_.student_id || 'Not provided'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(case_.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => {
                            setSelectedCase(case_)
                            setShowModal(true)
                          }}
                          className="text-blue-600 hover:text-blue-900 flex items-center space-x-1"
                        >
                          <EyeIcon className="w-4 h-4" />
                          <span>Review</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Case Modal */}
      {showModal && selectedCase && (
        <CaseModal
          case_={selectedCase}
          onClose={() => {
            setShowModal(false)
            setSelectedCase(null)
          }}
          onAction={handleAction}
        />
      )}
    </AdminLayout>
  )
}