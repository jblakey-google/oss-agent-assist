## Tasks
- [ ] The simulator can probably only work with the base connector, since others depend on things like Voice Calls, Messaging Sessions, conversations created by telephony interacting with core-services, deployment, etc. If that's the case then the simulator should test the configured features for a profile, with the base connector, and a disclaimer. Though possibly they should use the Console simulator instead if they just want to test their profile...not sure.
- [ ] Salesforce Setup and Diagnostics Panel can be merged. I like Diagnostics better.
- [ ] Test with various SF licenses, using the scratch-def.json.
- [ ] Build out Diagnostics & Platform Agnostic Chat Simulator (What features cannot be tested without voice?)
  - [ ] Check connectivity with the UI Connector
  - [ ] Check authentication with the UI Connector
  - [ ] Check static resources have been generated

## Doing

## Done
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

---

## Questions

- Should add lots of easy access links directly to the wizard, e.g. Agent Assist Conversation Profile?
- How can we solve the problem of it being difficult to test e2e? Can we automate it? Can we test all platforms from a single ephemeral scratch org? How to define these integration tests, possibly Playwright?
- `canvas/` is obsolete. Prove it and remove it with this PR. Then, migrate `aa-lwc` to `..`
- Can we bring Genesys integration in as a PlatformConnector? What testing is involved? Does it use the existing audiohook connector? Do we have a Genesys Test environment that will work for this? If so Add Public Docs, release with CompanionAgent support.

## Benefits/Value Added

- CX Platform Specific Setup panel: This points to the documentation, 3rd party links, etc. Accordion for each platform. Checklist (Is app installed, permission sets assigned, etc. But less hand holding to avoid introducing brittleness.)
- Detailed diagnostics page with troubleshooting steps for common issues. All the tools needed to integrate in one place. The app is aware of its deps, like the UI Modules static resources, connectivity, and auth, and can report on their status.
- ConfigurationName based LWC will allow centrally managing configurations, which can be used for many profile types. Suppose an enterprise customer has 10 different teams in the contact center and each want's to set them up differently. Now they don't do it at the page level, but in our centralized configuration wizard. This makes for an easier life for admins.
- It will also allow multiple configurations on the same page to be used, very flexible. This could be used to support both voice and chat side by side, which (probably) requires 2 different conversation profiles.
- This can also manage the transition to Companion Agent, while still supporting Container.
- Because this is an open source integration, and not a managed package, critically enterprise customers retain the ability to modify the LWC source code to do things like implement custom auth, fix any environment specific bugs that arise, and have visibility into what's going on under the hood. They can even add new features or modify existing platform integrations. This makes the (very complicated) solution robust against the unknowable future of AI, CX Platforms, and enterprise requirements.
