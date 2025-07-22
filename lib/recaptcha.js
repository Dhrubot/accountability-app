// lib/recaptcha.js
export async function verifyRecaptcha(token) {
  if (!token) {
    return { success: false, error: 'No reCAPTCHA token provided' }
  }

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`
    })

    const data = await response.json()
    
    if (data.success && data.score > 0.5) {
      return { success: true, score: data.score }
    } else {
      return { success: false, error: 'reCAPTCHA verification failed', score: data.score }
    }
  } catch (error) {
    return { success: false, error: 'reCAPTCHA verification error' }
  }
}