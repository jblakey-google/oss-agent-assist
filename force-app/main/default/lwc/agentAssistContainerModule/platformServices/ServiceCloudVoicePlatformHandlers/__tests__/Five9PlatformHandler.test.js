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

import Five9PlatformHandler from "../Five9PlatformHandler";
import { createMockLwcComponent } from "../../testUtils";
import { loadScript } from "lightning/platformResourceLoader";
const five9ByotSdk = "/resource/Five9BYOT__five9ByotSdk";

jest.mock("lightning/platformResourceLoader", () => ({
  loadScript: jest.fn().mockResolvedValue()
}));

describe("Five9PlatformHandler", () => {
  let mockLwc;
  let handler;
  let mockService;

  beforeEach(() => {
    // Set up global mock for Five9Sdk
    global.Five9Sdk = {
      SdkTypes: {
        SdkStatus: { Success: "Success", Proceed: "Proceed", Cancel: "Cancel" }
      },
      create: jest.fn().mockReturnValue({
        initialize: jest.fn(),
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

    mockLwc = createMockLwcComponent({
      projectLocationName: "projects/test/locations/test",
      conversationId: null,
      conversationName: null,
      platform: "servicecloudvoice-five9",
      debugLog: jest.fn()
    });
    mockService = {
      lwc: mockLwc,
      pollForConversationNameByIntegrationKey: jest.fn()
    };
    handler = new Five9PlatformHandler(mockService);
  });

  describe("init", () => {
    it("initializes Five9 SDK when platform includes five9", async () => {
      await handler.init();
      expect(global.Five9Sdk.create).toHaveBeenCalled();
    });
  });

  describe("handleCallConnected", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("calls pollForConversationNameByIntegrationKey with callId", async () => {
      const mockEvent = {
        detail: {
          callId: "test-call-id"
        }
      };

      await handler.init();

      const promise = handler.handleCallConnected(mockEvent);

      // Advance timers 50 times to cover the loop
      for (let i = 0; i < 50; i++) {
        jest.advanceTimersByTime(100);
        await Promise.resolve(); // Flush microtasks
      }

      await promise;

      expect(
        mockService.pollForConversationNameByIntegrationKey
      ).toHaveBeenCalledWith("test-call-id");
    });
  });

  describe("late loading fallbacks", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("starts polling immediately in init if sessionId is present", async () => {
      mockLwc.sessionId = "active-session-id";

      await handler.init();

      expect(
        mockService.pollForConversationNameByIntegrationKey
      ).toHaveBeenCalledWith("active-session-id");
    });

    it("starts polling with delay in init if vendorCallKey is present", async () => {
      mockLwc.vendorCallKey = "active-vendor-call-key";

      await handler.init();

      // Polling should not be triggered immediately
      expect(
        mockService.pollForConversationNameByIntegrationKey
      ).not.toHaveBeenCalled();

      // Advance timers by 1 second (1000ms)
      jest.advanceTimersByTime(1000);

      expect(
        mockService.pollForConversationNameByIntegrationKey
      ).toHaveBeenCalledWith("active-vendor-call-key");
    });

    it("prevents duplicate polling for the same GUID", async () => {
      mockLwc.sessionId = "active-session-id";

      await handler.init(); // Starts first poll

      // Manually trigger handleCallConnected which would normally trigger second poll
      const mockEvent = {
        detail: {
          callId: "active-session-id"
        }
      };

      const promise = handler.handleCallConnected(mockEvent);
      // Fast forward the loop wait
      for (let i = 0; i < 50; i++) {
        jest.advanceTimersByTime(100);
        await Promise.resolve();
      }
      await promise;

      // Assert that pollForConversationNameByIntegrationKey was only called ONCE total!
      expect(
        mockService.pollForConversationNameByIntegrationKey
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe("handleSessionIdUpdated", () => {
    it("handles reactive database-backed sessionId resolution during active calls", () => {
      handler.handleSessionIdUpdated("reactive-session-id");

      expect(
        mockService.pollForConversationNameByIntegrationKey
      ).toHaveBeenCalledWith("reactive-session-id");
    });

    it("ignores reactive updates when component is destroyed", () => {
      handler.teardown();
      handler.handleSessionIdUpdated("reactive-session-id");

      expect(
        mockService.pollForConversationNameByIntegrationKey
      ).not.toHaveBeenCalled();
    });

    it("prevents double polling on duplicate reactive updates", () => {
      handler.handleSessionIdUpdated("reactive-session-id");

      // Second update with same ID
      handler.handleSessionIdUpdated("reactive-session-id");

      // Poller should only be launched ONCE
      expect(
        mockService.pollForConversationNameByIntegrationKey
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe("HookApi", () => {
    let registeredHooks;

    beforeEach(async () => {
      await handler.init();
      const registerMethodsMock =
        global.Five9Sdk.create().getHookApi().registerMethods;
      expect(registerMethodsMock).toHaveBeenCalled();
      registeredHooks = registerMethodsMock.mock.calls[0][0];
    });

    describe("beforeMakeCall", () => {
      it("always proceeds and logs the event", async () => {
        const result = await registeredHooks.beforeMakeCall({
          isManualDial: true,
          selectedCampaignId: "0"
        });
        expect(result.status).toBe("Proceed");
      });
    });

    describe("beforeCallDisposition", () => {
      it("always proceeds and logs the event", async () => {
        const result = await registeredHooks.beforeCallDisposition({});
        expect(result.status).toBe("Proceed");
      });
    });

    describe("beforeCallEnd", () => {
      it("always proceeds and logs the event", async () => {
        const result = await registeredHooks.beforeCallEnd({});
        expect(result.status).toBe("Proceed");
      });
    });
  });
});
