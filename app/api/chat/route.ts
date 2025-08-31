import { GoogleGenerativeAI } from "@google/generative-ai"
import { type NextRequest, NextResponse } from "next/server"

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "")

function needsWebSearch(message: string): boolean {
  const webSearchKeywords = [
    "current",
    "latest",
    "recent",
    "today",
    "now",
    "happening",
    "news",
    "update",
    "what is",
    "tell me about",
    "information about",
    "search",
    "find",
    "weather",
    "price",
    "stock",
    "event",
    "incident",
    "revolution",
    "protest",
    "government",
    "politics",
    "breaking",
    "report",
    "issue",
    "problem",
  ]

  const lowerMessage = message.toLowerCase()
  return webSearchKeywords.some((keyword) => lowerMessage.includes(keyword))
}

function containsURL(message: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/gi
  const matches = message.match(urlRegex) || []

  // Clean up URLs - add https:// if missing
  return matches.map((url) => {
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return "https://" + url
    }
    return url
  })
}

async function fetchWebpageContent(urls: string[]): Promise<string> {
  try {
    console.log("[v0] Fetching content from URLs:", urls)

    const fetchPromises = urls.map(async (url) => {
      try {
        const response = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          },
          timeout: 10000, // 10 second timeout
        })

        if (!response.ok) {
          return `Unable to fetch content from ${url} (Status: ${response.status})`
        }

        const html = await response.text()

        // Basic HTML parsing to extract text content
        const textContent = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "") // Remove scripts
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "") // Remove styles
          .replace(/<[^>]*>/g, " ") // Remove HTML tags
          .replace(/\s+/g, " ") // Normalize whitespace
          .trim()

        // Limit content length to avoid token limits
        const limitedContent = textContent.substring(0, 2000)

        return `Content from ${url}:\n${limitedContent}${textContent.length > 2000 ? "..." : ""}`
      } catch (error) {
        console.error(`[v0] Error fetching ${url}:`, error)
        return `Unable to fetch content from ${url} due to network error`
      }
    })

    const results = await Promise.all(fetchPromises)
    return results.join("\n\n")
  } catch (error) {
    console.error("[v0] Error in fetchWebpageContent:", error)
    return "I encountered an error while trying to fetch the webpage content."
  }
}

async function performWebSearch(query: string): Promise<string> {
  try {
    const response = await fetch("https://api.search.brave.com/res/v1/web/search", {
      method: "GET",
      headers: {
        "X-Subscription-Token": process.env.BRAVE_SEARCH_API_KEY || "",
        Accept: "application/json",
      },
      // Note: Using a fallback search since we don't have Brave API key
    })

    // Fallback: Return indication that web search was attempted
    return `I attempted to search for current information about "${query}" but don't have access to real-time web search at the moment. For the most current information, I recommend checking reputable news sources like The Hindu, Times of India, or local Hyderabad news outlets.`
  } catch (error) {
    return `I don't have access to real-time web search at the moment. For current information about "${query}", please check reliable news sources.`
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, conversationHistory, language } = body

    // Validate required fields
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: "Message is required and must be a string" }, { status: 400 })
    }

    if (!conversationHistory || !Array.isArray(conversationHistory)) {
      return NextResponse.json({ error: "Conversation history is required and must be an array" }, { status: 400 })
    }

    console.log("[v0] API route called with message:", message)
    console.log("[v0] Language:", language)

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      console.error("[v0] Missing Google Generative AI API key")
      return NextResponse.json({ 
        error: "Google Generative AI API key not configured. Please add GOOGLE_GENERATIVE_AI_API_KEY to your environment variables." 
      }, { status: 500 })
    }

    // Get the generative model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const currentDate = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    const currentTime = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })

    const isFirstMessage = !conversationHistory || conversationHistory.length === 0

    let webSearchResults = ""
    let webpageContent = ""

    const urls = containsURL(message)
    if (urls.length > 0) {
      console.log("[v0] Found URLs in message, fetching content:", urls)
      webpageContent = await fetchWebpageContent(urls)
    } else if (needsWebSearch(message)) {
      console.log("[v0] Performing web search for:", message)
      webSearchResults = await performWebSearch(message)
    }

    const getLanguageInstructions = (lang: string) => {
      switch (lang) {
        case "te-IN":
          return `LANGUAGE INSTRUCTIONS:
- When user asks for Telugu response, respond ONLY in Telugu (తెలుగు) without any English translations or parentheses
- Use pure Telugu script and vocabulary
- Do NOT mix English words or provide English translations unless specifically asked
- Be completely fluent in Telugu without code-switching`
        case "hi-IN":
          return `LANGUAGE INSTRUCTIONS:
- When user asks for Hindi response, respond ONLY in Hindi (हिंदी) without any English translations or parentheses
- Use pure Hindi script and vocabulary
- Do NOT mix English words or provide English translations unless specifically asked
- Be completely fluent in Hindi without code-switching`
        case "kn-IN":
          return `LANGUAGE INSTRUCTIONS:
- When user asks for Kannada response, respond ONLY in Kannada (ಕನ್ನಡ) without any English translations or parentheses
- Use pure Kannada script and vocabulary
- Do NOT mix English words or provide English translations unless specifically asked
- Be completely fluent in Kannada without code-switching`
        case "ta-IN":
          return `LANGUAGE INSTRUCTIONS:
- When user asks for Tamil response, respond ONLY in Tamil (தமிழ்) without any English translations or parentheses
- Use pure Tamil script and vocabulary
- Do NOT mix English words or provide English translations unless specifically asked
- Be completely fluent in Tamil without code-switching`
        default:
          return `LANGUAGE INSTRUCTIONS:
- Respond in English as the primary language
- You can use occasional Hindi/Telugu/Tamil/Kannada phrases naturally when appropriate`
      }
    }

    const prompt = `You are Krrish, Abhi's personal AI voice assistant with a warm, friendly personality. You are speaking to users in January 2025.

ABOUT YOUR CREATOR & CONTEXT:
- You are Abhi's personal assistant named Krrish
- Abhi is a 24-year-old AI developer living in Hyderabad, the heart of Telangana, India
- Abhi developed and created you (Krrish)
- Today's date: ${currentDate}
- Current time: ${currentTime}
- You should always provide current, accurate information based on this date

${getLanguageInstructions(language || "en-IN")}

PERSONALITY & BEHAVIOR:
- Speak like a friendly, knowledgeable Indian female assistant aged 24-28
- Be conversational, warm, and helpful with a natural human-like tone
- Keep responses concise but informative since they will be spoken aloud
- Use natural speech patterns and occasional Indian English expressions when appropriate
- Always provide accurate, up-to-date information
- When asked about yourself, mention that you're Abhi's personal assistant and that he created you
- Show pride in being developed by Abhi, a talented AI developer from Hyderabad
- Adapt your language based on the user's preferred language setting

${
  isFirstMessage
    ? `GREETING INSTRUCTIONS:
- Since this is the first interaction, start with a warm greeting appropriate to the language
- For Telugu: "నమస్కారం!" (Namaskaram)
- For Hindi: "नमस्ते!" (Namaste)  
- For Kannada: "ನಮಸ್ಕಾರ!" (Namaskara)
- For Tamil: "வணக்கம்!" (Vanakkam)
- For English: "Namaste!" or "Hello!"
- After greeting, proceed with your response`
    : `GREETING INSTRUCTIONS:
- Do NOT repeat greetings since you've already greeted in this conversation
- Jump directly to answering the user's question in their preferred language`
}

${
  webpageContent
    ? `WEBPAGE CONTENT:
${webpageContent}

The user has asked you to analyze or provide information about the above webpage(s). Use this content to provide helpful insights, summaries, or answer their questions about the website.`
    : webSearchResults
      ? `CURRENT INFORMATION FROM WEB SEARCH:
${webSearchResults}

Use this information to provide accurate, current responses. If the web search indicates no current information is available, mention that and suggest reliable sources.`
      : ""
}

Previous conversation:
${conversationHistory.map((msg: any) => `${msg.isUser ? "User" : "Krrish"}: ${msg.text}`).join("\n")}

User: ${message}
Krrish:`

    console.log("[v0] Sending request to Gemini API")

    // Generate response
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    console.log("[v0] Received response from Gemini API:", text.substring(0, 100) + "...")

    return NextResponse.json({ response: text })
  } catch (error) {
    console.error("[v0] Gemini API error:", error)
    return NextResponse.json({ error: "Failed to generate response" }, { status: 500 })
  }
}
