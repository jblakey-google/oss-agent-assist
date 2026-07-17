import { LightningElement, api, wire, track } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getResolvedConfig from '@salesforce/apex/AgentAssistConfigController.getResolvedConfig';

export default class AgentAssistContainer extends LightningElement {
    // Standard Record Page context properties provided by Salesforce
    @api recordId;
    @api objectApiName;

    // XML App Builder Design Properties (Configured in FlexiPage XML)
    @api configName = 'Default';
    @api title;
    @api showSuggestions = false;
    @api enableAutoAssist = false;

    // Component Reactive State
    @track resolvedState = {};
    @track isLoading = true;
    @track showConfigDetails = false;
    wiredConfigResult;

    @wire(getResolvedConfig, {
        configName: '$configName',
        objectApiName: '$objectApiName',
        xmlTitle: '$title',
        xmlShowSuggestions: '$showSuggestionsOverride',
        xmlEnableAutoAssist: '$enableAutoAssistOverride'
    })
    wiredConfig(result) {
        this.wiredConfigResult = result;
        const { data, error } = result;
        this.isLoading = false;
        if (data) {
            this.resolvedState = data;
        } else if (error) {
            // Fallback gracefully if Apex is unreachable or record is not yet deployed
            this.resolvedState = {
                title: this.title || 'Agent Assist',
                developerName: this.configName || 'Default',
                endpointUrl: 'https://api.agentassist.example.com/v1',
                showSuggestions: this.showSuggestions !== undefined ? this.showSuggestions : true,
                enableAutoAssist: this.enableAutoAssist !== undefined ? this.enableAutoAssist : true,
                resolutionSource: 'Fallback Local State'
            };
        }
    }

    get showSuggestionsOverride() {
        return this.showSuggestions ? true : null;
    }

    get enableAutoAssistOverride() {
        return this.enableAutoAssist ? true : null;
    }

    get isUtilityBar() {
        return !this.recordId && !this.objectApiName;
    }

    get contextBadgeLabel() {
        if (this.objectApiName) {
            return `${this.objectApiName} Record`;
        }
        return 'Utility Bar';
    }

    get resolvedTitle() {
        return this.resolvedState?.title || this.title || 'Agent Assist';
    }

    get activeProfileName() {
        return this.resolvedState?.developerName || this.configName || 'Default';
    }

    get resolutionSource() {
        return this.resolvedState?.resolutionSource || 'XML Defaults';
    }

    get resolvedEndpoint() {
        return this.resolvedState?.endpointUrl || 'https://api.agentassist.example.com/v1';
    }

    get resolvedShowSuggestions() {
        return this.resolvedState?.showSuggestions ?? this.showSuggestions;
    }

    get resolvedEnableAutoAssist() {
        return this.resolvedState?.enableAutoAssist ?? this.enableAutoAssist;
    }

    get autoAssistStatusText() {
        return this.resolvedEnableAutoAssist ? 'Enabled' : 'Disabled';
    }

    get suggestionsStatusText() {
        return this.resolvedShowSuggestions ? 'Enabled' : 'Disabled';
    }

    get activeContextDescription() {
        if (this.objectApiName && this.recordId) {
            return `${this.objectApiName} (${this.recordId.substring(0, 8)}...)`;
        }
        return 'Global Utility Session';
    }

    get noFeaturesEnabled() {
        return !this.resolvedShowSuggestions && !this.resolvedEnableAutoAssist;
    }

    get toggleDetailsLabel() {
        return this.showConfigDetails ? 'Hide Architecture Details' : 'View Architecture Details';
    }

    toggleConfigDetails() {
        this.showConfigDetails = !this.showConfigDetails;
    }

    handleRefresh() {
        this.isLoading = true;
        if (this.wiredConfigResult) {
            refreshApex(this.wiredConfigResult)
                .finally(() => {
                    this.isLoading = false;
                });
        } else {
            this.isLoading = false;
        }
    }

    handleTriggerAssist() {
        this.dispatchEvent(
            new ShowToastEvent({
                title: 'Agent Assist Triggered',
                message: `Synthesizing assistance for ${this.activeContextDescription} using profile [${this.activeProfileName}]`,
                variant: 'success'
            })
        );
    }
}