import { useState, useRef } from 'react'
import ReCAPTCHA from 'react-google-recaptcha'
import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline'

export default function SubmissionForm() {
  const [formData, setFormData] = useState({
    // Basic Information
    name: '',
    age: '',
    gender: '',
    status: 'missing',
    
    // Student Information
    studentId: '',
    classGrade: '',
    section: '',
    rollNumber: '',
    
    // Family Information
    fathersName: '',
    mothersName: '',
    guardianName: '',
    
    // Identity (optional)
    nidLast4: '',
    birthCertNumber: '',
    
    // Contact Information
    contactEmail: '',
    contactPhone: '',
    emergencyContact: '',
    address: '',
    
    // Location Information
    lastSeenLocation: '',
    lastSeenTime: '',
    hospitalFacility: '',
    roomWard: '',
    
    // Additional Information
    description: '',
    medicalConditions: '',
    distinguishingFeatures: '',
    
    // Submitter Information
    submitterName: '',
    submitterRelationship: '',
    submitterContact: ''
  })

  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const recaptchaRef = useRef()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setMessage('')

    try {
      // Get reCAPTCHA token
      const recaptchaToken = await recaptchaRef.current.executeAsync()
      recaptchaRef.current.reset()

      const response = await fetch('/api/submit-case', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          recaptchaToken
        })
      })

      const result = await response.json()

      if (response.ok) {
        setMessage('Case submitted successfully. It will be reviewed for verification.')
        // Reset form
        setFormData({
          name: '', age: '', gender: '', status: 'missing',
          studentId: '', classGrade: '', section: '', rollNumber: '',
          fathersName: '', mothersName: '', guardianName: '',
          nidLast4: '', birthCertNumber: '',
          contactEmail: '', contactPhone: '', emergencyContact: '', address: '',
          lastSeenLocation: '', lastSeenTime: '', hospitalFacility: '', roomWard: '',
          description: '', medicalConditions: '', distinguishingFeatures: '',
          submitterName: '', submitterRelationship: '', submitterContact: ''
        })
        setCurrentStep(1)
      } else {
        setMessage(`Error: ${result.error}`)
      }
    } catch (error) {
      setMessage('Network error. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const nextStep = () => setCurrentStep(Math.min(4, currentStep + 1))
  const prevStep = () => setCurrentStep(Math.max(1, currentStep - 1))

  const getStatusIcon = (status) => {
    const icons = {
      missing: '🔍',
      injured: '🏥',
      deceased: '🕊️',
      safe: '✅'
    }
    return icons[status] || '📝'
  }

  const getStatusColor = (status) => {
    const colors = {
      missing: 'from-amber-400 to-orange-500',
      injured: 'from-orange-400 to-red-500',
      deceased: 'from-gray-400 to-gray-600',
      safe: 'from-green-400 to-green-600'
    }
    return colors[status] || 'from-blue-400 to-blue-600'
  }

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-4">
          <span className="text-2xl text-white">👤</span>
        </div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">Basic Information</h3>
        <p className="text-gray-600">Start by providing the essential details</p>
      </div>
      
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Full Name <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="Enter full name as per school records"
            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 bg-white"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-400">👤</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
          <input
            type="number"
            name="age"
            value={formData.age}
            onChange={handleChange}
            min="1"
            max="120"
            placeholder="Age"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
          <div className="relative">
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 appearance-none bg-white"
            >
              <option value="">Select Gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="not_specified">Prefer not to say</option>
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Status <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          {['missing', 'injured', 'deceased', 'safe'].map((status) => (
            <label
              key={status}
              className={`relative flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                formData.status === status
                  ? `border-transparent bg-gradient-to-r ${getStatusColor(status)} text-white shadow-lg`
                  : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="status"
                value={status}
                checked={formData.status === status}
                onChange={handleChange}
                className="sr-only"
              />
              <div className="flex items-center space-x-3">
                <span className="text-xl">{getStatusIcon(status)}</span>
                <span className="font-medium capitalize">{status}</span>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-green-500 to-teal-600 rounded-full mb-4">
          <span className="text-2xl text-white">🎓</span>
        </div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">Student Information</h3>
        <p className="text-gray-600">These details help with verification</p>
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start">
          <InformationCircleIcon className="w-5 h-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">Verification Tip</p>
            <p>Providing student ID and class information significantly helps with verification process</p>
          </div>
        </div>
      </div>
      
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-2">Student ID</label>
        <div className="relative">
          <input
            type="text"
            name="studentId"
            value={formData.studentId}
            onChange={handleChange}
            placeholder="e.g., MS2024001"
            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-400">🆔</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-1">School-issued student ID number</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Class/Grade</label>
          <input
            type="text"
            name="classGrade"
            value={formData.classGrade}
            onChange={handleChange}
            placeholder="e.g., 10"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
          <input
            type="text"
            name="section"
            value={formData.section}
            onChange={handleChange}
            placeholder="e.g., A"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Roll Number</label>
          <input
            type="text"
            name="rollNumber"
            value={formData.rollNumber}
            onChange={handleChange}
            placeholder="e.g., 15"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">Father's Name</label>
          <div className="relative">
            <input
              type="text"
              name="fathersName"
              value={formData.fathersName}
              onChange={handleChange}
              placeholder="Father's full name"
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400">👨</span>
            </div>
          </div>
        </div>
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">Mother's Name</label>
          <div className="relative">
            <input
              type="text"
              name="mothersName"
              value={formData.mothersName}
              onChange={handleChange}
              placeholder="Mother's full name"
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400">👩</span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-2">Guardian Name (if different)</label>
        <div className="relative">
          <input
            type="text"
            name="guardianName"
            value={formData.guardianName}
            onChange={handleChange}
            placeholder="Guardian's full name"
            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all duration-200"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-400">👥</span>
          </div>
        </div>
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full mb-4">
          <span className="text-2xl text-white">📞</span>
        </div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">Contact & Location</h3>
        <p className="text-gray-600">Help us reach you and locate the person</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Contact Phone <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="tel"
              name="contactPhone"
              value={formData.contactPhone}
              onChange={handleChange}
              required
              placeholder="+8801XXXXXXXXX"
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400">📱</span>
            </div>
          </div>
        </div>
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Contact</label>
          <div className="relative">
            <input
              type="tel"
              name="emergencyContact"
              value={formData.emergencyContact}
              onChange={handleChange}
              placeholder="Alternative contact number"
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400">🆘</span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
        <div className="relative">
          <input
            type="email"
            name="contactEmail"
            value={formData.contactEmail}
            onChange={handleChange}
            placeholder="your.email@example.com"
            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-400">✉️</span>
          </div>
        </div>
      </div>

      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-2">Home Address</label>
        <div className="relative">
          <textarea
            name="address"
            value={formData.address}
            onChange={handleChange}
            rows="2"
            placeholder="Full address"
            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200 resize-none"
          />
          <div className="absolute top-3 left-0 pl-3 flex items-start pointer-events-none">
            <span className="text-gray-400">🏠</span>
          </div>
        </div>
      </div>

      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-2">Last Seen Location</label>
        <div className="relative">
          <input
            type="text"
            name="lastSeenLocation"
            value={formData.lastSeenLocation}
            onChange={handleChange}
            placeholder="e.g., School cafeteria, classroom 10A"
            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-400">📍</span>
          </div>
        </div>
      </div>

      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-2">Last Seen Time</label>
        <div className="relative">
          <input
            type="datetime-local"
            name="lastSeenTime"
            value={formData.lastSeenTime}
            onChange={handleChange}
            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all duration-200"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-400">🕐</span>
          </div>
        </div>
      </div>

      {(formData.status === 'injured' || formData.status === 'safe') && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-4">
          <div className="flex items-center">
            <span className="text-green-500 mr-2">🏥</span>
            <h4 className="font-medium text-green-800">Hospital Information</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-green-700 mb-1">Hospital/Facility</label>
              <input
                type="text"
                name="hospitalFacility"
                value={formData.hospitalFacility}
                onChange={handleChange}
                placeholder="Hospital name"
                className="w-full px-4 py-2 border border-green-300 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-green-700 mb-1">Room/Ward Number</label>
              <input
                type="text"
                name="roomWard"
                value={formData.roomWard}
                onChange={handleChange}
                placeholder="Room or ward number"
                className="w-full px-4 py-2 border border-green-300 rounded-lg focus:border-green-500 focus:ring-1 focus:ring-green-200"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-orange-500 to-red-600 rounded-full mb-4">
          <span className="text-2xl text-white">📝</span>
        </div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">Additional Information</h3>
        <p className="text-gray-600">Final details to complete the submission</p>
      </div>
      
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
        <div className="relative">
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows="4"
            placeholder="Any additional information that might help..."
            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all duration-200 resize-none"
          />
          <div className="absolute top-3 left-0 pl-3 flex items-start pointer-events-none">
            <span className="text-gray-400">💬</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">Medical Conditions</label>
          <div className="relative">
            <input
              type="text"
              name="medicalConditions"
              value={formData.medicalConditions}
              onChange={handleChange}
              placeholder="Known medical conditions or allergies"
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all duration-200"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400">🏥</span>
            </div>
          </div>
        </div>
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">Distinguishing Features</label>
          <div className="relative">
            <input
              type="text"
              name="distinguishingFeatures"
              value={formData.distinguishingFeatures}
              onChange={handleChange}
              placeholder="Scars, birthmarks, clothing worn, etc."
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all duration-200"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-400">👁️</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
        <h4 className="font-semibold text-gray-800 mb-4 flex items-center">
          <span className="mr-2">👤</span>
          Submitter Information
        </h4>
        
        <div className="space-y-4">
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                name="submitterName"
                value={formData.submitterName}
                onChange={handleChange}
                required
                placeholder="Your full name"
                className="w-full pl-10 pr-4 py-3 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 bg-white"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-blue-400">✍️</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Relationship <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  name="submitterRelationship"
                  value={formData.submitterRelationship}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 appearance-none bg-white"
                >
                  <option value="">Select relationship</option>
                  <option value="father">Father</option>
                  <option value="mother">Mother</option>
                  <option value="guardian">Guardian</option>
                  <option value="sibling">Sibling</option>
                  <option value="relative">Other Relative</option>
                  <option value="friend">Friend</option>
                  <option value="teacher">Teacher</option>
                  <option value="classmate">Classmate</option>
                  <option value="neighbor">Neighbor</option>
                  <option value="other">Other</option>
                </select>
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Contact Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  name="submitterContact"
                  value={formData.submitterContact}
                  onChange={handleChange}
                  required
                  placeholder="+8801XXXXXXXXX"
                  className="w-full pl-10 pr-4 py-3 border-2 border-blue-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 bg-white"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-blue-400">📞</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-700 rounded-full mb-4 shadow-lg">
          <span className="text-3xl text-white">🏫</span>
        </div>
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Submit a Case</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Help us create a comprehensive record by providing information about those affected by the tragedy. 
          Your submission will be carefully reviewed and verified.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Progress Indicator */}
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div className="relative">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                    step < currentStep 
                      ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg transform scale-110' 
                      : step === currentStep
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-110'
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {step < currentStep ? (
                      <CheckCircleIcon className="w-6 h-6" />
                    ) : (
                      step
                    )}
                  </div>
                  {step < currentStep && (
                    <div className="absolute -inset-1 bg-green-400 rounded-full animate-ping opacity-20"></div>
                  )}
                  {step === currentStep && (
                    <div className="absolute -inset-1 bg-blue-400 rounded-full animate-pulse opacity-30"></div>
                  )}
                </div>
                {step < 4 && (
                  <div className={`flex-1 h-2 mx-4 rounded-full transition-all duration-500 ${
                    step < currentStep ? 'bg-gradient-to-r from-green-400 to-green-500' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm font-medium">
            <span className={currentStep >= 1 ? 'text-blue-600' : 'text-gray-500'}>Basic Info</span>
            <span className={currentStep >= 2 ? 'text-blue-600' : 'text-gray-500'}>Student Details</span>
            <span className={currentStep >= 3 ? 'text-blue-600' : 'text-gray-500'}>Contact & Location</span>
            <span className={currentStep >= 4 ? 'text-blue-600' : 'text-gray-500'}>Additional Info</span>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8">
          <div className="min-h-[500px]">
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
            {currentStep === 4 && renderStep4()}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 1}
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                currentStep === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:shadow-md active:transform active:scale-95'
              }`}
            >
              ← Previous
            </button>
            
            {currentStep < 4 ? (
              <button
                type="button"
                onClick={nextStep}
                className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-purple-700 hover:shadow-lg transition-all duration-200 active:transform active:scale-95"
              >
                Next →
              </button>
            ) : (
              <div className="flex items-center space-x-4">
                <ReCAPTCHA
                  ref={recaptchaRef}
                  size="invisible"
                  sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-8 py-3 rounded-xl font-medium transition-all duration-200 ${
                    isSubmitting
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 hover:shadow-lg active:transform active:scale-95'
                  }`}
                >
                  {isSubmitting ? (
                    <div className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </div>
                  ) : (
                    '✓ Submit Case'
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Message Display */}
          {message && (
            <div className={`mt-6 p-4 rounded-xl border-l-4 ${
              message.includes('Error') 
                ? 'bg-red-50 border-red-400 text-red-800' 
                : 'bg-green-50 border-green-400 text-green-800'
            }`}>
              <div className="flex items-center">
                {message.includes('Error') ? (
                  <ExclamationTriangleIcon className="w-5 h-5 mr-3 flex-shrink-0" />
                ) : (
                  <CheckCircleIcon className="w-5 h-5 mr-3 flex-shrink-0" />
                )}
                <p className="font-medium">{message}</p>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Verification Notice */}
      <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
              <InformationCircleIcon className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="ml-4">
            <h4 className="text-lg font-semibold text-blue-800 mb-3">Verification Process</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-blue-700">
              <div className="flex items-start">
                <span className="mr-2">🔍</span>
                <span>All submissions are reviewed before publication</span>
              </div>
              <div className="flex items-start">
                <span className="mr-2">📞</span>
                <span>We may contact you for additional verification</span>
              </div>
              <div className="flex items-start">
                <span className="mr-2">🎓</span>
                <span>Student ID and contact information help with verification</span>
              </div>
              <div className="flex items-start">
                <span className="mr-2">⭐</span>
                <span>Providing multiple verification details increases credibility</span>
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-100 rounded-lg">
              <p className="text-blue-800 text-sm font-medium">
                💡 <strong>Pro Tip:</strong> Cases with student IDs and family contact information are verified faster
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}