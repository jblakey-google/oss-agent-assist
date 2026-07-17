import { createElement } from '@lwc/engine-dom';
import AgentAssistContainer from 'c/agentAssistContainer';

describe('c-agent-assist-container', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    it('renders agent assist container with default properties', () => {
        const element = createElement('c-agent-assist-container', {
            is: AgentAssistContainer
        });
        element.configName = 'Case_Config';
        element.title = 'Case Assist Test';

        document.body.appendChild(element);

        return Promise.resolve().then(() => {
            const card = element.shadowRoot.querySelector('lightning-card');
            expect(card).not.toBeNull();
        });
    });
});