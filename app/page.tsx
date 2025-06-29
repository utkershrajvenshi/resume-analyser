"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Upload, FileText, Key, Zap, AlertCircle, Info, FileCheck, AlertTriangle, CheckCircle } from "lucide-react"
import { AnalysisResult } from "./components/analysis-result"
import { registerServiceWorker } from "./service-worker-registration"

interface AnalysisResponse {
  analysis: string
  extractionStatus?: "success" | "fallback"
  error?: string
}

export default function ResumeAnalyzer() {
  // Register service worker
  registerServiceWorker();
  const [apiKey, setApiKey] = useState("")
  const [jobDescription, setJobDescription] = useState("")
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [analysis, setAnalysis] = useState<string>("")
  const [extractionStatus, setExtractionStatus] = useState<"success" | "fallback" | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [progress, setProgress] = useState(0)
  const [step, setStep] = useState<"setup" | "analysis" | "results">("setup")
  const [base64, setBase64] = useState<string>("")

  const convertToBase64 = (file: File) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setBase64(reader.result as string);
    };
    reader.onerror = (error) => {
      console.error('Error: ', error);
    };
  };
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.type !== "application/pdf") {
        setError("Please upload a valid PDF file")
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        // 10MB limit
        setError("File size must be less than 10MB")
        return
      }
      if (file.size < 1024) {
        // 1KB minimum
        setError("File seems too small to be a valid resume")
        return
      }
      setResumeFile(file)
      convertToBase64(file)
      setError("")
    }
  }

  const validateInputs = () => {
    if (!apiKey.trim()) {
      setError("Please enter your Claude API key")
      return false
    }
    if (!apiKey.startsWith("sk-ant-")) {
      setError("Invalid API key format. Claude API keys should start with 'sk-ant-'")
      return false
    }
    if (!jobDescription.trim()) {
      setError("Please enter a job description")
      return false
    }
    if (jobDescription.trim().length < 50) {
      setError("Job description is too short. Please provide more details.")
      return false
    }
    if (!resumeFile) {
      setError("Please upload your resume in PDF format")
      return false
    }
    return true
  }

  const analyzeResume = async () => {
    if (!validateInputs()) return

    setLoading(true)
    setError("")
    setProgress(0)
    setStep("analysis")

    try {
      // Simulate progress updates with more realistic timing
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev < 30) return prev + 4 // PDF extraction phase
          if (prev < 60) return prev + 3 // API call phase
          if (prev < 90) return prev + 2 // Analysis phase
          return prev + 1 // Final phase
        })
      }, 500)

      const formData = new FormData()
      formData.append("jobDescription", jobDescription.trim())
      formData.append("resume", base64)

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
        headers: {
          "api-key": apiKey.trim(),
        }
      })

      clearInterval(progressInterval)
      setProgress(100)

      // Check if response is JSON
      const contentType = response.headers.get("content-type")
      if (!contentType || !contentType.includes("application/json")) {
        const textResponse = await response.text()
        console.error("Non-JSON response:", textResponse)
        throw new Error("Server returned an invalid response. Please try again.")
      }

      const data: AnalysisResponse = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`)
      }

      if (data.error) {
        throw new Error(data.error)
      }

      setAnalysis(data.analysis)
      setExtractionStatus(data.extractionStatus || "success")
      setStep("results")
    } catch (err) {
      console.error("Analysis error:", err)
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
      setStep("setup")
    } finally {
      setLoading(false)
      setProgress(0)
    }
  }

  const resetAnalysis = () => {
    setStep("setup")
    setAnalysis("")
    setExtractionStatus(null)
    setError("")
    setProgress(0)
  }

  if (step === "results" && analysis) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Analysis Results</h1>
            <Button onClick={resetAnalysis} variant="outline">
              New Analysis
            </Button>
          </div>

          {/* Extraction Status Alert */}
          {extractionStatus === "fallback" && (
            <Alert className="mb-6 border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <strong>Limited Analysis:</strong> Text extraction from your PDF was not fully successful. The analysis
                below provides general recommendations based on the job description and best practices. For more
                accurate results, try uploading a text-based PDF.
              </AlertDescription>
            </Alert>
          )}

          {extractionStatus === "success" && (
            <Alert className="mb-6 border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Full Analysis:</strong> Text was successfully extracted from your PDF and analyzed against the
                job description.
              </AlertDescription>
            </Alert>
          )}

          <AnalysisResult analysis={analysis} />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Resume Analyzer</h1>
          <p className="text-gray-600">Analyze your resume against job descriptions using Claude AI</p>
        </div>

        {step === "analysis" && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-600" />
                Analyzing Your Resume
              </CardTitle>
              <CardDescription>
                {progress < 30 && "Extracting text from your PDF using PDF.js..."}
                {progress >= 30 && progress < 60 && "Sending data to Claude AI..."}
                {progress >= 60 && progress < 90 && "Analyzing resume content..."}
                {progress >= 90 && "Finalizing analysis..."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={progress} className="mb-2" />
              <p className="text-sm text-gray-600 text-center">{progress}% Complete</p>
            </CardContent>
          </Card>
        )}

        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Resume Analysis Setup
            </CardTitle>
            <CardDescription>Provide your Claude API key, job description, and resume to get started</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* API Key Input */}
            <div className="space-y-2">
              <Label htmlFor="apiKey" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                Claude API Key
              </Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="sk-ant-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="font-mono"
              />
              <div className="flex items-start gap-2 text-xs text-gray-500">
                <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <span>
                  Your API key is stored securely and only used for this analysis. Get your key from
                  console.anthropic.com
                </span>
              </div>
            </div>

            {/* Job Description Input */}
            <div className="space-y-2">
              <Label htmlFor="jobDescription">Job Description</Label>
              <Textarea
                id="jobDescription"
                placeholder="Paste the complete job description here (minimum 50 characters)..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={8}
                className="resize-none"
              />
              <p className="text-xs text-gray-500">
                Characters: {jobDescription.length} {jobDescription.length < 50 && "(minimum 50 required)"}
              </p>
            </div>

            {/* Resume Upload */}
            <div className="space-y-2">
              <Label htmlFor="resume" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Resume Upload (PDF only, 1KB - 10MB)
              </Label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <input id="resume" type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
                <label htmlFor="resume" className="cursor-pointer">
                  {resumeFile ? (
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <FileCheck className="h-5 w-5" />
                      <div className="text-left">
                        <div className="font-medium">{resumeFile.name}</div>
                        <div className="text-sm text-gray-500">
                          {(resumeFile.size / 1024).toFixed(1)} KB • Ready for PDF.js extraction
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-500">
                      <Upload className="h-8 w-8 mx-auto mb-2" />
                      <p className="font-medium">Click to upload your resume</p>
                      <p className="text-sm">PDF files only • Text extracted using PDF.js</p>
                    </div>
                  )}
                </label>
              </div>
              {resumeFile && (
                <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                  <FileCheck className="h-3 w-3 inline mr-1" />
                  PDF ready for processing. Text will be extracted using PDF.js (serverless-compatible).
                </div>
              )}
            </div>

            {/* PDF Processing Notice */}
            <Alert className="border-blue-200 bg-blue-50">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>PDF Processing:</strong> We use PDF.js for text extraction, which works with most text-based
                PDFs. If your PDF is image-based (scanned), the analysis will provide general recommendations based on
                the job description.
              </AlertDescription>
            </Alert>

            <Button
              onClick={analyzeResume}
              disabled={loading || !apiKey || !jobDescription || !resumeFile}
              className="w-full"
              size="lg"
            >
              {loading ? "Analyzing..." : "Analyze Resume"}
            </Button>
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Your data is processed securely and not stored on our servers</p>
          <p className="mt-1">PDF text extraction powered by PDF.js (Mozilla)</p>
        </div>
      </div>
    </div>
  )
}
