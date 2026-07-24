## Tasks

- [ ] Test with various SF licenses, using the project-scratch-def.json.
- [ ] To the CX Platform Setup tab, add deep links to the page where the LWC can go for each platform. (e.g. Messaging Session, Contact/Case, Voice Call)

- [ ] Individual platform integrations should change the shape of the Agents permission set, so only 1 permission set is needed for any, or all of them. But since they may require an additional license, this must happen in the CX Platform panel, after they have enabled said feature/license.

## Doing

## Done

- [x] Add CX Platform Setup accordion logos. Use the SVGs in the static resource folder.
- [x] Test standalone transcript using the .
- [x] Everywhere in the codebase, LWC templates with inline HTML elements should be surrounded with &#32;, not spaces
- [x] Create a toggle that allows disabling the integrated chat transcript and suggests using the standalone LWC instead.
- [x] Create a standalone Transcript LWC.
- [x] Update Messaging for In-App and Web to "Enhanced Chat" Throughout
  - [x] Create a CL to make this update in the public docs: MIAW -> "Enhanced Chat"
- [x] Perhaps we should call them LWC Configuration Profiles, to disambiguate from Conversation Profiles (which are configured in the Agent Assist Admin Console).
- [x] Active Tab persistence not working
- [x] Platform integration progress accordions
  - [x] Add links to the AgentExchange package each depends on.
  - [x] Use Apex to check installed packages for the specific package id required by each integration.
  - [x] Five9 Fusion: 04tTN000000C1rZYAS
  - [x] Twilio Flex CTI: 04t8Z0000012JNXQA2
  - [x] Nice CXOne: 04tUi000000L76XIAS
  - [x] Genesys Cloud CX: 04tQp000000ngyzIAA
- [x] Simulator
  - [x] Chat inputs for simulator.
  - [x] "Skip" or "SalesforceLWC" should work for auth.
  - [x] "Skip" should work for base/simulator without ECA details
- [x] Add https://docs.cloud.google.com/agent-assist/docs/backend-module-install#customize_the_user_authentication_method documentation near ECA configuration.
- [x] Current tab persistence on reload
- [x] Use an Apex callout to handle register/ request, this would improve the security posture of the auth flow which currently uses the client credentials flow from the browser which, although authenticated in SF, is an antipattern as it exposes the ECA creds in the browser. This can be prevented by using an Apex callout, specifically for register/. Once you have a JWT, should be fine with normal fetch
- [x] Salesforce Setup and Diagnostics Panel can be merged. I like Diagnostics better. https://screenshot.googleplex.com/B67WpmKBL8HfTAU
- [x] Build out Diagnostics & Platform Agnostic Chat Simulator (What features cannot be tested without voice?)
  - [x] Check connectivity with the UI Connector
  - [x] Check authentication with the UI Connector (no, platform specific auth prevents this)
  - [x] Check static resources have been generated
- [x] Support instantiating LWC in the Simulator, based on a configuration profile (select/search box). By default, it shows the default profile.
- [x] Implement the Base Platform Service to be fully initializable for chat using raw api connector calls, much like the messaging integration does. This means generating a conversationName.
- [x] Support UIM_TRANSCRIPT_URL and URL overrides in static resource generation
- [x] Refresh/Remount button in simulator
- [x] Create Companion Agent LWC and Configuration type
- [x] Remove Disabled features option. This should be managed in the conversation profile.
- [x] Support the generation of a static resource for https://storage.googleapis.com/jblakey-ui-modules-bugfix-tests/companion_agent.js
- [x] Scaffold out Wizard
- [x] Deletion of a profile with active page assignments should be stopped, and if the profile cannot be found, the widget should fail to load. Or possibly just the latter.
- [x] What if we need to manage more than one container configuration, which pure XML allows? Support the creation of multiple configuration profiles in the centralized wizard.
- [x] Create `agentAssistCompanionAgent` LWC and support separate schemas for Container vs Companion Agent configuration profiles.
- [x] Support instantiating live LWC in the Simulator based on a configuration profile selector (defaults to default profile).
- [x] Fix read-only Apex runtime 500 error in `getResolvedConfig` and `getAllConfigs` by removing DML operations from cacheable `@AuraEnabled(cacheable=true)` methods.
- [x] Support the generation of static resources for `companion_agent.js` (https://storage.googleapis.com/jblakey-ui-modules-bugfix-tests/companion_agent.js) and include in static resource checks.
- [x] Migrate integration callouts (`/register`) to Salesforce Named Credentials (`callout:Agent_Assist_UI_Connector`) and completely purge legacy Remote Site Settings.
- [x] Implement CSS Container Queries (`@container`) and responsive flex layout rules for `agentAssistContainer`.
- [x] Streamline LWC Simulator & Transcript UI: Remove redundant Transcript header, right-align Reload Component button, and fix 1px border clipping in stacked responsive views.

---

## Questions

- How can we solve the problem of it being difficult to test e2e? Can we automate it? Can we test all platforms from a single ephemeral scratch org? How to define these integration tests, possibly Playwright?
- `canvas/` is obsolete. Prove it and remove it with this PR. Then, migrate `aa-lwc` to `..`
- Can we bring Genesys integration in as a PlatformConnector? What testing is involved? Does it use the existing audiohook connector? Do we have a Genesys Test environment that will work for this? If so Add Public Docs, release with CompanionAgent support.
- How could a customer integrate both chat and voice?
  - In Voice integrations, conversations are initialized from external telephony events. To also support chat in the same LWC Configuration Profile, a chat channel/provider is needed. So say it's messaging, we would need to initialize the MessagingPlatformService, and say ServiceCloudVoicePlatformService with the Five9PlatformHandler, at the same time, in the same LWC.
  - What if platform was not a string, but a list, and you could mix and match platforms, like ["messaging", and "five9"]. The LWC then waits for initialization by agent assist events dispatched from either of those platform services.

## Benefits/Value Added

### Security & Governance

- **Named Credentials & Clean Auth Architecture (`/register`)**: Transitioned integration callouts to Salesforce Named Credentials (`callout:Agent_Assist_UI_Connector`), shifting authentication to server-side Apex while eliminating manual Remote Site Setting configuration overhead.
- **Active Configuration Profile Deletion Protection**: Protects active LWC Configuration Profiles assigned to live Salesforce pages from accidental deletion, preventing high-impact runtime outages in active contact centers.
- **Open Source Flexibility & Code Ownership**: Because it is an open source integration, and not a managed package, enterprise customers retain the ability to modify the LWC source code to do things like implement custom auth, fix any environment specific bugs that arise, and have visibility into what's going on under the hood. They can even add new features or modify existing platform integrations. This makes the (very complicated) solution robust against the unknowable future of AI, CX Platforms, and enterprise requirements.

### Admin Experience & Diagnostics

- **Centralized Configuration Management**: ConfigurationName based LWC will allow centrally managing configurations, which can be used for many profile types. Suppose an enterprise customer has 10 different teams in the contact center and each want's to set them up differently. Now they don't have to do it at the page level, but in our centralized configuration wizard. This makes for an easier life for admins.
- **CX Platform Specific Setup Panel**: This points to the documentation, 3rd party links, etc. Accordion for each platform. Checklist (Is app installed, permission sets assigned, etc. But less hand holding to avoid introducing brittleness.)
- **Detailed Diagnostics Page**: Detailed diagnostics page with troubleshooting steps for common issues. All the tools needed to integrate in one place. Deep links to fix issues in SF config. The app is aware of its deps, like the UI Modules static resources, connectivity, and auth, and can report on their status.
- **Terminology Alignment ("Enhanced Chat")**: Updated messaging terminology from MIAW to "Enhanced Chat" across documentation and component UI, aligning with current Salesforce product standards to minimize admin and agent confusion.

### UI, UX & Responsive Layout

- **Container Queries & Responsive Layout Flexibility**: Implemented modern CSS container queries (`@container`) to make components dynamically adapt to their parent container dimensions. In wide views, the transcript fills 100% container height; in narrow sidebars or stacked layouts, it cleanly contracts to a compact 160px scrollable view, ensuring high-density usability across Salesforce Utility Bars, sidebars, and full-page layouts.
- **Standalone Transcript LWC (`agentAssistTranscript`)**: Introduced a dedicated standalone transcript LWC component (`agentAssistTranscript`) along with a configuration profile toggle (`Disable Integrated Transcript`) in `agentAssistContainer`. This allows contact centers to decouple the live transcript UI from suggestions and place them in separate utility bars, sidebars, or page tabs.
- **Polished Simulator Experience**: Streamlined the Simulator UI by removing redundant column headers, right-aligning action controls, and ensuring zero-clipping borders across all viewport sizes.

### Testing & Onboarding

- **Simulator Auth Flexibility**: Simulator works with AUTH_OPTION "Skip", so customer can test their conversation profile with the Base API Connector in Salesforce, before they get auth set up (or implementing their own as may very well be the case). Improves user experience and reduces friction.
- **Console Transcript Simulator Script**: Created a developer-friendly 10-turn conversation simulation script (`simulateAgentAssistTranscript.js`) executable directly from the browser Developer Console on any record page. This enables immediate testing of live transcript rendering, UI module events, and suggestion triggers without requiring active telephony hardware or live messaging sessions.

### Multi-Platform & Architecture Flexibility

- **Base API Connector**: Base API Connector facilitates use of the LWC with other messaging platforms (e.g. SF + Quiq, which Warner Bros. Discovery uses).
- **Multi-Instance Page Support**: Allows multiple configurations on the same page to be used, and is very flexible. Could be used to support both voice and chat side by side, which (probably) requires 2 different conversation profiles.
- **Companion Agent & Container Support**: Supports the transition to Companion Agent, while still supporting Container.

### System Reliability & Performance

- **High-Throughput Apex Caching Stability**: Fixed Apex 500 runtime errors in `@AuraEnabled(cacheable=true)` methods (`getResolvedConfig`, `getAllConfigs`) by removing DML operations, ensuring reliable performance under heavy contact center call/chat traffic.

## Appendix

https://appexchange.salesforce.com/appxListingDetail?listingId=a0N4V00000GuYVdUAN
https://appexchange.salesforce.com/appxListingDetail?listingId=175e1542-c700-459c-8f9b-6fcb1bce7a14
https://appexchange.salesforce.com/appxListingDetail?listingId=a0N4V00000GZ7AuUAL
https://appexchange.salesforce.com/appxListingDetail?listingId=7f59a36f-86c0-4cac-b8af-2c1722ede4d1
