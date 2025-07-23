// components/CasesList.js
import { useState, useEffect, useRef, useCallback } from 'react'
import { PencilSquareIcon } from '@heroicons/react/24/outline'

export default function CasesList({ publicData, onSearch, isLoading, showUpdateButton = false, onCaseSelect }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [localCases, setLocalCases] = useState([])
  const [localLoading, setLocalLoading] = useState(false)
  const hasInitialized = useRef(false)
  const debounceTimer = useRef(null)
  const lastParams = useRef('')

  // Debounced search function to prevent rapid API calls
  const debouncedSearch = useCallback((params) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }
    
    debounceTimer.current = setTimeout(() => {
      if (onSearch) {
        onSearch(params)
      }
    }, 300) // Optimal 300ms for good UX
  }, [onSearch])

  // Generate params string for comparison to prevent duplicate calls
  const generateParamsString = useCallback((searchVal, statusVal, pageVal) => {
    const params = {}
    if (searchVal) params.search = searchVal
    if (statusVal) params.status = statusVal
    params.page = pageVal.toString()
    params.limit = '20'
    return JSON.stringify(params)
  }, [])

  // Handle search/filter changes when onSearch prop is provided
  useEffect(() => {
    if (!onSearch) {
      // Fallback: fetch cases directly if no onSearch prop
      fetchCasesDirectly()
      return
    }

    const currentParamsString = generateParamsString(search, statusFilter, page)
    
    // Prevent duplicate calls
    if (lastParams.current === currentParamsString) {
      return
    }

    const params = {}
    if (search) params.search = search
    if (statusFilter) params.status = statusFilter
    params.page = page.toString()
    params.limit = '20'

    // Initial load - execute immediately
    if (!hasInitialized.current) {
      onSearch(params)
      hasInitialized.current = true
      lastParams.current = currentParamsString
      return
    }

    // Use debounced search for text input to avoid excessive API calls
    if (search && search.length > 0) {
      debouncedSearch(params)
    } else {
      // Clear any pending debounced searches for immediate execution
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
      onSearch(params)
    }

    lastParams.current = currentParamsString
  }, [search, statusFilter, page, onSearch, debouncedSearch, generateParamsString])

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [])

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

  // Get verification method display text
  const getVerificationMethodText = (method) => {
    const methods = {
      'student_id_verification': 'Student ID Verified',
      'family_contact': 'Family Contact Verified',
      'photo_match': 'Photo Verification',
      'hospital_record': 'Hospital Records',
      'hospital_confirmation': 'Hospital Confirmed',
      'official_confirmation': 'Official Confirmation',
      'document_verification': 'Document Verified',
      'witness_testimony': 'Witness Testimony',
      'teacher_confirmation': 'Teacher Confirmed'
    }
    return methods[method] || method
  }

  // Enhanced pagination function
  const renderPaginationNumbers = (currentPage, totalPages) => {
    const pages = []
    const maxVisible = 5
    
    if (totalPages <= maxVisible) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Show first page
      pages.push(1)
      
      if (currentPage > 3) {
        pages.push('...')
      }
      
      // Show pages around current
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)
      
      for (let i = start; i <= end; i++) {
        if (i !== 1 && i !== totalPages) {
          pages.push(i)
        }
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('...')
      }
      
      // Show last page
      if (totalPages > 1) {
        pages.push(totalPages)
      }
    }
    
    return pages
  }

  // Handle filter changes with state reset and duplicate prevention
  const handleStatusFilterChange = (newStatus) => {
    setStatusFilter(newStatus)
    setPage(1) // Reset to first page when filter changes
  }

  const handleSearchChange = (newSearch) => {
    setSearch(newSearch)
    setPage(1) // Reset to first page when search changes
  }

  // Force refresh function that bypasses duplicate prevention
  const handleRefresh = () => {
    const params = { 
      fresh: 'true', 
      search, 
      status: statusFilter, 
      page: currentPage.toString(),
      limit: '20'
    }
    lastParams.current = '' // Force refresh by clearing cache
    if (onSearch) {
      onSearch(params)
    }
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
          onChange={(e) => handleSearchChange(e.target.value)}
          className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => handleStatusFilterChange(e.target.value)}
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
            onClick={handleRefresh}
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
                        <h3 className="text-xl font-semibold text-gray-800 mb-1 flex items-center gap-2">
                          {case_.name}
                          {case_.status === 'deceased' && (
                            <span className="text-red-400 text-lg" title="In loving memory">🌹</span>
                          )}
                        </h3>
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
                        {case_.verification_method && case_.verification_status === 'verified' && (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700" title={`Verified via: ${getVerificationMethodText(case_.verification_method)}`}>
                            {getVerificationMethodText(case_.verification_method)}
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
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-gray-500">
                          Reported: {new Date(case_.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        {showUpdateButton && onCaseSelect && (
                          <button
                            onClick={() => onCaseSelect(case_)}
                            className="flex items-center gap-1 px-3 py-1 text-xs bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors duration-200 font-medium"
                            title="Update this case"
                          >
                            <PencilSquareIcon className="w-3 h-3" />
                            Update
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Enhanced Pagination */}
      {totalPages > 1 && (
        <div className="mt-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            {/* Results info */}
            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </div>
            
            {/* Pagination controls */}
            <div className="flex items-center space-x-1">
              {/* First page button */}
              <button
                onClick={() => setPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors duration-200 font-medium"
                title="First page"
              >
                ««
              </button>
              
              {/* Previous page button */}
              <button
                onClick={() => setPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors duration-200 font-medium"
                title="Previous page"
              >
                ‹
              </button>
              
              {/* Page numbers */}
              {renderPaginationNumbers(currentPage, totalPages).map((pageNum, index) => (
                <button
                  key={index}
                  onClick={() => typeof pageNum === 'number' && setPage(pageNum)}
                  disabled={pageNum === '...'}
                  className={`px-3 py-2 text-sm border rounded-lg transition-colors duration-200 font-medium ${
                    pageNum === currentPage
                      ? 'bg-blue-600 text-white border-blue-600'
                      : pageNum === '...'
                      ? 'border-transparent cursor-default'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              ))}
              
              {/* Next page button */}
              <button
                onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors duration-200 font-medium"
                title="Next page"
              >
                ›
              </button>
              
              {/* Last page button */}
              <button
                onClick={() => setPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors duration-200 font-medium"
                title="Last page"
              >
                »»
              </button>
            </div>
            
            {/* Quick page jump */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">Go to:</span>
              <input
                type="number"
                min="1"
                max={totalPages}
                value={currentPage}
                onChange={(e) => {
                  const pageNum = parseInt(e.target.value)
                  if (pageNum >= 1 && pageNum <= totalPages) {
                    setPage(pageNum)
                  }
                }}
                className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}