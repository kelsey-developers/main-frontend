'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import UnitPreviewCard from '@/components/chat/UnitPreviewCard';
import { useRouter } from 'next/navigation';
import { LAYOUT_NAVBAR_OFFSET } from '@/lib/constants';
import { parseUnitIdsFromMessage, stripUnitTags } from '@/lib/chat/parseUnits';

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  suggestedUnits?: Array<{ id: string; title?: string; price?: number; city?: string; main_image_url?: string | null; bedrooms?: number; bathrooms?: number; property_type?: string }>;
};

function wantsNearMe(text: string): boolean {
  const lower = text.toLowerCase();
  return /near\s*(me|my\s*location|my\s*area)/.test(lower) || /around\s*here/.test(lower) || /close\s*to\s*me/.test(lower);
}

export default function ChatPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      router.replace('/login?redirect=/chat');
      return;
    }
  }, [user, router]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || !user) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      text: trimmed,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

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

      const history = messages.map((m) => ({
        role: m.sender === 'user' ? ('user' as const) : ('model' as const),
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
      const botText =
        res.ok && typeof data.message === 'string'
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
  };

  if (!user) {
    return (
      <div className={`min-h-screen ${LAYOUT_NAVBAR_OFFSET} flex items-center justify-center`}>
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0B5858]" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${LAYOUT_NAVBAR_OFFSET} pb-12 bg-gray-50 flex flex-col`}>
      <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col px-4 py-6">
        <div className="mb-6">
          <h1
            className="text-2xl font-bold text-gray-900"
            style={{ fontFamily: 'var(--font-poppins)' }}
          >
            AI Assistant
          </h1>
          <p className="text-sm text-gray-600 mt-1" style={{ fontFamily: 'var(--font-poppins)' }}>
            Ask about units, find properties near you, or get booking help. Try &quot;find units near my location&quot; or &quot;show me something cozy&quot;.
          </p>
        </div>

        <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[400px]">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-12 text-gray-500 text-sm" style={{ fontFamily: 'var(--font-poppins)' }}>
                Start a conversation. Try asking for units near your location or in a specific city.
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col gap-2 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                    msg.sender === 'user'
                      ? 'rounded-br-md bg-[#0B5858] text-white'
                      : 'rounded-bl-md bg-gray-100 text-gray-800'
                  }`}
                  style={{ fontFamily: 'var(--font-poppins)' }}
                >
                  {msg.sender === 'bot' && msg.suggestedUnits ? stripUnitTags(msg.text) : msg.text}
                </div>
                {msg.sender === 'bot' && msg.suggestedUnits && msg.suggestedUnits.length > 0 && (
                  <div className="flex flex-wrap gap-2 max-w-[85%]">
                    {msg.suggestedUnits.map((unit) => (
                      <UnitPreviewCard key={unit.id} unit={unit} />
                    ))}
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md bg-gray-100 px-4 py-2.5 text-sm text-gray-600">
                  <span className="inline-flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="border-t border-gray-100 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder="Type a message..."
                className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm placeholder:text-gray-400 focus:border-[#0B5858] focus:bg-white focus:ring-2 focus:ring-[#0B5858]/20 outline-none"
                style={{ fontFamily: 'var(--font-poppins)' }}
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="rounded-xl bg-[#0B5858] px-4 py-2.5 text-white font-medium transition-colors hover:bg-[#094848] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: 'var(--font-poppins)' }}
              >
                {isLoading ? (
                  <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  'Send'
                )}
              </button>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-500 mt-4 text-center" style={{ fontFamily: 'var(--font-poppins)' }}>
          Powered by Groq. Units data from Kelsey&apos;s Homestay.
        </p>
      </div>
    </div>
  );
}
