import { useState, useEffect, useRef, useCallback } from 'react';

export interface LiveTelemetry {
  noradId: number;
  name: string;
  latitude: number;
  longitude: number;
  altitude: number;
  velocity: number;
  temperature: number;
  battery: number;
  signalStrength: number;
  inEclipse: boolean;
  timestamp: string;
}

export function useLiveTelemetry() {
  const [telemetry, setTelemetry] = useState<Map<number, LiveTelemetry>>(new Map());
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource('/api/telemetry');
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setConnected(true);
    };

    eventSource.addEventListener('telemetry', (event) => {
      try {
        const data = JSON.parse(event.data) as LiveTelemetry;
        setTelemetry(prev => new Map(prev).set(data.noradId, data));
        setLastUpdate(new Date());
      } catch (e) {
        console.error('Failed to parse telemetry:', e);
      }
    });

    eventSource.addEventListener('heartbeat', () => {
      setLastUpdate(new Date());
    });

    eventSource.addEventListener('error', () => {
      setConnected(false);
    });

    eventSource.addEventListener('end', () => {
      setConnected(false);
    });
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [connect]);

  const satelliteArray = Array.from(telemetry.values());

  return {
    satellites: satelliteArray,
    connected,
    lastUpdate,
    reconnect: connect
  };
}