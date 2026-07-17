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

import { createElement } from "@lwc/engine-dom";
import AgentAssistSetupWizard from "c/agentAssistSetupWizard";

describe("c-agent-assist-setup-wizard", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it("renders setup wizard header and tabset", () => {
    const element = createElement("c-agent-assist-setup-wizard", {
      is: AgentAssistSetupWizard
    });

    document.body.appendChild(element);

    return Promise.resolve().then(() => {
      const header = element.shadowRoot.querySelector(".wizard-header-clean");
      expect(header).not.toBeNull();
      const tabset = element.shadowRoot.querySelector("lightning-tabset");
      expect(tabset).not.toBeNull();
    });
  });
});
