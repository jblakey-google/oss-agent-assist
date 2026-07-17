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
import { loadScript } from "lightning/platformResourceLoader";
import {
  createMessageContext,
  publish,
  subscribe,
  unsubscribe,
  APPLICATION_SCOPE
} from "lightning/messageService";
import MSG_CHANNEL from "@salesforce/messageChannel/Five9VoiceMessageChannel__c";

const five9ByotSdk = "/resource/Five9BYOT__five9ByotSdk";

// The maximum time (in seconds) to wait for the Five9 SDK to populate the sessionId before falling back to the SCV callId.
const SESSION_ID_WAIT_TIMEOUT_SECONDS = 5;

let cachedSessionId;

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

export default class Five9PlatformHandler extends BasePlatformHandler {
  _five9Sdk;
  _channelTransportProvider;
  sessionId;

  constructor(service) {
    super(service);
  }

  _activePollGuid = null;

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
      setTimeout(() => {
        const finalGuid =
          this.lwc.sessionId || cachedSessionId || this.lwc.vendorCallKey;
        this.lwc.debugLog(`Starting delayed late poll with key: ${finalGuid}`);
        this.startConversationNamePolling(finalGuid);
      }, 1000);
    }
  }

  startConversationNamePolling(guid) {
    if (this._activePollGuid === guid) {
      this.lwc.debugLog(
        `Polling already active for GUID: ${guid}. Ignoring duplicate poll request.`
      );
      return;
    }
    this._activePollGuid = guid;
    this.service.pollForConversationNameByIntegrationKey(guid);
  }

  handleSessionIdUpdated(sessionId) {
    if (this.destroyed) return;
    this.lwc.debugLog(`handleSessionIdUpdated received: ${sessionId}`);
    cachedSessionId = sessionId;

    // If active poll key has not been set or is different from the newly resolved sessionId,
    // trigger the poller immediately to override the fallback SCV callId.
    if (this._activePollGuid !== sessionId) {
      this.lwc.debugLog(
        `Telemetry update mapping resolved. Starting poll for: ${sessionId}`
      );
      this.startConversationNamePolling(sessionId);
    }
  }

  async handleCallConnected(event) {
    this.lwc.debugLog(
      `handleCallConnected called with SCV callId: ${event.detail.callId}. Waiting for sessionId...`
    );

    // Wait for sessionId to be populated by Five9 SDK events
    const waitIntervalMs = 100;
    const maxAttempts = (SESSION_ID_WAIT_TIMEOUT_SECONDS * 1000) / waitIntervalMs;
    let attempts = 0;
    while (!cachedSessionId && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, waitIntervalMs));
      attempts++;
    }

    const guid = cachedSessionId || event.detail.callId;
    this.lwc.debugLog(
      `Starting poll for conversation name with Integration Key (SessionId): ${guid} (waited ${attempts * waitIntervalMs}ms)`
    );
    this.startConversationNamePolling(guid);
  }

  getVoiceCallFields() {
    return ["VoiceCall.Five9BYOT__F9_SessionId__c"];
  }

  getSessionId(voiceCallData) {
    return getFieldValue(voiceCallData, "VoiceCall.Five9BYOT__F9_SessionId__c");
  }

  teardown() {
    this.lwc.debugLog("Five9PlatformHandler teardown called");
    this.destroyed = true;
    this._activePollGuid = null;
  }

  async _initializeFive9SDK() {
    this.lwc.debugLog("_initializeFive9SDK called");
    const { SdkStatus } = window.Five9Sdk.SdkTypes;
    this._five9Sdk = window.Five9Sdk.create();

    // BEGIN: The initialization should be done in this order
    this._channelTransportProvider = new ChannelTransportProvider();
    this._five9Sdk.initialize(this._channelTransportProvider);
    this._channelTransportProvider.subscribe();
    // END: The initialization should be done in this order

    const interactionApi = this._five9Sdk.getInteractionApi();
    const hookApi = this._five9Sdk.getHookApi();

    let result = await interactionApi.registerEventHandlers({
      callStarted: (param) => {
        if (this.destroyed) return;
        this.lwc.debugLog(
          "Five9 SDK InteractionApi - callStarted FULL DATA: " +
            JSON.stringify(param)
        );
        const sessionId = param.sessionId || (param.arg && param.arg.sessionId);
        if (sessionId) {
          cachedSessionId = sessionId;
          this.lwc.debugLog(
            `Five9 SDK InteractionApi - Cached sessionId: ${cachedSessionId}`
          );
        }
      },
      callAccepted: (param) => {
        if (this.destroyed) return;
        this.lwc.debugLog(
          "Five9 SDK InteractionApi - callAccepted FULL DATA: " +
            JSON.stringify(param)
        );
        const sessionId = param.sessionId || (param.arg && param.arg.sessionId);
        if (sessionId && !cachedSessionId) {
          cachedSessionId = sessionId;
          this.lwc.debugLog(
            `Five9 SDK InteractionApi - Cached sessionId in callAccepted: ${cachedSessionId}`
          );
        }
      },
      callRejected: (param) => {
        this.lwc.debugLog(
          "Five9 SDK InteractionApi - callRejected FULL DATA: " +
            JSON.stringify(param)
        );
      },
      callEnded: (param) => {
        this.lwc.debugLog(
          "Five9 SDK InteractionApi - callEnded FULL DATA: " +
            JSON.stringify(param)
        );
      },
      callFinished: (param) => {
        this.lwc.debugLog(
          "Five9 SDK InteractionApi - callFinished FULL DATA: " +
            JSON.stringify(param)
        );
        this.closeVoiceCallTab(param.sfVoiceCallId);
      }
    });
    if (result.status !== SdkStatus.Success) {
      console.error(
        "Five9 SDK InteractionApi - registerEventHandlers error",
        result.errorMessage
      );
    }

    result = await hookApi.registerMethods(
      {
        beforeMakeCall: (param) => {
          this.lwc.debugLog("Five9 SDK HookApi - beforeMakeCall", param);
          // Add custom validation or business logic here if needed.
          // Example: Restricting manual dialing or validating campaign selection.
          return Promise.resolve({ status: SdkStatus.Proceed });
        },
        beforeCallDisposition: (param) => {
          this.lwc.debugLog("Five9 SDK HookApi - beforeCallDisposition", param);
          // Add custom validation or business logic here if needed.
          return Promise.resolve({ status: SdkStatus.Proceed });
        },
        beforeCallEnd: (param) => {
          this.lwc.debugLog("Five9 SDK HookApi - beforeCallEnd", param);
          // Add custom validation or business logic here if needed.
          return Promise.resolve({ status: SdkStatus.Proceed });
        }
      },
      20
    );
    if (result.status !== SdkStatus.Success) {
      console.error(
        "Five9 SDK HookApi - registerMethods error",
        result.errorMessage
      );
    }
  }

  async closeVoiceCallTab(sfVoiceCallId) {
    const workspaceAPI = document.querySelector("lightning-workspace-api");
    if (workspaceAPI) {
      const enclosingTabId = await workspaceAPI.getEnclosingTabId();
      if (enclosingTabId) {
        await workspaceAPI.closeTab({ tabId: enclosingTabId });
        return;
      }

      const tabInfo = await workspaceAPI.getAllTabInfo();
      const voiceCallTab = tabInfo.find(
        (tab) => tab.recordId === sfVoiceCallId
      );
      if (voiceCallTab) {
        await workspaceAPI.closeTab({ tabId: voiceCallTab.tabId });
      }
    }
  }
}
