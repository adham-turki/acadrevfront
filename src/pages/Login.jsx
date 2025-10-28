"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { LogIn, UserPlus, Building2, FileCheck, Eye, EyeOff } from "lucide-react"
import { login, signup } from "../lib/auth"

export default function Login() {
    const navigate = useNavigate()

    useEffect(() => {
        // Check if user is already logged in
        const token = localStorage.getItem("token")
        const userRole = localStorage.getItem("userRole")

        if (token && userRole) {
            // Redirect to appropriate dashboard based on role
            if (userRole === "COMPANY_OWNER") {
                navigate("/company-dashboard")
            } else if (userRole === "AUDITOR") {
                navigate("/auditor-dashboard")
            }
        }
    }, [navigate])
    const [isLogin, setIsLogin] = useState(true)
    const [userType, setUserType] = useState("COMPANY_OWNER")
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const [formData, setFormData] = useState({
        email: "",
        password: "",
        name: "",
        companyName: "",
    })

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError("")
        setLoading(true)

        try {
            const payload = isLogin
                ? { email: formData.email, password: formData.password }
                : {
                    email: formData.email,
                    password: formData.password,
                    name: formData.name,
                    role: userType,
                }

            const data = isLogin ? await login(payload) : await signup(payload)

            if (data.user.role === "COMPANY_OWNER") {
                navigate("/company-dashboard")
            } else if (data.user.role === "AUDITOR") {
                navigate("/auditor-dashboard")
            }
        } catch (err) {
            if (err.response?.data?.error) {
                // Check for duplicate username error
                if (err.response.data.error.includes("duplicate key")) {
                    setError("This email is already registered. Please use a different email or try logging in.")
                } else {
                    setError(err.response.data.error)
                }
            } else {
                setError(err.message || "Authentication failed")
            }
        } finally {
            setLoading(false)
        }
    }

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4 overflow-hidden relative">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
                <div className="absolute top-40 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
            </div>
            <div className="relative z-10 w-full max-w-6xl">
                <div className="w-full max-w-6xl grid md:grid-cols-2 gap-8 items-center">
                    {/* Left Side - Branding */}
                    <div className="hidden md:block animate-fade-in">
                        <div className="space-y-6">
                            <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg">
                                <FileCheck className="w-8 h-8 text-indigo-600" />
                                <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                    AcadRev
                                </span>
                            </div>

                            <h1 className="text-5xl font-bold text-gray-900 leading-tight">
                                Document Management
                                <br />
                                <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                    & Audit System
                                </span>
                            </h1>

                            <p className="text-xl text-gray-600 leading-relaxed">
                                Streamline your document review process with our professional audit platform.
                            </p>

                            <div className="grid grid-cols-2 gap-4 pt-8">
                                <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl shadow-lg transform hover:scale-105 transition-transform duration-300">
                                    <Building2 className="w-10 h-10 text-indigo-600 mb-3" />
                                    <h3 className="font-semibold text-gray-900 mb-1">For Companies</h3>
                                    <p className="text-sm text-gray-600">Upload and manage your documents securely</p>
                                </div>

                                <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl shadow-lg transform hover:scale-105 transition-transform duration-300">
                                    <FileCheck className="w-10 h-10 text-purple-600 mb-3" />
                                    <h3 className="font-semibold text-gray-900 mb-1">For Auditors</h3>
                                    <p className="text-sm text-gray-600">Review and audit documents efficiently</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Side - Form */}
                    <div className="animate-scale-in">
                        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-10">
                            {/* Mobile Logo */}
                            <div className="md:hidden flex items-center justify-center gap-3 mb-6">
                                <FileCheck className="w-8 h-8 text-indigo-600" />
                                <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                    AcadRev
                                </span>
                            </div>

                            {/* Toggle Login/Register */}
                            <div className="flex gap-2 bg-gray-100 p-1 rounded-xl mb-8">
                                <button
                                    onClick={() => setIsLogin(true)}
                                    className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-300 ${isLogin ? "bg-white text-indigo-600 shadow-md" : "text-gray-600 hover:text-gray-900"
                                        }`}
                                >
                                    <LogIn className="w-4 h-4 inline mr-2" />
                                    Login
                                </button>
                                <button
                                    onClick={() => setIsLogin(false)}
                                    className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all duration-300 ${!isLogin ? "bg-white text-indigo-600 shadow-md" : "text-gray-600 hover:text-gray-900"
                                        }`}
                                >
                                    <UserPlus className="w-4 h-4 inline mr-2" />
                                    Register
                                </button>
                            </div>

                            {/* User Type Selection */}
                            {!isLogin && (
                                <div className="mb-6 animate-fade-in">
                                    <label className="block text-sm font-medium text-gray-700 mb-3">I am a</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setUserType("COMPANY_OWNER")}
                                            className={`p-4 rounded-xl border-2 transition-all duration-300 ${userType === "COMPANY_OWNER"
                                                ? "border-indigo-600 bg-indigo-50 shadow-md"
                                                : "border-gray-200 hover:border-indigo-300"
                                                }`}
                                        >
                                            <Building2
                                                className={`w-6 h-6 mx-auto mb-2 ${userType === "COMPANY_OWNER" ? "text-indigo-600" : "text-gray-400"
                                                    }`}
                                            />
                                            <span
                                                className={`text-sm font-medium ${userType === "COMPANY_OWNER" ? "text-indigo-600" : "text-gray-600"
                                                    }`}
                                            >
                                                Company
                                            </span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setUserType("AUDITOR")}
                                            className={`p-4 rounded-xl border-2 transition-all duration-300 ${userType === "AUDITOR"
                                                ? "border-purple-600 bg-purple-50 shadow-md"
                                                : "border-gray-200 hover:border-purple-300"
                                                }`}
                                        >
                                            <FileCheck
                                                className={`w-6 h-6 mx-auto mb-2 ${userType === "AUDITOR" ? "text-purple-600" : "text-gray-400"}`}
                                            />
                                            <span
                                                className={`text-sm font-medium ${userType === "AUDITOR" ? "text-purple-600" : "text-gray-600"}`}
                                            >
                                                Auditor
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="space-y-5">
                                {!isLogin && (
                                    <div className="animate-fade-in">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                                        <input
                                            type="text"
                                            name="name"
                                            value={formData.name}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                                            placeholder="John Doe"
                                        />
                                    </div>
                                )}

                                {!isLogin && userType === "COMPANY_OWNER" && (
                                    <div className="animate-fade-in">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                                        <input
                                            type="text"
                                            name="companyName"
                                            value={formData.companyName}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                                            placeholder="Acme Corporation"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                                        placeholder="you@example.com"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            name="password"
                                            value={formData.password}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300"
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>

                                {error && (
                                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl animate-fade-in">
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                    fill="none"
                                                />
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                />
                                            </svg>
                                            Processing...
                                        </span>
                                    ) : (
                                        <span>{isLogin ? "Sign In" : "Create Account"}</span>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
