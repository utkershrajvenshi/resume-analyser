import { createAnthropic } from "@ai-sdk/anthropic"
import { generateText } from "ai"
import { type NextRequest, NextResponse } from "next/server"

// Allow streaming responses up to 60 seconds
export const maxDuration = 60

function cleanText(text: string): string {
  // Remove or replace problematic characters
  return text
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Remove control characters
    .replace(/[^\x20-\x7E\u00A0-\u00FF\u0100-\u017F\u0180-\u024F]/g, "") // Keep only basic Latin, Latin-1, and Latin Extended
    .replace(/\s+/g, " ") // Normalize whitespace
    .replace(/\n\s*\n/g, "\n") // Remove excessive line breaks
    .trim()
}

// async function extractTextFromPDF(file: File): Promise<string> {
//   try {
//     console.log(`Starting PDF extraction for: ${file.name}, Size: ${file.size} bytes`)

//     // Dynamic import of pdfjs-dist to handle serverless environment
//     const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.js")

//     // Convert File to Uint8Array for pdfjs-dist
//     const arrayBuffer = await file.arrayBuffer()
//     const uint8Array = new Uint8Array(arrayBuffer)

//     console.log("Loading PDF document...")

//     // Load the PDF document
//     const loadingTask = pdfjsLib.getDocument({
//       data: uint8Array,
//       useSystemFonts: true,
//     })

//     const pdf = await loadingTask.promise
//     console.log(`PDF loaded successfully. Pages: ${pdf.numPages}`)

//     let fullText = ""

//     // Extract text from each page
//     for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
//       try {
//         const page = await pdf.getPage(pageNum)
//         const textContent = await page.getTextContent()

//         // Combine text items from the page
//         const pageText = textContent.items
//           .map((item: any) => {
//             // Handle different types of text items
//             if (typeof item === "object" && item.str) {
//               return item.str
//             }
//             return ""
//           })
//           .join(" ")

//         if (pageText.trim()) {
//           fullText += `\n--- Page ${pageNum} ---\n${pageText}\n`
//         }

//         console.log(`Extracted text from page ${pageNum}: ${pageText.length} characters`)
//       } catch (pageError) {
//         console.warn(`Error extracting text from page ${pageNum}:`, pageError)
//         fullText += `\n--- Page ${pageNum} ---\n[Error extracting text from this page]\n`
//       }
//     }

//     if (!fullText || fullText.trim().length === 0) {
//       throw new Error("No text content found in PDF")
//     }

//     // Clean and format the extracted text
//     let extractedText = fullText

//     // Basic formatting improvements
//     extractedText = extractedText
//       .replace(/([a-z])([A-Z])/g, "$1 $2") // Add space between camelCase
//       .replace(/(\d)([A-Z])/g, "$1 $2") // Add space between numbers and letters
//       .replace(/([a-z])(\d)/g, "$1 $2") // Add space between letters and numbers
//       .replace(/\s*\|\s*/g, " | ") // Clean up pipe separators
//       .replace(/\s*•\s*/g, "\n• ") // Format bullet points
//       .replace(/\s*-\s*/g, "\n- ") // Format dashes
//       .replace(/([.!?])\s*([A-Z])/g, "$1\n$2") // Add line breaks after sentences
//       .replace(/--- Page \d+ ---/g, "") // Remove page markers
//       .replace(/\n{3,}/g, "\n\n") // Limit consecutive line breaks

//     const cleanedText = cleanText(extractedText)

//     console.log(`Text extraction completed. Final text length: ${cleanedText.length} characters`)

//     // Add metadata about the extraction
//     const metadata = `
// === PDF EXTRACTION METADATA ===
// Filename: ${file.name}
// File Size: ${(file.size / 1024).toFixed(2)} KB
// Pages: ${pdf.numPages}
// Text Length: ${cleanedText.length} characters
// Extraction Date: ${new Date().toISOString()}
// Extraction Method: PDF.js (pdfjs-dist)

// === RESUME CONTENT ===
// ${cleanedText}
//     `

//     return metadata.trim()
//   } catch (error) {
//     console.error("PDF extraction error:", error)

//     // Provide detailed error information
//     if (error instanceof Error) {
//       if (error.message.includes("Invalid PDF")) {
//         console.log("PDF appears to be invalid or corrupted")
//       } else if (error.message.includes("No text content")) {
//         console.log("PDF contains no extractable text content")
//       } else {
//         console.log(`PDF extraction failed: ${error.message}`)
//       }
//     }

//     // Fallback text when extraction fails
//     const fallbackText = `
// === PDF PROCESSING NOTICE ===
// Filename: ${file.name}
// File Size: ${(file.size / 1024).toFixed(2)} KB
// Status: Text extraction encountered an issue
// Error: ${error instanceof Error ? error.message : "Unknown error"}

// Note: This PDF could not be processed for text extraction. This may be due to:
// - The PDF being image-based (scanned document)
// - Password protection
// - Corrupted file format
// - Unsupported PDF version
// - Complex formatting or embedded objects

// For best results, please ensure your resume is:
// - A text-based PDF (not a scanned image)
// - Not password protected
// - Created from a word processor or PDF generator
// - Contains selectable text

// You may still proceed with the analysis, but results will be limited without the actual resume content.
// The analysis will focus on general resume improvement recommendations based on the job description.
//     `

//     // Return fallback text instead of throwing an error
//     return fallbackText.trim()
//   }
// }

export async function POST(req: NextRequest) {
  try {
    console.log("Starting resume analysis request")

    const formData = await req.formData()
    const apiKey = req.headers.get("api-key")
    const jobDescription = formData.get("jobDescription") as string
    const resumeBase64String = formData.get("resume") as string

    if (!apiKey || !jobDescription || !resumeBase64String) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log(`Processing file: ${resumeBase64String.substring(0, 50)}...`)

    // Validate API key format
    if (!apiKey.startsWith("sk-ant-")) {
      return NextResponse.json(
        {
          error: "Invalid API key format. Claude API keys should start with 'sk-ant-'",
        },
        { status: 400 },
      )
    }

    // Clean and validate inputs
    const cleanJobDescription = cleanText(jobDescription)
    if (cleanJobDescription.length < 50) {
      return NextResponse.json(
        {
          error: "Job description is too short. Please provide a more detailed job description.",
        },
        { status: 400 },
      )
    }

    // Extract and clean text from PDF
    console.log("Starting PDF text extraction")
    // const resumeText = await extractTextFromPDF(resumeFile)
    // console.log(`PDF extraction completed, text length: ${resumeText.length}`)

    // Validate extracted content (but be more lenient for fallback cases)
    // const contentLength = resumeText.replace(/=== .+ ===/g, "").trim().length
    // const isProcessingNotice = resumeText.includes("PDF PROCESSING NOTICE")
    const isProcessingNotice = false

    // if (contentLength < 50 && !isProcessingNotice) {
    //   return NextResponse.json(
    //     {
    //       error:
    //         "Insufficient content extracted from PDF. Please ensure your resume contains readable text and try again.",
    //     },
    //     { status: 400 },
    //   )
    // }

    // Create Anthropic provider with user's API key
    console.log("Creating Anthropic provider")
    const anthropicProvider = createAnthropic({
      apiKey: apiKey.trim(),
    })

    const prompt = `You are an expert resume analyst and career counselor. Analyze the following resume against the provided job description and provide a comprehensive analysis.

${
  isProcessingNotice
    ? "IMPORTANT NOTE: The resume PDF could not be fully processed for text extraction. Please provide analysis based on the job description and general resume improvement advice, focusing on best practices and common recommendations for this type of role."
    : ""
}

Job Description:
${cleanJobDescription}

Resume Content:
${resumeBase64String}

Please provide your analysis in the following structured format:

<scores>
Technical Skills: [score out of 100${isProcessingNotice ? " - provide general score based on job requirements" : ""}]
Experience Relevance: [score out of 100${isProcessingNotice ? " - provide general guidance" : ""}]
Education Match: [score out of 100${isProcessingNotice ? " - provide general recommendations" : ""}]
Keywords Alignment: [score out of 100${isProcessingNotice ? " - suggest important keywords for this role" : ""}]
</scores>

<overall_score>[overall score out of 100${
      isProcessingNotice ? " - provide general assessment based on job requirements" : ""
    }]</overall_score>

<strengths_weaknesses>
Strengths:
${
  isProcessingNotice
    ? "- [Provide general strengths that would be valuable for this role]"
    : "- [List key strengths of the resume in relation to the job]"
}
- [Continue listing strengths]

Weaknesses:
${
  isProcessingNotice
    ? "- [Provide common areas that candidates should focus on for this role]"
    : "- [List areas where the resume falls short]"
}
- [Continue listing weaknesses]
</strengths_weaknesses>

<suggestions>
${
  isProcessingNotice
    ? "- [Provide specific suggestions for creating a strong resume for this role]"
    : "- [Specific actionable suggestions for improvement]"
}
- [More suggestions]
- [Continue with detailed recommendations]
</suggestions>

<ats_considerations>
- [ATS optimization recommendations for this type of role]
- [Important keywords that should be included]
- [Formatting recommendations for ATS systems]
</ats_considerations>

Provide detailed, actionable feedback that will help the candidate improve their resume for this specific job opportunity.${
      isProcessingNotice
        ? " Focus on general best practices and role-specific recommendations since the actual resume content could not be analyzed."
        : ""
    }`

    const userPrompt = `You are a Resume screener and hiring assistant. Your task is to evaluate a candidate's resume against a specific job description. You will be provided with two inputs: the candidate's resume and the job description. Your goal is to assess the candidate's suitability for the position and provide a comprehensive evaluation.
    
    First, carefully read the resume being sent as an attachment:
    
    Once done, review the job description for which this candidate is applying:
    
    <job_description>
    ${jobDescription}
    </job_description>
    
    When evaluating experience, consider the difference between today's date(${new Date().toISOString()}) and the earliest reported date of employment. For example, if a candidate has mentioned that they have started working from January 2020, and present date is 20 June 2025, then they have 5 years of experience.
    Your evaluation should be based on an aggregate score of 100 points. Consider the following categories when assessing the candidate:
    
    1. Relevant Experience (0-25 points)
    2. Education and Qualifications (0-20 points)
    3. Skills Match (0-25 points)
    4. Achievements and Accomplishments (0-15 points)
    5. Overall Presentation and Clarity (0-15 points)
    
    For each category, provide a brief justification for the score you assign. Then, give the total score out of 100.
    
    Next, provide an analysis of the candidate's strengths and weaknesses as they relate to the job description. Be specific and reference particular aspects of the resume and job requirements.
    
    If the candidate falls short in any areas, provide actionable tips on how they could improve their resume to better fit the job description. These tips should be concrete and directly related to the job requirements.
    
    Additionally, consider ATS (Applicant Tracking System) friendly techniques and comment on how well the resume might perform in an ATS scan. Provide suggestions for improvement if necessary.
    
    Your final output should be structured as follows:
    
    <evaluation>
    
    <scores>
    Technical Skills: [score out of 100]
    Experience Relevance: [score out of 100]
    Education Match: [score out of 100]
    Achievements and Accomplishments: [score out of 100]
    Overall Presentation and Clarity: [score out of 100]
    Keywords Alignment: [score out of 100]
    </scores>

    <total_score>
    [Provide the total score out of 100]
    </total_score>
    
    <strengths_and_weaknesses>
    [Analyze the candidate's strengths and weaknesses]
    Strengths:
    - [Continue listing strengths]

    Weaknesses:
    - [Continue listing weaknesses]
    </strengths_and_weaknesses>
    
    <improvement_tips>
    [Provide actionable tips for improvement]
    </improvement_tips>
    
    <ats_considerations>
    [Comment on ATS-friendliness and provide suggestions]
    </ats_considerations>
    </evaluation>
    
    Remember, your evaluation should be objective, thorough, and constructive. Focus on providing valuable insights that would be helpful for both the hiring team and the candidate.`

    console.log("Sending request to Claude API")
    const result = await generateText({
      model: anthropicProvider("claude-3-5-sonnet-20241022"),
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: userPrompt
          },
          {
            type: 'file',
            data: resumeBase64String,
            mimeType: 'application/pdf',
          },
        ]
      }],
      maxTokens: 4000,
      temperature: 0.3,
    })

    console.log("Analysis completed successfully")
    return NextResponse.json({
      analysis: result.text,
      extractionStatus: isProcessingNotice ? "fallback" : "success",
    })
  } catch (error) {
    console.error("Analysis error:", error)

    // Always return JSON, never let the error bubble up as HTML
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase()

      if (
        errorMessage.includes("401") ||
        errorMessage.includes("authentication") ||
        errorMessage.includes("unauthorized")
      ) {
        return NextResponse.json(
          { error: "Invalid API key. Please check your Claude API key and try again." },
          { status: 401 },
        )
      }

      if (errorMessage.includes("429") || errorMessage.includes("rate limit")) {
        return NextResponse.json(
          {
            error: "Rate limit exceeded. Please try again in a few minutes.",
          },
          { status: 429 },
        )
      }

      if (errorMessage.includes("400") || errorMessage.includes("bad request")) {
        return NextResponse.json(
          {
            error: "Invalid request. Please check your inputs and try again.",
          },
          { status: 400 },
        )
      }

      if (errorMessage.includes("headers") || errorMessage.includes("iso-8859-1")) {
        return NextResponse.json(
          {
            error: "Text contains unsupported characters. Please check your job description for special characters.",
          },
          { status: 400 },
        )
      }

      if (errorMessage.includes("context_length") || errorMessage.includes("too long")) {
        return NextResponse.json(
          {
            error: "The resume or job description is too long. Please try with shorter content.",
          },
          { status: 400 },
        )
      }

      // Return the actual error message for debugging
      return NextResponse.json(
        {
          error: `Analysis failed: ${error.message}`,
        },
        { status: 500 },
      )
    }

    return NextResponse.json(
      {
        error: "Failed to analyze resume. Please try again or contact support if the issue persists.",
      },
      { status: 500 },
    )
  }
}
