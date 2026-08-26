import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';

/**
 * Fetches one or more API paths and tracks loading/error state.
 *
 * `paths` may be a string or an array; an array resolves in parallel and the
 * data is returned in the same order. A stale response from a superseded
 * request is discarded, so fast typing in a search box cannot render an
 * out-of-date list over a newer one.
 *
 * Pass `null` to skip fetching entirely (e.g. while a route param is missing).
 */
export function useResource(paths, { skip = false } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  const key = Array.isArray(paths) ? paths.join('|') : paths;

  const load = useCallback(
    async ({ quiet = false } = {}) => {
      if (skip || !key) return;
      const id = ++requestId.current;
      if (!quiet) setLoading(true);
      setError('');

      try {
        const list = Array.isArray(paths) ? paths : [paths];
        const results = await Promise.all(list.map((path) => api(path)));
        if (id !== requestId.current) return; // A newer request already won.
        setData(Array.isArray(paths) ? results : results[0]);
      } catch (err) {
        if (id !== requestId.current) return;
        setError(err.message);
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    // `key` is the stable identity of `paths`; depending on the array itself
    // would refetch on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, skip],
  );

  useEffect(() => {
    load();
  }, [load]);

  /** Refetch without flashing skeletons — used after a mutation succeeds. */
  const refresh = useCallback(() => load({ quiet: true }), [load]);

  return { data, loading, error, refresh, setData };
}
