/**
 * Copyright 2026 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export function isValidEndpointUrl(url) {
  if (!url || !url.trim()) {
    return {
      valid: false,
      reason: "empty",
      message: "Please enter a UI Connector Endpoint URL."
    };
  }
  const trimmed = url.trim();
  if (trimmed.startsWith("callout:")) {
    return { valid: true, url: trimmed };
  }
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      valid: false,
      reason: "format",
      message: "HTTP 400 Bad Request — Invalid URL format."
    };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      valid: false,
      reason: "protocol",
      message: "HTTP 400 Bad Request — URL must start with https:// or http://."
    };
  }
  const hostname = parsed.hostname;
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
  const hasDot = hostname.includes(".");
  if (!isLocalhost && !hasDot) {
    return {
      valid: false,
      reason: "host",
      message:
        "HTTP 400 Bad Request — Hostname must be a valid domain (e.g. example.com) or IP address."
    };
  }
  return { valid: true, url: trimmed };
}

export async function checkBrowserFetchHealth(url) {
  if (typeof fetch === "undefined" || url.startsWith("callout:")) {
    return null;
  }
  try {
    const controller =
      typeof AbortController !== "undefined" ? new AbortController() : null;
    /* eslint-disable @lwc/lwc/no-async-operation */
    const timeoutId = controller
      ? setTimeout(() => controller.abort(), 4000)
      : null;
    /* eslint-enable @lwc/lwc/no-async-operation */
    const resp = await fetch(url, {
      method: "GET",
      mode: "cors",
      signal: controller ? controller.signal : undefined
    });
    if (timeoutId) clearTimeout(timeoutId);

    if (resp && resp.status > 0) {
      return { code: resp.status, statusText: resp.statusText };
    }
  } catch {
    // Direct browser fetch rejected (DNS error, connection refused, CORS, or CSP)
  }
  return null;
}

export function formatEndpointStatusResult(httpCode, httpStatusText) {
  if (httpCode >= 200 && httpCode < 300) {
    return {
      state: "pass",
      label: `${httpCode} OK`,
      message: `HTTP ${httpCode} OK — Endpoint is reachable and responding.`
    };
  }
  if (httpCode === 404) {
    return {
      state: "warning",
      label: "404 Not Found",
      message: "HTTP 404 Not Found — Endpoint could not be reached."
    };
  }
  if (httpCode >= 500) {
    return {
      state: "fail",
      label: `${httpCode} Server Error`,
      message: `HTTP ${httpCode} Server Error — Remote server returned an error.`
    };
  }
  if (httpCode === 401 || httpCode === 403) {
    return {
      state: "warning",
      label: `${httpCode} Forbidden`,
      message: `HTTP ${httpCode} Forbidden — Access to endpoint is unauthorized.`
    };
  }
  return {
    state: "warning",
    label: `${httpCode} ${httpStatusText || "Alert"}`,
    message: `HTTP ${httpCode} ${httpStatusText || "Alert"}`
  };
}

export function formatRegisterTokenResult(result, trimmedUrl) {
  if (result && result.status === "success" && result.token) {
    return {
      state: "pass",
      code: 200,
      label: "200 OK",
      message: "HTTP 200 OK — /register route authenticated and reachable."
    };
  }
  const errorMsg =
    result && result.error ? String(result.error) : "Unknown error";
  if (errorMsg.includes("Unauthorized endpoint")) {
    return {
      state: "warning",
      code: 401,
      label: "Setup Warning",
      message: `Apex callout blocked. Verify Remote Site Setting for ${trimmedUrl} in Setup > Remote Site Settings for server-side callouts.`
    };
  }
  if (errorMsg.includes("401") || errorMsg.includes("403")) {
    return {
      state: "fail",
      code: 401,
      label: "401 Unauthorized",
      message: `HTTP 401 Unauthorized — /register auth failed: ${errorMsg}`
    };
  }
  if (errorMsg.includes("404")) {
    return {
      state: "warning",
      code: 404,
      label: "404 Not Found",
      message: `HTTP 404 Not Found — /register route unreachable: ${errorMsg}`
    };
  }
  return {
    state: "fail",
    code: 500,
    label: "Auth Error",
    message: `/register health check error: ${errorMsg}`
  };
}

export async function performEndpointHealthCheck(url, checkApexEndpointHealth) {
  const check = isValidEndpointUrl(url);
  if (!check.valid) {
    return {
      state: check.reason === "empty" ? "warning" : "fail",
      statusCode: check.reason === "empty" ? 0 : 400,
      label: check.reason === "empty" ? "No URL" : "400 Bad Request",
      message: check.message,
      isValid: false
    };
  }

  const trimmed = check.url;
  let httpCode = null;
  let httpStatusText = "";
  let apexErrorMessage = "";

  // 1. Direct browser fetch check
  let browserResult = null;
  if (typeof fetch !== "undefined" && !trimmed.startsWith("callout:")) {
    browserResult = await checkBrowserFetchHealth(trimmed);
  }
  if (browserResult) {
    httpCode = browserResult.code;
    httpStatusText = browserResult.statusText;
  }

  // 2. Server-side Apex checkEndpointHealth fallback
  if (httpCode === null && checkApexEndpointHealth) {
    try {
      const apexResult = await checkApexEndpointHealth({ endpointUrl: trimmed });
      if (apexResult) {
        if (apexResult.statusCode !== undefined && apexResult.statusCode > 0) {
          httpCode = apexResult.statusCode;
          httpStatusText = apexResult.statusText || apexResult.statusLabel || "";
        }
        if (apexResult.message) {
          apexErrorMessage = apexResult.message;
        }
        if (apexResult.status === "warning" || apexResult.status === "fail") {
          let msg = apexResult.message || "Endpoint unreachable.";
          if (
            msg.includes("Unauthorized endpoint") ||
            msg.includes("Remote site") ||
            msg.includes("Remote Site")
          ) {
            msg = `Connection failed for ${trimmed}: Unable to reach endpoint (DNS error, connection refused, or invalid URL).`;
          }
          return {
            state: apexResult.status,
            statusCode: apexResult.statusCode || 0,
            label: apexResult.statusLabel || "Connection Error",
            message: msg,
            isValid: true,
            trimmedUrl: trimmed
          };
        }
      }
    } catch (err) {
      apexErrorMessage = err?.body?.message || err?.message || String(err);
    }
  }

  // 3. Fallback when both fail
  if (httpCode === null) {
    if (
      apexErrorMessage.includes("Unauthorized endpoint") ||
      apexErrorMessage.includes("Remote site") ||
      apexErrorMessage.includes("Remote Site")
    ) {
      apexErrorMessage = `Connection failed for ${trimmed}: Unable to reach endpoint (DNS error, connection refused, or invalid URL).`;
    }
    return {
      state: "fail",
      statusCode: 0,
      label: "Connection Failed",
      message: apexErrorMessage
        ? apexErrorMessage
        : `Connection failed for ${trimmed}: Unable to reach endpoint (DNS error, connection refused, or invalid URL).`,
      isValid: true,
      trimmedUrl: trimmed
    };
  }

  const formatted = formatEndpointStatusResult(httpCode, httpStatusText);
  return {
    ...formatted,
    statusCode: httpCode,
    isValid: true,
    trimmedUrl: trimmed
  };
}

export async function performRegisterEndpointHealthCheck(params, registerAuthTokenFn) {
  const {
    configName = "Default",
    endpointUrl,
    consumerKey = "",
    consumerSecret = "",
    clientCredentialsUser = ""
  } = params;

  try {
    const result = await registerAuthTokenFn({
      configName,
      endpointUrl,
      consumerKey,
      consumerSecret,
      clientCredentialsUser
    });

    if (result && (result.status === "success" || result.error)) {
      return formatRegisterTokenResult(result, endpointUrl);
    }
    return {
      state: "warning",
      code: 0,
      label: "No Response",
      message: "No response from /register route."
    };
  } catch (err) {
    const errMsg = err?.body?.message || err?.message || String(err);
    return formatRegisterTokenResult({ error: errMsg }, endpointUrl);
  }
}

export function validateRegisterPrerequisites(url, endpointStatusCode, endpointHealthState, endpointStatusLabel) {
  const check = isValidEndpointUrl(url);
  if (!check.valid) {
    return {
      canProceed: false,
      state: check.reason === "empty" ? "warning" : "fail",
      code: check.reason === "empty" ? 0 : 400,
      label: check.reason === "empty" ? "No URL" : "400 Bad Request",
      message: check.message
    };
  }

  if (endpointStatusCode && (endpointStatusCode < 200 || endpointStatusCode >= 300)) {
    return {
      canProceed: false,
      state: endpointHealthState || "fail",
      code: endpointStatusCode,
      label: endpointStatusLabel || `${endpointStatusCode} Unreachable`,
      message: `HTTP ${endpointStatusCode} — /register route unreachable because Endpoint URL returned ${endpointStatusLabel}.`
    };
  }

  return {
    canProceed: true,
    trimmedUrl: check.url.replace(/\/$/, "")
  };
}

