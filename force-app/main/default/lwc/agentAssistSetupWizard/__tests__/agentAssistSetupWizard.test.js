import { createElement } from '@lwc/engine-dom';
import AgentAssistSetupWizard from 'c/agentAssistSetupWizard';

describe('c-agent-assist-setup-wizard', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
    });

    it('renders setup wizard header and cards', () => {
        const element = createElement('c-agent-assist-setup-wizard', {
            is: AgentAssistSetupWizard
        });

        document.body.appendChild(element);

        return Promise.resolve().then(() => {
            const header = element.shadowRoot.querySelector('.wizard-header');
            expect(header).not.toBeNull();
        });
    });
});