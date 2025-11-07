import { useState, useEffect } from "react"
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Upload,
  Download,
  FileText,
  Star,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Check,
  X,
  Send,
  MessageSquare,
} from "lucide-react"
import DocumentPreviewModal from "./DocumentPreviewModal"
import PDFPreviewModal from "./PDFPreviewModal"

export default function RequirementsTabs({
  sections = [],
  requirements = [],
  companyId,
  isAuditor = false,
  onUpload,
  onDownload,
  onReview,
  getRequirementDocuments,
  refreshRequirementId = null, // When this changes, refresh that requirement's documents
  requirementStatuses = [], // Array of requirement status objects (for company owners)
  onUpdateStatus = null, // Function to update requirement status (for company owners)
  auditStatuses = [], // Array of audit status objects (for auditors)
  onUpdateAuditStatus = null // Function to update audit status (for auditors)
}) {
  const [activeSection, setActiveSection] = useState(null)
  const [expandedSections, setExpandedSections] = useState(new Set())
  const [documentsCache, setDocumentsCache] = useState({})
  const [loadingDocs, setLoadingDocs] = useState({})
  const [organizedSections, setOrganizedSections] = useState([])
  const [selectedDocument, setSelectedDocument] = useState(null)
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [expandedRequirements, setExpandedRequirements] = useState(new Set())
  const [reviewingDoc, setReviewingDoc] = useState(null)
  const [reviewForms, setReviewForms] = useState({}) // Keyed by document ID
  const [documentReviews, setDocumentReviews] = useState({})
  const [documentCounts, setDocumentCounts] = useState({})
  const [pdfPreviewDoc, setPdfPreviewDoc] = useState(null)
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false)
  const [currentAuditorId, setCurrentAuditorId] = useState(null)
  const [expandedReviewDocs, setExpandedReviewDocs] = useState(new Set()) // Track which documents have reviews expanded (company view)
  const [statusDropdowns, setStatusDropdowns] = useState({}) // Track which requirement status dropdowns are open
  const [requirementResponses, setRequirementResponses] = useState({}) // Cache for requirement responses keyed by requirementId
  const [loadingResponses, setLoadingResponses] = useState({}) // Track loading state for responses
  const [responseDialogOpen, setResponseDialogOpen] = useState(false) // Dialog for add/update response
  const [editingResponse, setEditingResponse] = useState(null) // The response being edited (null for new)
  const [editingRequirementId, setEditingRequirementId] = useState(null) // The requirement ID for the response
  const [responseText, setResponseText] = useState("") // Text in the response dialog

  // Get current auditor ID
  useEffect(() => {
    if (isAuditor) {
      const userId = localStorage.getItem("userId")
      setCurrentAuditorId(userId ? parseInt(userId) : null)
    }
  }, [isAuditor])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (Object.keys(statusDropdowns).length > 0) {
        const isClickInsideDropdown = event.target.closest('.status-dropdown-container')
        if (!isClickInsideDropdown) {
          setStatusDropdowns({})
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [statusDropdowns])

  // Refresh documents when refreshRequirementId changes (after upload)
  useEffect(() => {
    if (refreshRequirementId && getRequirementDocuments) {
      // Clear cache for this requirement
      setDocumentsCache(prev => {
        const next = { ...prev }
        delete next[refreshRequirementId]
        return next
      })
      setDocumentCounts(prev => {
        const next = { ...prev }
        delete next[refreshRequirementId]
        return next
      })

      // Force reload documents for this requirement
      const reloadDocuments = async () => {
        setLoadingDocs(prev => ({ ...prev, [refreshRequirementId]: true }))
        try {
          const docs = await getRequirementDocuments(refreshRequirementId, companyId)
          setDocumentsCache(prev => ({ ...prev, [refreshRequirementId]: docs || [] }))
          setDocumentCounts(prev => ({ ...prev, [refreshRequirementId]: docs?.length || 0 }))

          // Load reviews for each document
          if (docs && docs.length > 0) {
            for (const doc of docs) {
              if (!doc.reviews) {
                loadDocumentReviews(doc.id)
              } else {
                setDocumentReviews(prev => ({ ...prev, [doc.id]: doc.reviews || [] }))
              }
            }
          }
        } catch (error) {
          console.error(`Error loading documents for requirement ${refreshRequirementId}:`, error)
          setDocumentsCache(prev => ({ ...prev, [refreshRequirementId]: [] }))
          setDocumentCounts(prev => ({ ...prev, [refreshRequirementId]: 0 }))
        } finally {
          setLoadingDocs(prev => ({ ...prev, [refreshRequirementId]: false }))
        }
      }

      reloadDocuments()

      // Also expand the requirement if it's not already expanded
      setExpandedRequirements(prev => {
        if (!prev.has(refreshRequirementId)) {
          return new Set([...prev, refreshRequirementId])
        }
        return prev
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshRequirementId, getRequirementDocuments, companyId])

  // Load document counts for all requirements (only once)
  useEffect(() => {
    if (requirements && requirements.length > 0 && getRequirementDocuments) {
      const loadCounts = async () => {
        setDocumentCounts(prev => {
          const promises = requirements
            .filter(req => prev[req.id] === undefined)
            .map(async (requirement) => {
              try {
                const docs = await getRequirementDocuments(requirement.id, companyId)
                return { id: requirement.id, count: docs?.length || 0 }
              } catch (error) {
                console.error(`Error loading document count for requirement ${requirement.id}:`, error)
                return { id: requirement.id, count: 0 }
              }
            })

          Promise.all(promises).then(results => {
            const newCounts = {}
            results.forEach(({ id, count }) => {
              newCounts[id] = count
            })
            setDocumentCounts(current => ({ ...current, ...newCounts }))
          })

          return prev
        })
      }

      loadCounts()
    }
  }, [requirements, getRequirementDocuments, companyId])

  // Organize sections into hierarchy based on code
  useEffect(() => {
    if (!sections || !Array.isArray(sections) || sections.length === 0) return

    // First, map all existing sections
    const existingSections = new Map()
    sections.forEach(section => {
      existingSections.set(section.code, section)
    })

    // Create organized sections with virtual parents
    const organized = []
    const virtualSections = new Map() // Track virtual parent sections we create

    sections.forEach(section => {
      const code = section.code || ""
      const levels = code.split(".").filter(Boolean)

      // Create the actual section
      const sectionData = {
        ...section,
        code,
        level: levels.length,
        parentCode: levels.length > 1 ? levels.slice(0, -1).join(".") : null,
        isVirtual: false,
        sectionRequirements: requirements.filter(req =>
          req.sectionId === section.id || req.section?.id === section.id
        )
      }
      organized.push(sectionData)

      // If this section has a parent that doesn't exist, create virtual parent sections
      if (levels.length > 1) {
        for (let i = 1; i < levels.length; i++) {
          const parentCode = levels.slice(0, i).join(".")

          // If parent doesn't exist and we haven't created it yet, create virtual parent
          if (!existingSections.has(parentCode) && !virtualSections.has(parentCode)) {
            const parentLevels = parentCode.split(".").filter(Boolean)
            const parentData = {
              id: `virtual-${parentCode}`, // Virtual ID
              code: parentCode,
              name: `Section ${parentCode}`, // Generic name, can be improved
              level: parentLevels.length,
              parentCode: parentLevels.length > 1 ? parentLevels.slice(0, -1).join(".") : null,
              isVirtual: true,
              sectionRequirements: [] // Virtual sections have no requirements directly
            }
            virtualSections.set(parentCode, parentData)
            organized.push(parentData)
          }
        }
      }
    })

    // Sort by code
    organized.sort((a, b) => {
      const aParts = a.code.split(".").map(Number)
      const bParts = b.code.split(".").map(Number)
      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aNum = aParts[i] || 0
        const bNum = bParts[i] || 0
        if (aNum !== bNum) return aNum - bNum
      }
      return 0
    })

    // Assign requirements to virtual sections (requirements belong to their direct parent)
    organized.forEach(section => {
      if (section.isVirtual) {
        // Find all child sections (real ones) that belong to this virtual parent
        const childSections = organized.filter(s =>
          !s.isVirtual && s.parentCode === section.code
        )
        // Collect all requirements from child sections
        section.sectionRequirements = childSections.flatMap(child => child.sectionRequirements)
      }
    })

    console.log("Organized sections with virtual parents:", organized.map(s => ({
      id: s.id,
      code: s.code,
      name: s.name,
      isVirtual: s.isVirtual,
      level: s.level,
      parentCode: s.parentCode,
      requirementsCount: s.sectionRequirements.length
    })))

    setOrganizedSections(organized)

    // Find the minimum level (top-most level in the data)
    const minLevel = Math.min(...organized.map(s => s.level))

    // Set first top-level section (1, 2, 3, 4, 5) as active if none is selected
    const currentActive = activeSection
    if (!currentActive && organized.length > 0) {
      const firstTopLevel = organized.find(s =>
        s.level === 1 && ["1", "2", "3", "4", "5"].includes(s.code.split(".")[0])
      ) || organized.find(s => s.level === minLevel)
      if (firstTopLevel) {
        setActiveSection(firstTopLevel.code)
        // Also expand the first top-level section
        setExpandedSections(prev => new Set([...prev, firstTopLevel.code]))
      }
    }
  }, [sections, requirements, activeSection])

  const toggleExpand = (code) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(code)) {
        next.delete(code)
      } else {
        next.add(code)
      }
      return next
    })
  }

  const toggleRequirementExpand = (requirementId) => {
    setExpandedRequirements(prev => {
      const next = new Set(prev)
      if (next.has(requirementId)) {
        next.delete(requirementId)
      } else {
        next.add(requirementId)
        loadDocuments(requirementId)
        loadRequirementResponse(requirementId)
      }
      return next
    })
  }

  // Load requirement response
  const loadRequirementResponse = async (requirementId) => {
    if (!companyId || loadingResponses[requirementId]) return

    setLoadingResponses(prev => ({ ...prev, [requirementId]: true }))
    try {
      let response
      if (isAuditor) {
        const { getRequirementResponse } = await import("../lib/auditor-api")
        response = await getRequirementResponse(companyId, requirementId)
      } else {
        const { getRequirementResponse } = await import("../lib/company-api")
        response = await getRequirementResponse(companyId, requirementId)
      }
      setRequirementResponses(prev => ({ ...prev, [requirementId]: response }))
    } catch (error) {
      console.error(`Error loading response for requirement ${requirementId}:`, error)
      setRequirementResponses(prev => ({ ...prev, [requirementId]: null }))
    } finally {
      setLoadingResponses(prev => ({ ...prev, [requirementId]: false }))
    }
  }

  // Open response dialog for add/update
  const openResponseDialog = (requirementId, existingResponse = null) => {
    setEditingRequirementId(requirementId)
    setEditingResponse(existingResponse)
    setResponseText(existingResponse?.responseText || "")
    setResponseDialogOpen(true)
  }

  // Close response dialog
  const closeResponseDialog = () => {
    setResponseDialogOpen(false)
    setEditingResponse(null)
    setEditingRequirementId(null)
    setResponseText("")
  }

  // Handle submit response (create or update)
  const handleSubmitResponse = async (e) => {
    e.preventDefault()
    if (!responseText.trim() || !editingRequirementId || !companyId) return

    try {
      if (isAuditor) {
        // Auditors can't create/update responses
        return
      }

      const { createRequirementResponse, updateRequirementResponse } = await import("../lib/company-api")

      if (editingResponse) {
        // Update existing response
        const updated = await updateRequirementResponse(editingResponse.id, responseText)
        setRequirementResponses(prev => ({ ...prev, [editingRequirementId]: updated }))
      } else {
        // Create new response
        const created = await createRequirementResponse(editingRequirementId, companyId, responseText)
        setRequirementResponses(prev => ({ ...prev, [editingRequirementId]: created }))
      }

      closeResponseDialog()
    } catch (error) {
      console.error("Error saving response:", error)
      alert("Failed to save response: " + error.message)
    }
  }

  // Get status for a requirement (defaults to 0 if not found) - for company owners
  const getRequirementStatus = (requirementId) => {
    const statusObj = requirementStatuses.find(s => s.requirement?.id === requirementId)
    return statusObj ? statusObj.status : 0
  }

  // Get audit status for a requirement (defaults to 0 if not found) - for auditors
  const getAuditStatus = (requirementId) => {
    const statusObj = auditStatuses.find(s => s.requirementId === requirementId)
    return statusObj ? statusObj.status : 0
  }

  // Get status label and color
  const getStatusLabel = (status) => {
    switch (status) {
      case 0:
        return { label: "No", color: "bg-red-100 text-red-700 border-red-300", iconColor: "text-red-600" }
      case 1:
        return { label: "TSE", color: "bg-orange-100 text-orange-700 border-orange-300", iconColor: "text-orange-600" }
      case 2:
        return { label: "Yes", color: "bg-green-100 text-green-700 border-green-300", iconColor: "text-green-600" }
      default:
        return { label: "No", color: "bg-red-100 text-red-700 border-red-300", iconColor: "text-red-600" }
    }
  }

  // Toggle status dropdown (for company owners)
  const toggleStatusDropdown = (requirementId) => {
    if (isAuditor || !onUpdateStatus) return
    setStatusDropdowns(prev => ({
      ...prev,
      [requirementId]: !prev[requirementId]
    }))
  }

  // Toggle audit status dropdown (for auditors and company owners)
  const toggleAuditStatusDropdown = (requirementId) => {
    if (!onUpdateAuditStatus) return
    setStatusDropdowns(prev => ({
      ...prev,
      [`audit-${requirementId}`]: !prev[`audit-${requirementId}`]
    }))
  }

  // Handle status update (for company owners)
  const handleStatusUpdate = async (requirementId, newStatus) => {
    if (!onUpdateStatus) return
    try {
      await onUpdateStatus(requirementId, newStatus)
      setStatusDropdowns(prev => ({
        ...prev,
        [requirementId]: false
      }))
    } catch (error) {
      console.error("Failed to update status:", error)
    }
  }

  // Handle audit status update (for auditors and company owners)
  const handleAuditStatusUpdate = async (requirementId, newStatus) => {
    if (!onUpdateAuditStatus) return
    try {
      await onUpdateAuditStatus(requirementId, newStatus)
      setStatusDropdowns(prev => ({
        ...prev,
        [`audit-${requirementId}`]: false
      }))
    } catch (error) {
      console.error("Failed to update audit status:", error)
    }
  }

  const loadDocuments = async (requirementId, forceReload = false) => {
    if (!forceReload && (documentsCache[requirementId] || loadingDocs[requirementId])) return

    setLoadingDocs(prev => ({ ...prev, [requirementId]: true }))
    try {
      const docs = await getRequirementDocuments(requirementId, companyId)
      setDocumentsCache(prev => ({ ...prev, [requirementId]: docs || [] }))
      setDocumentCounts(prev => ({ ...prev, [requirementId]: docs?.length || 0 }))

      // Load reviews for each document if not already included
      if (docs && docs.length > 0) {
        for (const doc of docs) {
          // Always load reviews if not in document object (they come from separate endpoint)
          if (!doc.reviews) {
            loadDocumentReviews(doc.id)
          } else {
            // If reviews are in document, also store them in documentReviews cache
            setDocumentReviews(prev => ({ ...prev, [doc.id]: doc.reviews || [] }))
          }
        }
      }
    } catch (error) {
      console.error(`Error loading documents for requirement ${requirementId}:`, error)
      setDocumentsCache(prev => ({ ...prev, [requirementId]: [] }))
      setDocumentCounts(prev => ({ ...prev, [requirementId]: 0 }))
    } finally {
      setLoadingDocs(prev => ({ ...prev, [requirementId]: false }))
    }
  }

  const loadDocumentReviews = async (docId, forceReload = false) => {
    if (!forceReload && documentReviews[docId]) return

    try {
      let reviews
      if (isAuditor) {
        const { getDocumentReviews } = await import("../lib/auditor-api")
        reviews = await getDocumentReviews(docId)
      } else {
        const { getDocumentReviews } = await import("../lib/company-api")
        reviews = await getDocumentReviews(docId)
      }
      // Ensure reviews is always an array
      const reviewsArray = Array.isArray(reviews) ? reviews : []
      setDocumentReviews(prev => ({ ...prev, [docId]: reviewsArray }))
      return reviewsArray
    } catch (error) {
      // Backend throws exception if document hasn't been reviewed yet
      // This is expected behavior, so we return empty array
      if (error.response?.status === 500 || error.message?.includes("not reviewed")) {
        setDocumentReviews(prev => ({ ...prev, [docId]: [] }))
        return []
      }
      console.error(`Error loading reviews for document ${docId}:`, error)
      setDocumentReviews(prev => ({ ...prev, [docId]: [] }))
      return []
    }
  }


  const handleDocumentClick = (doc) => {
    setSelectedDocument(doc)
    setPreviewModalOpen(true)
  }

  const hasAuditorReviewed = (doc) => {
    if (!isAuditor || !currentAuditorId) return false
    const reviews = doc.reviews || documentReviews[doc.id] || []
    return reviews.some(review => review.auditor?.id === currentAuditorId)
  }

  const isPDF = (fileName) => {
    return fileName?.toLowerCase().endsWith(".pdf") || fileName?.includes("pdf")
  }

  const handlePDFPreview = (doc) => {
    setPdfPreviewDoc(doc)
    setPdfPreviewOpen(true)
  }

  const handleSubmitReview = async (e, doc) => {
    e.preventDefault()
    e.stopPropagation()

    const formData = reviewForms[doc.id] || { rating: "ACCEPTED", comments: "" }

    if (!formData.comments.trim()) {
      alert("Please enter comments")
      return
    }

    try {
      if (onReview) {
        await onReview(doc, formData.rating, formData.comments)
        setReviewingDoc(null)
        // Clear the review form for this document
        setReviewForms(prev => {
          const next = { ...prev }
          delete next[doc.id]
          return next
        })

        // Immediately reload reviews for this document to show the new review
        await loadDocumentReviews(doc.id, true) // Force reload

        // Also refresh documents and reviews cache
        if (doc.requirement?.id) {
          // Clear reviews cache for this document (already reloaded above)
          // Clear documents cache to reload
          setDocumentsCache(prev => {
            const newCache = { ...prev }
            delete newCache[doc.requirement.id]
            return newCache
          })
          // Reload documents (which might have updated review counts)
          loadDocuments(doc.requirement.id)
        }
      }
    } catch (error) {
      console.error("Error submitting review:", error)
      alert("Failed to submit review: " + error.message)
    }
  }

  const getReviewStatusColor = (rating) => {
    const normalizedRating = rating?.toUpperCase()
    if (normalizedRating === "ACCEPTED") {
      return { bg: "bg-green-100", text: "text-green-800", icon: CheckCircle2, label: "ACCEPTED" }
    } else if (normalizedRating === "REJECTED") {
      return { bg: "bg-red-100", text: "text-red-800", icon: XCircle, label: "REJECTED" }
    } else if (normalizedRating === "TSE") {
      return { bg: "bg-orange-100", text: "text-orange-800", icon: AlertCircle, label: "TSE" }
    }
    return { bg: "bg-blue-100", text: "text-blue-800", icon: MessageSquare, label: rating }
  }

  // Section name mapping for top-level sections (1-5)
  const topLevelSectionNames = {
    "1": "Context of the organization",
    "2": "Leadership",
    "3": "Planning",
    "4": "Support",
    "5": "Operation"
  }

  // Find minimum level to determine top-level sections
  const minLevel = organizedSections.length > 0
    ? Math.min(...organizedSections.map(s => s.level))
    : 1

  // Get top-level sections (those starting with just "1", "2", "3", "4", "5")
  // These are sections where the first part of the code is a single digit
  const topLevelSections = organizedSections
    .filter(s => {
      const codeParts = s.code.split(".")
      const firstPart = codeParts[0]
      // Top-level sections are those where first part is "1", "2", "3", "4", or "5" and level is 1
      return ["1", "2", "3", "4", "5"].includes(firstPart) && s.level === 1
    })
    .sort((a, b) => {
      const aNum = parseInt(a.code.split(".")[0], 10)
      const bNum = parseInt(b.code.split(".")[0], 10)
      return aNum - bNum
    })

  // Helper function to get all requirements from a section and its children (deduplicated)
  const getAllRequirementsForSection = (sectionCode) => {
    const section = organizedSections.find(s => s.code === sectionCode)
    if (!section) return []

    // Use a Map to deduplicate by requirement ID
    const requirementsMap = new Map()

    // Add direct requirements
    section.sectionRequirements.forEach(req => {
      requirementsMap.set(req.id, req)
    })

    // Get all child sections recursively
    const getChildSections = (parentCode) => {
      return organizedSections.filter(s => s.parentCode === parentCode)
    }

    const collectAllChildren = (parentCode) => {
      const children = getChildSections(parentCode)
      children.forEach(child => {
        // Add requirements from child (deduplicate by ID)
        child.sectionRequirements.forEach(req => {
          requirementsMap.set(req.id, req)
        })
        collectAllChildren(child.code)
      })
    }

    collectAllChildren(sectionCode)
    // Return as array, deduplicated by ID
    return Array.from(requirementsMap.values())
  }

  console.log("All organized sections:", organizedSections.map(s => ({ code: s.code, name: s.name, level: s.level, parentCode: s.parentCode })))
  console.log("Top-level sections:", topLevelSections.map(s => ({ code: s.code, name: s.name, level: s.level })))

  if (!sections || !Array.isArray(sections) || sections.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No sections available</p>
        <p className="text-gray-400 text-sm mt-2">Sections will appear here once they are loaded</p>
      </div>
    )
  }

  const renderSection = (section, depth = 0, minLevel = 1) => {
    const isExpanded = expandedSections.has(section.code)
    const isActive = activeSection === section.code
    const hasChildren = organizedSections.some(s => s.parentCode === section.code)
    const children = organizedSections.filter(s => s.parentCode === section.code)

    // Check if this is a top-level section (1, 2, 3, 4, 5)
    const isTopLevelSection = section.level === 1 && ["1", "2", "3", "4", "5"].includes(section.code.split(".")[0])

    // Get section name - use mapping for top-level sections
    const sectionName = isTopLevelSection && topLevelSectionNames[section.code]
      ? topLevelSectionNames[section.code]
      : (section.isVirtual ? `Section ${section.code}` : section.name)

    // For top-level sections, only show direct requirements (not from subsections)
    // For other sections, show their direct requirements
    const displayRequirements = section.sectionRequirements

    return (
      <div key={section.id}>
        <button
          onClick={(e) => {
            e.stopPropagation()
            // Top-level sections (1-5) should toggle expand/collapse
            if (isTopLevelSection) {
              // Always toggle expand/collapse when clicking
              toggleExpand(section.code)
              // Set as active
              setActiveSection(section.code)
            } else {
              // For other sections, toggle expand if has children, and set as active
              if (hasChildren) {
                toggleExpand(section.code)
              }
              setActiveSection(section.code)
            }
          }}
          className={`w-full flex items-center justify-between p-3 rounded-lg mb-1 transition-all duration-200 ${isTopLevelSection
            ? (isActive && isExpanded)
              ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg"
              : isActive
                ? "bg-indigo-100 text-indigo-700 border-2 border-indigo-300"
                : "text-gray-700 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:shadow-md"
            : isActive
              ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg transform scale-[1.02]"
              : "text-gray-700 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:shadow-md"
            } ${depth > 0 ? "ml-4" : ""}`}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {hasChildren && (
              <div className="flex-shrink-0">
                {isExpanded ? (
                  <ChevronDown className={`w-4 h-4 ${(isTopLevelSection && isActive && isExpanded) || (!isTopLevelSection && isActive)
                    ? "text-white"
                    : "text-indigo-600"
                    }`} />
                ) : (
                  <ChevronRight className={`w-4 h-4 ${(isTopLevelSection && isActive && isExpanded) || (!isTopLevelSection && isActive)
                    ? "text-white"
                    : "text-indigo-600"
                    }`} />
                )}
              </div>
            )}
            <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${(isTopLevelSection && isActive && isExpanded) || (!isTopLevelSection && isActive)
              ? "bg-white/20 text-white"
              : isTopLevelSection && isActive
                ? "bg-indigo-600 text-white"
                : section.isVirtual
                  ? "bg-purple-100 text-purple-700 border-2 border-purple-300"
                  : "bg-indigo-100 text-indigo-700"
              }`}>
              {section.code}
            </div>
            <span className={`font-medium text-sm truncate ${(isTopLevelSection && isActive && isExpanded) || (!isTopLevelSection && isActive)
              ? "text-white"
              : isTopLevelSection && isActive
                ? "text-indigo-700"
                : section.isVirtual
                  ? "text-purple-700 italic"
                  : "text-gray-900"
              }`}>
              {sectionName}
            </span>
          </div>
          {displayRequirements.length > 0 && (
            <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${(isTopLevelSection && isActive && isExpanded) || (!isTopLevelSection && isActive)
              ? "bg-white/30 text-white"
              : isTopLevelSection && isActive
                ? "bg-indigo-200 text-indigo-800"
                : "bg-indigo-100 text-indigo-700"
              }`}>
              {displayRequirements.length}
            </span>
          )}
        </button>
        {hasChildren && isExpanded && (
          <div className="mt-1 ml-2 border-l-2 border-indigo-200 pl-2">
            {children.map(child => renderSection(child, depth + 1, minLevel))}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <DocumentPreviewModal
        document={selectedDocument}
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        onDownload={onDownload}
        getDocumentReviews={async (docId) => {
          try {
            if (isAuditor) {
              const { getDocumentReviews } = await import("../lib/auditor-api")
              return await getDocumentReviews(docId)
            } else {
              const { getDocumentReviews } = await import("../lib/company-api")
              return await getDocumentReviews(docId)
            }
          } catch (error) {
            console.error("Error loading reviews:", error)
            return []
          }
        }}
      />
      <PDFPreviewModal
        document={pdfPreviewDoc}
        isOpen={pdfPreviewOpen}
        onClose={() => {
          setPdfPreviewOpen(false)
          setPdfPreviewDoc(null)
        }}
      />

      {/* Response Dialog */}
      {responseDialogOpen && !isAuditor && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                {editingResponse ? "Update Response" : "Add Response"}
              </h3>
              <button
                onClick={closeResponseDialog}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmitResponse} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Response Text <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  required
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  placeholder="Enter your response to this requirement..."
                />
              </div>

              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={closeResponseDialog}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {editingResponse ? "Update Response" : "Add Response"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex gap-6">
        {/* Creative Vertical Sidebar for Sections */}
        <div className="w-80 flex-shrink-0">
          <div className="bg-gradient-to-br from-white via-indigo-50/30 to-purple-50/30 rounded-xl border border-indigo-100 shadow-lg p-4 sticky top-4">
            <div className="mb-4 pb-4 border-b border-indigo-200">
              <h3 className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Sections
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                {topLevelSections.length} section{topLevelSections.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="space-y-1">
              {topLevelSections.length > 0 ? (
                topLevelSections.map(section => renderSection(section, 0, minLevel))
              ) : (
                organizedSections.length > 0 && organizedSections.map(section => renderSection(section, 0, minLevel))
              )}
            </div>
          </div>
        </div>

        {/* Full Width Requirements Content */}
        <div className="flex-1">
          <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-6">
            {activeSection ? (
              <>
                <div className="mb-6 pb-6 border-b border-gray-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg">
                      <span className="font-mono text-sm text-white font-bold">
                        {activeSection}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-gray-900">
                        {(() => {
                          const section = organizedSections.find(s => s.code === activeSection)
                          const isTopLevel = section && section.level === 1 && ["1", "2", "3", "4", "5"].includes(activeSection.split(".")[0])
                          return isTopLevel && topLevelSectionNames[activeSection]
                            ? topLevelSectionNames[activeSection]
                            : (section?.name || activeSection)
                        })()}
                      </h3>
                      <p className="text-gray-600 text-sm mt-1">
                        {(() => {
                          const section = organizedSections.find(s => s.code === activeSection)
                          const isTopLevel = section && section.level === 1 && ["1", "2", "3", "4", "5"].includes(activeSection.split(".")[0])
                          const requirements = isTopLevel && expandedSections.has(activeSection)
                            ? getAllRequirementsForSection(activeSection)
                            : (section?.sectionRequirements || [])
                          return `${requirements.length} requirement${requirements.length !== 1 ? "s" : ""}`
                        })()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Requirements List */}
                <div className="space-y-4">
                  {(() => {
                    const section = organizedSections.find(s => s.code === activeSection)
                    if (!section) return []

                    const isTopLevel = section.level === 1 && ["1", "2", "3", "4", "5"].includes(activeSection.split(".")[0])
                    const isRealSection = !section.isVirtual // Check if section is real (from database)

                    // For top-level sections:
                    // - If real section: show its direct requirements + children when expanded
                    // - If virtual section: only show children requirements when expanded
                    // - If not expanded: show nothing (they need to be expanded to see requirements)
                    // For other sections: show their direct requirements
                    let requirements = []

                    if (isTopLevel) {
                      // Top-level sections (1-5) should only show their DIRECT requirements
                      // They should NOT show requirements from subsections
                      // Users need to click on subsections to see their requirements
                      if (expandedSections.has(activeSection)) {
                        // When expanded, only show direct requirements of this section
                        // Do NOT include requirements from child subsections
                        requirements = isRealSection
                          ? section.sectionRequirements || []
                          : [] // Virtual sections have no direct requirements
                      } else {
                        // Not expanded: show nothing for top-level sections
                        requirements = []
                      }
                    } else {
                      // Not a top-level section: show direct requirements
                      requirements = section?.sectionRequirements || []
                    }

                    // Deduplicate requirements by ID to avoid duplicate keys
                    const uniqueRequirements = Array.from(
                      new Map(requirements.map(req => [req.id, req])).values()
                    )

                    return uniqueRequirements.map((requirement) => {
                      const isExpanded = expandedRequirements.has(requirement.id)
                      const docs = documentsCache[requirement.id] || []
                      const isLoading = loadingDocs[requirement.id]

                      return (
                        <div
                          key={`req-${requirement.id}-${activeSection}`}
                          className="border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200"
                        >
                          {/* Requirement Header */}
                          <div className="bg-gradient-to-r from-gray-50 to-indigo-50/30 p-4 flex items-center justify-between border-b border-gray-200 relative">
                            <div className="flex items-center gap-3 flex-1">
                              <button
                                onClick={() => toggleRequirementExpand(requirement.id)}
                                className="text-gray-500 hover:text-gray-700 transition-colors"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-5 h-5" />
                                ) : (
                                  <ChevronRight className="w-5 h-5" />
                                )}
                              </button>
                              <div className="flex-1">
                                <p className="font-semibold text-gray-900">{requirement.name}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {documentCounts[requirement.id] !== undefined
                                    ? `${documentCounts[requirement.id]} document${documentCounts[requirement.id] !== 1 ? "s" : ""}`
                                    : "Loading..."}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {/* Status Dropdown - Only for company owners */}
                              {!isAuditor && onUpdateStatus && (
                                <div className="relative status-dropdown-container" style={{ zIndex: statusDropdowns[requirement.id] ? 1000 : 'auto' }}>
                                  <button
                                    onClick={() => toggleStatusDropdown(requirement.id)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-all duration-200 flex items-center gap-2 ${getStatusLabel(getRequirementStatus(requirement.id)).color
                                      } hover:shadow-md relative`}
                                    style={{ zIndex: statusDropdowns[requirement.id] ? 1001 : 'auto' }}
                                  >
                                    <span>{getStatusLabel(getRequirementStatus(requirement.id)).label}</span>
                                    {statusDropdowns[requirement.id] ? (
                                      <ChevronUp className="w-4 h-4" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4" />
                                    )}
                                  </button>
                                  {statusDropdowns[requirement.id] && (
                                    <div className="absolute right-0 top-full mt-2 w-32 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden status-dropdown-container" style={{ zIndex: 1002 }}>
                                      <button
                                        onClick={() => handleStatusUpdate(requirement.id, 0)}
                                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 ${getRequirementStatus(requirement.id) === 0 ? "bg-red-50 font-semibold" : ""
                                          }`}
                                      >
                                        <XCircle className={`w-4 h-4 ${getRequirementStatus(requirement.id) === 0 ? "text-red-600" : "text-gray-400"}`} />
                                        No
                                      </button>
                                      <button
                                        onClick={() => handleStatusUpdate(requirement.id, 1)}
                                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 ${getRequirementStatus(requirement.id) === 1 ? "bg-orange-50 font-semibold" : ""
                                          }`}
                                      >
                                        <AlertCircle className={`w-4 h-4 ${getRequirementStatus(requirement.id) === 1 ? "text-orange-600" : "text-gray-400"}`} />
                                        TSE
                                      </button>
                                      <button
                                        onClick={() => handleStatusUpdate(requirement.id, 2)}
                                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 ${getRequirementStatus(requirement.id) === 2 ? "bg-green-50 font-semibold" : ""
                                          }`}
                                      >
                                        <CheckCircle2 className={`w-4 h-4 ${getRequirementStatus(requirement.id) === 2 ? "text-green-600" : "text-gray-400"}`} />
                                        Yes
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                              {/* Audit Status - Read-only for company owners, editable for auditors */}
                              {(!isAuditor && auditStatuses.length > 0) || (isAuditor && onUpdateAuditStatus) ? (
                                <>
                                  {!isAuditor ? (
                                    // Read-only display for company owners
                                    <div className={`px-3 py-1.5 rounded-lg text-sm font-medium border-2 flex items-center gap-2 ${getStatusLabel(getAuditStatus(requirement.id)).color}`} title="Auditor Status (Read-only)">
                                      <span>Audit: {getStatusLabel(getAuditStatus(requirement.id)).label}</span>
                                    </div>
                                  ) : (
                                    // Editable dropdown for auditors (Yes/No only, no TSE)
                                    <div className="relative status-dropdown-container" style={{ zIndex: statusDropdowns[`audit-${requirement.id}`] ? 1000 : 'auto' }}>
                                      <button
                                        onClick={() => toggleAuditStatusDropdown(requirement.id)}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border-2 transition-all duration-200 flex items-center gap-2 ${getStatusLabel(getAuditStatus(requirement.id)).color
                                          } hover:shadow-md relative`}
                                        style={{ zIndex: statusDropdowns[`audit-${requirement.id}`] ? 1001 : 'auto' }}
                                        title="Auditor Status"
                                      >
                                        <span>{getStatusLabel(getAuditStatus(requirement.id)).label}</span>
                                        {statusDropdowns[`audit-${requirement.id}`] ? (
                                          <ChevronUp className="w-4 h-4" />
                                        ) : (
                                          <ChevronDown className="w-4 h-4" />
                                        )}
                                      </button>
                                      {statusDropdowns[`audit-${requirement.id}`] && (
                                        <div className="absolute right-0 top-full mt-2 w-32 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden status-dropdown-container" style={{ zIndex: 1002 }}>
                                          <button
                                            onClick={() => handleAuditStatusUpdate(requirement.id, 0)}
                                            className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 ${getAuditStatus(requirement.id) === 0 ? "bg-red-50 font-semibold" : ""
                                              }`}
                                          >
                                            <XCircle className={`w-4 h-4 ${getAuditStatus(requirement.id) === 0 ? "text-red-600" : "text-gray-400"}`} />
                                            No
                                          </button>
                                          <button
                                            onClick={() => handleAuditStatusUpdate(requirement.id, 2)}
                                            className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 ${getAuditStatus(requirement.id) === 2 ? "bg-green-50 font-semibold" : ""
                                              }`}
                                          >
                                            <CheckCircle2 className={`w-4 h-4 ${getAuditStatus(requirement.id) === 2 ? "text-green-600" : "text-gray-400"}`} />
                                            Yes
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </>
                              ) : null}
                              {!isAuditor && onUpload && (
                                <button
                                  onClick={() => {
                                    const section = organizedSections.find(s => s.code === activeSection)
                                    // Only pass section if it's not virtual (virtual sections don't exist in DB)
                                    const realSection = section && !section.isVirtual ? section : null
                                    onUpload(requirement, realSection)
                                  }}
                                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg transform hover:scale-105"
                                >
                                  <Upload className="w-4 h-4" />
                                  Upload
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Requirement Response Section */}
                          {isExpanded && (
                            <div className="px-4 pt-4 pb-2 bg-white border-b border-gray-200">
                              {loadingResponses[requirement.id] ? (
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span>Loading response...</span>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {requirementResponses[requirement.id] ? (
                                    <>
                                      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="flex-1">
                                            <p className="text-xs font-medium text-indigo-700 mb-1">Response:</p>
                                            <p className="text-sm text-gray-800 whitespace-pre-wrap">
                                              {requirementResponses[requirement.id].responseText}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                      {!isAuditor && (
                                        <button
                                          onClick={() => openResponseDialog(requirement.id, requirementResponses[requirement.id])}
                                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                        >
                                          <MessageSquare className="w-4 h-4" />
                                          Update Response
                                        </button>
                                      )}
                                    </>
                                  ) : (
                                    !isAuditor && (
                                      <button
                                        onClick={() => openResponseDialog(requirement.id)}
                                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                      >
                                        <MessageSquare className="w-4 h-4" />
                                        Add Response
                                      </button>
                                    )
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Documents List */}
                          {isExpanded && (
                            <div className="p-4 bg-white">
                              {isLoading ? (
                                <div className="flex items-center justify-center py-8">
                                  <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                                  <span className="ml-2 text-gray-600">Loading documents...</span>
                                </div>
                              ) : docs.length === 0 ? (
                                <p className="text-sm text-gray-500 italic text-center py-4">
                                  No documents uploaded yet
                                </p>
                              ) : (
                                <div className="space-y-3">
                                  {docs.map((doc) => {
                                    const reviews = doc.reviews || documentReviews[doc.id] || []
                                    const hasReview = reviews.length > 0
                                    const auditorHasReviewed = hasAuditorReviewed(doc)
                                    const latestReview = hasReview ? reviews[reviews.length - 1] : null
                                    const reviewStatus = latestReview ? getReviewStatusColor(latestReview.rating) : null
                                    const isReviewing = reviewingDoc === doc.id
                                    const isPDFFile = isPDF(doc.fileName) || doc.fileType === "application/pdf"

                                    return (
                                      <div
                                        key={doc.id}
                                        className="border border-gray-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-md transition-all duration-200 bg-white"
                                      >
                                        {/* Document Info */}
                                        <div className="flex items-start justify-between mb-3">
                                          <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <FileText className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                                            <div className="flex-1 min-w-0">
                                              <p className="font-medium text-gray-900 truncate">
                                                {doc.fileName}
                                              </p>
                                              <p className="text-xs text-gray-500 mt-1">
                                                Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                                              </p>
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-2 flex-shrink-0">
                                            {reviewStatus && (
                                              <span className={`${reviewStatus.bg} ${reviewStatus.text} px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1`}>
                                                <reviewStatus.icon className="w-3 h-3" />
                                                {reviewStatus.label}
                                              </span>
                                            )}
                                            {!isAuditor && (
                                              <>
                                                {hasReview && (
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation()
                                                      setExpandedReviewDocs(prev => {
                                                        const next = new Set(prev)
                                                        if (next.has(doc.id)) {
                                                          next.delete(doc.id)
                                                        } else {
                                                          next.add(doc.id)
                                                          // Load reviews if not already loaded
                                                          if (!documentReviews[doc.id] && !doc.reviews) {
                                                            loadDocumentReviews(doc.id)
                                                          }
                                                        }
                                                        return next
                                                      })
                                                    }}
                                                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                                  >
                                                    <MessageSquare className="w-4 h-4" />
                                                    {expandedReviewDocs.has(doc.id) ? "Hide Reviews" : "View Reviews"}
                                                  </button>
                                                )}
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    onDownload(doc.id, doc.fileName)
                                                  }}
                                                  className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                                                  title="Download"
                                                >
                                                  <Download className="w-4 h-4 text-gray-600" />
                                                </button>
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleDocumentClick(doc)
                                                  }}
                                                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                                                >
                                                  View Details
                                                </button>
                                              </>
                                            )}
                                            {isAuditor && (
                                              <>
                                                {isPDFFile && (
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation()
                                                      handlePDFPreview(doc)
                                                    }}
                                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                                  >
                                                    <FileText className="w-4 h-4" />
                                                    Open
                                                  </button>
                                                )}
                                                {auditorHasReviewed && (
                                                  <span className="px-3 py-1.5 bg-gray-200 text-gray-600 rounded-lg text-sm font-medium">
                                                    Reviewed
                                                  </span>
                                                )}
                                              </>
                                            )}
                                          </div>
                                        </div>

                                        {/* Inline Review Form - Show for auditors if document hasn't been reviewed */}
                                        {isAuditor && onReview && !auditorHasReviewed && (() => {
                                          const formData = reviewForms[doc.id] || { rating: "ACCEPTED", comments: "" }
                                          return (
                                            <div className="mt-4 pt-4 border-t border-gray-200">
                                              <form onSubmit={(e) => handleSubmitReview(e, doc)} className="space-y-4">
                                                <div>
                                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Review Status
                                                  </label>
                                                  <div className="grid grid-cols-3 gap-2">
                                                    <button
                                                      type="button"
                                                      onClick={() => setReviewForms(prev => ({
                                                        ...prev,
                                                        [doc.id]: { ...formData, rating: "ACCEPTED" }
                                                      }))}
                                                      className={`p-3 rounded-lg border-2 transition-all flex items-center gap-2 ${formData.rating === "ACCEPTED"
                                                        ? "border-green-500 bg-green-50"
                                                        : "border-gray-200 hover:border-green-300"
                                                        }`}
                                                    >
                                                      <Check className={`w-5 h-5 ${formData.rating === "ACCEPTED" ? "text-green-600" : "text-gray-400"
                                                        }`} />
                                                      <span className="font-medium text-sm">ACCEPTED</span>
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={() => setReviewForms(prev => ({
                                                        ...prev,
                                                        [doc.id]: { ...formData, rating: "TSE" }
                                                      }))}
                                                      className={`p-3 rounded-lg border-2 transition-all flex items-center gap-2 ${formData.rating === "TSE"
                                                        ? "border-orange-500 bg-orange-50"
                                                        : "border-gray-200 hover:border-orange-300"
                                                        }`}
                                                    >
                                                      <AlertCircle className={`w-5 h-5 ${formData.rating === "TSE" ? "text-orange-600" : "text-gray-400"
                                                        }`} />
                                                      <span className="font-medium text-sm">TSE</span>
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={() => setReviewForms(prev => ({
                                                        ...prev,
                                                        [doc.id]: { ...formData, rating: "REJECTED" }
                                                      }))}
                                                      className={`p-3 rounded-lg border-2 transition-all flex items-center gap-2 ${formData.rating === "REJECTED"
                                                        ? "border-red-500 bg-red-50"
                                                        : "border-gray-200 hover:border-red-300"
                                                        }`}
                                                    >
                                                      <XCircle className={`w-5 h-5 ${formData.rating === "REJECTED" ? "text-red-600" : "text-gray-400"
                                                        }`} />
                                                      <span className="font-medium text-sm">REJECTED</span>
                                                    </button>
                                                  </div>
                                                </div>
                                                <div>
                                                  <label htmlFor={`comments-${doc.id}`} className="block text-sm font-medium text-gray-700 mb-2">
                                                    Comments <span className="text-red-500">*</span>
                                                  </label>
                                                  <textarea
                                                    id={`comments-${doc.id}`}
                                                    value={formData.comments}
                                                    onChange={(e) => setReviewForms(prev => ({
                                                      ...prev,
                                                      [doc.id]: { ...formData, comments: e.target.value }
                                                    }))}
                                                    required
                                                    rows={3}
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                                                    placeholder="Enter your review comments..."
                                                  />
                                                </div>
                                                <div className="flex items-center gap-2 justify-end">
                                                  <button
                                                    type="button"
                                                    onClick={(e) => {
                                                      e.stopPropagation()
                                                      setReviewingDoc(null)
                                                      setReviewForms(prev => {
                                                        const next = { ...prev }
                                                        delete next[doc.id]
                                                        return next
                                                      })
                                                    }}
                                                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                                                  >
                                                    Cancel
                                                  </button>
                                                  <button
                                                    type="submit"
                                                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
                                                  >
                                                    <Send className="w-4 h-4" />
                                                    Submit Review
                                                  </button>
                                                </div>
                                              </form>
                                            </div>
                                          )
                                        })()}

                                        {/* Existing Review Display */}
                                        {/* For company owners: only show when expandedReviewDocs includes this doc */}
                                        {/* For auditors: do NOT show reviews */}
                                        {!isAuditor && hasReview && !isReviewing && latestReview && expandedReviewDocs.has(doc.id) && (
                                          <div className="mt-3 pt-3 border-t border-gray-200">
                                            <h4 className="text-sm font-semibold text-gray-800 mb-3">Reviews:</h4>
                                            <div className="space-y-3">
                                              {reviews.map((review, index) => {
                                                const reviewStatusColor = getReviewStatusColor(review.rating)
                                                return (
                                                  <div key={review.id || index} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                    <div className="flex items-center justify-between mb-2">
                                                      <span className="font-medium text-sm text-gray-900 flex items-center gap-2">
                                                        <div className={`p-1.5 rounded ${reviewStatusColor.bg}`}>
                                                          <reviewStatusColor.icon className={`w-3 h-3 ${reviewStatusColor.text}`} />
                                                        </div>
                                                        {review.auditor?.name || "Auditor"}
                                                      </span>
                                                      <span className="text-xs text-gray-500">
                                                        {new Date(review.reviewedAt).toLocaleDateString()}
                                                      </span>
                                                    </div>
                                                    <p className="text-sm text-gray-800 mb-2">{review.comments}</p>
                                                    <span className={`${reviewStatusColor.bg} ${reviewStatusColor.text} px-2 py-0.5 rounded text-xs font-medium inline-flex items-center gap-1`}>
                                                      <reviewStatusColor.icon className="w-3 h-3" />
                                                      {reviewStatusColor.label}
                                                    </span>
                                                  </div>
                                                )
                                              })}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })
                  })()}
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 mb-4">
                  <AlertCircle className="w-10 h-10 text-indigo-400" />
                </div>
                <p className="text-lg font-medium text-gray-700">Select a section</p>
                <p className="text-sm text-gray-500 mt-1">Choose a section from the sidebar to view requirements</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
