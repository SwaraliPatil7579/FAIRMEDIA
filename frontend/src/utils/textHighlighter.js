export const highlightBiasedText = (text, biasedPhrases) => {
  if (!text || !biasedPhrases || biasedPhrases.length === 0) {
    return text
  }

  let highlightedText = text
  
  biasedPhrases.forEach((phrase) => {
    const regex = new RegExp(`(${phrase.text})`, 'gi')
    highlightedText = highlightedText.replace(
      regex,
      `<mark class="bg-yellow-200 px-1 rounded" data-severity="${phrase.severity}">$1</mark>`
    )
  })

  return highlightedText
}

export const getSeverityColor = (severity) => {
  const colors = {
    low: 'bg-yellow-100 text-yellow-800',
    medium: 'bg-orange-100 text-orange-800',
    high: 'bg-red-100 text-red-800',
  }
  
  return colors[severity] || colors.low
}
