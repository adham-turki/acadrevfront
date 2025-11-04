import { useState, useEffect } from "react"
import {
  X,
  Download,
  FileText,
  Calendar,
  User,
  Building2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MessageSquare,
} from "lucide-react"

export default function DocumentPreviewModal({ 
  document, 
  isOpen, 
  onClose, 
  onDownload,
  getDocumentReviews 
}) {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && document) {
      loadReviews()
    }
  }, [isOpen, document])

  const loadReviews = async () => {
    if (!document || !getDocumentReviews) return
    
    setLoading(true)
    try {
      const reviewsData = await getDocumentReviews(document.id)
      setReviews(reviewsData || [])
    } catch (error) {
      console.error("Error loading reviews:", error)
      setReviews([])
    } finally {
      setLoading(false)
    }
  }

  const getReviewStatusColor = (rating) => {
    const normalizedRating = rating?.toUpperCase()
    if (normalizedRating === "ACCEPTED") {
      return {
        bg: "bg-green-100",
        text: "text-green-800",
        icon: CheckCircle2,
        label: "ACCEPTED"
      }
    } else if (normalizedRating === "REJECTED") {
      return {
        bg: "bg-red-100",
        text: "text-red-800",
        icon: XCircle,
        label: "REJECTED"
      }
    } else if (normalizedRating === "TSE") {
      return {
        bg: "bg-orange-100",
        text: "text-orange-800",
        icon: AlertCircle,
        label: "TSE (To See Evidence)"
      }
    } else {
      // Legacy numeric rating
      return {
        bg: "bg-blue-100",
        text: "text-blue-800",
        icon: MessageSquare,
        label: `Rating: ${rating}`
      }
    }
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return "N/A"
    const kb = bytes / 1024
    const mb = kb / 1024
    if (mb >= 1) return `${mb.toFixed(2)} MB`
    return `${kb.toFixed(2)} KB`
  }

  if (!isOpen || !document) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-3 rounded-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Document Details</h3>
              <p className="text-sm text-gray-600">View document information and reviews</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-white rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Document Info Card */}
          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              Document Information
            </h4>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 uppercase font-medium">File Name</label>
                <p className="font-semibold text-gray-900 mt-1">{document.fileName}</p>
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase font-medium">Document Type</label>
                <p className="font-semibold text-gray-900 mt-1">
                  <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm">
                    {document.documentType}
                  </span>
                </p>
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase font-medium">File Type</label>
                <p className="font-semibold text-gray-900 mt-1">{document.fileType || "N/A"}</p>
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase font-medium">File Size</label>
                <p className="font-semibold text-gray-900 mt-1">
                  {document.fileData ? formatFileSize(document.fileData.length) : "N/A"}
                </p>
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase font-medium">Uploaded Date</label>
                <p className="font-semibold text-gray-900 mt-1 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  {new Date(document.uploadedAt).toLocaleString()}
                </p>
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase font-medium">Document ID</label>
                <p className="font-semibold text-gray-900 mt-1">#{document.id}</p>
              </div>

              {document.requirement && (
                <div className="md:col-span-2">
                  <label className="text-xs text-gray-500 uppercase font-medium">Linked Requirement</label>
                  <p className="font-semibold text-gray-900 mt-1 flex items-center gap-2">
                    <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
                      {document.requirement.name}
                    </span>
                    {document.section && (
                      <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-sm font-mono">
                        Section {document.section.code}
                      </span>
                    )}
                  </p>
                </div>
              )}

              {document.company && (
                <div className="md:col-span-2">
                  <label className="text-xs text-gray-500 uppercase font-medium">Company</label>
                  <p className="font-semibold text-gray-900 mt-1 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    {document.company.name}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Reviews Section */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
              Reviews ({reviews.length})
            </h4>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="text-gray-600 mt-4">Loading reviews...</p>
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No reviews yet</p>
                <p className="text-gray-400 text-sm mt-2">
                  This document hasn't been reviewed by any auditors yet.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((review, index) => {
                  const statusInfo = getReviewStatusColor(review.rating)
                  const StatusIcon = statusInfo.icon

                  return (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors"
                    >
                      {/* Review Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="bg-purple-100 p-2 rounded-full">
                            <User className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {review.auditor?.name || review.auditor?.username || "Anonymous Auditor"}
                            </p>
                            <p className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(review.reviewedAt).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className={`${statusInfo.bg} ${statusInfo.text} px-4 py-2 rounded-lg flex items-center gap-2 font-medium`}>
                          <StatusIcon className="w-5 h-5" />
                          {statusInfo.label}
                        </div>
                      </div>

                      {/* Review Comments */}
                      {review.comments && (
                        <div className="bg-gray-50 rounded-lg p-4 mt-3">
                          <p className="text-sm font-medium text-gray-700 mb-2">Comments:</p>
                          <p className="text-gray-800">{review.comments}</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors font-medium"
          >
            Close
          </button>
          <button
            onClick={() => onDownload(document.id, document.fileName)}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg font-medium"
          >
            <Download className="w-5 h-5" />
            Download Document
          </button>
        </div>
      </div>
    </div>
  )
}

