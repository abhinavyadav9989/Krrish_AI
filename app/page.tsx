"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Mic, MicOff, Menu, Volume2, Loader2, MessageCircle, Send, X, WifiOff, Plus } from "lucide-react"
import type { SpeechRecognition, SpeechSynthesis } from "web-speech-api"
import { chatStorage, type Message, type Conversation } from "@/lib/chat-storage"
import { InstallPrompt } from "@/components/install-prompt"

const FILLER_PHRASES = [
  "Hmm, let me check that for you...",
  "One second, I'm thinking...",
  "Got it, here's what I found...",
  "Let me process that...",
  "Interesting question, give me a moment...",
  "I'm working on that for you...",
  "Just a sec while I figure this out...",
]

const SUPPORTED_LANGUAGES = {
  "en-IN": { name: "English", code: "en-IN", flag: "🇮🇳" },
  "te-IN": { name: "తెలుగు", code: "te-IN", flag: "🇮🇳" },
  "hi-IN": { name: "हिंदी", code: "hi-IN", flag: "🇮🇳" },
  "kn-IN": { name: "ಕನ್ನಡ", code: "kn-IN", flag: "🇮🇳" },
  "ta-IN": { name: "தமிழ்", code: "ta-IN", flag: "🇮🇳" },
}

type LanguageCode = keyof typeof SUPPORTED_LANGUAGES

export default function VoiceAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hello! I'm Krrish, your AI voice assistant. Say 'Hey Krrish' or just 'Krrish' followed by your question to get started!",
      isUser: false,
      timestamp: new Date(),
    },
  ])
  const [isListening, setIsListening] = useState(false)
  const [isWaitingForWakeWord, setIsWaitingForWakeWord] = useState(true)
  const [isProcessingCommand, setIsProcessingCommand] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [inputText, setInputText] = useState("")
  const [showTextInput, setShowTextInput] = useState(false)

  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>("en-IN")
  const [showLanguageSelector, setShowLanguageSelector] = useState(false)

  const [liveTranscript, setLiveTranscript] = useState("")
  const [isShowingLiveTranscript, setIsShowingLiveTranscript] = useState(false)
  const [currentFillerPhrase, setCurrentFillerPhrase] = useState("")
  const [isProcessingWithFiller, setIsProcessingWithFiller] = useState(false)

  const [preferredVoice, setPreferredVoice] = useState<SpeechSynthesisVoice | null>(null)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const fillerTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pauseDetectionRef = useRef<NodeJS.Timeout | null>(null)

  const [recognitionActive, setRecognitionActive] = useState(false)
  const recognitionStateRef = useRef(false)

  const isWaitingForWakeWordRef = useRef(true)
  const isProcessingCommandRef = useRef(false)

  useEffect(() => {
    const loadedConversations = chatStorage.getConversations()
    setConversations(loadedConversations)
  }, [])

  // Cleanup effect for timeouts and refs
  useEffect(() => {
    return () => {
      // Cleanup timeouts
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current)
      }
      if (fillerTimeoutRef.current) {
        clearTimeout(fillerTimeoutRef.current)
      }
      if (pauseDetectionRef.current) {
        clearTimeout(pauseDetectionRef.current)
      }
      
      // Stop speech recognition
      if (recognitionRef.current && recognitionStateRef.current) {
        recognitionRef.current.stop()
      }
      
      // Stop speech synthesis
      if (synthRef.current) {
        synthRef.current.cancel()
      }
    }
  }, [])

  useEffect(() => {
    if (messages.length > 1) {
      const conversation: Conversation = {
        id: currentConversationId || `conv-${Date.now()}`,
        title: chatStorage.generateTitle(messages),
        messages,
        createdAt: currentConversationId
          ? conversations.find((c) => c.id === currentConversationId)?.createdAt || new Date()
          : new Date(),
        updatedAt: new Date(),
      }

      chatStorage.saveConversation(conversation)

      if (!currentConversationId) {
        setCurrentConversationId(conversation.id)
      }

      const updatedConversations = chatStorage.getConversations()
      setConversations(updatedConversations)
    }
  }, [messages, currentConversationId])

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    setIsOnline(navigator.onLine)
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      const speechSynthesis = window.speechSynthesis

      if (SpeechRecognition && speechSynthesis) {
        setSpeechSupported(true)

        const loadVoices = () => {
          const voices = speechSynthesis.getVoices()
          console.log(
            "[v0] Available voices:",
            voices.map((v) => `${v.name} (${v.lang}) - ${v.gender || "unknown"}`),
          )

          let selectedVoice = null

          // Try to find a voice for the selected language
          if (selectedLanguage === "te-IN") {
            selectedVoice = voices.find((voice) => voice.lang.includes("te") || voice.lang.includes("te-IN"))
          } else if (selectedLanguage === "hi-IN") {
            selectedVoice = voices.find((voice) => voice.lang.includes("hi") || voice.lang.includes("hi-IN"))
          } else if (selectedLanguage === "kn-IN") {
            selectedVoice = voices.find((voice) => voice.lang.includes("kn") || voice.lang.includes("kn-IN"))
          } else if (selectedLanguage === "ta-IN") {
            selectedVoice = voices.find((voice) => voice.lang.includes("ta") || voice.lang.includes("ta-IN"))
          }

          // Fallback to English Indian voices
          if (!selectedVoice) {
            selectedVoice = voices.find(
              (voice) =>
                voice.lang.includes("en-IN") &&
                (voice.name.toLowerCase().includes("female") ||
                  voice.name.toLowerCase().includes("woman") ||
                  voice.name.toLowerCase().includes("priya") ||
                  voice.name.toLowerCase().includes("aditi")),
            )
          }

          if (!selectedVoice) {
            selectedVoice = voices.find((voice) => voice.lang.includes("en-IN"))
          }

          if (!selectedVoice) {
            selectedVoice = voices.find(
              (voice) =>
                voice.lang.startsWith("en") &&
                (voice.name.toLowerCase().includes("female") ||
                  voice.name.toLowerCase().includes("woman") ||
                  voice.name.toLowerCase().includes("samantha") ||
                  voice.name.toLowerCase().includes("karen") ||
                  voice.name.toLowerCase().includes("susan")),
            )
          }

          if (!selectedVoice) {
            selectedVoice = voices.find((voice) => voice.lang.startsWith("en")) || voices[0]
          }

          if (selectedVoice) {
            setPreferredVoice(selectedVoice)
            console.log("[v0] Selected voice:", selectedVoice.name, selectedVoice.lang)
          }
        }

        loadVoices()
        speechSynthesis.onvoiceschanged = loadVoices

        const recognition = new SpeechRecognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = selectedLanguage

        recognition.onstart = () => {
          console.log("[v0] Speech recognition started")
          setIsListening(true)
          setRecognitionActive(true)
          recognitionStateRef.current = true
        }

        // Store recognition instance for cleanup
        recognitionRef.current = recognition

        recognition.onresult = (event) => {
          let interimTranscript = ""
          let finalTranscript = ""

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript
            if (event.results[i].isFinal) {
              finalTranscript += transcript
            } else {
              interimTranscript += transcript
            }
          }

          if (interimTranscript) {
            setLiveTranscript(interimTranscript)
            setIsShowingLiveTranscript(true)
          }

          if (finalTranscript) {
            const transcript = finalTranscript.toLowerCase().trim()
            console.log("[v0] Final speech recognized:", transcript)
            console.log(
              "[v0] Current state - isWaitingForWakeWord:",
              isWaitingForWakeWordRef.current,
              "isProcessingCommand:",
              isProcessingCommandRef.current,
            )

            setLiveTranscript("")
            setIsShowingLiveTranscript(false)

            if (pauseDetectionRef.current) {
              clearTimeout(pauseDetectionRef.current)
            }

            if (isWaitingForWakeWordRef.current) {
              if (detectWakeWord(transcript)) {
                console.log("[v0] Wake word detected!")
                setIsWaitingForWakeWord(false)
                setIsProcessingCommand(true)
                isWaitingForWakeWordRef.current = false
                isProcessingCommandRef.current = true

                let command = ""
                if (transcript.includes("hey krrish")) {
                  command = transcript.substring(transcript.indexOf("hey krrish") + "hey krrish".length).trim()
                } else if (transcript.includes("hey krish")) {
                  command = transcript.substring(transcript.indexOf("hey krish") + "hey krish".length).trim()
                } else if (transcript.includes("krrish")) {
                  command = transcript.substring(transcript.indexOf("krrish") + "krrish".length).trim()
                } else if (transcript.includes("krish")) {
                  command = transcript.substring(transcript.indexOf("krish") + "krish".length).trim()
                } else if (
                  selectedLanguage === "te-IN" &&
                  (transcript.includes("హే కృష్") || transcript.includes("కృష్"))
                ) {
                  command = transcript.substring(transcript.indexOf("కృష్") + "కృష్".length).trim()
                } else if (selectedLanguage === "hi-IN" && (transcript.includes("हे कृष") || transcript.includes("कृष"))) {
                  command = transcript.substring(transcript.indexOf("कृष") + "कृष".length).trim()
                } else if (
                  selectedLanguage === "kn-IN" &&
                  (transcript.includes("ಹೇ ಕೃಷ್") || transcript.includes("ಕೃಷ್"))
                ) {
                  command = transcript.substring(transcript.indexOf("ಕೃಷ್") + "ಕೃಷ್".length).trim()
                } else if (
                  selectedLanguage === "ta-IN" &&
                  (transcript.includes("ஹே கிருஷ்") || transcript.includes("கிருஷ்"))
                ) {
                  command = transcript.substring(transcript.indexOf("கிருஷ்") + "கிருஷ்".length).trim()
                }

                if (command) {
                  console.log("[v0] Command found with wake word:", command)
                  stopRecognition()
                  handleVoiceCommand(command)
                } else {
                  console.log("[v0] Wake word detected, waiting for command...")
                }
              }
            } else if (isProcessingCommandRef.current) {
              console.log("[v0] Processing command:", transcript)
              stopRecognition()
              handleVoiceCommand(transcript)
            }
          }

          if (interimTranscript && isProcessingCommandRef.current) {
            if (pauseDetectionRef.current) {
              clearTimeout(pauseDetectionRef.current)
            }
            pauseDetectionRef.current = setTimeout(() => {
              if (isProcessingCommandRef.current && interimTranscript) {
                console.log("[v0] Processing interim command after pause:", interimTranscript)
                stopRecognition()
                handleVoiceCommand(interimTranscript.toLowerCase().trim())
              }
            }, 2000)
          }
        }

        recognition.onerror = (event) => {
          console.log("[v0] Speech recognition error:", event.error)
          setRecognitionActive(false)
          recognitionStateRef.current = false

          if (event.error !== "aborted" && isWaitingForWakeWordRef.current) {
            setTimeout(() => {
              if (speechSupported && !recognitionStateRef.current) {
                startContinuousListening()
              }
            }, 1000)
          }
        }

        recognition.onend = () => {
          console.log("[v0] Speech recognition ended")
          console.log(
            "[v0] State on end - isWaitingForWakeWord:",
            isWaitingForWakeWordRef.current,
            "isProcessingCommand:",
            isProcessingCommandRef.current,
          )

          setIsListening(false)
          setRecognitionActive(false)
          recognitionStateRef.current = false

          if (isWaitingForWakeWordRef.current && speechSupported && !isSpeaking) {
            restartTimeoutRef.current = setTimeout(() => {
              if (!recognitionStateRef.current) {
                console.log("[v0] Restarting recognition for wake word listening")
                startContinuousListening()
              }
            }, 500)
          } else if (isProcessingCommandRef.current && speechSupported && !isSpeaking) {
            restartTimeoutRef.current = setTimeout(() => {
              if (!recognitionStateRef.current && isProcessingCommandRef.current) {
                console.log("[v0] Restarting recognition to continue listening for command")
                startContinuousListening()
              }
            }, 500)
          }
        }

        recognitionRef.current = recognition
        synthRef.current = speechSynthesis

        startContinuousListening()
      }
    }

    return () => {
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current)
      }
      if (fillerTimeoutRef.current) {
        clearTimeout(fillerTimeoutRef.current)
      }
      if (pauseDetectionRef.current) {
        clearTimeout(pauseDetectionRef.current)
      }
      if (recognitionRef.current && recognitionStateRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [isWaitingForWakeWord, isProcessingCommand, speechSupported, isSpeaking, selectedLanguage]) // Added selectedLanguage dependency

  useEffect(() => {
    isWaitingForWakeWordRef.current = isWaitingForWakeWord
  }, [isWaitingForWakeWord])

  useEffect(() => {
    isProcessingCommandRef.current = isProcessingCommand
  }, [isProcessingCommand])

  useEffect(() => {
    if (recognitionRef.current && speechSupported) {
      console.log(`[v0] Updating speech recognition language to: ${selectedLanguage}`)
      recognitionRef.current.lang = selectedLanguage

      // If recognition is currently active, restart it with the new language
      if (recognitionStateRef.current) {
        console.log("[v0] Restarting recognition with new language")
        stopRecognition()
        setTimeout(() => {
          if (speechSupported && !isSpeaking) {
            startContinuousListening()
          }
        }, 100)
      }
    }
  }, [selectedLanguage])

  const startContinuousListening = () => {
    if (recognitionRef.current && speechSupported && !isSpeaking && !recognitionStateRef.current) {
      try {
        recognitionRef.current.start()
      } catch (error) {
        console.log("[v0] Recognition start error:", error)
      }
    }
  }

  const stopRecognition = () => {
    if (recognitionRef.current && recognitionStateRef.current) {
      recognitionRef.current.stop()
      setRecognitionActive(false)
      recognitionStateRef.current = false
    }
  }

  const restartRecognition = () => {
    stopRecognition()
    setTimeout(() => {
      if (!isSpeaking) {
        startContinuousListening()
      }
    }, 500)
  }

  const handleVoiceCommand = async (command: string) => {
    console.log("[v0] Processing voice command:", command)
    setLiveTranscript("")
    setIsShowingLiveTranscript(false)

    stopRecognition()

    setIsProcessingCommand(false)
    setIsWaitingForWakeWord(true)
    isProcessingCommandRef.current = false
    isWaitingForWakeWordRef.current = true

    let displayCommand = command
    if (!command.toLowerCase().includes("hey") && !command.toLowerCase().includes("krrish")) {
      displayCommand = `Hey Krrish, ${command}`
    }

    const newMessage: Message = {
      id: Date.now().toString(),
      text: displayCommand,
      isUser: true,
      timestamp: new Date(),
    }

    const updatedMessages = [...messages, newMessage]
    setMessages(updatedMessages)

    setIsProcessingWithFiller(true)
    const randomFiller = FILLER_PHRASES[Math.floor(Math.random() * FILLER_PHRASES.length)]
    setCurrentFillerPhrase(randomFiller)

    speakFillerPhrase(randomFiller)

    try {
      const aiResponseText = await sendMessageToAI(displayCommand, updatedMessages)

      setIsProcessingWithFiller(false)
      setCurrentFillerPhrase("")

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponseText,
        isUser: false,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, aiResponse])
      speakText(aiResponseText)
    } catch (error) {
      console.error("[v0] Error processing voice command:", error)
      setIsProcessingWithFiller(false)
      setCurrentFillerPhrase("")

      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm sorry, I encountered an error processing your request. Please try again.",
        isUser: false,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, errorResponse])
      speakText(errorResponse.text)
    }

    setTimeout(() => {
      if (!isSpeaking && !recognitionStateRef.current) {
        console.log("[v0] Restarting recognition after command processing")
        startContinuousListening()
      }
    }, 1000)
  }

  const speakFillerPhrase = (phrase: string) => {
    if (synthRef.current && speechSupported) {
      const utterance = new SpeechSynthesisUtterance(phrase)

      if (preferredVoice) {
        utterance.voice = preferredVoice
      }
      utterance.rate = 1.0
      utterance.pitch = 1.1
      utterance.volume = 0.8

      utterance.onstart = () => {
        setIsSpeaking(true)
      }

      utterance.onend = () => {
        setIsSpeaking(false)
      }

      synthRef.current.speak(utterance)
    }
  }

  const handleSendMessage = async () => {
    if (inputText.trim()) {
      const newMessage: Message = {
        id: Date.now().toString(),
        text: inputText,
        isUser: true,
        timestamp: new Date(),
      }

      const updatedMessages = [...messages, newMessage]
      setMessages(updatedMessages)
      setInputText("")
      setShowTextInput(false)

      const aiResponseText = await sendMessageToAI(inputText, updatedMessages)

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponseText,
        isUser: false,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, aiResponse])
      speakText(aiResponseText)
    }
  }

  const speakText = (text: string) => {
    if (synthRef.current && speechSupported) {
      synthRef.current.cancel()

      const utterance = new SpeechSynthesisUtterance(text)

      if (preferredVoice) {
        utterance.voice = preferredVoice
      }
      utterance.rate = 0.95
      utterance.pitch = 1.15
      utterance.volume = 0.9

      utterance.onstart = () => {
        console.log("[v0] Started speaking")
        setIsSpeaking(true)
        if (!recognitionStateRef.current && speechSupported) {
          startContinuousListening()
        }
      }

      utterance.onend = () => {
        console.log("[v0] Finished speaking")
        setIsSpeaking(false)
        setTimeout(() => {
          if (isWaitingForWakeWordRef.current && !recognitionStateRef.current) {
            startContinuousListening()
          }
        }, 500)
      }

      utterance.onerror = (event) => {
        console.log("[v0] Speech synthesis error:", event.error)
        setIsSpeaking(false)
        setTimeout(() => {
          if (isWaitingForWakeWordRef.current && !recognitionStateRef.current) {
            startContinuousListening()
          }
        }, 500)
      }

      synthRef.current.speak(utterance)
    }
  }

  const handleStopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel()
      setIsSpeaking(false)
      setTimeout(() => {
        if (isWaitingForWakeWordRef.current && !recognitionStateRef.current) {
          startContinuousListening()
        }
      }, 500)
    }
  }

  const toggleContinuousListening = () => {
    if (isWaitingForWakeWordRef.current) {
      setIsWaitingForWakeWord(false)
      setIsProcessingCommand(false)
      stopRecognition()
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current)
      }
    } else {
      setIsWaitingForWakeWord(true)
      startContinuousListening()
    }
  }

  const startNewConversation = () => {
    setMessages([
      {
        id: "1",
        text: "Hello! I'm Krrish, your AI voice assistant. Say 'Hey Krrish' or just 'Krrish' followed by your question to get started!",
        isUser: false,
        timestamp: new Date(),
      },
    ])
    setCurrentConversationId(null)
    setSidebarOpen(false)
    setInputText("")
    setShowTextInput(false)
  }

  const loadConversation = (conversation: Conversation) => {
    setMessages(conversation.messages)
    setCurrentConversationId(conversation.id)
    setSidebarOpen(false)
    setInputText("")
    setShowTextInput(false)
  }

  const deleteConversation = (conversationId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    chatStorage.deleteConversation(conversationId)

    const updatedConversations = chatStorage.getConversations()
    setConversations(updatedConversations)

    if (currentConversationId === conversationId) {
      startNewConversation()
    }
  }

  const sendMessageToAI = async (userMessage: string, history: Message[]) => {
    try {
      setIsLoading(true)

      if (!isOnline) {
        return "I'm currently offline. Please check your internet connection and try again."
      }

      if (!userMessage || userMessage.trim().length === 0) {
        return "I didn't receive your message. Please try speaking again."
      }

      console.log("[v0] Sending message to AI:", userMessage)

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: history.slice(-10),
          language: selectedLanguage,
        }),
      })

      console.log("[v0] API response status:", response.status)

      if (!response.ok) {
        let errorMessage = `API request failed: ${response.status}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          // If error response is not JSON, use status text
          errorMessage = `API request failed: ${response.status} ${response.statusText}`
        }
        console.error("[v0] API error response:", errorMessage)
        throw new Error(errorMessage)
      }

      const data = await response.json()
      console.log("[v0] AI response received:", data.response?.substring(0, 100) + "...")

      if (data.error) {
        throw new Error(data.error)
      }

      if (!data.response || typeof data.response !== 'string') {
        throw new Error("Invalid response format from AI service")
      }

      return data.response
    } catch (error) {
      console.error("[v0] AI API error:", error)
      
      // Provide more specific error messages based on error type
      if (error instanceof TypeError && error.message.includes('fetch')) {
        return "I'm having trouble connecting to my services. Please check your internet connection and try again."
      }
      
      if (error instanceof Error) {
        if (error.message.includes('API key not configured')) {
          return "I'm not properly configured yet. Please contact the administrator to set up the required API keys."
        }
        if (error.message.includes('API request failed: 429')) {
          return "I'm receiving too many requests right now. Please wait a moment and try again."
        }
        if (error.message.includes('API request failed: 500')) {
          return "I'm experiencing technical difficulties. Please try again in a few moments."
        }
      }
      
      if (!isOnline) {
        return "I'm currently offline. Your message has been saved and I'll respond when connection is restored."
      }
      
      return "I'm sorry, I'm having trouble processing your request right now. Please try again later."
    } finally {
      setIsLoading(false)
    }
  }

  const detectWakeWord = (transcript: string) => {
    const lowerTranscript = transcript.toLowerCase()

    // English wake words
    if (
      lowerTranscript.includes("hey krrish") ||
      lowerTranscript.includes("hey krish") ||
      lowerTranscript.includes("krrish") ||
      lowerTranscript.includes("krish")
    ) {
      return true
    }

    // Telugu wake words
    if (lowerTranscript.includes("హే కృష్") || lowerTranscript.includes("కృష్")) {
      return true
    }

    // Hindi wake words
    if (lowerTranscript.includes("हे कृष") || lowerTranscript.includes("कृष")) {
      return true
    }

    // Kannada wake words
    if (lowerTranscript.includes("ಹೇ ಕೃಷ್") || lowerTranscript.includes("ಕೃಷ್")) {
      return true
    }

    // Tamil wake words
    if (lowerTranscript.includes("ஹே கிருஷ்") || lowerTranscript.includes("கிருஷ்")) {
      return true
    }

    return false
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-blue-50 to-purple-100 flex flex-col">
      <header className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm border-b border-white/20">
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="hover:bg-white/50">
          <Menu className="h-6 w-6 text-gray-700" />
        </Button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center shadow-lg">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Krrish</h1>
          {!isOnline && (
            <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-full flex items-center gap-1">
              <WifiOff className="h-3 w-3" />
              Offline
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLanguageSelector(!showLanguageSelector)}
              className="hover:bg-white/50 text-sm"
            >
              {SUPPORTED_LANGUAGES[selectedLanguage].flag} {SUPPORTED_LANGUAGES[selectedLanguage].name}
            </Button>

            {showLanguageSelector && (
              <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50 min-w-[150px]">
                {Object.entries(SUPPORTED_LANGUAGES).map(([code, lang]) => (
                  <button
                    key={code}
                    onClick={() => {
                      setSelectedLanguage(code as LanguageCode)
                      setShowLanguageSelector(false)
                    }}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 ${
                      selectedLanguage === code ? "bg-blue-50 text-blue-600" : "text-gray-700"
                    }`}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button variant="ghost" size="icon" onClick={startNewConversation} className="hover:bg-white/50">
            <Plus className="h-6 w-6 text-gray-700" />
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-8">
        {messages.length === 1 ? (
          <div className="text-center space-y-8 max-w-md">
            <div className="relative">
              <div className="w-32 h-32 mx-auto bg-gradient-to-br from-gray-200 to-gray-300 rounded-3xl flex items-center justify-center shadow-lg">
                <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-white rounded-2xl flex items-center justify-center">
                  <div className="space-y-2">
                    <div className="flex gap-2 justify-center">
                      <div
                        className={`w-3 h-3 rounded-full ${isWaitingForWakeWord ? "bg-cyan-400 animate-pulse" : "bg-gray-400"}`}
                      ></div>
                      <div
                        className={`w-3 h-3 rounded-full ${isWaitingForWakeWord ? "bg-cyan-400 animate-pulse" : "bg-gray-400"}`}
                      ></div>
                    </div>
                    <div className="w-6 h-2 bg-gray-300 rounded-full mx-auto"></div>
                  </div>
                </div>
              </div>
              {isWaitingForWakeWord && (
                <div className="absolute -inset-4 bg-gradient-to-r from-cyan-400/20 to-blue-500/20 rounded-full animate-ping"></div>
              )}
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-800">How can I help you?</h2>

              {isShowingLiveTranscript && (
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
                  <p className="text-gray-600 italic">"{liveTranscript}"</p>
                </div>
              )}

              {isProcessingWithFiller && (
                <div className="bg-purple-100 rounded-2xl p-4 border border-purple-200">
                  <p className="text-purple-700">{currentFillerPhrase}</p>
                </div>
              )}

              {showTextInput ? (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                      placeholder="Type your message..."
                      className="flex-1 px-4 py-3 rounded-2xl border border-white/30 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      autoFocus
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!inputText.trim()}
                      className="px-6 py-3 bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-2xl"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex justify-center">
                    <Button
                      onClick={() => setShowTextInput(false)}
                      variant="ghost"
                      className="text-gray-600 hover:bg-white/50"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-4 justify-center">
                  <Button
                    onClick={toggleContinuousListening}
                    size="lg"
                    disabled={!speechSupported}
                    className={`w-20 h-20 rounded-full ${
                      isWaitingForWakeWord
                        ? "bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg"
                        : "bg-gray-300 hover:bg-gray-400"
                    } transition-all duration-300 ${isWaitingForWakeWord ? "animate-pulse" : ""}`}
                  >
                    {isWaitingForWakeWord ? (
                      <Mic className="h-8 w-8 text-white" />
                    ) : (
                      <MicOff className="h-8 w-8 text-gray-600" />
                    )}
                  </Button>

                  <Button
                    onClick={() => setShowTextInput(true)}
                    size="lg"
                    className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-lg transition-all duration-300"
                  >
                    <MessageCircle className="h-8 w-8 text-white" />
                  </Button>
                </div>
              )}

              <p className="text-gray-600">
                {showTextInput
                  ? "Type your message above"
                  : isWaitingForWakeWord
                    ? "Tap to Speak!"
                    : "Voice assistant paused"}
              </p>

              <p className="text-sm text-gray-500">
                {showTextInput
                  ? "Or use the microphone for voice input"
                  : isWaitingForWakeWord
                    ? 'Say "Hey Krrish" or just "Krrish" followed by your question'
                    : "Tap the microphone to start listening"}
              </p>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-2xl space-y-4">
            {messages.slice(1).map((message) => (
              <div key={message.id} className={`flex ${message.isUser ? "justify-end" : "justify-start"}`}>
                <Card
                  className={`max-w-xs sm:max-w-md p-4 ${
                    message.isUser
                      ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white"
                      : "bg-white/80 backdrop-blur-sm text-gray-800 border border-white/30"
                  } rounded-2xl shadow-lg`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm">{message.text}</p>
                      <span className="text-xs opacity-70 mt-2 block">{message.timestamp.toLocaleTimeString()}</span>
                    </div>
                    {!message.isUser && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => speakText(message.text)}
                        className="h-6 w-6 p-1 hover:bg-gray-100"
                      >
                        <Volume2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </Card>
              </div>
            ))}

            {isShowingLiveTranscript && (
              <div className="flex justify-end">
                <Card className="max-w-xs sm:max-w-md p-4 bg-gradient-to-br from-purple-400 to-pink-400 text-white rounded-2xl shadow-lg opacity-70">
                  <p className="text-sm italic">"{liveTranscript}"</p>
                </Card>
              </div>
            )}

            {isProcessingWithFiller && (
              <div className="flex justify-start">
                <Card className="max-w-xs sm:max-w-md p-4 bg-white/80 backdrop-blur-sm text-gray-800 border border-white/30 rounded-2xl shadow-lg">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <p className="text-sm">{currentFillerPhrase}</p>
                  </div>
                </Card>
              </div>
            )}

            {isLoading && !isProcessingWithFiller && (
              <div className="flex justify-start">
                <Card className="max-w-xs sm:max-w-md p-4 bg-white/80 backdrop-blur-sm text-gray-800 border border-white/30 rounded-2xl shadow-lg">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <p className="text-sm">Krrish is thinking...</p>
                  </div>
                </Card>
              </div>
            )}

            <div className="flex justify-center pt-4 space-y-4">
              {showTextInput ? (
                <div className="w-full space-y-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                      placeholder="Type your message..."
                      className="flex-1 px-4 py-3 rounded-2xl border border-white/30 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      autoFocus
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!inputText.trim()}
                      className="px-6 py-3 bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-2xl"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex justify-center">
                    <Button
                      onClick={() => setShowTextInput(false)}
                      variant="ghost"
                      className="text-gray-600 hover:bg-white/50"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-4">
                  <Button
                    onClick={toggleContinuousListening}
                    size="lg"
                    disabled={!speechSupported}
                    className={`w-16 h-16 rounded-full ${
                      isWaitingForWakeWord
                        ? "bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg"
                        : "bg-gray-300 hover:bg-gray-400"
                    } transition-all duration-300 ${isWaitingForWakeWord ? "animate-pulse" : ""}`}
                  >
                    {isWaitingForWakeWord ? (
                      <Mic className="h-6 w-6 text-white" />
                    ) : (
                      <MicOff className="h-6 w-6 text-gray-600" />
                    )}
                  </Button>

                  <Button
                    onClick={() => setShowTextInput(true)}
                    size="lg"
                    className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-lg transition-all duration-300"
                  >
                    <MessageCircle className="h-6 w-6 text-white" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="p-4 bg-white/50 backdrop-blur-sm border-t border-white/20">
        <div className="text-center">
          <p className="text-sm text-gray-600">
            {!isOnline
              ? "Offline mode - AI responses unavailable"
              : isWaitingForWakeWordRef.current
                ? `Listening in ${SUPPORTED_LANGUAGES[selectedLanguage].name} - Say "Hey Krrish" or "Krrish"`
                : "Voice assistant is paused"}
          </p>
        </div>
      </footer>

      <InstallPrompt />
    </div>
  )
}
