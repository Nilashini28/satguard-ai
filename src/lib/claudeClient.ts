import type { AnomalyAlert, SatelliteState } from '@/types/satellite';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.1-70b-versatile';

function getApiKey(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('groq_api_key') || '';
  }
  return process.env.VITE_GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY || '';
}

export async function generateAnomalyNarration(alert: AnomalyAlert): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return 'Configure your Groq API key in settings to enable AI narration.';
  }

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 120,
        temperature: 0.5,
        messages: [
          {
            role: 'system',
            content: 'You are SATGUARD AI, an expert satellite operations assistant. When given a telemetry anomaly, respond with exactly 2 sentences: first sentence explains the likely cause, second sentence states what the operator should check. Be specific, technical, and under 60 words total.'
          },
          {
            role: 'user',
            content: `Satellite: ${alert.satelliteName}. Anomaly: ${alert.metric} reading ${alert.currentValue} vs baseline ${alert.baselineValue.toFixed(2)}. Severity: ${alert.severity}. Detection: ${alert.detectionMethod} method, ${alert.confidence}% confidence.`
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || 'Analysis unavailable.';
  } catch (error) {
    console.error('Failed to generate narration:', error);
    return 'Failed to generate AI analysis. Check API key configuration.';
  }
}

export async function streamAnomalyNarration(
  alert: AnomalyAlert,
  onChunk: (text: string) => void
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    onChunk('Configure your Groq API key in settings to enable AI narration.');
    return '';
  }

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 120,
        temperature: 0.5,
        stream: true,
        messages: [
          {
            role: 'system',
            content: 'You are SATGUARD AI, an expert satellite operations assistant. When given a telemetry anomaly, respond with exactly 2 sentences: first sentence explains the likely cause, second sentence states what the operator should check. Be specific, technical, and under 60 words total.'
          },
          {
            role: 'user',
            content: `Satellite: ${alert.satelliteName}. Anomaly: ${alert.metric} reading ${alert.currentValue} vs baseline ${alert.baselineValue.toFixed(2)}. Severity: ${alert.severity}. Detection: ${alert.detectionMethod} method, ${alert.confidence}% confidence.`
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          try {
            const json = JSON.parse(data);
            const content = json.choices?.[0]?.delta?.content;
            if (content) {
              onChunk(content);
            }
          } catch {}
        }
      }
    }

    return '';
  } catch (error) {
    console.error('Failed to stream narration:', error);
    onChunk('Failed to generate AI analysis.');
    return '';
  }
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = `You are SATGUARD AI, an expert satellite operations assistant integrated into a real-time monitoring dashboard. You have access to the current telemetry snapshot below. Answer operator questions concisely and technically. Reference specific satellite names and metric values. Keep answers under 80 words unless asked for detail.`;

export async function sendChatMessage(
  message: string,
  telemetry: SatelliteState[],
  alerts: AnomalyAlert[],
  history: ChatMessage[] = []
): Promise<{ response: string; streaming: (onChunk: (text: string) => void) => Promise<void> }> {
  const apiKey = getApiKey();

  const telemetryJson = telemetry.map(s => ({
    name: s.name,
    status: s.status,
    altitude: s.altitude.toFixed(2),
    temperature: s.temperature.toFixed(1),
    battery: s.battery.toFixed(0),
    signal: s.signalStrength ? s.signalStrength.toFixed(0) : 'out of range'
  }));

  const alertsJson = alerts
    .filter(a => !a.acknowledged)
    .map(a => ({
      satellite: a.satelliteName,
      metric: a.metric,
      severity: a.severity,
      value: a.currentValue.toFixed(2)
    }));

  const contextMessage = `Current telemetry: ${JSON.stringify(telemetryJson)}. Active alerts: ${JSON.stringify(alertsJson)}.`;

  if (!apiKey) {
    return {
      response: 'Configure your Groq API key in settings to enable the AI assistant.',
      streaming: async () => {}
    };
  }

  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: `${contextMessage}\n\nOperator question: ${message}` }
  ];

  const streamResponse = async (onChunk: (text: string) => void): Promise<void> => {
    try {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 200,
          temperature: 0.5,
          stream: true,
          messages
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const json = JSON.parse(data);
              const content = json.choices?.[0]?.delta?.content;
              if (content) {
                onChunk(content);
              }
            } catch {}
          }
        }
      }
    } catch (error) {
      console.error('Failed to stream chat:', error);
      onChunk('Failed to connect to AI. Please check your API key.');
    }
  };

  return {
    response: '',
    streaming: streamResponse
  };
}

export const STARTER_QUESTIONS = [
  "Which satellite needs attention right now?",
  "Explain the current ISS thermal reading",
  "What does a HIGH severity anomaly mean?",
  "How is battery level calculated?"
];