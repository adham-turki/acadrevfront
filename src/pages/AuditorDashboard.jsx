"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  LogOut,
  Building2,
  FileText,
  Download,
  Star,
  ChevronLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  X,
  Send,
  AlertCircle,
  File,
  Image as ImageIcon,
  FileSpreadsheet,
  FileType,
} from "lucide-react"
import { getAllCompanies, getCompanyDocuments, reviewDocument, hasAlreadyReviewed, downloadFile } from "../lib/auditor-api"

export default function AuditorDashboard() {
  const navigate = useNavigate()
  const [companies, setCompanies] = useState([])
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [companyDocuments, setCompanyDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [reviewModalOpen, setReviewModalOpen] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState(null)
  const [error, setError] = useState("")
  const [reviewedDocuments, setReviewedDocuments] = useState(new Set())
  const [toast, setToast] = useState(null)

  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    comments: "",
  })

  useEffect(() => {
    const token = localStorage.getItem("token")
    const userRole = localStorage.getItem("userRole")

    if (!token || userRole !== "AUDITOR") {
      navigate("/")
      return
    }

    fetchCompanies()
  }, [navigate])

  const fetchCompanies = async () => {
    try {
      const data = await getAllCompanies()
      setCompanies(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchCompanyDocuments = async (companyId) => {
    try {
      const data = await getCompanyDocuments(companyId)
      setCompanyDocuments(data)

      // Check which documents the user has already reviewed
      const userId = localStorage.getItem("userId")
      if (userId) {
        const reviewedSet = new Set()
        for (const doc of data) {
          const hasReviewed = await hasAlreadyReviewed(doc.id, userId)
          if (hasReviewed) {
            reviewedSet.add(doc.id)
          }
        }
        setReviewedDocuments(reviewedSet)
      }
    } catch (err) {
      setError(err.message)
    }
  }

  const handleCompanyClick = async (company) => {
    setSelectedCompany(company)
    await fetchCompanyDocuments(company.id)
  }

  const handleDownload = async (documentId, filename) => {
    try {
      const blob = await downloadFile(documentId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      setError(err.message)
    }
  }

  const showToast = (message, type = "success") => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const getFileIcon = (fileType) => {
    if (!fileType) return { Icon: FileText, color: "text-gray-600", bgColor: "bg-gray-100" }

    const type = fileType.toLowerCase()

    if (type.includes("pdf")) {
      return { Icon: FileText, color: "text-red-600", bgColor: "bg-red-100" }
    } else if (type.includes("word") || type.includes("doc")) {
      return { Icon: FileType, color: "text-blue-600", bgColor: "bg-blue-100" }
    } else if (type.includes("excel") || type.includes("spreadsheet") || type.includes("xls") || type.includes("csv")) {
      return { Icon: FileSpreadsheet, color: "text-green-600", bgColor: "bg-green-100" }
    } else if (type.includes("image") || type.includes("jpg") || type.includes("jpeg") || type.includes("png") || type.includes("gif")) {
      return { Icon: ImageIcon, color: "text-purple-600", bgColor: "bg-purple-100" }
    } else {
      return { Icon: File, color: "text-gray-600", bgColor: "bg-gray-100" }
    }
  }

  const handleSubmitReview = async (e) => {
    e.preventDefault()
    try {
      await reviewDocument(selectedDocument.id, reviewForm.rating, reviewForm.comments)

      // Mark document as reviewed
      setReviewedDocuments(prev => new Set([...prev, selectedDocument.id]))

      setReviewModalOpen(false)
      setReviewForm({ rating: 5, comments: "" })
      showToast("Review submitted successfully!")
    } catch (err) {
      setError(err.message)
    }
  }

  const handleLogout = () => {
    localStorage.clear()
    navigate("/")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-10 animate-fade-in">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {selectedCompany && (
                <button
                  onClick={() => setSelectedCompany(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
              <div className="bg-gradient-to-br from-purple-600 to-indigo-600 p-2 rounded-xl">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Auditor Dashboard</h1>
                <p className="text-sm text-gray-600">
                  {selectedCompany ? selectedCompany.companyName : "Review company documents"}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-300"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl animate-fade-in">
            {error}
          </div>
        )}

        {!selectedCompany ? (
          /* Companies List */
          <div className="animate-slide-in">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Companies</h2>
              <p className="text-gray-600">Select a company to review their documents</p>
            </div>

            {companies.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
                <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No companies found</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {companies.map((company, index) => (
                  <button
                    key={company.id}
                    onClick={() => handleCompanyClick(company)}
                    className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl hover:scale-105 transition-all duration-300 text-left animate-fade-in"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className="bg-gradient-to-br from-purple-100 to-indigo-100 p-3 rounded-xl">
                        <Building2 className="w-8 h-8 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg text-gray-900 truncate mb-1">{company.name}</h3>
                        <p className="text-xs text-gray-500 mb-2">{company.industry || "Industry: N/A"}</p>
                        <p className="text-xs text-gray-400">Company ID: {company.id}</p>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600">
                      {company.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span>{company.phone}</span>
                        </div>
                      )}
                      {company.address && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="truncate">{company.address}</span>
                        </div>
                      )}
                      {company.user?.username && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="truncate">{company.user.username}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <span className="text-sm font-medium text-purple-600">Click to view documents →</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Company Details & Documents */
          <div className="space-y-6">
            {/* Company Profile */}
            <div className="bg-white rounded-2xl shadow-lg p-6 animate-slide-in">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Company Profile</h2>
                  <p className="text-gray-600">{selectedCompany.name}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-100 to-indigo-100 p-3 rounded-xl">
                  <Building2 className="w-8 h-8 text-purple-600" />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Building2 className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="text-xs text-gray-500">Company Name</p>
                      <p className="font-semibold text-gray-900">{selectedCompany.name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Phone className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="font-semibold text-gray-900">{selectedCompany.phone || "Not provided"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Mail className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="text-xs text-gray-500">Contact Email</p>
                      <p className="font-semibold text-gray-900">{selectedCompany.user?.username || "Not provided"}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <MapPin className="w-5 h-5 text-purple-600 mt-1" />
                    <div>
                      <p className="text-xs text-gray-500">Address</p>
                      <p className="font-semibold text-gray-900">{selectedCompany.address || "Not provided"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Building2 className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="text-xs text-gray-500">Industry</p>
                      <p className="font-semibold text-gray-900">{selectedCompany.industry || "Not provided"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="text-xs text-gray-500">Company ID</p>
                      <p className="font-semibold text-gray-900">{selectedCompany.id}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Documents */}
            <div className="bg-white rounded-2xl shadow-lg p-6 animate-slide-in" style={{ animationDelay: "0.1s" }}>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Documents</h2>
                <p className="text-gray-600">Review and audit company documents</p>
              </div>

              {companyDocuments.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No documents available</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {companyDocuments.map((doc, index) => (
                    <div
                      key={doc.id}
                      className="border border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-purple-300 transition-all duration-300 animate-fade-in"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        {(() => {
                          const { Icon, color, bgColor } = getFileIcon(doc.fileType)
                          return (
                            <div className={`${bgColor} p-3 rounded-lg`}>
                              <Icon className={`w-6 h-6 ${color}`} />
                            </div>
                          )
                        })()}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{doc.fileName}</h3>
                          <p className="text-xs text-gray-500">{new Date(doc.uploadedAt).toLocaleDateString()}</p>
                        </div>
                      </div>

                      <div className="space-y-2 mb-4 text-xs text-gray-600">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Document Type:</span>
                          <span className="text-purple-600">{doc.documentType}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">File Type:</span>
                          <span className="text-gray-500">{doc.fileType}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Document ID:</span>
                          <span className="text-gray-400">#{doc.id}</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDownload(doc.id, doc.fileName)}
                          className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-purple-100 text-gray-700 hover:text-purple-700 px-3 py-2 rounded-lg transition-all duration-300 text-sm"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </button>
                        {reviewedDocuments.has(doc.id) ? (
                          <button
                            disabled
                            className="flex-1 flex items-center justify-center gap-2 bg-green-500 text-white px-3 py-2 rounded-lg text-sm cursor-not-allowed"
                          >
                            <Star className="w-4 h-4 fill-white" />
                            Already Reviewed
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedDocument(doc)
                              setReviewModalOpen(true)
                            }}
                            className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg transition-all duration-300 text-sm"
                          >
                            <Star className="w-4 h-4" />
                            Review
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Review Modal */}
      {reviewModalOpen && selectedDocument && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Submit Review</h3>
              <button
                onClick={() => setReviewModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500 mb-1">Document</p>
              <p className="font-semibold text-gray-900">{selectedDocument.fileName}</p>
              <div className="mt-2 flex gap-4 text-xs text-gray-600">
                <span>Type: {selectedDocument.documentType}</span>
                <span>•</span>
                <span>File: {selectedDocument.fileType}</span>
              </div>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Rating</label>
                <div className="flex gap-2 justify-center">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setReviewForm({ ...reviewForm, rating })}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-10 h-10 ${rating <= reviewForm.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                          }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Comments</label>
                <textarea
                  value={reviewForm.comments}
                  onChange={(e) => setReviewForm({ ...reviewForm, comments: e.target.value })}
                  required
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                  placeholder="Enter your review comments..."
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 font-medium"
              >
                <Send className="w-5 h-5" />
                Submit Review
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 animate-slide-in">
          <div
            className={`${toast.type === "success"
              ? "bg-green-500 text-white"
              : toast.type === "error"
                ? "bg-red-500 text-white"
                : "bg-blue-500 text-white"
              } px-6 py-4 rounded-lg shadow-lg flex items-center gap-3`}
          >
            {toast.type === "success" ? (
              <X className="w-5 h-5" />
            ) : toast.type === "error" ? (
              <AlertCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <p className="font-medium">{toast.message}</p>
          </div>
        </div>
      )}
    </div>
  )
}
