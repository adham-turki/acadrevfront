import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import Login from "./pages/Login"
import CompanyDashboard from "./pages/CompanyDashboard"
import AuditorDashboard from "./pages/AuditorDashboard"

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/company-dashboard" element={<CompanyDashboard />} />
        <Route path="/auditor-dashboard" element={<AuditorDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
