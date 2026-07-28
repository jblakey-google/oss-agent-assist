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

export const DEFAULT_DIAGNOSTIC_SECTIONS = [
  {
    id: "ui_connector",
    title: "UI Connector & Network Endpoints",
    subtitle: "Verify HTTPS, WebSocket, and API allowlists in Trusted URLs.",
    iconName: "utility:connected_apps",
    statusBadge: "Checking...",
    badgeVariant: "warning",
    items: [
      {
        id: "check-ui-https",
        label: "Cloud Run HTTPS Endpoint (cloud_run_https)",
        subLabel: "Allowlisted in Trusted URLs (https://*.run.app)",
        status: "pending",
        errorMessage: "",
        assignees: []
      },
      {
        id: "check-ui-wss",
        label: "Cloud Run WebSocket Streaming (cloud_run_wss)",
        subLabel: "Allowlisted in Trusted URLs (wss://*.run.app)",
        status: "pending",
        errorMessage: "",
        assignees: []
      },
      {
        id: "check-ui-gapi",
        label: "Google Cloud APIs Allowlist (googleapi)",
        subLabel: "Allowlisted in Trusted URLs (https://*.googleapis.com)",
        status: "pending",
        errorMessage: "",
        assignees: []
      },
      {
        id: "check-ui-gstatic",
        label: "Google Static UI Module CDN (gstatic)",
        subLabel: "Allowlisted in Trusted URLs (https://www.gstatic.com)",
        status: "pending",
        errorMessage: "",
        assignees: []
      },
      {
        id: "check-ui-twilio",
        label: "Twilio Flex Integration Allowlist (twilio_flex)",
        subLabel: "Allowlisted in Trusted URLs (https://flex.twilio.com)",
        status: "pending",
        errorMessage: "",
        assignees: []
      }
    ]
  },
  {
    id: "auth_tokens",
    title: "Authentication & Security Tokens",
    subtitle:
      "Enumerate administrator and agent permission sets and user assignees.",
    iconName: "utility:key",
    statusBadge: "Checking...",
    badgeVariant: "warning",
    setupUrl: "/lightning/setup/PermSets/home",
    setupUrlLabel: "Permission Sets",
    items: [
      {
        id: "check-perm-admin",
        label: "Agent Assist Administrator (Agent_Assist_Admin)",
        subLabel: "Administrative permission set deployed in org metadata.",
        status: "pending",
        errorMessage: "",
        totalCount: 0,
        assignees: []
      },
      {
        id: "check-perm-user",
        label: "Google Cloud Agent Assist User (Agent_Assist_User)",
        subLabel: "Agent user permission set deployed.",
        status: "pending",
        errorMessage: "",
        totalCount: 0,
        assignees: []
      },
      {
        id: "check-named-credentials",
        label: "Agent Assist Named Credentials (Agent_Assist_*)",
        subLabel: "Named Credentials for secure callout authentication.",
        status: "pending",
        errorMessage: "",
        totalCount: 0,
        assignees: []
      }
    ]
  },
  {
    id: "static_resources",
    title: "Static Resources & UI Module Bundles",
    subtitle:
      "Verify static resource packages for container, transcript, and asset bundles.",
    iconName: "utility:file",
    statusBadge: "Checking...",
    badgeVariant: "warning",
    setupUrl: "/lightning/setup/StaticResources/home",
    setupUrlLabel: "Static Resources",
    items: [
      {
        id: "check-sr-modules",
        label: "UI Modules Bundle (ui_modules.zip)",
        subLabel:
          "Verified JavaScript bundle (container.js, transcript.js, common.js, companion_agent.js).",
        status: "pending",
        errorMessage: "",
        setupUrl: "/lightning/setup/StaticResources/home",
        assignees: []
      }
    ]
  },
  {
    id: "omnichannel",
    title: "Omni-Channel Presence & Routing",
    subtitle:
      "Presence statuses and queue routing configurations for agent dispatch.",
    iconName: "utility:user",
    statusBadge: "Checking...",
    badgeVariant: "warning",
    setupUrl: "/lightning/setup/ServicePresenceStatusSettings/home",
    setupUrlLabel: "Omni-Channel",
    items: [
      {
        id: "check-presence-messaging",
        label: "Online Messaging Status (Online_Messaging)",
        subLabel: "Deployed Omni-Channel presence status active in org.",
        status: "pending",
        errorMessage: "",
        setupUrl: "/lightning/setup/ServicePresenceStatusSettings/home",
        assignees: []
      },
      {
        id: "check-presence-busy",
        label: "Busy Presence Status (Busy)",
        subLabel: "Deployed Omni-Channel presence status active in org.",
        status: "pending",
        errorMessage: "",
        setupUrl: "/lightning/setup/ServicePresenceStatusSettings/home",
        assignees: []
      },
      {
        id: "check-qrc-messaging",
        label: "Messaging Routing Config (Messaging_Routing_Configuration)",
        subLabel: "Deployed Omni-Channel routing configuration active.",
        status: "pending",
        errorMessage: "",
        setupUrl: "/lightning/setup/QueueRoutingConfigSettings/home",
        assignees: []
      },
      {
        id: "check-queues-messaging",
        label: "Messaging Queue (Messaging_Queue)",
        subLabel: "Deployed Omni-Channel messaging queue active in org.",
        status: "pending",
        errorMessage: "",
        setupUrl: "/lightning/setup/Queues/home",
        assignees: []
      }
    ]
  },
  {
    id: "schema",
    title: "Custom Metadata Objects & Schemas",
    subtitle:
      "Agent_Assist_Config__c database storage and active profile records.",
    iconName: "utility:database",
    statusBadge: "Checking...",
    badgeVariant: "warning",
    items: [
      {
        id: "check-db-schema",
        label: "Agent_Assist_Config__c Custom Object",
        subLabel: "Active database schema supporting configuration profiles.",
        status: "pending",
        errorMessage: "",
        assignees: []
      }
    ]
  },
  {
    id: "installed_packages",
    title: "Installed Contact Center (CX) Packages",
    subtitle:
      "Checks for required third-party telephony/CTI packages in Salesforce.",
    iconName: "utility:package",
    statusBadge: "Checking...",
    badgeVariant: "warning",
    setupUrl: "/lightning/setup/ImportedPackage/home",
    setupUrlLabel: "Packages",
    items: [
      {
        id: "check-pkg-five9",
        label: "Salesforce voice integration with Five9 (Five9 Fusion)",
        subLabel: "Package Five9 Fusion (04tTN000000C1rZYAS)",
        status: "pending",
        errorMessage: "",
        setupUrl:
          "https://appexchange.salesforce.com/appxListingDetail?listingId=a0N4V00000GuYVdUAN"
      },
      {
        id: "check-pkg-twilio",
        label:
          "Salesforce voice integration with Twilio Flex (Twilio Flex CTI)",
        subLabel: "Package Twilio Flex CTI (04t8Z0000012JNXQA2)",
        status: "pending",
        errorMessage: "",
        setupUrl:
          "https://appexchange.salesforce.com/appxListingDetail?listingId=175e1542-c700-459c-8f9b-6fcb1bce7a14"
      },
      {
        id: "check-pkg-nice",
        label: "Salesforce voice integration with NICE CXone (NICE CXone)",
        subLabel: "Package NICE CXone (04tUi000000L76XIAS)",
        status: "pending",
        errorMessage: "",
        setupUrl:
          "https://appexchange.salesforce.com/appxListingDetail?listingId=a0N4V00000GZ7AuUAL"
      },
      {
        id: "check-pkg-genesys",
        label:
          "Salesforce voice integration with Genesys Cloud CX (Genesys Cloud CX)",
        subLabel: "Package Genesys Cloud CX (04tQp000000ngyzIAA)",
        status: "pending",
        errorMessage: "",
        setupUrl:
          "https://appexchange.salesforce.com/appxListingDetail?listingId=7f59a36f-86c0-4cac-b8af-2c1722ede4d1"
      }
    ]
  }
];

export const CHAT_PLATFORM_OPTIONS = [
  { label: "Base Platform (Direct API Connector)", value: "base" },
  { label: "Salesforce chat integration", value: "messaging" }
];

export const VOICE_PLATFORM_OPTIONS = [
  {
    label: "Salesforce voice integration with Twilio Flex",
    value: "twilioflex"
  },
  {
    label: "Salesforce voice integration with NICE CXone",
    value: "servicecloudvoice-nice"
  },
  {
    label: "Salesforce voice integration with Five9",
    value: "servicecloudvoice-byot-five9"
  }
];

export const CHANNEL_OPTIONS = [
  { label: "Chat (Digital Messaging)", value: "chat" },
  { label: "Voice (Telephony)", value: "voice" }
];

export const INITIAL_PROFILES = [
  {
    id: "mock-1",
    name: "Default Profile",
    developerName: "Default",
    profileType: "Container",
    title: "Google Cloud Agent Assist",
    endpointUrl: "https://ui-connector-{id}.{region}.run.app",
    conversationProfile:
      "projects/{project-id}/locations/{location-id}/conversationProfiles/{profile-id}",
    channel: "chat",
    platform: "base",
    consumerKey: "",
    consumerSecret: "",
    clientCredentialsUser: "",
    containerHeight: "530px",
    debugMode: true,
    showDarkModeToggle: true,
    showHeader: false,
    showCorrectnessFeedback: false,
    disableIntegratedTranscript: false,
    modelName: "gemini-1.5-pro",
    welcomeMessage: "Hello! I am your AI Companion Agent.",
    enableAutonomousActions: true,
    isActive: true
  },
  {
    id: "mock-2",
    name: "Default Companion Agent",
    developerName: "Default_Companion",
    profileType: "Companion Agent",
    title: "Google Cloud Companion Agent",
    endpointUrl: "https://ui-connector-{id}.{region}.run.app",
    conversationProfile:
      "projects/{project-id}/locations/{location-id}/conversationProfiles/{profile-id}",
    channel: "chat",
    platform: "base",
    consumerKey: "",
    consumerSecret: "",
    clientCredentialsUser: "",
    containerHeight: "530px",
    debugMode: true,
    showDarkModeToggle: true,
    showHeader: false,
    showCorrectnessFeedback: false,
    disableIntegratedTranscript: false,
    modelName: "gemini-1.5-pro",
    welcomeMessage:
      "Hello! I am your AI Companion Agent. How can I assist you with this record today?",
    enableAutonomousActions: true,
    isActive: true
  }
];

export const PERMISSION_SET_OPTIONS = [
  {
    label: "Google Cloud Agent Assist User (Agent_Assist_User)",
    value: "Agent_Assist_User"
  },
  {
    label: "Google Cloud Agent Assist Administrator (Agent_Assist_Admin)",
    value: "Agent_Assist_Admin"
  },
  {
    label: "Google Cloud Agent Assist Messaging User (Agent_Assist_Messaging_User)",
    value: "Agent_Assist_Messaging_User"
  }
];

export const PERMISSION_SET_CONFIG = {
  Agent_Assist_User: {
    label: "Google Cloud Agent Assist User",
    description:
      "Grants contact center agents access to Google Cloud Agent Assist and Companion Agent LWC components in Salesforce."
  },
  Agent_Assist_Admin: {
    label: "Google Cloud Agent Assist Administrator",
    description:
      "Grants full administrative privileges to configure LWC profiles, manage settings, and access the Integration Setup Wizard in Salesforce."
  },
  Agent_Assist_Messaging_User: {
    label: "Google Cloud Agent Assist Messaging User",
    description:
      "Grants messaging users access to Enhanced Chat and messaging channel events for Agent Assist integration."
  }
};

export const STATUS_PILL_CLASSES = {
  pass: "status-pill status-pill_pass",
  warning: "status-pill status-pill_warn",
  fail: "status-pill status-pill_fail",
  error: "status-pill status-pill_fail",
  pending: "status-pill status-pill_pending"
};

export const STATUS_LED_CLASSES = {
  pass: "status-led status-led_pass",
  warning: "status-led status-led_warn",
  fail: "status-led status-led_fail",
  error: "status-led status-led_fail",
  pending: "status-led status-led_pending"
};

export const STATUS_ICONS = {
  pending: "utility:sync",
  error: "utility:error",
  warning: "utility:warning",
  healthy: "utility:success",
  pass: "utility:success"
};

export const STATUS_LABELS = {
  pending: "Checking...",
  error: "Action Required",
  warning: "Attention Needed",
  pass: "OK",
  healthy: "OK"
};
