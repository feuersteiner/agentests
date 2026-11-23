import { useEffect, useMemo, useState } from 'react';
import { useRider } from '../session/RiderContext';

interface Dock {
  id: string;
  bikesAvailable: number;
  ebikesAvailable: number;
  updatedAt: string;
}

const refreshEveryMs = 30_000;

export function StationBoard({ stationId }: { stationId: string }) {
  const { rider } = useRider();
  const riderId = rider.id;
  const [docks, setDocks] = useState<Dock[]>([]);
  const [showEbikesOnly, setShowEbikesOnly] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const load = () =>
      fetch(`/api/stations/${encodeURIComponent(stationId)}/docks?rider=${encodeURIComponent(riderId)}`, {
        signal: controller.signal
      })
        .then((response) => response.json())
        .then((data: Dock[]) => setDocks(data))
        .catch(() => undefined);
    load();
    const timer = setInterval(load, refreshEveryMs);
    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }, [stationId, riderId]);

  const shown = useMemo(
    () => (showEbikesOnly ? docks.filter((dock) => dock.ebikesAvailable > 0) : docks),
    [docks, showEbikesOnly]
  );

  return (
    <section>
      <h1>Station {stationId}</h1>
      <label>
        <input type="checkbox" checked={showEbikesOnly} onChange={(event) => setShowEbikesOnly(event.target.checked)} />
        E-bikes only
      </label>
      <ul>
        {shown.map((dock) => (
          <li key={dock.id}>
            {dock.bikesAvailable} bikes, {dock.ebikesAvailable} e-bikes (updated {dock.updatedAt})
          </li>
        ))}
      </ul>
    </section>
  );
}
