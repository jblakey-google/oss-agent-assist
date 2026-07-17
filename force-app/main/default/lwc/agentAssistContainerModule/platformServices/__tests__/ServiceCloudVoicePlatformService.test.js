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

import ServiceCloudVoicePlatformService from "../ServiceCloudVoicePlatformService";
import {
  setupPlatformServiceTest,
  createMockLwcComponent,
  createMockRefs
} from "../testUtils";

jest.mock("lightning/platformResourceLoader", () => ({
  loadScript: jest.fn().mockImplementation(() => {
    // Simulate Five9 SDK loading by populating global.Five9Sdk
    global.Five9Sdk = {
      SdkTypes: {
        SdkStatus: { Success: "Success", Proceed: "Proceed", Cancel: "Cancel" }
      },
      create: jest.fn().mockReturnValue({
        initialize: jest.fn(),
        destroy: jest.fn(),
        getInteractionApi: jest.fn().mockReturnValue({
          registerEventHandlers: jest
            .fn()
            .mockResolvedValue({ status: "Success" })
        }),
        getHookApi: jest.fn().mockReturnValue({
          registerMethods: jest.fn().mockResolvedValue({ status: "Success" })
        })
      })
    };
    return Promise.resolve();
  })
}));

describe("ServiceCloudVoicePlatformService", () => {
  let mockLwc;
  let mockRefs;
  let serviceCloudVoicePlatformService;

  setupPlatformServiceTest();

  beforeEach(() => {
    mockLwc = createMockLwcComponent({
      vendorCallKey: "test-call-key",
      platform: "servicecloudvoice-nice",
      projectLocationName: "projects/test/locations/test",
      conversationId: null,
      conversationName: null,
      debugMode: false,
      debugLog: jest.fn(),
      recordId: "test-record-id",
      conversationProfile:
        "projects/test/locations/test/conversationProfiles/test",
      token: "test-token",
      endpoint: "https://test-endpoint.com",
      consumerKey: "test-key",
      consumerSecret: "test-secret",
      channel: "voice",
      showTranscript: true,
      loadError: null,
      refs: {
        transcriptContainer: {
          classList: {
            add: jest.fn(),
            remove: jest.fn()
          }
        },
        agentAssistTranscript: {
          appendChild: jest.fn()
        },
        agentAssistContainer: {
          appendChild: jest.fn(),
          classList: {
            add: jest.fn(),
            remove: jest.fn()
          }
        }
      }
    });

    mockRefs = createMockRefs({
      serviceCloudVoiceToolkitApi: {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      }
    });

    serviceCloudVoicePlatformService = new ServiceCloudVoicePlatformService(
      mockLwc,
      mockRefs
    );
  });

  afterEach(() => {});

  describe("constructor", () => {
    it("initializes with lwc and refs parameters", () => {
      expect(serviceCloudVoicePlatformService.lwc).toBe(mockLwc);
      expect(serviceCloudVoicePlatformService.refs).toBe(mockRefs);
      expect(
        serviceCloudVoicePlatformService.telephonyEventListener
      ).toBeDefined();
    });
  });

  describe("init", () => {
    it("executes without errors", () => {
      expect(() => {
        serviceCloudVoicePlatformService.init();
      }).not.toThrow();
    });

    it("logs initServiceCloudVoice call", () => {
      serviceCloudVoicePlatformService.init();
      expect(mockLwc.debugLog).toHaveBeenCalledWith(
        "initServiceCloudVoice called"
      );
    });

    it("logs vendorCallKey", () => {
      serviceCloudVoicePlatformService.init();
      expect(mockLwc.debugLog).toHaveBeenCalledWith(
        "this.lwc.vendorCallKey: test-call-key"
      );
    });

    it("subscribes to voice toolkit events when toolkitApi exists", () => {
      serviceCloudVoicePlatformService.init();

      expect(mockLwc.debugLog).toHaveBeenCalledWith(
        "subscribeToVoiceToolkit: callconnected,callended"
      );
      expect(
        mockRefs.serviceCloudVoiceToolkitApi.addEventListener
      ).toHaveBeenCalledWith("callconnected", expect.any(Function));
      expect(
        mockRefs.serviceCloudVoiceToolkitApi.addEventListener
      ).toHaveBeenCalledWith("callended", expect.any(Function));
    });
  });

  describe("teardown", () => {
    // It's difficult to test the full functionality of `super.teardown()` without complex mocking.
    // These tests simply ensure the method is defined and doesn't crash, which is sufficient for now.
    it("executes without errors", () => {
      expect(serviceCloudVoicePlatformService.teardown).toBeDefined();
    });

    it("calls super.teardown()", () => {
      expect(serviceCloudVoicePlatformService.teardown).toBeDefined();
    });

    it("calls teardown on platformHandler", () => {
      const mockHandler = { teardown: jest.fn() };
      serviceCloudVoicePlatformService.platformHandler = mockHandler;
      serviceCloudVoicePlatformService.teardown();
      expect(mockHandler.teardown).toHaveBeenCalled();
    });
  });

  describe("subscribeToVoiceToolkit", () => {
    it("subscribes to SCV events", () => {
      const mockToolkitApi = {
        addEventListener: jest.fn()
      };

      serviceCloudVoicePlatformService.subscribeToVoiceToolkit(
        mockToolkitApi,
        jest.fn()
      );

      expect(mockToolkitApi.addEventListener).toHaveBeenCalledWith(
        "callconnected",
        expect.any(Function)
      );
      expect(mockToolkitApi.addEventListener).toHaveBeenCalledWith(
        "callended",
        expect.any(Function)
      );
    });
  });

  describe("unsubscribeFromVoiceToolkit", () => {
    it("unsubscribes from SCV events", () => {
      const mockToolkitApi = {
        removeEventListener: jest.fn()
      };

      serviceCloudVoicePlatformService.unsubscribeFromVoiceToolkit(
        mockToolkitApi,
        jest.fn()
      );

      expect(mockToolkitApi.removeEventListener).toHaveBeenCalledWith(
        "callconnected",
        expect.any(Function)
      );
      expect(mockToolkitApi.removeEventListener).toHaveBeenCalledWith(
        "callended",
        expect.any(Function)
      );
    });
  });

  describe("onTelephonyEvent", () => {
    beforeEach(() => {
      // Mock initUIModules to isolate the logic of onTelephonyEvent.
      serviceCloudVoicePlatformService.initUIModules = jest.fn();
    });

    it("logs the telephony event", () => {
      const mockEvent = {
        type: "callconnected",
        detail: {
          callId: "test-call-key"
        }
      };

      serviceCloudVoicePlatformService.onTelephonyEvent(mockEvent);

      expect(mockLwc.debugLog).toHaveBeenCalledWith(
        `[onTelephonyEvent callconnected]: ${JSON.stringify(mockEvent)}`
      );
    });

    it("handles call connected when call ID matches and platform includes 'nice'", () => {
      const mockEvent = {
        type: "callconnected",
        detail: {
          callId: "test-call-key"
        }
      };
      const handleSpy = jest.spyOn(
        serviceCloudVoicePlatformService.platformHandler,
        "handleCallConnected"
      );
      serviceCloudVoicePlatformService.onTelephonyEvent(mockEvent);
      expect(handleSpy).toHaveBeenCalledWith(mockEvent);
    });

    it("handles call connected when call ID matches and platform includes 'five9'", () => {
      mockLwc.platform = "servicecloudvoice-five9";
      serviceCloudVoicePlatformService = new ServiceCloudVoicePlatformService(
        mockLwc,
        mockRefs
      );
      const spy = jest
        .spyOn(
          serviceCloudVoicePlatformService.platformHandler,
          "handleCallConnected"
        )
        .mockImplementation(() => {});
      const mockEvent = {
        type: "callconnected",
        detail: {
          callId: "test-call-key"
        }
      };
      serviceCloudVoicePlatformService.onTelephonyEvent(mockEvent);
      expect(spy).toHaveBeenCalledWith(mockEvent);
    });

    it("logs unsupported platform message when platform does not include 'nice' or 'five9'", () => {
      mockLwc.platform = "servicecloudvoice-other";
      serviceCloudVoicePlatformService = new ServiceCloudVoicePlatformService(
        mockLwc,
        mockRefs
      );
      const mockEvent = {
        type: "callconnected",
        detail: {
          callId: "test-call-key"
        }
      };

      serviceCloudVoicePlatformService.onTelephonyEvent(mockEvent);

      expect(mockLwc.debugLog).toHaveBeenCalledWith(
        "Unsupported SCV telephony platform."
      );
    });

    it("does not generate conversation name when call ID does not match", () => {
      const mockEvent = {
        type: "callconnected",
        detail: {
          callId: "different-call-key"
        }
      };

      const handleSpy = jest.spyOn(
        serviceCloudVoicePlatformService.platformHandler,
        "handleCallConnected"
      );
      serviceCloudVoicePlatformService.onTelephonyEvent(mockEvent);

      expect(handleSpy).not.toHaveBeenCalled();
    });

    it("triggers summarization on callended event", () => {
      mockLwc.triggerSummarization = jest.fn();
      const mockEvent = {
        type: "callended",
        detail: {
          callId: "test-call-key"
        }
      };
      serviceCloudVoicePlatformService.onTelephonyEvent(mockEvent);
      expect(mockLwc.triggerSummarization).toHaveBeenCalled();
    });

    it("does not trigger summarization on callended event if callId does not match", () => {
      mockLwc.triggerSummarization = jest.fn();
      const mockEvent = {
        type: "callended",
        detail: {
          callId: "different-call-key"
        }
      };
      serviceCloudVoicePlatformService.onTelephonyEvent(mockEvent);
      expect(mockLwc.triggerSummarization).not.toHaveBeenCalled();
    });
  });

  describe("NicePlatformHandler", () => {
    it("generates conversation name with proper format for Nice platform", () => {
      const mockEvent = {
        detail: {
          callId: "test-call-id"
        }
      };

      serviceCloudVoicePlatformService.platformHandler.handleCallConnected(
        mockEvent
      );

      const idPattern = /^BusNo-(?:\d{7}|)_ContactId-test-call-id$/;
      expect(mockLwc.conversationId).toMatch(idPattern);
      expect(mockLwc.conversationName).toMatch(
        /^projects\/test\/locations\/test\/conversations\/BusNo-(?:\d{7}|)_ContactId-test-call-id$/
      );
    });
  });

  describe("handleSessionIdUpdated", () => {
    it("delegates to platformHandler", () => {
      const mockHandler = { handleSessionIdUpdated: jest.fn() };
      serviceCloudVoicePlatformService.platformHandler = mockHandler;
      serviceCloudVoicePlatformService.handleSessionIdUpdated(
        "test-session-id"
      );
      expect(mockHandler.handleSessionIdUpdated).toHaveBeenCalledWith(
        "test-session-id"
      );
    });
  });
});
