import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const GROQ_MODEL = 'llama-3.1-70b-versatile';

export async function POST(req: NextRequest) {
  try {
    const { messages }: { messages: ChatMessage[] } = await req.json();

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'No messages provided' }, { status: 400 });
    }

    const latestMessage = messages[messages.length - 1].content.toLowerCase();
    const needsLiveData = /status|current|now|live|iss|hubble|noaa|sentinel|starlink|altitude|velocity|temperature|battery/i.test(latestMessage);

    let satelliteContext = '';
    if (needsLiveData) {
      try {
        const satResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/satellites`, {
          cache: 'no-store'
        });
        if (satResponse.ok) {
          const satData = await satResponse.json();
          satelliteContext = `\n\nCURRENT SATELLITE TELEMETRY DATA:\n${JSON.stringify(satData.satellites, null, 2)}\n\nFetched at: ${satData.fetchedAt}`;
        }
      } catch (e) {
        console.error('Failed to fetch satellite data for chat:', e);
      }
    }

    const systemPrompt = `You are SATGUARD AI Assistant, an expert in satellite telemetry, orbital mechanics, and space systems engineering. You have access to real-time satellite data from the SATGUARD dashboard.${satelliteContext}

Answer questions about satellite health, anomalies, orbital mechanics, space weather, and telemetry interpretation. Be precise, technical, and cite real parameters when discussing satellite status. If the user asks about specific satellite current status, use the live telemetry data provided above.`;

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 });
    }

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        max_tokens: 1024,
        temperature: 0.5,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map(m => ({ role: m.role, content: m.content }))
        ],
        stream: true
      })
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error('Groq API error:', errorText);
      return NextResponse.json({ error: 'Failed to get AI response' }, { status: 500 });
    }

    const reader = groqResponse.body?.getReader();
    if (!reader) {
      return NextResponse.json({ error: 'No response body' }, { status: 500 });
    }

    const streamReader = reader;

    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        let buffer = '';

        async function processStream() {
          try {
            while (true) {
              const { done, value } = await streamReader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
                    controller.close();
                    return;
                  }
                  try {
                    const json = JSON.parse(data);
                    const content = json.choices?.[0]?.delta?.content;
                    if (content) {
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'content', text: content })}\n\n`));
                    }
                  } catch {}
                }
              }
            }
          } catch (e) {
            console.error('Stream error:', e);
            controller.close();
          }
        }

        processStream();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}