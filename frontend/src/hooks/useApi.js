import { useState, useCallback } from 'react';

const API_BASE = 'http://localhost:3001/api';

export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = useCallback(async (endpoint, options = {}) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      if (response.status === 204) {
        return null;
      }

      return await response.json();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const get = useCallback((endpoint) => request(endpoint), [request]);

  const post = useCallback(
    (endpoint, data) =>
      request(endpoint, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    [request]
  );

  const put = useCallback(
    (endpoint, data) =>
      request(endpoint, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    [request]
  );

  const del = useCallback(
    (endpoint) =>
      request(endpoint, {
        method: 'DELETE',
      }),
    [request]
  );

  return { loading, error, get, post, put, del };
}

export default useApi;
