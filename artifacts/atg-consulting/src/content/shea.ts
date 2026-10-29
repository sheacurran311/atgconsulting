/**
 * Shea content file — edit this to update the founder section across the site.
 * All text here appears on marketing pages and in the client Workbench.
 * Do not include fabricated credentials, testimonials, or statistics.
 */

export const SHEA = {
  name: "Shea Curran",
  title: "Founder, ATG Consulting",
  location: "Colorado, USA",
  photo: "/brand/shea.jpg",       // Replace with real photo before launch
  initials: "SC",                 // Monogram fallback if photo is missing
  // Short first-person note shown on the marketing page:
  note: `I started ATG because I kept watching people I care about spend their best hours on work that shouldn't require a person at all. Returning calls, chasing quotes, reposting the same content, typing the same email — these tasks are real, they take real time, and AI can handle them if the setup matches how you work.

On Self-serve you get a reviewed plan and run the workflows yourself. On Guided we set them up together. On Done-for-you I run them, and you approve what goes out.`,

  // What changes by tier. Shown on the marketing page, so it must not describe Done-for-you as every plan.
  whatSheaDoesMarketing: [
    { step: "Reviews your intake", detail: "On every plan, Shea reads the intake before a diagnosis or report reaches you." },
    { step: "Self-serve", detail: "You follow the setup guides in your own tools. Shea does not connect your accounts." },
    { step: "Guided", detail: "Shea joins you on live calls and walks through setup with you." },
    { step: "Done-for-you", detail: "She designs the workflow, connects the tools you approve, and keeps it running. You approve what goes out." },
    { step: "Stays available", detail: "Email support on Self-serve. A message thread on Guided. Monthly tuning on Done-for-you." },
  ],

  // Short line used in the Workbench operator panel:
  workbenchTagline: "You approve what goes out. Shea's role follows the plan on your account.",

  // Shown in the chat thread / message CTA:
  messagePlaceholder: "Ask Shea about your workflows, request a change, or flag something that doesn't look right…",
};
