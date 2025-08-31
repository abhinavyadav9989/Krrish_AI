export interface Message {
  id: string
  text: string
  isUser: boolean
  timestamp: Date
}

export interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}

const STORAGE_KEY = "krrish-chat-history"

export const chatStorage = {
  // Get all conversations
  getConversations(): Conversation[] {
    if (typeof window === "undefined") return []

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return []

      const conversations = JSON.parse(stored)
      return conversations.map((conv: any) => ({
        ...conv,
        createdAt: new Date(conv.createdAt),
        updatedAt: new Date(conv.updatedAt),
        messages: conv.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        })),
      }))
    } catch (error) {
      console.error("Error loading conversations:", error)
      return []
    }
  },

  // Save conversation
  saveConversation(conversation: Conversation): void {
    if (typeof window === "undefined") return

    try {
      const conversations = this.getConversations()
      const existingIndex = conversations.findIndex((c) => c.id === conversation.id)

      if (existingIndex >= 0) {
        conversations[existingIndex] = conversation
      } else {
        conversations.unshift(conversation) // Add to beginning
      }

      // Keep only last 50 conversations
      const trimmed = conversations.slice(0, 50)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
    } catch (error) {
      console.error("Error saving conversation:", error)
    }
  },

  // Delete conversation
  deleteConversation(conversationId: string): void {
    if (typeof window === "undefined") return

    try {
      const conversations = this.getConversations()
      const filtered = conversations.filter((c) => c.id !== conversationId)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
    } catch (error) {
      console.error("Error deleting conversation:", error)
    }
  },

  // Generate conversation title from first user message
  generateTitle(messages: Message[]): string {
    const firstUserMessage = messages.find((m) => m.isUser)
    if (!firstUserMessage) return "New Conversation"

    const text = firstUserMessage.text.trim()
    if (text.length <= 30) return text
    return text.substring(0, 30) + "..."
  },
}
