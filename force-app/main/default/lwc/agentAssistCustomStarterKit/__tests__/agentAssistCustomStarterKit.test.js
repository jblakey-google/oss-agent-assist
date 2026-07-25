import { createElement } from "lwc";
import AgentAssistCustomStarterKit from "c/agentAssistCustomStarterKit";

describe("c-agent-assist-custom-starter-kit", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    jest.clearAllMocks();
  });

  test("renders disconnected badge and alert when connector is missing", () => {
    const element = createElement("c-agent-assist-custom-starter-kit", {
      is: AgentAssistCustomStarterKit
    });
    document.body.appendChild(element);

    const badge = element.shadowRoot.querySelector(".status-pill");
    expect(badge).not.toBeNull();
    expect(badge.textContent).toBe("Disconnected");

    const alert = element.shadowRoot.querySelector(".slds-alert_warning");
    expect(alert).not.toBeNull();
    expect(alert.textContent).toContain("Agent Assist Container component missing");
  });

  test("renders connected badge when container component exists on page", () => {
    const mockContainer = document.createElement("c-agent-assist-container");
    document.body.appendChild(mockContainer);

    window.addAgentAssistEventListener = jest.fn();
    window.dispatchAgentAssistEvent = jest.fn();

    const element = createElement("c-agent-assist-custom-starter-kit", {
      is: AgentAssistCustomStarterKit
    });
    document.body.appendChild(element);

    const badge = element.shadowRoot.querySelector(".status-pill");
    expect(badge).not.toBeNull();
    expect(badge.textContent).toBe("Connected");

    delete window.addAgentAssistEventListener;
    delete window.dispatchAgentAssistEvent;
  });
});
