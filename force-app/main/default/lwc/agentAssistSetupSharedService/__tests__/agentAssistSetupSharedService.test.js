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

import {
  isValidEndpointUrl,
  formatEndpointStatusResult,
  validateRegisterPrerequisites,
  performEndpointHealthCheck,
  performRegisterEndpointHealthCheck
} from "../agentAssistSetupSharedService";

describe("agentAssistSetupSharedService", () => {
  it("validates endpoint URLs correctly", () => {
    expect(isValidEndpointUrl("").valid).toBe(false);
    expect(isValidEndpointUrl("invalid-url").valid).toBe(false);
    expect(isValidEndpointUrl("https://example.com").valid).toBe(true);
    expect(isValidEndpointUrl("callout:MyNamedCred").valid).toBe(true);
  });

  it("formats endpoint status results into pass/warn/fail status objects", () => {
    expect(formatEndpointStatusResult(200).state).toBe("pass");
    expect(formatEndpointStatusResult(404).state).toBe("warning");
    expect(formatEndpointStatusResult(500).state).toBe("fail");
  });

  it("validates register prerequisites correctly", () => {
    const valid = validateRegisterPrerequisites("https://example.com", 200, "pass", "200 OK");
    expect(valid.canProceed).toBe(true);

    const invalidUrl = validateRegisterPrerequisites("", 0, "pending", "");
    expect(invalidUrl.canProceed).toBe(false);
  });

  it("performs endpoint health check via Apex fallback when fetch is unavailable", async () => {
    const mockApex = jest.fn().mockResolvedValue({
      statusCode: 200,
      status: "pass",
      statusLabel: "200 OK",
      message: "Healthy"
    });

    const res = await performEndpointHealthCheck("callout:MyNamedCred", mockApex);
    expect(res.state).toBe("pass");
  });

  it("performs register endpoint health check with auth params", async () => {
    const mockRegister = jest.fn().mockResolvedValue({
      status: "success",
      token: "mock-jwt-token"
    });

    const res = await performRegisterEndpointHealthCheck(
      {
        configName: "Default",
        endpointUrl: "https://example.com",
        consumerKey: "key",
        consumerSecret: "secret"
      },
      mockRegister
    );

    expect(res.state).toBe("pass");
    expect(res.code).toBe(200);
  });
});
