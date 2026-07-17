import { LightningElement, track, wire } from 'lwc';
import { refreshApex } from '@salesforce/apex';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getAllConfigs from '@salesforce/apex/AgentAssistConfigController.getAllConfigs';
import saveConfig from '@salesforce/apex/AgentAssistConfigController.saveConfig';
import deleteConfig from '@salesforce/apex/AgentAssistConfigController.deleteConfig';

const INITIAL_PROFILES = [
    {
        id: 'mock-1',
        name: 'Default Global Profile',
        developerName: 'Default',
        title: 'Global Agent Assist',
        endpointUrl: 'https://api.agentassist.example.com/v1',
        targetObject: 'Global',
        enableAutoAssist: true,
        showSuggestions: true,
        isActive: true
    },
    {
        id: 'mock-2',
        name: 'Case Support Profile',
        developerName: 'Case_Config',
        title: 'Case Resolution Assist',
        endpointUrl: 'https://api.agentassist.example.com/case',
        targetObject: 'Case',
        enableAutoAssist: true,
        showSuggestions: true,
        isActive: true
    },
    {
        id: 'mock-3',
        name: 'Contact Sales Profile',
        developerName: 'Contact_Config',
        title: 'Contact Insights & Assist',
        endpointUrl: 'https://api.agentassist.example.com/contact',
        targetObject: 'Contact',
        enableAutoAssist: false,
        showSuggestions: true,
        isActive: true
    },
    {
        id: 'mock-4',
        name: 'Messaging Live Profile',
        developerName: 'MessagingSession_Config',
        title: 'Live Chat Assist',
        endpointUrl: 'https://api.agentassist.example.com/messaging',
        targetObject: 'MessagingSession',
        enableAutoAssist: true,
        showSuggestions: true,
        isActive: true
    }
];

export default class AgentAssistSetupWizard extends LightningElement {
    @track profiles = [...INITIAL_PROFILES];
    @track selectedDevName = 'Default';
    @track currentProfile = { ...INITIAL_PROFILES[0] };
    wiredConfigsResult;

    targetObjectOptions = [
        { label: 'Global / Utility Bar', value: 'Global' },
        { label: 'Contact Record Page', value: 'Contact' },
        { label: 'Case Record Page', value: 'Case' },
        { label: 'Messaging Session Record Page', value: 'MessagingSession' }
    ];

    @wire(getAllConfigs)
    wiredConfigs(result) {
        this.wiredConfigsResult = result;
        const { data } = result;
        if (data && data.length > 0) {
            this.profiles = data.map((item) => ({
                id: item.Id,
                name: item.Name,
                developerName: item.Developer_Name__c,
                title: item.Title__c,
                endpointUrl: item.Endpoint_URL__c,
                targetObject: item.Target_Object__c || 'Global',
                enableAutoAssist: item.Enable_Auto_Assist__c,
                showSuggestions: item.Show_Suggestions__c,
                isActive: item.Is_Active__c
            }));
            this.selectProfileByDevName(this.selectedDevName);
        }
    }

    get profileList() {
        return this.profiles.map((prof) => {
            const isSelected = prof.developerName === this.selectedDevName;
            return {
                ...prof,
                cssClass: `profile-item slds-p-around_small slds-m-bottom_x-small ${
                    isSelected ? 'profile-item_active' : ''
                }`,
                badgeClass: `slds-badge ${
                    prof.targetObject === 'Case' ? 'slds-theme_warning' : 'slds-badge_lightest'
                }`
            };
        });
    }

    get editorCardTitle() {
        return `Edit Profile: ${this.currentProfile?.name || 'New Profile'}`;
    }

    get isDefaultProfile() {
        return this.currentProfile?.developerName === 'Default';
    }

    selectProfileByDevName(devName) {
        const found = this.profiles.find((p) => p.developerName === devName);
        if (found) {
            this.selectedDevName = found.developerName;
            this.currentProfile = { ...found };
        } else if (this.profiles.length > 0) {
            this.selectedDevName = this.profiles[0].developerName;
            this.currentProfile = { ...this.profiles[0] };
        }
    }

    handleSelectProfile(event) {
        const devName = event.currentTarget.dataset.id;
        this.selectProfileByDevName(devName);
    }

    handleFieldChange(event) {
        const field = event.target.dataset.field;
        const value = event.target.type === 'toggle' ? event.target.checked : event.target.value;
        this.currentProfile = {
            ...this.currentProfile,
            [field]: value
        };
    }

    handleNewProfile() {
        const newProf = {
            id: 'temp-' + Date.now(),
            name: 'New Custom Profile',
            developerName: 'Custom_Config_' + Math.floor(Math.random() * 1000),
            title: 'Custom Agent Assist',
            endpointUrl: 'https://api.agentassist.example.com/v1',
            targetObject: 'Global',
            enableAutoAssist: true,
            showSuggestions: true,
            isActive: true
        };
        this.profiles = [newProf, ...this.profiles];
        this.selectProfileByDevName(newProf.developerName);
    }

    handleReset() {
        this.selectProfileByDevName(this.selectedDevName);
    }

    async handleSaveProfile() {
        try {
            const payload = {
                sobjectType: 'Agent_Assist_Config__c',
                Name: this.currentProfile.name,
                Developer_Name__c: this.currentProfile.developerName,
                Title__c: this.currentProfile.title,
                Endpoint_URL__c: this.currentProfile.endpointUrl,
                Target_Object__c: this.currentProfile.targetObject,
                Enable_Auto_Assist__c: this.currentProfile.enableAutoAssist,
                Show_Suggestions__c: this.currentProfile.showSuggestions,
                Is_Active__c: true
            };

            if (this.currentProfile.id && !this.currentProfile.id.startsWith('temp-') && !this.currentProfile.id.startsWith('mock-')) {
                payload.Id = this.currentProfile.id;
            }

            const saved = await saveConfig({ configRecord: payload });
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Configuration Saved',
                    message: `Profile state for "${this.currentProfile.name}" (${this.currentProfile.developerName}) was saved successfully.`,
                    variant: 'success'
                })
            );

            if (this.wiredConfigsResult) {
                await refreshApex(this.wiredConfigsResult);
            }
        } catch (error) {
            // Local state fallback update if DB record save is offline in dev preview
            const idx = this.profiles.findIndex((p) => p.developerName === this.currentProfile.developerName);
            if (idx >= 0) {
                this.profiles[idx] = { ...this.currentProfile };
                this.profiles = [...this.profiles];
            }
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Profile Updated (Local State)',
                    message: `Saved "${this.currentProfile.name}" locally. Deploy metadata to save directly to Salesforce DB.`,
                    variant: 'info'
                })
            );
        }
    }

    async handleDeleteProfile() {
        if (this.isDefaultProfile) return;
        try {
            if (this.currentProfile.id && !this.currentProfile.id.startsWith('temp-') && !this.currentProfile.id.startsWith('mock-')) {
                await deleteConfig({ configId: this.currentProfile.id });
            }
            this.profiles = this.profiles.filter((p) => p.developerName !== this.currentProfile.developerName);
            this.selectProfileByDevName(this.profiles[0]?.developerName || 'Default');
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Profile Deleted',
                    message: 'Configuration profile removed.',
                    variant: 'warning'
                })
            );
            if (this.wiredConfigsResult) {
                refreshApex(this.wiredConfigsResult);
            }
        } catch (error) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error Deleting Profile',
                    message: error.body ? error.body.message : error.message,
                    variant: 'error'
                })
            );
        }
    }
}