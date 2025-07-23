// components/CasesList.js
import { useState, useEffect, useRef } from 'react'

export default function CasesList({ publicData, onSearch, isLoading }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [localCases, setLocalCases] = useState([])
  const [localLoading, setLocalLoading] = useState(false)
  const hasInitialized = useRef(false)

  // Handle search/filter changes when onSearch prop is provided
  useEffect(() => {
    // Only trigger search if user has actually changed filters or if it's a fallback
    if (onSearch && (search || statusFilter || page > 1 || hasInitialized.current)) {
      const params = {}
      if (search) params.search = search
      if (statusFilter) params.status = statusFilter
      params.page = page.toString()
      params.limit = '20'
      
      onSearch(params)
      hasInitialized.current = true
    } else if (!onSearch) {
      // Fallback: fetch cases directly if no onSearch prop
      fetchCasesDirectly()
    }
  }, [search, statusFilter, page, onSearch])

  // Fallback function for direct API calls when no parent data management
  const fetchCasesDirectly = async () => {
    setLocalLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      })
      
      if (search) params.append('search', search)
      if (statusFilter) params.append('status', statusFilter)

      const response = await fetch(`/api/cases?${params}`)
      const data = await response.json()
      
      if (response.ok) {
        setLocalCases(data.cases || [])
      }
    } catch (error) {
      console.error('Failed to fetch cases:', error)
    } finally {
      setLocalLoading(false)
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      missing: 'bg-yellow-100 text-yellow-800',
      injured: 'bg-orange-100 text-orange-800',
      deceased: 'bg-red-100 text-red-800',
      safe: 'bg-green-100 text-green-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  // Use publicData if available, otherwise fall back to localCases
  const cases = publicData?.cases || localCases
  const totalPages = publicData?.totalPages || 1
  const currentPage = publicData?.currentPage || page
  const loading = isLoading !== undefined ? isLoading : localLoading

  return (
    <div className="max-w-4xl mx-auto">
      {/* Search and Filters */}
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
        >
          <option value="">All Status</option>
          <option value="missing">Missing</option>
          <option value="injured">Injured</option>
          <option value="deceased">Deceased</option>
          <option value="safe">Safe</option>
        </select>
        {onSearch && (
          <button
            onClick={() => onSearch({ fresh: 'true', search, status: statusFilter, page: currentPage.toString() })}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium shadow-sm"
          >
            Refresh
          </button>
        )}
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading cases...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {cases.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <div className="text-gray-400 text-6xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-600 mb-2">No Cases Found</h3>
              <p className="text-gray-500">
                {search || statusFilter 
                  ? 'Try adjusting your search criteria or filters.' 
                  : 'No cases have been submitted yet.'}
              </p>
            </div>
          ) : (
            <>
              {/* Results Summary */}
              <div className="text-sm text-gray-600 mb-4">
                Showing {cases.length} case{cases.length !== 1 ? 's' : ''}
                {search && ` matching "${search}"`}
                {statusFilter && ` with status "${statusFilter}"`}
              </div>

              {/* Cases Grid */}
              <div className="grid gap-6">
                {cases.map((case_) => (
                  <div key={case_.id} className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-800 mb-1">{case_.name}</h3>
                        {case_.age && (
                          <p className="text-sm text-gray-600 flex items-center gap-2">
                            <span>Age: {case_.age}</span>
                            {(case_.grade || case_.class_grade) && (
                              <>
                                <span>•</span>
                                <span>Grade: {case_.grade || case_.class_grade}</span>
                              </>
                            )}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 flex-wrap justify-end">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(case_.status)}`}>
                          {case_.status.toUpperCase()}
                        </span>
                        {case_.verification_status === 'verified' && (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            ✓ VERIFIED
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {case_.description && (
                      <div className="mb-4">
                        <p className="text-gray-700 text-sm leading-relaxed">{case_.description}</p>
                      </div>
                    )}
                    
                    <div className="space-y-2 text-sm">
                      {case_.last_seen_location && (
                        <p className="text-gray-600 flex items-start gap-2">
                          <span className="font-medium text-gray-700">Last seen:</span>
                          <span>
                            {case_.last_seen_location}
                            {case_.last_seen_time && (
                              <span className="text-gray-500 ml-2">
                                on {new Date(case_.last_seen_time).toLocaleString()}
                              </span>
                            )}
                          </span>
                        </p>
                      )}
                      
                      {case_.hospital_facility && (
                        <p className="text-gray-600 flex items-start gap-2">
                          <span className="font-medium text-gray-700">Hospital/Facility:</span>
                          <span>{case_.hospital_facility}</span>
                        </p>
                      )}
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs text-gray-500">
                        Reported: {new Date(case_.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center mt-8 space-x-4">
          <button
            onClick={() => setPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors duration-200 font-medium"
          >
            ← Previous
          </button>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
          </div>
          
          <button
            onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors duration-200 font-medium"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}