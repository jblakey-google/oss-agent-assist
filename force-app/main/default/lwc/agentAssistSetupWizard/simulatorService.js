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

export function getActiveSimulatorProfile(profiles = [], devName) {
  const prof = profiles.find((p) => p.developerName === devName) || profiles[0];
  return prof ? { ...prof, isFound: true } : null;
}

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

export function dispatchSimulatedMessage(payload, win = window) {
  if (typeof win.dispatchAgentAssistEvent === "function") {
    win.dispatchAgentAssistEvent("analyze-content-requested", payload);
  } else {
    win.dispatchEvent(new CustomEvent("analyze-content-requested", payload));
  }
}
