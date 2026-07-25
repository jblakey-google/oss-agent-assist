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

/**
 * Agent Assist 10-Turn Conversation Simulator for Salesforce Lightning Experience
 *
 * Instructions:
 * 1. Ensure an Agent Assist LWC component (agentAssistContainer) with debugMode enabled is loaded on the page.
 * 2. Open the browser Developer Console (F12 / Cmd+Option+I) and find the console log for `dispatchAgentAssistEvent:`.
 * 3. Right-click the `dispatchAgentAssistEvent` function in the console log and click "Store as global variable" (assigned to `temp1`).
 * 4. Copy and paste this script into the browser Developer Console and press Enter to run the simulation.
 *
 * Optional Configuration Parameters (pass an object):
 *   simulateAgentAssistTranscript({ recordId: '001xx000003DGGZAA4', delayMs: 1000 })
 */
(function simulateAgentAssistTranscript(options = {}) {
  if (typeof temp1 !== "undefined") {
    window.dispatchAgentAssistEvent = temp1;
  }

  // 1. Automatically detect Record ID from URL or fallback
  function detectRecordId() {
    if (options.recordId) return options.recordId;
    const match = window.location.href.match(
      /\/r\/(?:[A-Za-z0-9_]+)\/([a-zA-Z0-9]{15,18})\//
    );
    if (match && match[1]) return match[1];
    const matchAlt = window.location.pathname.match(/\b([a-zA-Z0-9]{15,18})\b/);
    return matchAlt ? matchAlt[1] : "001xx000003DGGZAA4";
  }

  const recordId = detectRecordId();
  const conversationId = options.conversationId || `SF-${recordId}`;
  const delayMs = options.delayMs || 1500; // Delay between turns in ms

  console.log(
    `%c[AgentAssist Simulator]%c Starting 10-turn transcript simulation...`,
    "background-color: #0070d2; color: #ffffff; padding: 2px 6px; border-radius: 3px; font-weight: bold;",
    "",
    `\nRecord ID: ${recordId}\nConversation ID: ${conversationId}`
  );

  // 2. Define 10-turn conversation transcript alternating between Customer (END_USER) and Agent (HUMAN_AGENT)
  const turns = [
    {
      role: "END_USER",
      text: "Hi, I need help with my account billing statement."
    },
    {
      role: "HUMAN_AGENT",
      text: "Hello! I would be happy to help you with your billing statement today. Could you please confirm your account number?"
    },
    {
      role: "END_USER",
      text: "Sure, my account number is ACCT-987654321."
    },
    {
      role: "HUMAN_AGENT",
      text: "Thank you. Let me look up account ACCT-987654321 for you."
    },
    {
      role: "HUMAN_AGENT",
      text: "I see the latest invoice from July 15th for $120.50. Is that the statement you have a question about?"
    },
    {
      role: "END_USER",
      text: "Yes, I was charged twice for the monthly service subscription."
    },
    {
      role: "HUMAN_AGENT",
      text: "I apologize for the double charge. Let me process a refund for the duplicate $60.25 charge right now."
    },
    {
      role: "HUMAN_AGENT",
      text: "The refund of $60.25 has been successfully issued to your payment method on file. It should reflect in 2-3 business days."
    },
    {
      role: "END_USER",
      text: "That was so quick! Thank you very much for your help."
    },
    {
      role: "HUMAN_AGENT",
      text: "You are very welcome! Is there anything else I can assist you with today?"
    }
  ];

  // 3. Dispatch function using dispatchAgentAssistEvent
  function sendTurn(turn, index) {
    const payload = {
      detail: {
        conversationId: conversationId,
        participantRole: turn.role,
        request: {
          textInput: {
            text: turn.text,
            languageCode: "en-US"
          }
        }
      }
    };

    const opts = { namespace: recordId };

    console.log(
      `%c[AgentAssist Simulator]%c Turn ${index + 1}/10 (${turn.role}): "${turn.text}"`,
      turn.role === "HUMAN_AGENT"
        ? "background-color: #0070d2; color: #fff; padding: 2px 4px; border-radius: 3px;"
        : "background-color: #2e844a; color: #fff; padding: 2px 4px; border-radius: 3px;",
      ""
    );

    if (typeof window.dispatchAgentAssistEvent === "function") {
      window.dispatchAgentAssistEvent(
        "analyze-content-requested",
        payload,
        opts
      );
    } else if (
      window._uiModuleEventTarget &&
      typeof window._uiModuleEventTarget.dispatchEvent === "function"
    ) {
      const event = new CustomEvent("analyze-content-requested", {
        detail: { ...payload.detail, namespace: recordId },
        bubbles: true,
        composed: true
      });
      window._uiModuleEventTarget.dispatchEvent(event);
    } else {
      console.warn(
        "[AgentAssist Simulator] dispatchAgentAssistEvent is not defined on window. Make sure an Agent Assist LWC component is active on this page."
      );
    }
  }

  // 4. Execute turn sequence asynchronously
  let currentTurn = 0;
  const intervalId = setInterval(() => {
    if (currentTurn >= turns.length) {
      clearInterval(intervalId);
      console.log(
        `%c[AgentAssist Simulator]%c 10-turn conversation simulation completed!`,
        "background-color: #2e844a; color: #ffffff; padding: 2px 6px; border-radius: 3px; font-weight: bold;",
        ""
      );
      return;
    }
    sendTurn(turns[currentTurn], currentTurn);
    currentTurn++;
  }, delayMs);

  return {
    stop: () => {
      clearInterval(intervalId);
      console.log("[AgentAssist Simulator] Simulation cancelled.");
    }
  };
})();
