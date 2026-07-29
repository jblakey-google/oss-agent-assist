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

// =============================================================================
// #region 1. Combobox and Profile Resolution Helpers
// =============================================================================

/**
 * Formats a list of profile objects into combobox option objects.
 *
 * @param {Array<Object>} [profiles=[]] - List of profile objects.
 * @returns {Array<{ label: string, value: string }>} Combobox options.
 */
export function formatSimulatorProfileOptions(profiles = []) {
  return profiles.map((prof) => {
    const typeStr =
      prof.profileType === "Companion Agent" ? "Companion Agent" : "Container";
    return {
      label: `${prof.name} [${typeStr}] (${prof.developerName})`,
      value: prof.developerName
    };
  });
}

/**
 * Resolves the currently active simulator profile object by developer name.
 *
 * @param {Array<Object>} [profiles=[]] - List of profile objects.
 * @param {string} devName - Developer name to find.
 * @returns {Object|null} Matching profile object with isFound flag.
 */
export function getActiveSimulatorProfile(profiles = [], devName) {
  const prof = profiles.find((p) => p.developerName === devName) || profiles[0];
  return prof ? { ...prof, isFound: true } : null;
}

// #endregion

// =============================================================================
// #region 2. Conversation ID Resolution and Payload Utilities
// =============================================================================

/**
 * Extracts conversationId and conversationName from a container component event detail.
 *
 * @param {Object} event - DOM event emitted by agent assist container.
 * @returns {{ conversationName: string|null, conversationId: string|null }} Extracted IDs.
 */
export function extractConversationIdFromEvent(event) {
  if (event?.detail?.conversationName) {
    const parts = event.detail.conversationName.split("/");
    return {
      conversationName: event.detail.conversationName,
      conversationId: parts[parts.length - 1]
    };
  }
  if (event?.detail?.conversationId) {
    return {
      conversationName: null,
      conversationId: event.detail.conversationId
    };
  }
  return { conversationName: null, conversationId: null };
}

/**
 * Resolves the current conversation ID from local state or DOM element properties.
 *
 * @param {string|null} currentId - Currently tracked conversation ID in state.
 * @param {HTMLElement|null} containerEl - Sub-component DOM element reference.
 * @returns {string|null} Resolved conversation ID string or null.
 */
export function resolveConversationId(currentId, containerEl) {
  if (currentId) return currentId;
  if (containerEl?.conversationId) {
    return containerEl.conversationId;
  }
  if (containerEl?.conversationName) {
    const parts = containerEl.conversationName.split("/");
    return parts[parts.length - 1];
  }
  return null;
}

/**
 * Builds the simulated analyze-content event payload for customer or agent messages.
 *
 * @param {string} participantRole - Role of message sender ('END_USER' | 'HUMAN_AGENT').
 * @param {string} text - Message text input.
 * @param {string|null} conversationId - Conversation ID string.
 * @returns {Object} Structured event payload for analyze-content request.
 */
export function buildSimulatedMessagePayload(
  participantRole,
  text,
  conversationId
) {
  const trimmedText = (text || "").trim();
  return {
    detail: {
      conversationId: conversationId || null,
      participantRole: participantRole,
      request: {
        textInput: {
          text: trimmedText,
          languageCode: "us"
        }
      }
    }
  };
}

/**
 * Dispatches the simulated event to window using global bridge function or standard dispatch.
 *
 * @param {Object} payload - Simulated message payload.
 * @param {Window} [win=window] - Window object context.
 */
export function dispatchSimulatedMessage(payload, win = window) {
  if (typeof win.dispatchAgentAssistEvent === "function") {
    win.dispatchAgentAssistEvent("analyze-content-requested", payload);
  } else {
    win.dispatchEvent(new CustomEvent("analyze-content-requested", payload));
  }
}

// #endregion
