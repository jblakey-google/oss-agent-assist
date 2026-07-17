## Tasks

## Doing

## Done

- [x] Deletion of a profile with active page assignments should be stopped, and if the profile cannot be found, the widget should fail to load. Or possibly just the latter.
- [x] What if we need to manage more than one container configuration, which pure XML allows? Support the creation of multiple configuration profiles in the centralized wizard.

---

## Questions

- Separate LWC for Companion Agent (or toggle for main LWC)?
- Wizard Sections
  - Salesforce Setup
  - Google Cloud Agent Assist LWC Configuration Profiles
  - Diagnostics & Platform Agnostic Chat Simulator
    - Check connectivity with the UI Connector
    - Check authentication with the UI Connector
    - Check static resources have been generated
  - Platform Specific Setup
    - This can point to documentation, 3rd party links, etc. Accordion for each platform. Checklist (Is app installed, permission sets assigned, etc. But less hand holding to avoid introducing brittleness.)

## Benefits/Value Added

- ConfigurationName based LWC will allow centrally managing configurations, which can be used for many profile types. Suppose an enterprise customer has 10 different teams in the contact center and each want's to set them up differently. Now they don't do it at the page level, but in our centralized configuration wizard. This makes for an easier life for admins.
- It will also allow multiple configurations on the same page to be used, very flexible. This could be used to support both voice and chat side by side, which (probably) requires 2 different conversation profiles.
- This can also manage the transition to Companion Agent, while still supporting Container, without creating a new LWC.
- Because this is an open source integration, and not a managed package, critically customers retain the ability to modify the LWC source code to do things like implement custom auth, fix any environment specific bugs that arise, and have visibility into what's going on under the hood. They can even add new features or modify existing platform integrations.
