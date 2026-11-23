import { useEffect, useState } from 'react';

interface Reading {
  sensor: string;
  celsius: number;
  takenAt: string;
}

type Unit = 'celsius' | 'fahrenheit';

export function Dashboard() {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [unit, setUnit] = useState<Unit>('celsius');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/readings')
      .then((response) => response.json())
      .then((data: Reading[]) => {
        if (!cancelled) setReadings(data);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const show = (celsius: number) =>
    unit === 'celsius' ? `${celsius.toFixed(1)} °C` : `${((celsius * 9) / 5 + 32).toFixed(1)} °F`;

  return (
    <section>
      <h1>Greenhouse readings</h1>
      <button type="button" onClick={() => setUnit(unit === 'celsius' ? 'fahrenheit' : 'celsius')}>
        Show {unit === 'celsius' ? '°F' : '°C'}
      </button>
      <ul>
        {readings.map((reading) => (
          <li key={reading.sensor}>
            <button type="button" onClick={() => setExpanded(expanded === reading.sensor ? null : reading.sensor)}>
              {reading.sensor}
            </button>
            : {show(reading.celsius)}
            {expanded === reading.sensor && <small> taken at {reading.takenAt}</small>}
          </li>
        ))}
      </ul>
    </section>
  );
}
