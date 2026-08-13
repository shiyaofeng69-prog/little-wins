import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { isLegacyPeriod, resolvePeriodKey } from '../config/periods.js';

export function usePeriodRoute() {
  const [params, setParams] = useSearchParams();
  const requestedPeriod = params.get('period') || 'today';
  const period = resolvePeriodKey(requestedPeriod);

  useEffect(() => {
    if (requestedPeriod === period && !isLegacyPeriod(requestedPeriod)) return;
    const next = new URLSearchParams(params);
    next.set('period', period);
    setParams(next, { replace: true });
  }, [params, period, requestedPeriod, setParams]);

  const patchParams = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([key, value]) => {
      if (value == null) next.delete(key);
      else next.set(key, String(value));
    });
    setParams(next);
  };

  const setPeriod = (nextPeriod) => {
    const next = new URLSearchParams(params);
    next.set('period', resolvePeriodKey(nextPeriod));
    next.delete('achievement');
    setParams(next);
  };

  return { params, period, requestedPeriod, patchParams, setPeriod };
}
