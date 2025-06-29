"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Target, Lightbulb, Search, Star, CheckCircle, XCircle } from "lucide-react"

interface AnalysisResultProps {
  analysis: string
}

interface ParsedAnalysis {
  categoryScores: { [key: string]: number }
  totalScore: number
  strengths: string[]
  weaknesses: string[]
  improvementTips: string[]
  atsConsiderations: string
}

export function AnalysisResult({ analysis }: AnalysisResultProps) {
  const parseAnalysis = (text: string): ParsedAnalysis => {
    const result: ParsedAnalysis = {
      categoryScores: {},
      totalScore: 0,
      strengths: [],
      weaknesses: [],
      improvementTips: [],
      atsConsiderations: '',
    }

    // Parse category scores
    const scoresMatch = text.match(/<scores>(.*?)<\/scores>/s)
    if (scoresMatch) {
      const scoresText = scoresMatch[1]
      const scoreLines = scoresText.split("\n").filter((line) => line.trim())
      scoreLines.forEach((line) => {
        const match = line.match(/(.+?):\s*(\d+)\/(\d+)/)
        if (match) {
          result.categoryScores[match[1].trim()] = Math.round((Number.parseInt(match[2]))/(Number.parseInt(match[3]))*100)
        }
      })
    }

    // Parse total score
    const totalMatch = text.match(/<total_score>(.*?)<\/total_score>/s)?.[1].split("\n").filter(line => line.trim())[0].match(/(\d+)/s)
    if (totalMatch) {
      result.totalScore = Number.parseInt(totalMatch[1])
    }

    // Parse strengths and weaknesses
    const swMatch = text.match(/<strengths_and_weaknesses>(.*?)<\/strengths_and_weaknesses>/s)
    if (swMatch) {
      const swText = swMatch[1]
      const strengthsMatch = swText.match(/Strengths:(.*?)(?=Weaknesses:|$)/s)
      const weaknessesMatch = swText.match(/Weaknesses:(.*?)$/s)

      if (strengthsMatch) {
        result.strengths = strengthsMatch[1]
          .split("\n")
          .filter((line) => line.trim().startsWith("-"))
          .map((line) => line.replace(/^-\s*/, "").trim())
      }

      if (weaknessesMatch) {
        result.weaknesses = weaknessesMatch[1]
          .split("\n")
          .filter((line) => line.trim().startsWith("-"))
          .map((line) => line.replace(/^-\s*/, "").trim())
      }
    }

    // Parse improvement tips
    const suggestionsMatch = text.match(/<improvement_tips>([\s\S]*?)<\/improvement_tips>/)
    if (suggestionsMatch) {
      result.improvementTips = suggestionsMatch[1]
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => line.replace(/^(\d+).\s*/, "").trim())
    }

    // Parse ATS considerations
    const atsMatch = text.match(/<ats_considerations>([\s\S]*?)<\/ats_considerations>/)
    if (atsMatch) {
      result.atsConsiderations = atsMatch[1]
    }

    return result
  }

  const parsed = parseAnalysis(analysis)

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 80) return "default"
    if (score >= 60) return "secondary"
    return "destructive"
  }

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Overall Match Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold text-blue-600">{parsed.totalScore}%</div>
            <div className="flex-1">
              <Progress value={parsed.totalScore} className="h-3" />
            </div>
            <Badge variant={getScoreBadgeVariant(parsed.totalScore)} className="text-sm">
              {parsed.totalScore >= 80 ? "Excellent" : parsed.totalScore >= 60 ? "Good" : "Needs Improvement"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Category Scores */}
      {Object.keys(parsed.categoryScores).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Category Scores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {Object.entries(parsed.categoryScores).map(([category, score]) => (
                <div key={category} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{category}</span>
                    <span className={`font-bold ${getScoreColor(score)}`}>{score}%</span>
                  </div>
                  <Progress value={score} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Strengths and Weaknesses */}
      <div className="grid gap-6 md:grid-cols-2">
        {parsed.strengths.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                Strengths
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {parsed.strengths.map((strength, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{strength}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {parsed.weaknesses.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <XCircle className="h-5 w-5" />
                Areas for Improvement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {parsed.weaknesses.map((weakness, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{weakness}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Suggestions */}
      {parsed.improvementTips.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Improvement Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {parsed.improvementTips.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2">
                  <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{suggestion}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* ATS Considerations */}
      {parsed.atsConsiderations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-purple-600" />
              ATS Optimization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap text-sm">{parsed.atsConsiderations}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Raw Analysis Fallback */}
      {Object.keys(parsed.categoryScores).length === 0 && parsed.totalScore === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-sm">{analysis}</pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
