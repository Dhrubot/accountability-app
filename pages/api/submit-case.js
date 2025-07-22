// pages/api/submit-case.js
import { supabase } from '../../lib/supabase'
import { securityManager } from '../../lib/security'
import { verifyRecaptcha } from '../../lib/recaptcha'

export default async function handler(req, res) {
  const ip = securityManager.getClientIP(req)
  
  try {
    securityManager.updateMetrics('requests')

    // Security checks
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' })
    }

    if (securityManager.suspiciousIPs.has(ip)) {
      securityManager.updateMetrics('errors')
      return res.status(429).json({ error: 'IP blocked due to suspicious activity' })
    }

    if (!securityManager.checkRateLimit(ip, 'submission')) {
      securityManager.updateMetrics('errors')
      return res.status(429).json({ error: 'Rate limit exceeded' })
    }

    if (securityManager.detectThreats(req)) {
      securityManager.updateMetrics('errors')
      return res.status(400).json({ error: 'Suspicious activity detected' })
    }

    // Verify reCAPTCHA
    const recaptchaResult = await verifyRecaptcha(req.body.recaptchaToken)
    if (!recaptchaResult.success) {
      securityManager.updateMetrics('errors')
      return res.status(400).json({ error: 'reCAPTCHA verification failed' })
    }

    // Sanitize and validate inputs
    const sanitizedData = {
      // Basic Information
      name: securityManager.sanitizeInput(req.body.name),
      age: parseInt(req.body.age) || null,
      gender: req.body.gender || null,
      status: req.body.status,
      
      // Student Information
      student_id: securityManager.sanitizeInput(req.body.studentId),
      class_grade: securityManager.sanitizeInput(req.body.classGrade),
      section: securityManager.sanitizeInput(req.body.section),
      roll_number: securityManager.sanitizeInput(req.body.rollNumber),
      
      // Family Information
      fathers_name: securityManager.sanitizeInput(req.body.fathersName),
      mothers_name: securityManager.sanitizeInput(req.body.mothersName),
      guardian_name: securityManager.sanitizeInput(req.body.guardianName),
      
      // Identity Information
      nid_last_4_digits: securityManager.sanitizeInput(req.body.nidLast4),
      birth_certificate_number: securityManager.sanitizeInput(req.body.birthCertNumber),
      
      // Contact Information
      contact_email: securityManager.sanitizeInput(req.body.contactEmail),
      contact_phone: securityManager.sanitizeInput(req.body.contactPhone),
      emergency_contact: securityManager.sanitizeInput(req.body.emergencyContact),
      address: securityManager.sanitizeInput(req.body.address),
      
      // Location Information
      last_seen_location: securityManager.sanitizeInput(req.body.lastSeenLocation),
      last_seen_time: req.body.lastSeenTime || null,
      hospital_facility: securityManager.sanitizeInput(req.body.hospitalFacility),
      room_ward_number: securityManager.sanitizeInput(req.body.roomWard),
      
      // Additional Information
      description: securityManager.sanitizeInput(req.body.description),
      medical_conditions: securityManager.sanitizeInput(req.body.medicalConditions),
      distinguishing_features: securityManager.sanitizeInput(req.body.distinguishingFeatures),
      
      // Submitter Information
      submitter_name: securityManager.sanitizeInput(req.body.submitterName),
      submitter_relationship: req.body.submitterRelationship,
      submitter_contact: securityManager.sanitizeInput(req.body.submitterContact)
    }

    // Validate required fields
    if (!sanitizedData.name || !sanitizedData.status || !sanitizedData.submitter_name || !sanitizedData.submitter_contact) {
      securityManager.updateMetrics('errors')
      return res.status(400).json({ 
        error: 'Required fields missing: name, status, submitter name, and submitter contact are required' 
      })
    }

    // Validate status
    const validStatuses = ['missing', 'injured', 'deceased', 'safe']
    if (!validStatuses.includes(sanitizedData.status)) {
      securityManager.updateMetrics('errors')
      return res.status(400).json({ error: 'Invalid status' })
    }

    // Validate gender
    const validGenders = ['male', 'female', 'other', 'not_specified', null]
    if (!validGenders.includes(sanitizedData.gender)) {
      sanitizedData.gender = null
    }

    // Validate relationship
    const validRelationships = ['father', 'mother', 'guardian', 'sibling', 'relative', 'friend', 'teacher', 'classmate', 'neighbor', 'other']
    if (!validRelationships.includes(sanitizedData.submitter_relationship)) {
      sanitizedData.submitter_relationship = 'other'
    }

    // Calculate verification score based on provided information
    let verificationScore = 0
    let verificationMethods = []

    if (sanitizedData.student_id) {
      verificationScore += 30
      verificationMethods.push('student_id')
    }
    if (sanitizedData.contact_phone) {
      verificationScore += 20
      verificationMethods.push('phone_contact')
    }
    if (sanitizedData.fathers_name || sanitizedData.mothers_name) {
      verificationScore += 15
      verificationMethods.push('family_info')
    }
    if (sanitizedData.class_grade && sanitizedData.section) {
      verificationScore += 10
      verificationMethods.push('class_info')
    }
    if (sanitizedData.nid_last_4_digits) {
      verificationScore += 15
      verificationMethods.push('nid_partial')
    }

    // Determine initial verification status based on score
    let initialVerificationStatus = 'unverified'
    if (verificationScore >= 50) {
      initialVerificationStatus = 'pending'
    }

    // Generate data hash for integrity
    const dataHash = securityManager.hashData(sanitizedData)

    // Prepare final data for insertion
    const finalData = {
      ...sanitizedData,
      verification_status: initialVerificationStatus,
      verification_method: verificationMethods.join(', '),
      submission_ip: ip,
      data_hash: dataHash,
      priority_level: sanitizedData.status === 'missing' ? 2 : 1 // Higher priority for missing persons
    }

    // Insert into database
    const { data, error } = await supabase
      .from('cases')
      .insert(finalData)
      .select()

    if (error) {
      console.error('Database error:', error)
      securityManager.updateMetrics('errors')
      return res.status(500).json({ 
        error: 'Failed to submit case', 
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      })
    }

    // Log security event
    await supabase.from('security_logs').insert({
      event_type: 'case_submission',
      ip_address: ip,
      user_agent: req.headers['user-agent'],
      case_id: data[0].id,
      details: { 
        status: sanitizedData.status,
        verification_score: verificationScore,
        verification_methods: verificationMethods,
        has_student_id: !!sanitizedData.student_id,
        submitter_relationship: sanitizedData.submitter_relationship
      },
      severity: 'info'
    })

    securityManager.updateMetrics('submissions')
    
    // Send different responses based on verification status
    let responseMessage = 'Case submitted successfully.'
    if (initialVerificationStatus === 'pending') {
      responseMessage += ' Your case has high verification score and will be prioritized for review.'
    } else {
      responseMessage += ' It will be reviewed for verification. Providing student ID or more details helps with faster verification.'
    }

    res.status(200).json({ 
      success: true, 
      message: responseMessage,
      case_id: data[0].id,
      verification_status: initialVerificationStatus,
      verification_score: verificationScore
    })

  } catch (error) {
    console.error('API error:', error)
    securityManager.updateMetrics('errors')
    securityManager.sendAlert(`API error from ${ip}: ${error.message}`)
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}