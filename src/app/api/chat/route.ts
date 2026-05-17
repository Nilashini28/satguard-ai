import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'GROQ_API_KEY is not configured. Get a free key at https://console.groq.com' },
      { status: 500 }
    );
  }

  try {
    const { messages, satelliteContext, spaceWeather } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages array required' }, { status: 400 });
    }

    const client = new Groq({ apiKey });

    const systemPrompt = `You are SATGUARD AI — an expert satellite telemetry analyst and space
situational awareness assistant. You analyze real-time satellite data and space weather to detect
anomalies, assess risks, and advise ground operators.

Your expertise covers:
- Orbital mechanics (TLE propagation, Kepler elements, decay analysis)
- Space weather effects (geomagnetic storms, solar flares, radiation belts)
- Satellite subsystem anomalies (thermal, power, attitude control, RF comms)
- Conjunction analysis and collision avoidance

Current space weather context:
${spaceWeather ? `- Kp Index: ${spaceWeather.kpIndex} (${spaceWeather.riskLevel})
- Solar Wind Bz: ${spaceWeather.solarWindBz} nT
- Solar Flare Class: ${spaceWeather.flareClass}` : '- Space weather data not available'}

${satelliteContext ? `Currently monitoring satellite:
${JSON.stringify(satelliteContext, null, 2)}` : ''}

Keep responses concise, technically accurate, and operator-actionable. Use bullet points for
recommendations. Always reference actual telemetry values when analyzing anomalies.`;

    const completion = await client.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1024,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m: { role: string; content: string }) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ],
    });

    return NextResponse.json({
      message: completion.choices[0]?.message?.content ?? '',
      model: completion.model,
    });
  } catch (err: unknown) {
    console.error('Groq chat error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}