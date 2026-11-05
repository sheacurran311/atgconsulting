/**
 * Starter AI Workshop. Idempotent: missing slugs are created as published.
 * Existing rows are left alone so an admin edit is not overwritten.
 * Learners run the exercises in their own assistant. This app does not.
 */
import type { PrismaClient } from "@prisma/client";
import type { QuizQuestion } from "./workshopAccess";

interface LessonSeed {
  slug: string;
  title: string;
  minutes: number;
  body: string;
  takeaways: string[];
  exercise: string;
}

interface ModuleSeed {
  slug: string;
  title: string;
  summary: string;
  quiz: QuizQuestion[];
  lessons: LessonSeed[];
}

export const WORKSHOP_SEEDS: ModuleSeed[] = [
  {
    slug: "what-an-assistant-is",
    title: "What an AI assistant is",
    summary: "A plain account of what these tools do, what they do not do, and a first task worth trying.",
    quiz: [
      {
        prompt: "What is a reliable way to treat an assistant's answer?",
        choices: ["As a finished fact you can forward unchanged", "As a draft you check before you use it", "As a record of what your files contain"],
        answerIndex: 1,
      },
      {
        prompt: "What does this workshop's app do with your assistant account?",
        choices: ["It signs in and runs the exercise for you", "It stores your assistant password so Shea can help", "It does not connect. You run the exercise yourself"],
        answerIndex: 2,
      },
    ],
    lessons: [
      {
        slug: "what-it-does",
        title: "What it does and what it does not",
        minutes: 8,
        body: `An AI assistant is a chat tool that drafts text, summarises notes, and suggests next steps from what you give it.

It does not know your business until you tell it. It can sound sure and still be wrong. It does not replace your judgment on prices, legal terms, medical advice, or a message to a customer.

Use it to get a first draft faster. You still decide what is true and what goes out.

This course never connects to Grok, Claude, or ChatGPT. When a lesson says to try something, you open the assistant you already use and do it there.`,
        takeaways: [
          "The assistant drafts. You check.",
          "It only knows what you provide in that chat or project.",
          "This app does not sign in to your assistant for you.",
        ],
        exercise: "In your own assistant, ask: \"List three tasks a small business owner might draft with an assistant, and one thing the owner should still decide.\" Read the answer and cross out anything that does not fit your work.",
      },
      {
        slug: "chat-project-skill",
        title: "A chat, a project, and a saved instruction",
        minutes: 8,
        body: `Most assistants give you three places to work. Names differ by product. The idea is the same.

A chat is one conversation. It is fine for a one-off question. When the chat gets long, the tool may lose the earlier details.

A project, folder, or custom space keeps instructions and files together. Use it for ongoing work, such as quotes or weekly updates.

A saved instruction, skill, or custom GPT is a reusable recipe: the task, the inputs, and the shape of the answer. You still start it and review the result.

Check the product's own help if you cannot find these. Menus change. The pattern does not: one-off chat, a standing workspace, and a saved recipe.`,
        takeaways: [
          "A chat is for a single question.",
          "A project keeps instructions and files in one place.",
          "A saved instruction is a recipe you start yourself.",
        ],
        exercise: "Open your assistant and find where a new chat starts, and where saved instructions or projects live. Write those two places down in your own notes. Do not change any setting yet.",
      },
      {
        slug: "first-useful-task",
        title: "A first task worth doing",
        minutes: 10,
        body: `Pick a task you already do in writing, more than once a week. A follow-up email, a job summary, or a list of questions for a supplier are good starts. A task you do once a year is a poor start.

Write the task in one sentence: who it is for, what done looks like, and what you will not include.

Then run it once in your assistant with real but non-sensitive details. Compare the draft to the way you would have written it. Keep the sentences you like. Fix the ones that are wrong.

If the draft is useless, the task may be too vague, or the assistant is missing an example. The next modules cover both.`,
        takeaways: [
          "Start with a task you already repeat.",
          "Say who it is for and what done looks like.",
          "Compare the draft to your own standard.",
        ],
        exercise: "Write one sentence naming a repeated writing task. Run it once in your assistant with details you are allowed to share. Save the draft in your notes and mark one sentence you would change.",
      },
    ],
  },
  {
    slug: "prompting-fundamentals",
    title: "Prompting fundamentals",
    summary: "How to ask for a checkable result, and how to revise it.",
    quiz: [
      {
        prompt: "Which request is easier to check?",
        choices: ["Make this better", "Rewrite this email in under 120 words, keep the date, and end with one question", "Be more professional"],
        answerIndex: 1,
      },
      {
        prompt: "What should you do when the first draft is off?",
        choices: ["Start over with no reference to the draft", "Say what to change and what to keep", "Accept it so the task is finished"],
        answerIndex: 1,
      },
    ],
    lessons: [
      {
        slug: "ask-for-a-result",
        title: "Ask for a result you can check",
        minutes: 8,
        body: `A useful request names the result. "Help me with email" can go anywhere. "Draft a follow-up email of under 120 words that asks for a site visit next week" can be checked.

Add the format you want: a short email, a bullet list, a table with two columns. Add a limit: length, tone, or what to leave out.

Avoid asking the assistant to invent numbers, reviews, or quotes. If you need a figure, supply it yourself.`,
        takeaways: [
          "Name the finished piece, not a mood.",
          "Set length and format.",
          "Do not ask it to invent facts.",
        ],
        exercise: "Rewrite a vague request you have used, or this one: \"Help with a customer email.\" Make it name the reader, the ask, and a length limit. Run both versions in your assistant and keep the clearer draft.",
      },
      {
        slug: "role-task-constraints",
        title: "Role, task, constraints, and format",
        minutes: 10,
        body: `A steady prompt has four parts.

Role: who the draft is speaking as. "You are the office manager at a plumbing company" is enough. Do not invent credentials.

Task: the job. "Draft a reply to a customer who asked about Saturday hours."

Constraints: facts that must stay true, and things to avoid. "We are closed Sunday. Do not promise a discount."

Format: how the answer should look. "One short email. No subject line alternatives."

You can write these as labels or as one paragraph. Labels are easier to reuse later.`,
        takeaways: [
          "Role, task, constraints, and format cover most drafts.",
          "Constraints stop the assistant from promising things you do not offer.",
          "Labels make the prompt easier to reuse.",
        ],
        exercise: "Build a four-part prompt for a real message you need this week. Run it in your assistant. Check every factual sentence against what you know.",
      },
      {
        slug: "revise-a-draft",
        title: "Revise a draft instead of starting over",
        minutes: 8,
        body: `The second message is often more useful than the first. Point at the draft.

Say what to keep, what is wrong, and what to change. "Keep the opening. The visit is Thursday, not Tuesday. Cut the last paragraph."

Ask for one change at a time if the draft is long. A pile of changes in one message is harder to review.

Stop when the draft matches your facts and your voice. More passes can make the writing smoother and less like you.`,
        takeaways: [
          "Name what to keep and what to fix.",
          "One change at a time is easier to review.",
          "Stop when the facts and the voice are right.",
        ],
        exercise: "Take the draft from the previous lesson. Send one revision that fixes a fact and removes one sentence. Compare the two drafts side by side.",
      },
    ],
  },
  {
    slug: "context-and-files",
    title: "Context and files",
    summary: "What to give the assistant, and what to leave out.",
    quiz: [
      {
        prompt: "Why does an example help?",
        choices: ["It guarantees the next answer is correct", "It shows the shape and voice you want", "It replaces the need to review"],
        answerIndex: 1,
      },
      {
        prompt: "When the answer ignores a fact you care about, what is the first check?",
        choices: ["Whether that fact was in the message or the file you attached", "Whether the assistant has your whole company history", "Whether you should switch products immediately"],
        answerIndex: 0,
      },
    ],
    lessons: [
      {
        slug: "what-to-include",
        title: "What to include",
        minutes: 8,
        body: `Context is the material the assistant can see: your message, a pasted note, or a file you attach in that product.

Include the facts the draft must use. A date, a price you already set, a customer's first name, the decision you made. Leave out history that does not change this task.

If you would not hand the text to a new employee for this task, do not paste it here either. The next module on privacy is stricter about secrets and customer data.

A short brief plus the source note usually beats a long dump.`,
        takeaways: [
          "Include only facts this task needs.",
          "The assistant cannot see files you did not attach.",
          "A short brief is easier to check than a dump.",
        ],
        exercise: "For one real task, list the five facts the draft must get right. Paste only those facts into your assistant, plus the task. See which facts it kept.",
      },
      {
        slug: "examples-and-voice",
        title: "Examples and house style",
        minutes: 10,
        body: `An example teaches the shape. Paste one email you are proud of, with names removed if needed, and say "match this length and tone."

You can also write three rules: short sentences, no exclamation marks, always end with a question. Rules plus one example are stronger than either alone.

Do not paste a customer's private thread as a style sample if you can use your own sent mail instead.

The assistant will still drift. Keep the example in the project or saved instruction so you are not re-pasting it every time.`,
        takeaways: [
          "One real example beats a list of adjectives.",
          "Add a few house rules.",
          "Keep the example in the project, not only in one chat.",
        ],
        exercise: "Paste one short message you have already sent, with private details removed, and ask for a new message in the same voice about a different topic you invent. Mark any line that does not sound like you.",
      },
      {
        slug: "check-the-context",
        title: "When the draft misses the point",
        minutes: 8,
        body: `If the draft misses a fact, check whether you supplied that fact. If you did, point to it: "Use the date in the note I pasted."

If the draft adds a fact you did not supply, delete it. Ask the assistant not to add details that are not in your note.

If a long chat has gone stale, start a new chat in the same project and repeat the task with the brief at the top. Long chats are a common reason older instructions get dropped.

You are not doing it wrong because the first answer missed something. You are checking the inputs.`,
        takeaways: [
          "A missing fact is often a missing input.",
          "Delete details the assistant added on its own.",
          "A fresh chat with the brief at the top beats a huge thread.",
        ],
        exercise: "Deliberately omit one fact, run the task, then add the fact in a follow-up. Notice what changed. This is a practice run, not a customer message.",
      },
    ],
  },
  {
    slug: "repeatable-workflows",
    title: "Repeatable workflows",
    summary: "Turn a repeated task into a template you start and review yourself.",
    quiz: [
      {
        prompt: "What belongs in a reusable template?",
        choices: ["Today's customer names baked in forever", "The standing instructions, with blanks for what changes", "A promise that the message will send itself"],
        answerIndex: 1,
      },
      {
        prompt: "Who reviews the draft before it is used?",
        choices: ["The assistant, automatically", "You, or a teammate you named", "ATG, for every self-serve run"],
        answerIndex: 1,
      },
    ],
    lessons: [
      {
        slug: "one-repeated-task",
        title: "Pick one repeated task",
        minutes: 8,
        body: `A workflow here means a task with the same shape every time and a few blanks that change. Follow-up after a quote. A weekly site update. Questions before a first meeting.

Write the standing parts once: the role, the rules, the format, and an example. Leave blanks for the parts that change: the name, the date, the job.

If you cannot name the blanks, the task is not ready to template. Do it by hand a few more times and notice what you retype.`,
        takeaways: [
          "Template a task you already repeat.",
          "Separate standing instructions from blanks.",
          "If you cannot name the blanks, wait.",
        ],
        exercise: "Choose one repeated task. Write the standing instructions and three blanks. Do not build the saved instruction yet.",
      },
      {
        slug: "inputs-and-review",
        title: "Inputs, steps, and the review",
        minutes: 10,
        body: `A small template has three lines at the top.

Inputs: what you will paste each time.
Steps: what the assistant should do with those inputs.
Review: what you will check before you use the draft. Facts, tone, and anything you promised.

The review line matters. A template that sends, posts, or files something without you is outside the way ATG sets work up. The draft waits for a person.

Save the template in the product's skill, project instruction, or custom GPT. The menu name depends on the product. The text can stay the same.`,
        takeaways: [
          "Write inputs, steps, and a review check.",
          "A person reviews before anything goes out.",
          "The saved place differs by product. The text can match.",
        ],
        exercise: "Turn the notes from the last lesson into a saved instruction in your own assistant. Run it once with sample inputs you are allowed to use. Complete your review check before you keep the draft.",
      },
      {
        slug: "name-the-workflow",
        title: "Name it so someone else can find it",
        minutes: 7,
        body: `Name the template after the job, not the tool. "Quote follow-up" is clearer than "Email bot 2."

Add one line at the top of the instruction: when to use it, and when not to. "Use after you send a quote. Do not use for complaints."

If a teammate will run it, the name and the inputs should be enough for them to start without asking you. The review check still names who signs off.`,
        takeaways: [
          "Name the job, not the software.",
          "Say when to use it and when not to.",
          "A teammate should see the inputs and the reviewer.",
        ],
        exercise: "Rename your saved instruction after the job. Add a \"use when / do not use when\" line. Read it as if you were a new hire.",
      },
      {
        slug: "a-routine-you-start",
        title: "A routine you start",
        minutes: 8,
        body: `Some products can remind you or run on a schedule. That is optional. A routine you start yourself is enough: same day each week, open the template, paste this week's notes, review the draft.

If you turn on a schedule, read what the product will do unattended. Prefer a reminder that waits for you over a send that does not.

Write the trigger in plain language. "Monday after the job board is updated" is a trigger. "Be more productive" is not.

Keep one routine before you add a second. A pile of unused templates is harder to trust than one you run.`,
        takeaways: [
          "A reminder you act on is enough.",
          "Read anything that would run while you are away.",
          "One routine you actually use beats several you do not.",
        ],
        exercise: "Put one repeating reminder on your own calendar to run the template. Do not turn on automatic sending.",
      },
    ],
  },
  {
    slug: "tools-privacy-and-team",
    title: "Tools, privacy, and the team",
    summary: "Connectors, safe use, choosing a product, and sharing a template.",
    quiz: [
      {
        prompt: "What should you do before you connect a mailbox or drive?",
        choices: ["Connect everything so the assistant is more helpful", "Read what access you are granting and keep sends behind your review", "Paste passwords into the chat so it can sign in"],
        answerIndex: 1,
      },
      {
        prompt: "How should you choose among Grok, Claude, and ChatGPT?",
        choices: ["By a single ranking that fits every business", "By where your team already works and a trial of the same real task", "By whichever ad you saw last"],
        answerIndex: 1,
      },
    ],
    lessons: [
      {
        slug: "connectors",
        title: "Connectors and automations",
        minutes: 9,
        body: `A connector lets the assistant read or act in another tool, such as mail, a calendar, or a drive. The product asks you to approve that access. Read the screen. Grant the smallest access that does the job.

A connector can draft a reply from a thread you opened. It can also be set, in some products, to send or change records. If you see a setting that sends, posts, or deletes without a person, leave it off until you understand it.

This ATG app does not connect those accounts and does not store those passwords. Connecting happens in the assistant or the other tool, under your login.

An automation that only reminds you, or that files a draft for review, is the version to start with.`,
        takeaways: [
          "Read the access you are granting.",
          "Leave unattended sends off until you mean to enable them.",
          "ATG does not connect or store those accounts for you.",
        ],
        exercise: "In your assistant's settings, look for connections. Write down what is already connected. Disconnect nothing unless you do not recognise it. Do not add a new connection in this lesson.",
      },
      {
        slug: "what-not-to-paste",
        title: "What not to paste",
        minutes: 8,
        body: `Do not paste passwords, API keys, payment card numbers, government ID numbers, or health details. Do not paste a customer's data if your agreement or your own rule says it stays in a specific system.

Remove names and addresses when the lesson only needs the shape of a message. Use initials or "the customer."

The assistant's vendor has its own privacy terms and retention. Read them on the vendor's site before you put business files in. This course does not restate those terms, because they change.

If you are unsure, leave it out and describe the situation in general words.`,
        takeaways: [
          "Secrets and card numbers do not belong in the chat.",
          "Customer data follows your own rules, not the assistant's convenience.",
          "Vendor privacy terms live on the vendor's site.",
        ],
        exercise: "Look at the last note you were tempted to paste. Black out anything that is a secret or that you are not allowed to move. If nothing remains, describe the task in general words instead.",
      },
      {
        slug: "choose-a-tool",
        title: "Grok, Claude, and ChatGPT",
        minutes: 10,
        body: `Grok, Claude, and ChatGPT are general assistants from different companies. Each has a chat, ways to keep instructions, and ways to attach files. The details of plans, apps, and connectors change. Check the vendor's current pages before you decide.

A practical way to choose: use the assistant your team can already sign in to. Run the same real task in that tool. If the draft is good enough after your review, stay. If you cannot get a checkable draft, try a second tool with the same prompt and the same files.

Do not choose from a slogan. Choose from one task you can compare. Price and plan limits belong on the vendor's site, not in this lesson.

ATG workflows can be saved as instructions for more than one of these tools. The review step stays yours on every plan.`,
        takeaways: [
          "Start with the assistant people can already open.",
          "Compare one real task, not a slogan.",
          "Plan details and prices live on each vendor's site.",
        ],
        exercise: "Write which assistant your team can open today. Run the four-part prompt from the prompting module once in that tool. Note one thing you would still edit.",
      },
      {
        slug: "roll-out-to-a-team",
        title: "Rolling this out to a team",
        minutes: 9,
        body: `Start with one willing person and one task. Show the template, the blanks, and the review check. Let them run it while you watch. Fix the instruction from what confused them.

Write three team rules: what may be pasted, who reviews before something goes to a customer, and where the template lives. Keep the rules short enough to reread.

Do not ask everyone to adopt five tools in a week. Add a second task only after the first one has been used on real work and the review check happened.

Owners still spot-check. A template does not transfer your responsibility to the software.`,
        takeaways: [
          "One person, one task, then the written rules.",
          "Say what may be pasted and who reviews.",
          "The owner still spot-checks.",
        ],
        exercise: "Draft the three team rules in your own notes: paste, review, and where the template lives. You do not have to send them yet.",
      },
    ],
  },
  {
    slug: "time-and-practice",
    title: "Time and practice",
    summary: "How to notice time saved on one task, and how to keep going after the course.",
    quiz: [
      {
        prompt: "What is a fair way to talk about time saved?",
        choices: ["Use a percentage you heard somewhere", "Time one real task before and after, and write down those two times", "Add up every task you might automate someday"],
        answerIndex: 1,
      },
      {
        prompt: "What does finishing this workshop give you?",
        choices: ["An accredited certificate", "A practice record in this app and a template you run yourself", "Access to Shea sending messages for you"],
        answerIndex: 1,
      },
    ],
    lessons: [
      {
        slug: "measure-one-task",
        title: "Measure one task",
        minutes: 8,
        body: `Pick the template you built. The next time you do that task, note the clock time when you start and when the reviewed draft is ready. That is one sample, not a study.

Do the same task once more the following week. Two samples tell you more than a guess. If the second run is slower because the job was harder, write that down. Do not average it into a claim you would put on a website.

This app's Hours saved tab, if you use workflows there, counts runs and approved outputs. It is a ledger of what you did. It is not a promise of hours.

Share a number only when you can point at the two times you wrote down.`,
        takeaways: [
          "Time one real task, twice if you can.",
          "Write down why a run was different.",
          "Do not publish a number you did not measure.",
        ],
        exercise: "On your next real run of the template, write the start time and the time you finished reviewing. Keep it in your notes. Do not turn it into a percentage.",
      },
      {
        slug: "a-practice-plan",
        title: "A four-week practice plan",
        minutes: 8,
        body: `Week 1: run the one template on real work and do the review check every time.
Week 2: fix the instruction based on what you had to edit.
Week 3: show one teammate, or if you work alone, reread the paste rules.
Week 4: decide whether to add a second task. If the first one is still awkward, do not add a second.

There is no score from Shea on this plan. You are the reviewer.

If you are on Guided, you can bring the template to a session. If you are on Done-for-you, Shea still does not send on your behalf unless you have agreed that work in the engagement. Self-serve stays in your hands.`,
        takeaways: [
          "Use the template for four weeks before you add another.",
          "Edit the instruction from real revisions.",
          "You review. Shea does not grade the quiz.",
        ],
        exercise: "Put the four weeks on your calendar as four short checks. The first check is the next time the real task shows up.",
      },
      {
        slug: "what-finished-means",
        title: "What finished means",
        minutes: 6,
        body: `When every lesson is marked complete, this app shows a completion state. That record means you finished the lessons here. It is not a certificate, a license, or an accreditation.

You leave with one template, a review habit, and rules for what you paste. The assistant is still a drafting tool.

Come back to a lesson if a menu in your product has moved. The steps in this course stay at the level of chats, projects, and saved instructions so they survive a redesign.

If you want Shea to look at a template, use the message thread or a booked session. Do not paste secrets into that message.`,
        takeaways: [
          "Completion here is a practice record, not a credential.",
          "You still review every draft.",
          "Ask Shea in the thread or a session, without secrets.",
        ],
        exercise: "Write one sentence: the template you will keep using, and the person who reviews it. That sentence is the end of the course.",
      },
    ],
  },
];

export async function seedWorkshop(prisma: PrismaClient): Promise<void> {
  for (const [moduleIndex, mod] of WORKSHOP_SEEDS.entries()) {
    const existingModule = await prisma.workshopModule.findUnique({ where: { slug: mod.slug } });
    const moduleRow = existingModule ?? await prisma.workshopModule.create({
      data: {
        slug: mod.slug,
        title: mod.title,
        summary: mod.summary,
        order: moduleIndex,
        status: "PUBLISHED",
        quizJson: JSON.stringify(mod.quiz),
      },
    });
    for (const [lessonIndex, lesson] of mod.lessons.entries()) {
      const existingLesson = await prisma.workshopLesson.findUnique({ where: { slug: lesson.slug } });
      if (existingLesson) continue;
      await prisma.workshopLesson.create({
        data: {
          moduleId: moduleRow.id,
          slug: lesson.slug,
          title: lesson.title,
          body: lesson.body,
          minutes: lesson.minutes,
          takeaways: JSON.stringify(lesson.takeaways),
          exercise: lesson.exercise,
          order: lessonIndex,
          status: "PUBLISHED",
        },
      });
    }
  }
}
