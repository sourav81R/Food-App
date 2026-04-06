let razorpaySdkPromise = null

export const loadRazorpaySdk = () => {
  if (window.Razorpay) {
    return Promise.resolve(true)
  }

  if (razorpaySdkPromise) {
    return razorpaySdkPromise
  }

  razorpaySdkPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector('script[data-razorpay-sdk="true"]')
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true), { once: true })
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Razorpay SDK')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.dataset.razorpaySdk = 'true'
    script.onload = () => resolve(true)
    script.onerror = () => reject(new Error('Failed to load Razorpay SDK'))
    document.body.appendChild(script)
  }).catch((error) => {
    razorpaySdkPromise = null
    throw error
  })

  return razorpaySdkPromise
}
