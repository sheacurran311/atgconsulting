# Native workflow library and per-client implementation lists

The 30 original ATG starter recipes support ChatGPT plugins, Grok Bot skills/routines and Claude plugins/scheduled work, without Zapier, Make or an external automation runner. They include source apps, what recurs, expected output, setup instructions, a reusable prompt, an example acceptance test and pause/recovery guidance. These are instructions to configure a workflow, not already-installed bots or a measured top-30 popularity ranking.

The library is served only to DIY (`SELF_SERVE`) accounts and real administrators. Guided/DFY client views cannot read it. An admin may use the same instructions for any client's delivery. Recommendations use the latest submitted intake belonging to the selected client; caller-supplied client IDs cannot switch a customer's intake. Admin selection is separately guarded. No raw intake or private operator notes are included in library responses. Microsoft source preferences adapt the app names, subject to native compatibility checks.

## Beyond the 30

Every private client playbook supports an **Exact implementation list**. The operator can:

1. Honor ChatGPT/Grok/Claude preference or choose “Shea decides” and explain the provider or provider mix.
2. Search the broader public official marketplaces, with local task filtering, provider filtering and pagination across every parsed listing. This discovery is separate from the Catalogue's small scheduled harvest and is not capped at 30.
3. Rank relevant results by published ratings, then installs, or installs first. Unknown metrics remain unknown; counts are not converted to a cross-provider popularity score. The present sources expose no usable ratings. Claude Code support is displayed explicitly and must not be mistaken for scheduled Claude work.
4. Open the full official directories for private/workspace or account-specific options. ChatGPT's public page does not expose a usable listing feed here; use the customer's signed-in directory and the provided research brief. Add an exact source or a custom workflow with the same review fields. Public discovery cannot claim exhaustive coverage of all accounts.
5. Record exact native apps/source scope, trigger/timezone, setup instructions, reusable prompt, expected test result, pause controls, source/date and compatibility evidence. Imported plugins start as components and candidates. Change to a named workflow only when it represents a complete agreed automation.
6. Save the list to that draft version. Ready-to-implement requires a provider, native-account confirmation, source, review date, reason, apps, steps, acceptance test, pause method and evidence. It does not mean installed. For DFY, the list allows up to 20 included named workflows plus their supporting components. Final versions are immutable; regeneration preserves the saved list in the next draft. Concurrent changes return a visible conflict instead of overwriting notes or a finalized version. Copy/print includes the implementation list.

Read-only public discovery fetches fixed official URLs, shares no intake upstream, uses a ten-minute process cache and reports provider failures/coverage dates. It neither installs nor follows arbitrary customer-supplied URLs. No new persistence tables, model API calls, subscriptions or provider tokens are required.

## Current starter recipes

Morning work briefing; Lead follow-up queue; Prospect research watch; Inbox priority digest; Customer reply draft queue; Quote request tracker; Invoice deadline watch; Weekly receivables summary; Support escalation briefing; Weekly social draft planner; Review-response draft queue; Meeting preparation briefing; Meeting action review; Lead register hygiene review; Project deadline watch; Weekly client status pack; Document change digest; Procedure drift review; New-client kickoff preparation; Team weekly briefing; Vendor renewal deadline watch; Calendar conflict digest; Family weekly briefing; School deadline reminder digest; Sports schedule change digest; Travel itinerary briefing; Household task digest; Weekly grocery planning review; Bill deadline digest; Personal paperwork deadline watch. The source-code entries in `automationLibrary.ts` are canonical.

## Primary sources reviewed 2026-11-16

- ChatGPT: [plugins](https://learn.chatgpt.com/docs/plugins), [building plugins](https://learn.chatgpt.com/docs/build-plugins), [Scheduled](https://learn.chatgpt.com/docs/automations), [account/workspace availability](https://help.openai.com/en/articles/20001256-plugins-in-chatgpt), [directory](https://chatgpt.com/plugins).
- Grok Bot: [getting started](https://docs.x.ai/grok-bot/get-started), [skills and routines](https://docs.x.ai/grok-bot/skills-routines-and-automations), [marketplace](https://x.ai/bot/marketplace).
- Claude: [plugins](https://support.claude.com/en/articles/13837440-use-plugins-in-claude), [unified plugin management](https://support.claude.com/en/articles/17740565-manage-plugins-skills-and-connectors-from-one-plugins-page), [recurring tasks](https://support.claude.com/en/articles/13854387-schedule-recurring-tasks-in-claude-cowork), [directory guidance](https://support.claude.com/en/articles/14328846-browse-skills-connectors-and-plugins-in-one-directory), [public marketplace](https://claude.com/marketplace/plugins).

Availability depends on account, plan, region, workspace policy and surface. Confirm capabilities in the actual customer account; if a required native capability is absent, stop and choose a compatible alternative. Inspect the first real run before activation is reported in Operations. No customer-provider installation was executed by this change.
