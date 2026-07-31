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

import BasePlatformHandler from "./BasePlatformHandler";
import { getFieldValue } from "lightning/uiRecordApi";
import {
  createMessageContext,
  publish,
  subscribe,
  unsubscribe,
  APPLICATION_SCOPE
} from "lightning/messageService";

// Five9 BYOT Message Channel (defined as string to prevent static import errors when package is not installed)
const MSG_CHANNEL = "Five9BYOT__Five9VoiceMessageChannel__c";

// The maximum time (in seconds) to wait for the Five9 SDK to populate the sessionId before falling back to the SCV callId.
const SESSION_ID_WAIT_TIMEOUT_SECONDS = 5;

let cachedSessionId;

// =============================================================================
// #region 1. Five9 LMS Transport Provider
// =============================================================================

class ChannelTransportProvider {
  _messageContext;
  _msgChannelSubscription;
  _messageHandler;

  constructor() {
    this._messageContext = createMessageContext();
  }

  subscribeToChannel(messageHandler) {
    this._messageHandler = messageHandler;
  }

  sendMessageToChannel(payload) {
    publish(this._messageContext, MSG_CHANNEL, payload);
  }

  subscribe() {
    this._msgChannelSubscription = subscribe(
      this._messageContext,
      MSG_CHANNEL,
      (message) => {
        if (this._messageHandler) {
          this._messageHandler(message);
        }
      },
      { scope: APPLICATION_SCOPE }
    );
  }

  unsubscribe() {
    if (this._msgChannelSubscription) {
      unsubscribe(this._msgChannelSubscription);
      this._msgChannelSubscription = null;
    }
  }
}

// #endregion

// =============================================================================
// #region 2. Five9 Platform Handler
// =============================================================================

export default class Five9PlatformHandler extends BasePlatformHandler {
  _five9Sdk;
  _channelTransportProvider;
  sessionId;
  _activePollGuid = null;
  isDestroyed = false;

  constructor(service) {
    super(service);
  }

  async init() {
    this.lwc.debugLog("Initializing Five9 SDK in handler...");
    await this._initializeFive9SDK();

    // Fallback for late loading: if session/call is already active, start polling immediately.
    const activeGuid = this.lwc.sessionId || cachedSessionId;
    if (activeGuid) {
      this.lwc.debugLog(
        `Late load fallback: Active call detected. Starting poll with sessionId: ${activeGuid}`
      );
      this.startConversationNamePolling(activeGuid);
    } else if (this.lwc.vendorCallKey) {
      this.lwc.debugLog(
        "Late load fallback: VendorCallKey present but no sessionId on boot. Retrying poll in 1s..."
      );
      // eslint-disable-next-line @lwc/lwc/no-async-operation
      setTimeout(() => {
        const finalGuid =
          this.lwc.sessionId || cachedSessionId || this.lwc.vendorCallKey;
        this.lwc.debugLog(
          `Late load fallback executing with resolved GUID: ${finalGuid}`
        );
        this.startConversationNamePolling(finalGuid);
      }, 1000);
    }
  }

  teardown() {
    super.teardown();
    this.isDestroyed = true;
    if (this._channelTransportProvider) {
      this._channelTransportProvider.unsubscribe();
    }
    if (this._five9Sdk && typeof this._five9Sdk.terminate === "function") {
      this._five9Sdk.terminate();
    }
    this._activePollGuid = null;
    cachedSessionId = null;
  }

  async _initializeFive9SDK() {
    try {
      if (
        typeof window !== "undefined" &&
        window.Five9Sdk &&
        typeof window.Five9Sdk.create === "function"
      ) {
        this._five9Sdk = window.Five9Sdk.create();
      } else if (
        typeof global !== "undefined" &&
        global.Five9Sdk &&
        typeof global.Five9Sdk.create === "function"
      ) {
        this._five9Sdk = global.Five9Sdk.create();
      } else {
        this.lwc.debugLog("Five9Sdk not detected on window scope.");
      }
      if (this._five9Sdk) {
        this._registerFive9Hooks();
        this.lwc.debugLog("Five9 BYOT SDK loaded successfully.");
      }
    } catch (e) {
      this.lwc.debugLog(
        `Five9 BYOT Package not installed or un-importable. Error: ${e.message}`
      );
    }
  }

  _registerFive9Hooks() {
    if (!this._five9Sdk || typeof this._five9Sdk.getHookApi !== "function")
      return;
    const hookApi = this._five9Sdk.getHookApi();
    if (hookApi && typeof hookApi.registerMethods === "function") {
      hookApi.registerMethods({
        beforeMakeCall: async (data) => {
          this.lwc.debugLog("Five9 Hook: beforeMakeCall", data);
          return { status: "Proceed" };
        },
        beforeCallDisposition: async (data) => {
          this.lwc.debugLog("Five9 Hook: beforeCallDisposition", data);
          return { status: "Proceed" };
        },
        beforeCallEnd: async (data) => {
          this.lwc.debugLog("Five9 Hook: beforeCallEnd", data);
          return { status: "Proceed" };
        }
      });
    }
  }

  startConversationNamePolling(integrationKey) {
    if (this._activePollGuid === integrationKey) {
      this.lwc.debugLog(
        `Polling already active for GUID: ${integrationKey}. Skipping duplicate poll.`
      );
      return;
    }
    this._activePollGuid = integrationKey;
    this.lwc.debugLog(
      `Starting fresh conversation polling loop for GUID: ${integrationKey}`
    );
    this.service.pollForConversationNameByIntegrationKey(integrationKey);
  }

  async handleCallConnected(event) {
    this.lwc.debugLog(
      `Five9PlatformHandler.handleCallConnected: ${JSON.stringify(event)}`
    );

    let activeGuid = this.lwc.sessionId || cachedSessionId;

    if (!activeGuid) {
      this.lwc.debugLog(
        `Five9 sessionId unavailable on callconnected. Waiting up to ${SESSION_ID_WAIT_TIMEOUT_SECONDS}s for Five9 SDK populate...`
      );
      let attempts = 0;
      const maxAttempts = Math.floor(
        (SESSION_ID_WAIT_TIMEOUT_SECONDS * 1000) / 100
      );
      while (!activeGuid && attempts < maxAttempts) {
        attempts++;
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        await new Promise((resolve) => setTimeout(resolve, 100));
        activeGuid = this.lwc.sessionId || cachedSessionId;
      }
    }

    if (!activeGuid) {
      activeGuid = event?.detail?.callId || this.lwc.vendorCallKey;
      this.lwc.debugLog(
        `Five9 sessionId timed out after ${SESSION_ID_WAIT_TIMEOUT_SECONDS}s. Falling back to SCV CallId: ${activeGuid}`
      );
    } else {
      this.lwc.debugLog(
        `Five9 sessionId captured successfully: ${activeGuid}`
      );
    }

    if (activeGuid) {
      this.startConversationNamePolling(activeGuid);
    }
  }

  handleSessionIdUpdated(sessionId) {
    if (this.isDestroyed) return;
    this.lwc.debugLog(
      `Five9PlatformHandler.handleSessionIdUpdated: ${sessionId}`
    );
    if (sessionId) {
      cachedSessionId = sessionId;
      this.sessionId = sessionId;
      this.startConversationNamePolling(sessionId);
    }
  }

  getVoiceCallFields() {
    return ["VoiceCall.Five9BYOT__sessionId__c"];
  }

  getSessionId(voiceCallData) {
    const val = getFieldValue(
      voiceCallData,
      "VoiceCall.Five9BYOT__sessionId__c"
    );
    if (val) {
      cachedSessionId = val;
    }
    return val || cachedSessionId || null;
  }
}

// #endregion
