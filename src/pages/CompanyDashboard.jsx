"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  LogOut,
  Upload,
  Download,
  FileText,
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  X,
  Check,
  AlertCircle,
  Star,
  File,
  Image as ImageIcon,
  FileSpreadsheet,
  FileType,
} from "lucide-react"
import { getMyDocuments, uploadFile, downloadFile, createCompanyProfile, getCompanyReviews, getCurrentUserCompany, getDocumentReviews } from "../lib/company-api"

export default function CompanyDashboard() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [documents, setDocuments] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [companyId, setCompanyId] = useState(null)
  const [showCreateProfile, setShowCreateProfile] = useState(false)
  const [creatingProfile, setCreatingProfile] = useState(false)

  const [uploadForm, setUploadForm] = useState({
    title: "",
    description: "",
    file: null,
    documentType: "GENERAL",
  })

  const [profileForm, setProfileForm] = useState({
    name: "",
    address: "",
    industry: "",
    phone: "",
  })

  const [reviewsModalOpen, setReviewsModalOpen] = useState(false)
  const [selectedDocumentForReviews, setSelectedDocumentForReviews] = useState(null)
  const [documentReviews, setDocumentReviews] = useState([])
  const [toast, setToast] = useState(null)

  useEffect(() => {
    const checkCompanyAndLoad = async () => {
      const token = localStorage.getItem("token")
      const userRole = localStorage.getItem("userRole")

      if (!token || userRole !== "COMPANY_OWNER") {
        navigate("/")
        return
      }

      // First try to get the current user's company
      try {
        const userCompany = await getCurrentUserCompany()

        // User has a company - load it
        const companyId = userCompany.id.toString()
        setCompanyId(companyId)
        setProfile(userCompany)
        localStorage.setItem("companyId", companyId)
        await fetchCompanyData(companyId)
      } catch {
        // User doesn't have a company or can't check - show create form
        setShowCreateProfile(true)
        setLoading(false)
      }
    }

    checkCompanyAndLoad()
  }, [navigate])

  const handleCreateProfile = async (e) => {
    e.preventDefault()
    setCreatingProfile(true)
    setError("")

    try {
      const newProfile = await createCompanyProfile(profileForm)
      localStorage.setItem("companyId", newProfile.id.toString())
      setCompanyId(newProfile.id.toString())
      setProfile(newProfile)
      setShowCreateProfile(false)
      await fetchCompanyData(newProfile.id.toString())
    } catch (err) {
      setError(err.message)
    } finally {
      setCreatingProfile(false)
    }
  }

  const showToast = (message, type = "success") => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchCompanyData = async (companyId) => {
    try {
      // Fetch documents and reviews in parallel
      const [docsData, reviewsData] = await Promise.all([
        getMyDocuments(companyId),
        getCompanyReviews(companyId).catch(() => []) // If no reviews, return empty array
      ])

      setDocuments(docsData)
      setReviews(reviewsData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleViewReviews = async (document) => {
    setSelectedDocumentForReviews(document)
    setReviewsModalOpen(true)

    try {
      // Fetch reviews for this document from the API
      const docReviews = await getDocumentReviews(document.id)
      setDocumentReviews(docReviews)
    } catch (error) {
      console.error("Error fetching reviews:", error)
      setDocumentReviews([])
    }
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    setUploading(true)
    setError("")

    try {
      await uploadFile(uploadForm.file, companyId, uploadForm.documentType)

      showToast("Document uploaded successfully!")
      setUploadModalOpen(false)
      setUploadForm({ title: "", description: "", file: null, documentType: "GENERAL" })
      fetchCompanyData(companyId)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
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

  const getReviewsForDocument = (documentId) => {
    return reviews.filter(review => review.document.id === documentId)
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

  const handleLogout = () => {
    localStorage.clear()
    navigate("/")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
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
              <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-2 rounded-xl">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Company Dashboard</h1>
                <p className="text-sm text-gray-600">Company ID: {companyId}</p>
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
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2 animate-fade-in">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {showCreateProfile && (
          <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-xl animate-fade-in">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5" />
              <span className="font-semibold">Create Company Profile</span>
            </div>
            <p className="mb-4">You need to create a company profile first to access your documents:</p>

            <form onSubmit={handleCreateProfile} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter company name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Industry</label>
                  <input
                    type="text"
                    value={profileForm.industry}
                    onChange={(e) => setProfileForm({ ...profileForm, industry: e.target.value })}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter industry"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                  <input
                    type="text"
                    value={profileForm.address}
                    onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                    type="text"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter phone number"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={creatingProfile}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {creatingProfile ? "Creating..." : "Create Company Profile"}
              </button>
            </form>
          </div>
        )}

        {/* Company Profile Section */}
        {profile && !showCreateProfile && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 animate-slide-in">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Company Profile</h2>
                <p className="text-gray-600">Your company information and details</p>
              </div>
              <div className="bg-gradient-to-br from-indigo-100 to-purple-100 p-3 rounded-xl">
                <Building2 className="w-8 h-8 text-indigo-600" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                  <div>
                    <p className="text-xs text-gray-500">Company Name</p>
                    <p className="font-semibold text-gray-900">{profile.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Phone className="w-5 h-5 text-indigo-600" />
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="font-semibold text-gray-900">{profile.phone || "Not provided"}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <MapPin className="w-5 h-5 text-indigo-600 mt-1" />
                  <div>
                    <p className="text-xs text-gray-500">Address</p>
                    <p className="font-semibold text-gray-900">{profile.address || "Not provided"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-5 h-5 text-indigo-600 mt-1" />
                  <div>
                    <p className="text-xs text-gray-500">Industry</p>
                    <p className="font-semibold text-gray-900">{profile.industry || "Not provided"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Documents Section */}
        <div className="bg-white rounded-2xl shadow-lg p-6 animate-slide-in">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Documents</h2>
              <p className="text-gray-600">Manage your uploaded documents</p>
            </div>
            <button
              onClick={() => setUploadModalOpen(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              <Upload className="w-5 h-5" />
              Upload Document
            </button>
          </div>

          {documents.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-2">No documents uploaded yet</p>
              <p className="text-gray-400">Click the upload button to add your first document</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map((doc, index) => (
                <div
                  key={doc.id}
                  className="border border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-indigo-300 transition-all duration-300 animate-fade-in cursor-pointer"
                  style={{ animationDelay: `${index * 0.05}s` }}
                  onClick={() => handleViewReviews(doc)}
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

                  {/* Reviews Count Badge */}
                  {getReviewsForDocument(doc.id).length > 0 && (
                    <div className="mb-3 p-2 bg-yellow-50 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-600 fill-yellow-600" />
                        <span className="text-xs font-semibold text-yellow-800">
                          {getReviewsForDocument(doc.id).length} Review{getReviewsForDocument(doc.id).length > 1 ? 's' : ''}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleViewReviews(doc)
                        }}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        View All →
                      </button>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDownload(doc.id, doc.fileName)
                      }}
                      className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-indigo-100 text-gray-700 hover:text-indigo-700 px-4 py-2 rounded-lg transition-all duration-300"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                    {getReviewsForDocument(doc.id).length > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleViewReviews(doc)
                        }}
                        className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-all duration-300"
                      >
                        <Star className="w-4 h-4" />
                        Reviews
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Upload Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Upload Document</h3>
              <button
                onClick={() => setUploadModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Document Title</label>
                <input
                  type="text"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  placeholder="Enter document title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  required
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                  placeholder="Enter document description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Document Type</label>
                <select
                  value={uploadForm.documentType}
                  onChange={(e) => setUploadForm({ ...uploadForm, documentType: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                >
                  <option value="GENERAL">General Document</option>
                  <option value="FINANCIAL">Financial Report</option>
                  <option value="LEGAL">Legal Document</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="CERTIFICATE">Certificate</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">File</label>
                <input
                  type="file"
                  onChange={(e) => setUploadForm({ ...uploadForm, file: e.target.files[0] })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={uploading}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {uploading ? "Uploading..." : "Upload Document"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Reviews Modal */}
      {reviewsModalOpen && selectedDocumentForReviews && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col animate-scale-in">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Document Reviews</h3>
                <p className="text-sm text-gray-600 mt-1">{selectedDocumentForReviews.fileName}</p>
              </div>
              <button
                onClick={() => setReviewsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {documentReviews.length === 0 ? (
                <div className="text-center py-12">
                  <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No reviews yet</p>
                  <p className="text-gray-400 text-sm">This document hasn't been reviewed by any auditors yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {documentReviews.map((review, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                            <span className="font-semibold text-gray-900">
                              {review.auditor?.name || review.auditor?.username || "Anonymous Auditor"}
                            </span>
                            <span className="text-xs text-gray-500">
                              • {new Date(review.reviewedAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <span
                                key={i}
                                className={`text-lg ${i < review.rating
                                  ? "text-yellow-400 fill-yellow-400"
                                  : "text-gray-300"
                                  }`}
                              >
                                ★
                              </span>
                            ))}
                            <span className="text-sm text-gray-600 ml-2">({review.rating}/5)</span>
                          </div>
                        </div>
                      </div>
                      {review.comments && (
                        <p className="text-gray-700 text-sm bg-gray-50 p-3 rounded-lg">
                          {review.comments}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
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
              <Check className="w-5 h-5" />
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
