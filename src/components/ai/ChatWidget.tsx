'use client'
import { useState, useRef, useEffect } from 'react'
import { ChatMessage, SatelliteState, AnomalyAlert } from '@/types/satellite'
import { chat } from '@/lib/groqClient'

const CHIPS = [
  'Which satellite needs attention right now?',
  'What is the ISS current altitude and velocity?',
  'Which satellites are in eclipse right now?',
  'Explain the most recent anomaly detected',
]

export function ChatWidget({ satellites, alerts, prefill, onClearPrefill }: {
  satellites: SatelliteState[]
  alerts: AnomalyAlert[]
  prefill?: string
  onClearPrefill?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  useEffect(() => {
    if (prefill) { setOpen(true); send(prefill); onClearPrefill?.() }
  }, [prefill])

  async function send(text: string) {
    if (!text.trim() || busy) return
    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: Date.now() }
    const history = [...msgs.slice(-9), userMsg]
    setMsgs([...history])
    setInput('')
    setBusy(true)
    const assistantMsg: ChatMessage = { role: 'assistant', content: '', timestamp: Date.now() }
    setMsgs(prev => [...prev, assistantMsg])
    try {
      for await (const chunk of chat(history, satellites, alerts.length)) {
        setMsgs(prev => {
          const last = prev[prev.length - 1]
          if (last?.role !== 'assistant') return prev
          return [...prev.slice(0, -1), { ...last, content: last.content + chunk }]
        })
      }
    } finally { setBusy(false) }
  }

  return (
    <>
      <button onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-full shadow-xl text-sm font-medium transition-all">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-300 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
        </span>
        Ask SATGUARD AI
      </button>

      {open && (
        <div className="fixed bottom-20 right-6 z-50 w-80 sm:w-96 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          <div className="bg-blue-700 px-4 py-3 flex justify-between items-center">
            <div>
              <p className="text-sm font-semibold text-white">SATGUARD AI Assistant</p>
              <p className="text-xs text-blue-200">Llama 3.1 · Live telemetry context</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-blue-200 hover:text-white text-xl">×</button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-80 min-h-40">
            {msgs.length === 0 && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 text-center mb-3">Powered by real telemetry data</p>
                {CHIPS.map(chip => (
                  <button key={chip} onClick={() => send(chip)}
                    className="w-full text-left text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-lg transition-colors">
                    {chip}
                  </button>
                ))}
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-gray-800 text-gray-100 rounded-bl-sm'
                }`}>
                  {m.content || (
                    <span className="flex gap-1">
                      {[0,1,2].map(j => (
                        <span key={j} className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: `${j*0.15}s` }} />
                      ))}
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-gray-800 p-3 flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send(input)}
              placeholder="Ask about live telemetry..."
              disabled={busy}
              className="flex-1 text-xs bg-gray-800 text-gray-100 rounded-lg px-3 py-2 outline-none border border-gray-700 focus:border-blue-500 placeholder:text-gray-600 disabled:opacity-50" />
            <button onClick={() => send(input)} disabled={busy || !input.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg px-3 py-2 text-xs transition-colors">
              Send
            </button>
          </div>
        </div>
      )}
    </>
  )
}