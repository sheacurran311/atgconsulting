/**
 * Shea content file — edit this to update the founder section across the site.
 * All text here appears on marketing pages and in the client Workbench.
 * Do not include fabricated credentials, testimonials, or statistics.
 */

export const SHEA = {
  name: "Shea Curran",
  title: "Founder, ATG Consulting",
  location: "CO · USA",
  photo: "/brand/shea.jpg",       // Replace with real photo before launch
  initials: "SC",                 // Monogram fallback if photo is missing
  // Short first-person note shown on the marketing page:
  note: `I started ATG because I kept watching people I care about spend their best hours on work that shouldn't require a person at all. Returning calls, chasing quotes, reposting the same content, typing the same email — these tasks are real, they take real time, and AI can handle them if someone sets it up right.

That someone is me. I map your week, design the workflow, set it up in your existing tools, and keep it running. You review what comes out. We tune it until it sounds like you.

[Add a personal line here — what you do outside work, why this matters to you.]`,

  // What Shea personally does on each engagement:
  whatSheaDoesMarketing: [
    { step: "Maps your week", detail: "Shea reviews your intake, then walks you through where your time actually goes." },
    { step: "Designs the workflow", detail: "She decides what to build, in what order, using tools that fit your budget and comfort level." },
    { step: "Sets it up in your tools", detail: "She connects your inbox, calendar, and other apps. You don't touch the setup." },
    { step: "Reviews outputs with you", detail: "She looks at what the system produces in the first few weeks and adjusts anything that's off." },
    { step: "Tunes it monthly", detail: "As your business changes, she updates the workflows so they keep working." },
  ],

  // Short line used in the Workbench operator panel:
  workbenchTagline: "I designed your workflows and I'll keep them running.",

  // Shown in the chat thread / message CTA:
  messagePlaceholder: "Ask Shea about your workflows, request a change, or flag something that doesn't look right…",
};
