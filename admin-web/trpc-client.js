/**
 * Clean tRPC client for admin/partner pages
 * Handles superjson encoding/decoding automatically
 */

class TRPCClient {
  constructor(baseUrl, getToken) {
    this.baseUrl = baseUrl;
    this.getToken = getToken || (() => null);
  }

  /**
   * Decode response with superjson if available
   */
  decodeResponse(data) {
    // Prefer unwrapping {json: ...} directly (tRPC/superjson envelope)
    if (data && typeof data === "object" && data.json !== undefined) {
      return data.json;
    }
    // If superjson is available and no json field, attempt deserialize
    if (typeof superjson !== "undefined" && superjson.deserialize) {
      try {
        const decoded = superjson.deserialize(data);
        if (decoded && typeof decoded === "object" && decoded.json !== undefined) {
          return decoded.json;
        }
        return decoded;
      } catch (e) {
        console.error("[TRPC] Superjson decoding failed:", e);
        return data;
      }
    }
    return data;
  }

  /**
   * Make a tRPC request
   * method: "AUTO" | "GET" | "POST"
   */
  async request(path, input, method = "AUTO") {
    const url = `${this.baseUrl}/api/trpc/${path}`;
    const inputValue = input !== undefined && input !== null ? input : {};

    // Payload builders
    const buildPostBody = () => JSON.stringify({ id: 0, json: inputValue });
    const buildGetUrl = () => {
      const inputParam = encodeURIComponent(JSON.stringify(inputValue));
      return `${url}?input=${inputParam}`;
    };

    const token = this.getToken();

    console.log('[TRPC Client] Making request:', { path, url, hasToken: !!token, method });

    // Helper to parse a fetch response
    const parseResponse = async (response) => {
      const contentType = response.headers.get('content-type') || '';
      const text = await response.text();

      console.log('[TRPC Client] Response:', { 
        status: response.status, 
        statusText: response.statusText,
        contentType,
        textLength: text.length,
        textPreview: text.substring(0, 200)
      });

      if (!text || text.trim().length === 0) {
        throw new Error(`Empty response from server (${response.status} ${response.statusText})`);
      }

      if (!contentType.includes('application/json')) {
        throw new Error(`Invalid response format (${contentType}): ${text.substring(0, 100)}`);
      }

      let json;
      try {
        json = JSON.parse(text);
      } catch (e) {
        console.error('[TRPC Client] JSON parse error:', e, 'Text:', text.substring(0, 200));
        throw new Error(`Invalid JSON response: ${text.substring(0, 200)}`);
      }

      console.log('[TRPC Client] Parsed JSON:', json);

      if (!response.ok || json.error) {
        const errorMsg = json.error?.message || 
                         json.error?.data?.message || 
                         (typeof json.error === 'string' ? json.error : JSON.stringify(json.error)) ||
                         `Request failed (${response.status} ${response.statusText})`;
        console.error('[TRPC Client] Error:', errorMsg, json.error);
        const err = new Error(errorMsg);
        err.trpc = json.error;
        err.status = response.status;
        throw err;
      }

      // tRPC v11 response format: { result: { data: ... } }
      const result = json.result?.data;
      console.log('[TRPC Client] Result before decode:', result);
      
      const decoded = this.decodeResponse(result);
      console.log('[TRPC Client] Result after decode:', decoded);
      
      return decoded;
    };

    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };

    // Decide method behavior
    if (method === "GET") {
      const getUrl = buildGetUrl();
      const response = await fetch(getUrl, {
        method: 'GET',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      return await parseResponse(response);
    }

    if (method === "POST") {
      const body = buildPostBody();
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body
      });
      return await parseResponse(response);
    }

    // AUTO: try POST (mutation) then GET on 405/METHOD_NOT_SUPPORTED (query)
    try {
      const body = buildPostBody();
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body
      });
      return await parseResponse(response);
    } catch (err) {
      const trpcCode = err?.trpc?.data?.code || err?.trpc?.code;
      const status = err?.status;
      const isMethodNotSupported = trpcCode === 'METHOD_NOT_SUPPORTED' || status === 405;
      if (isMethodNotSupported) {
        console.warn('[TRPC Client] POST not supported for this procedure, retrying with GET', { path });
        const getUrl = buildGetUrl();
        const response = await fetch(getUrl, {
          method: 'GET',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        });
        return await parseResponse(response);
      }
      throw err;
    }
  }
}

// Export for use in HTML pages
if (typeof window !== 'undefined') {
  window.TRPCClient = TRPCClient;
}

