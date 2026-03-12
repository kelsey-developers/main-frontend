'use client';

import React, { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import UnitPreviewCard from '@/components/chat/UnitPreviewCard';
import { parseUnitIdsFromMessage, stripUnitTags } from '@/lib/chat/parseUnits';

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  suggestedUnits?: Array<{ id: string; title?: string; price?: number; city?: string; main_image_url?: string | null; bedrooms?: number; bathrooms?: number; property_type?: string }>;
};

const BOT_GREETINGS = [
  "Hi! I'm Kelsey's assistant. How can I help you today?",
  "Need help finding a stay or managing a booking? Just ask!",
  "Welcome! Ask me about listings, rewards, or support.",
];

const BOT_GREETING_LOGGED_IN = "Hi! I can help you find units, including ones near your location. Try asking 'find units near my location' or 'show me available apartments in Manila'.";

/** Hide on cleaning job detail so the sticky "Mark as Done" is the only CTA and no visual distraction */
const HIDE_CHATBOT_PREFIX = '/cleaning/';

/** Check if message suggests user wants location-based results */
function wantsNearMe(text: string): boolean {
  const lower = text.toLowerCase();
  return /near\s*(me|my\s*location|my\s*area)/.test(lower) || /around\s*here/.test(lower) || /close\s*to\s*me/.test(lower);
}

export default function Chatbot() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => [
    {
      id: 'welcome',
      text: BOT_GREETINGS[0],
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const greetingSetRef = useRef(false);

  useEffect(() => {
    if (user && messages.length === 1 && messages[0].id === 'welcome' && !greetingSetRef.current) {
      greetingSetRef.current = true;
      setMessages([
        {
          id: 'welcome',
          text: BOT_GREETING_LOGGED_IN,
          sender: 'bot',
          timestamp: new Date(),
        },
      ]);
    }
  }, [user, messages]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [isOpen, messages]);

  const sendMessage = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      text: trimmed,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    if (user) {
      try {
        let latitude: number | undefined;
        let longitude: number | undefined;
        if (wantsNearMe(trimmed)) {
          const pos = await new Promise<GeolocationPosition | null>((resolve) => {
            if (!navigator.geolocation) {
              resolve(null);
              return;
            }
            navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { timeout: 5000 });
          });
          if (pos) {
            latitude = pos.coords.latitude;
            longitude = pos.coords.longitude;
          }
        }

        const history = messages
          .filter((m) => m.id !== 'welcome')
          .map((m) => ({
            role: m.sender === 'user' ? 'user' as const : 'model' as const,
            content: m.text,
          }));

        const res = await fetch('/api/chat', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: trimmed,
            history,
            ...(latitude != null && longitude != null ? { latitude, longitude } : {}),
          }),
        });

        const data = await res.json().catch(() => ({}));
        const botText = res.ok && typeof data.message === 'string'
          ? data.message
          : data.error || 'Sorry, I could not get a response. Please try again.';

        const units = Array.isArray(data.units) ? data.units : [];
        const unitIds = parseUnitIdsFromMessage(botText);
        const suggestedUnits = unitIds
          .map((id) => units.find((u: { id?: string }) => String(u?.id) === id))
          .filter(Boolean) as Message['suggestedUnits'];

        const botMsg: Message = {
          id: `bot-${Date.now()}`,
          text: botText,
          sender: 'bot',
          timestamp: new Date(),
          suggestedUnits: (suggestedUnits?.length ?? 0) > 0 ? suggestedUnits : undefined,
        };
        setMessages((prev) => [...prev, botMsg]);
      } catch {
        const botMsg: Message = {
          id: `bot-${Date.now()}`,
          text: 'Sorry, something went wrong. Please try again.',
          sender: 'bot',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, botMsg]);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Mock reply when not logged in
      setTimeout(() => {
        const replies = [
          "Please log in to chat with me and get real-time unit recommendations!",
          "Sign in to ask about available units, find properties near you, or get booking help.",
        ];
        const botMsg: Message = {
          id: `bot-${Date.now()}`,
          text: replies[Math.floor(Math.random() * replies.length)],
          sender: 'bot',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, botMsg]);
        setIsLoading(false);
      }, 600);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (pathname?.startsWith(HIDE_CHATBOT_PREFIX)) return null;

  return (
    <>
      {/* Floating button - bottom right */}
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="chatbot-fab fixed bottom-6 right-6 z-[100] flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand-teal)] text-white shadow-lg transition-all duration-300 hover:scale-110 hover:bg-[var(--brand-teal-hover)] hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-[var(--brand-teal)] focus:ring-offset-2"
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
        suppressHydrationWarning
      >
        {isOpen ? (
          <CloseIcon className="h-6 w-6" />
        ) : (
          <ChatIcon className="h-6 w-6" />
        )}
      </button>

      {/* Popup with character and chat */}
      {isOpen && (
        <div
          className="chatbot-backdrop fixed inset-0 z-[99] bg-black/20 backdrop-blur-[2px] animate-chatbot-fade-in"
          onClick={() => setIsOpen(false)}
          aria-hidden
        />
      )}
      {isOpen && (
        <div
          className="chatbot-popup fixed bottom-24 right-6 z-[100] flex w-[min(calc(100vw-3rem),380px)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-chatbot-popup"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="chatbot-header flex items-center gap-4 border-b border-[var(--brand-teal)]/20 bg-gradient-to-br from-[var(--brand-teal)] to-[var(--brand-teal-hover)] px-4 py-3.5">
            <div className="chatbot-avatar flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-white/80 bg-[var(--brand-yellow)] shadow-md">
              <CharacterFace className="h-6 w-6 text-[var(--brand-teal)]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-white">Kelsey Assistant</p>
              <p className="text-xs text-white/80">Here to help</p>
            </div>
          </div>
          <div className="chatbot-messages flex flex-1 flex-col gap-3 overflow-y-auto p-4 min-h-[220px] max-h-[320px]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col gap-2 ${msg.sender === 'user' ? 'items-end' : 'items-start'} animate-chatbot-msg`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                    msg.sender === 'user'
                      ? 'rounded-br-md bg-[var(--brand-teal)] text-white'
                      : 'rounded-bl-md bg-gray-100 text-gray-800'
                  }`}
                >
                  {msg.sender === 'bot' && msg.suggestedUnits ? stripUnitTags(msg.text) : msg.text}
                </div>
                {msg.sender === 'bot' && msg.suggestedUnits && msg.suggestedUnits.length > 0 && (
                  <div className="flex flex-wrap gap-2 max-w-[85%]">
                    {msg.suggestedUnits.map((unit) => (
                      <UnitPreviewCard key={unit.id} unit={unit} compact />
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="border-t border-gray-100 p-3">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm placeholder:text-gray-400 focus:border-[var(--brand-teal)] focus:bg-white focus:ring-2 focus:ring-[var(--brand-teal)]/20"
                suppressHydrationWarning
              />
              <button
                type="button"
                onClick={sendMessage}
                className="rounded-xl bg-[var(--brand-teal)] px-4 py-2.5 text-white transition-colors hover:bg-[var(--brand-teal-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-teal)] focus:ring-offset-2 disabled:opacity-50"
                disabled={!inputValue.trim() || isLoading}
              >
                {isLoading ? (
                  <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <SendIcon className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Icons as inline SVG components
function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  );
}

function CharacterFace({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <circle cx="9" cy="10" r="1.5" />
      <circle cx="15" cy="10" r="1.5" />
      <path d="M12 14c-1.5 0-2.5.75-2.5 1.5s1 1.5 2.5 1.5 2.5-.75 2.5-1.5-1-1.5-2.5-1.5z" />
    </svg>
  );
}
