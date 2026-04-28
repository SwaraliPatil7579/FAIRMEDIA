const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000'

export const analyzeText = async (text, options = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: text,
        ...options,
      }),
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error analyzing text:', error)
    throw error
  }
}

export const getFairnessMetrics = async (textId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/analyze/${textId}`)
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching fairness metrics:', error)
    throw error
  }
}

export const healthCheck = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`)
    return response.ok
  } catch (error) {
    console.error('Health check failed:', error)
    return false
  }
}
