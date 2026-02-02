import { useState, useCallback } from 'react';

// In production, use relative URL (same origin). In development, use localhost:3001
const API_BASE = import.meta.env.PROD ? '/api' : 'http://localhost:3001/api';

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

      // For DELETE or empty responses
      if (response.status === 204 || response.status === 201 || response.status === 200) {
        // Try to parse JSON, but don't fail if it's empty
        const text = await response.text();
        if (text && text.length > 0) {
          try {
            return JSON.parse(text);
          } catch {
            // JSON parsing failed, but request was successful
            return { success: true };
          }
        }
        return { success: true };
      }

      if (!response.ok) {
        const text = await response.text();
        let errorMessage = `HTTP error ${response.status}`;
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Could not parse error
        }
        throw new Error(errorMessage);
      }

      return { success: true };
    } catch (err) {
      // Network errors or other issues
      if (err.message.includes('JSON')) {
        // JSON parsing error but data might be saved
        return { success: true };
      }
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
