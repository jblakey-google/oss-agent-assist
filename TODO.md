## Tasks

- [ ] Create Companion Agent LWC and Configuration type
- [ ] Support instantiating LWC in the Simulator, based on a configuration profile (select/search box). By default, it shows the default profile.
- [ ] Build out Diagnostics & Platform Agnostic Chat Simulator (What features cannot be tested without voice?)
  - [ ] Check connectivity with the UI Connector
  - [ ] Check authentication with the UI Connector
  - [ ] Check static resources have been generated

## Doing

## Done

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

- `canvas/` is obsolete. Prove it and remove it with this PR. Then, migrate `aa-lwc` to `..`
- Separate LWC for Companion Agent (or toggle for main LWC)?

## Benefits/Value Added

- CX Platform Specific Setup panel: This points to the documentation, 3rd party links, etc. Accordion for each platform. Checklist (Is app installed, permission sets assigned, etc. But less hand holding to avoid introducing brittleness.)
- Detailed diagnostics page with troubleshooting steps for common issues. All the tools needed to integrate in one place. The app is aware of its deps, like the UI Modules static resources, connectivity, and auth, and can report on their status.
- ConfigurationName based LWC will allow centrally managing configurations, which can be used for many profile types. Suppose an enterprise customer has 10 different teams in the contact center and each want's to set them up differently. Now they don't do it at the page level, but in our centralized configuration wizard. This makes for an easier life for admins.
- It will also allow multiple configurations on the same page to be used, very flexible. This could be used to support both voice and chat side by side, which (probably) requires 2 different conversation profiles.
- This can also manage the transition to Companion Agent, while still supporting Container.
- Because this is an open source integration, and not a managed package, critically enterprise customers retain the ability to modify the LWC source code to do things like implement custom auth, fix any environment specific bugs that arise, and have visibility into what's going on under the hood. They can even add new features or modify existing platform integrations. This makes the (very complicated) solution robust against the unknowable future of AI, CX Platforms, and enterprise requirements.
