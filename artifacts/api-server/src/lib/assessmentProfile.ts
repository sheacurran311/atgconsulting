import { industrySites } from "./industrySites";
import { serviceFor } from "./firstCallPrep";
import { QUESTION_BANK, QUESTION_MAP, type Question } from "./questionBank";

export type Audience = "business" | "personal" | "both";
type Answer = { id: string; answer: string };
export function audienceFrom(answers: Answer[]): Audience {
  const value = answers.find((a) => a.id === "audience")?.answer.toLowerCase() ?? "";
  return value.includes("both") ? "both" : value.includes("personal") || value.includes("family") ? "personal" : "business";
}
export const AUDIT_QUESTIONS: Question[] = [
  { id: "audience", category: "goals", text: "Where would you like help?", type: "choice", core: true, options: ["My business", "My personal and family life", "Both business and personal life"] },
  { id: "task_frequency", category: "goals", text: "How often do your biggest time-consuming tasks happen, and roughly how long do they take each week?", type: "text", core: true },
  { id: "workflow_example", category: "goals", text: "Walk us through one recent example: what started the task, what did you do, and what counted as finished? Use a general example; leave out private messages, children's names, passwords, and customer details.", type: "text", core: true },
  { id: "approval_preference", category: "authority", text: "What would you be comfortable allowing a system to do?", type: "choice", core: true, options: ["Prepare drafts only", "Take specific actions after my approval", "Handle agreed routine actions; ask me about exceptions", "Help me decide during the consultation"] },
  { id: "data_boundaries", category: "security", text: "Which information or accounts must stay separate or off limits? For example: family vs work, employer systems, or school information.", type: "text", core: true },
  { id: "pilot_owner", category: "goals", text: "Who will review the pilot and be responsible for the system day to day? A role is enough; no contact details needed.", type: "text", core: true },
  { id: "support_preference", category: "goals", text: "What kind of help would suit you?", type: "choice", core: true, options: ["A plan and setup instructions", "Guided installation and training", "Done-for-you setup in my accounts", "Setup plus ongoing maintenance", "Not sure yet"] },
  { id: "family_sources", category: "personal", text: "Where do updates come from, and where would you like to keep track of them?", type: "text", core: true },
  { id: "family_coordination", category: "personal", text: "Which part of coordination takes the most effort?", type: "text", core: true },
  { id: "travel_needs", category: "personal", text: "What would you like help organizing for a trip?", type: "text", core: true },
  { id: "project_requirements", category: "project", text: "What should the finished project let you or your customers do?", type: "text", core: true },
  { id: "website_current", category: "website", text: "What are you starting with? Include your current platform, content you can reuse, and anything that must survive a redesign or migration.", type: "text", core: false },
  { id: "website_features", category: "website", text: "What does the site need at launch?", type: "multiselect", options: ["Service or portfolio pages", "Bookings or lead capture", "Online sales", "Branding or logo work", "Search visibility or migration", "Connections to existing tools", "Help defining the scope"], allowOther: true, core: false },
  { id: "support_scope", category: "support", text: "What would you like a technical partner to own, and how often do you need help?", type: "text", core: false },
  { id: "first_priority", category: "goals", text: "Which of these improvements matters most right now?", type: "choice", core: true },
  { id: "website_url", category: "company", text: "What is your business website? If you do not have one, you can skip this question.", type: "text", core: false },
  { id: "current_software", category: "systems", text: "Which specific apps or software do you currently use? Product names are enough; do not share logins or account details.", type: "text", core: false },
  { id: "customer_impact", category: "goals", text: "What is the main cost of this problem today?", type: "choice", core: false },
  { id: "lead_volume", category: "sales", text: "Roughly how many new inquiries or leads do you receive each month?", type: "choice", core: false },
  { id: "marketing_channels", category: "marketing", text: "Which channels do you actively use to find new customers?", type: "multiselect", core: false },
  { id: "marketing_goal", category: "marketing", text: "What is your biggest marketing priority over the next 90 days?", type: "choice", core: false },
  { id: "website_goal", category: "marketing", text: "What do you most want customers to do when they visit your website?", type: "choice", core: false },
];
export const AUDIT_MAP = Object.fromEntries(AUDIT_QUESTIONS.map((q) => [q.id, q]));
const projectTasks = ["Build or redesign a website", "Design a logo or refresh a brand", "Build a custom app or connect systems", "Combine website and workflow improvements", "Get ongoing technical support"];
const businessTasks = [...projectTasks, "Find and research prospects", "Sales follow-ups and outreach", "Booking and scheduling", "Quotes and estimates", "Customer requests and admin", "Invoices and expense tracking", "Content and marketing", "Website SEO and search visibility", "Meeting notes and proposals", "Reporting and data analysis"];
const personalTasks = ["Manage my time and commitments", "Organize files, email and paperwork", "Research options and make decisions", "Plan trips or events", "Learn a tool or develop a skill", "Manage a personal project", "Coordinate shared routines"];
const historicalPersonalTasks = ["School and sports schedules", "Family and sports travel", "Household tasks and reminders", "Personal email and paperwork"];

export function personalGoal(goal: string) { return [...personalTasks,...historicalPersonalTasks].includes(goal); }

export function projectFocus(priority: string) {
  if (/combin.*website|website.*workflow/i.test(priority)) return "combined";
  if (/ongoing technical|fractional|technical partner/i.test(priority)) return "support";
  if (/custom app|connect systems|integration project/i.test(priority)) return "development";
  if (/redesign|build.*website|website.*build|brand refresh|refresh a brand|logo/i.test(priority)) return "website";
  return null;
}
const selectionQuestions: Record<string, { text: string; options: string[]; type?: "choice" | "multiselect" }> = {
  customer_impact: { text: "What is the main cost of this problem today?", type: "choice", options: ["Lost leads or missed revenue", "Staff time and repetitive work", "Slow response to customers", "Errors or work that has to be redone", "Customer experience or retention", "Not sure yet"] },
  lead_volume: { text: "Roughly how many new inquiries or leads arrive per month?", type: "choice", options: ["0–10", "11–30", "31–100", "101–300", "More than 300", "Not sure"] },
  marketing_channels: { text: "Which channels do you use to acquire customers?", type: "multiselect", options: ["Google Search / Maps", "Website or blog", "Facebook or Instagram", "Other social media", "Referrals and word of mouth", "Paid advertisements", "Email marketing", "Not actively marketing"] },
  marketing_goal: { text: "Which outcome would make marketing more valuable?", type: "choice", options: ["More qualified inquiries", "More website visitors from search", "More bookings or purchases", "Consistent content creation", "Better follow-up with existing prospects", "Know which campaigns work"] },
  website_goal: { text: "What action should your website encourage?", type: "choice", options: ["Call or request a quote", "Book an appointment", "Submit a contact form", "Buy a product or service", "Learn about our services", "We do not have a website yet"] },
  task_frequency: { text: "How often does this work come up?", type: "choice", options: ["Several times a day", "About once a day", "A few times a week", "Weekly", "Occasionally or around events", "Not sure yet"] },
  time_per_task: { text: "About how long does one round of this work take?", type: "choice", options: ["Under 15 minutes", "15–30 minutes", "30–60 minutes", "1–2 hours", "More than 2 hours", "Not sure yet"] },
  workflow_example: { text: "What usually starts the work you want help with?", options: ["An email or message arrives", "A date or schedule changes", "A new lead or customer request arrives", "A meeting ends", "A recurring deadline or weekly review", "I remember and do it manually", "Not sure yet"] },
  business_type: { text: "Which industry best describes your business?", type: "choice", options: [...industrySites.map(site=>site.industry), "Sales or business development", "Professional services or consulting", "Trades, construction or home services", "Real estate", "Retail or e-commerce", "Hospitality", "Coaching or content creation"] },
  role: { text: "What is your role?", type: "choice", options: ["Owner or solo operator", "Manager or team lead", "Sales or outreach", "Operations or administration", "Employee exploring improvements"] },
  core_system: { text: "Which tools handle your business work today?", options: ["Gmail / Google Workspace", "Outlook / Microsoft 365", "CRM (such as HubSpot or Salesforce)", "Spreadsheets", "Accounting software", "Project or task management app", "Mostly manual / no formal system"] },
  sales_pipeline_stage: { text: "Where would sales help make the biggest difference?", options: ["Finding qualified prospects", "Research before outreach", "Writing personalized outreach", "Following up consistently", "Preparing proposals", "Updating the CRM", "Not sure yet"] },
  family_sources: { text: "Where do updates about these commitments arrive?", options: ["Email", "Text messages or group chats", "An organization or activity app", "Shared calendar", "Paper notices", "Several places that do not sync"] },
  family_coordination: { text: "What is hardest to keep coordinated?", options: ["Schedule changes", "Conflicting events", "Coordinating people or locations", "Registration or payment deadlines", "Remembering tasks", "Sharing updates with the right people"] },
  travel_needs: { text: "What would make travel easier?", options: ["Itineraries in one place", "Comparing travel options", "Departure and arrival reminders", "Packing lists", "Handling schedule changes", "Coordinating a group"] },
  ai_tools_today: { text: "Which AI tools have you tried?", options: ["ChatGPT", "Claude", "Grok", "Microsoft Copilot", "Google Gemini", "None yet", "Not sure which tools I use"] },
  data_boundaries: { text: "Which boundaries should we plan around?", options: ["Keep work and family separate", "Employer approval is required", "Private personal records", "Customer or confidential business information", "No access to financial accounts", "Help me decide during the consultation"] },
  pilot_owner: { text: "Who would review and manage the first workflow?", type: "choice", options: ["Me", "Me and my partner / household", "Me and a colleague", "A team manager", "I need help choosing an owner"] },
  success_definition: { text: "What results would matter most?", options: ["Less time on repetitive work", "Fewer missed tasks or deadlines", "More consistent follow-up", "Fewer errors or duplicate entries", "Less stress and better coordination", "A clear process I can trust"] },
};
/** Selected problems remain the backlog; the highest priority drives short follow-up branches. */
export function selectedProblems(raw:string):string[] {
  if (!raw.trim() || raw === "(skipped)") return [];
  try {
    const parsed:unknown=JSON.parse(raw);
    if(Array.isArray(parsed)) return parsed.filter((v):v is string=>typeof v==="string"&&Boolean(v.trim()));
  }catch { /* Previous text-only answers are valid. */ }
  return raw.split(/[;\n]/).map(v=>v.trim()).filter(Boolean);
}
function hasMatch(raw:string,pattern:RegExp):boolean { return pattern.test(raw.toLowerCase()); }

/** A stable ordered tree. One priority gets deeper questions; others remain in the backlog. */
export function assessmentOrder(answers:Answer[]):string[] {
  const values=Object.fromEntries(answers.map(a=>[a.id,a.answer]));
  const audience=audienceFrom(answers);
  const business=audience!=="personal",personal=audience!=="business";
  const selected=selectedProblems(values.top_problems??"");
  const priority=selected.includes(values.first_priority??"")?values.first_priority:selected[0]??"";
  const project=business ? projectFocus(priority) : null;
  const personalPriority=personal&&(audience==="personal"||personalGoal(priority));
  const industry=values.business_type??"";
  const trades=business&&hasMatch(industry,/trade|construction|home service|plumb|electri|landscap|roof|clean/);
  const sales=hasMatch(priority,/sales|prospect|outreach|lead|follow.up|quote|estimate/);
  const marketing=hasMatch(priority,/content|marketing|social|seo|search|website|advertis/);
  const invoices=hasMatch(priority,/invoice|expense|account|finance|receivable/);
  const operational=hasMatch(priority,/admin|operat|customer request|schedul|meeting|proposal|book/);
  const branch:string[]=[];
  if(trades)branch.push("ops_scheduling","quote_process","lead_source","ops_volume");
  if(sales)branch.push("lead_source","sales_pipeline_stage","follow_up_process","lead_volume");
  if(marketing)branch.push("marketing_channels","marketing_goal","website_goal");
  if(invoices)branch.push("invoicing_tool","invoicing_bottleneck");
  if(operational)branch.push("ops_volume","ops_handoff_risk","ops_manual_steps");
  if(business&&!branch.length)branch.push("ops_manual_steps","lead_source");
  const branchLimit=audience==="both"?2:3;
  const branchQuestions = project === "website" || project === "combined" ? ["project_requirements","website_current","website_features"]
    : project === "development" ? ["project_requirements","current_software"]
    : project === "support" ? ["support_scope","current_software"]
    : personalPriority ? [] : [...new Set(branch)].slice(0,branchLimit);
  const needsApprover=business&&/partial|^no\b/i.test(values.decision_authority??"");
  const travel=personal&&hasMatch(priority || (values.top_problems ?? ""),/travel|trip/);
  const coordination=personalPriority&&hasMatch(priority,/schedule|commitment|coordinate|routine|travel|trip/);
  const plan=[
    "contact_email","contact_name","audience",
    ...(business?["company_name","business_type","team_size","role","decision_authority",...(needsApprover?["decision_process"]:[]),"website_url"]:[]),
    "top_problems",...(selected.length>1?["first_priority"]:[]),
    ...(project && project!=="combined" ? [] : ["task_frequency","time_per_task","workflow_example"]),
    ...(audience==="business"&&!project?["customer_impact"]:[]),
    ...(business?[...(project==="website"?[]:["core_system","current_software"]),...branchQuestions]:[]),
    ...(coordination?["family_sources","family_coordination",...(travel?["travel_needs"]:[])]:[]),
    ...(!project||project==="combined"?["ai_tools_today","approval_preference"]:[]),"data_boundaries","pilot_owner","success_definition","budget_range","urgency","support_preference",
  ];
  return [...new Set(plan)];
}
export function assessmentQuestions(answers:Answer[]):Question[] {
  const values=Object.fromEntries(answers.map(a=>[a.id,a.answer]));
  const audience=audienceFrom(answers);
  return assessmentOrder(answers).map((id):Question|undefined=>{
    const base=AUDIT_MAP[id]??QUESTION_MAP[id];
    if(id==="top_problems"){
      const groups=[
        ...(audience!=="personal"?[{label:"Projects and technical support",options:projectTasks},{label:"Business operations and growth",options:businessTasks.filter(task=>!projectTasks.includes(task))}]:[]),
        ...(audience!=="business"?[{label:"Personal & household",options:personalTasks}]:[]),
      ];
      return {...base!,category:"goals",text:"What would you like to improve or build?",type:"multiselect",allowOther:true,optionGroups:groups,options:groups.flatMap(g=>g.options)};
    }
    if(id==="first_priority"){
      const options=selectedProblems(values.top_problems??"");
      return {...base!,text:"Of the areas you selected, which one should we address first?",type:"choice",options,allowOther:false};
    }
    if(id==="workflow_example" && (audience==="personal" || !businessTasks.includes(values.first_priority ?? selectedProblems(values.top_problems ?? "")[0] ?? ""))) {
      return {...base!,type:"text",text:"Tell us about one example in your own words. What are you trying to do, and where would help make a difference?"};
    }
    const selection=selectionQuestions[id];
    if(selection)return {id,category:base?.category??"goals",core:base?.core??true,...selection,type:selection.type??"multiselect",allowOther:true};
    return base;
  }).filter((q):q is Question=>!!q&&!q.skip?.(values));
}

/** Deterministic navigation; never request AI on the answer-save path. */
export function preCallQuestions(answers:Answer[]):Question[] {
  const values=Object.fromEntries(answers.map(a=>[a.id,a.answer]));
  const goals=selectedProblems(values.top_problems??"");
  const primary=goals.includes(values.first_priority) ? values.first_priority : goals[0]??"";
  const track=serviceFor(primary,values.audience??"");
  const industry=industrySites.find(site=>site.industry===values.business_type);
  const contextPrompt=industry && track.name==="Websites"
    ? industry.question+" Include your current website if you have one."
    : track.prompt;
  const contextId="meeting_context_"+track.name.toLowerCase().replace(/[^a-z]+/g,"_");
  const ids=["contact_email","contact_name","audience",...(audienceFrom(answers)!=="personal"?["company_name","business_type"]:[]),
    "top_problems",...(goals.length>1?["first_priority"]:[]),contextId,"success_definition","urgency","budget_range"];
  const detailed=new Map(assessmentQuestions(answers).map(question=>[question.id,question]));
  return ids.flatMap((id):Question[]=>{
    if(id===contextId)return [{id,category:"goals",core:false,type:"text",text:contextPrompt}];
    if(id==="success_definition")return [{id,category:"goals",core:false,type:"text",text:"What would make this project a success for you?"}];
    const question=detailed.get(id);
    return question?[question]:[];
  });
}

export function assessmentStep(answers:Answer[],afterQuestionId?:string,questionPlan=assessmentQuestions(answers)){
  const answered=new Set(answers.map(a=>a.id));
  const position=afterQuestionId?questionPlan.findIndex(q=>q.id===afterQuestionId):-1;
  const pending=questionPlan.filter(q=>!answered.has(q.id));
  const next=pending.find(q=>questionPlan.indexOf(q)>position)??pending[0];
  return {questionPlan,questions:next?[next]:[],done:!next};
}

/** Prune stale branch answers when someone changes audience or primary priority. */
export function applicableAnswers<T extends Answer>(answers:T[]):T[]{
  if(!answers.some(a=>a.id==="audience"))return answers;
  const audience=audienceFrom(answers);
  // When a user changes audience, remove known selections from the old audience.
  // A fully incompatible problem selection must be re-asked instead of treated as answered.
  const normalized=answers.flatMap(answer=>{
    if(answer.id!=="top_problems")return [answer];
    const selected=selectedProblems(answer.answer);
    if(!selected.length)return [answer];
    const retained=selected.filter(value=>
      !(audience==="personal"&&businessTasks.includes(value)) &&
      !(audience==="business"&&[...personalTasks,...historicalPersonalTasks].includes(value)));
    if(!retained.length)return [];
    return [{...answer,answer:JSON.stringify(retained)} as T];
  });
  const choices=selectedProblems(normalized.find(a=>a.id==="top_problems")?.answer??"");
  const withoutStalePriority=normalized.filter(a=>a.id!=="first_priority"||choices.includes(a.answer));
  const applicable=new Set(assessmentQuestions(withoutStalePriority).map(q=>q.id));
  const branched=new Set([
    "company_name","business_type","team_size","role","decision_authority","decision_process",
    "project_requirements","website_current","website_features","support_scope","workflow_example","task_frequency","time_per_task","ai_tools_today","approval_preference",
    "website_url","first_priority","current_software","core_system","customer_impact",
    "lead_source","sales_pipeline_stage","follow_up_process","crm_tool","lead_volume",
    "ops_scheduling","quote_process","ops_volume","ops_handoff_risk","ops_manual_steps",
    "marketing_channels","marketing_goal","website_goal","invoicing_tool","invoicing_bottleneck",
    "family_sources","family_coordination","travel_needs",
    "approver_name","approver_email","approver_role",
  ]);
  const contextId=preCallQuestions(withoutStalePriority).find(q=>q.id.startsWith("meeting_context_"))?.id;
  return withoutStalePriority.filter(a=>a.id.startsWith("meeting_context_") ? a.id===contextId : !branched.has(a.id)||applicable.has(a.id));
}
export const ALL_ASSESSMENT_QUESTIONS = [...QUESTION_BANK, ...AUDIT_QUESTIONS];
export const ALL_ASSESSMENT_MAP = { ...QUESTION_MAP, ...AUDIT_MAP };
