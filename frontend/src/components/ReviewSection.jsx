function ReviewSection({ originalText, highlightedText }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-4">Text Review</h2>
      <div className="prose max-w-none">
        {highlightedText ? (
          <div 
            className="p-4 bg-gray-50 rounded-lg"
            dangerouslySetInnerHTML={{ __html: highlightedText }}
          />
        ) : (
          <p className="text-gray-500">No text to review</p>
        )}
      </div>
    </div>
  )
}

export default ReviewSection
