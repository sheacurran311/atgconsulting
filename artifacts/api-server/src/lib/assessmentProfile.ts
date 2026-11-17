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
  { id: "family_sources", category: "personal", text: "Where do school, sports, household, and travel updates arrive? Name the apps or channels, not children's names or private content.", type: "text", core: true },
  { id: "family_coordination", category: "personal", text: "What gets missed or conflicts: deadlines, pickups, activity changes, travel, household tasks, or something else?", type: "text", core: true },
  { id: "travel_needs", category: "personal", text: "What help would you like with trips or sports travel? For example: itinerary, departure reminders, packing, or comparing options. Purchases stay with you.", type: "text", core: true },
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
const businessTasks = ["Find and research prospects", "Sales follow-ups and outreach", "Meeting notes and proposals", "Customer requests and admin", "Invoices and expense tracking", "Content and marketing"];
const personalTasks = ["School and sports schedules", "Family and sports travel", "Household tasks and reminders", "Personal email and paperwork"];
const selectionQuestions: Record<string, { text: string; options: string[]; type?: "choice" | "multiselect" }> = {
  customer_impact: { text: "What is the main cost of this problem today?", type: "choice", options: ["Lost leads or missed revenue", "Staff time and repetitive work", "Slow response to customers", "Errors or work that has to be redone", "Customer experience or retention", "Not sure yet"] },
  lead_volume: { text: "Roughly how many new inquiries or leads arrive per month?", type: "choice", options: ["0–10", "11–30", "31–100", "101–300", "More than 300", "Not sure"] },
  marketing_channels: { text: "Which channels do you use to acquire customers?", type: "multiselect", options: ["Google Search / Maps", "Website or blog", "Facebook or Instagram", "Other social media", "Referrals and word of mouth", "Paid advertisements", "Email marketing", "Not actively marketing"] },
  marketing_goal: { text: "Which outcome would make marketing more valuable?", type: "choice", options: ["More qualified inquiries", "More website visitors from search", "More bookings or purchases", "Consistent content creation", "Better follow-up with existing prospects", "Know which campaigns work"] },
  website_goal: { text: "What action should your website encourage?", type: "choice", options: ["Call or request a quote", "Book an appointment", "Submit a contact form", "Buy a product or service", "Learn about our services", "We do not have a website yet"] },
  task_frequency: { text: "How often does this work come up?", type: "choice", options: ["Several times a day", "About once a day", "A few times a week", "Weekly", "Occasionally or around events", "Not sure yet"] },
  time_per_task: { text: "About how long does one round of this work take?", type: "choice", options: ["Under 15 minutes", "15–30 minutes", "30–60 minutes", "1–2 hours", "More than 2 hours", "Not sure yet"] },
  workflow_example: { text: "What usually starts the work you want help with?", options: ["An email or message arrives", "A date or schedule changes", "A new lead or customer request arrives", "A meeting ends", "A recurring deadline or weekly review", "I remember and do it manually", "Not sure yet"] },
  business_type: { text: "Which best describes your work?", type: "choice", options: ["Sales or business development", "Professional services or consulting", "Trades, construction or home services", "Real estate", "Retail or e-commerce", "Hospitality", "Coaching or content creation"] },
  role: { text: "What is your role?", type: "choice", options: ["Owner or solo operator", "Manager or team lead", "Sales or outreach", "Operations or administration", "Employee exploring improvements"] },
  core_system: { text: "Which tools handle your business work today?", options: ["Gmail / Google Workspace", "Outlook / Microsoft 365", "CRM (such as HubSpot or Salesforce)", "Spreadsheets", "Accounting software", "Project or task management app", "Mostly manual / no formal system"] },
  sales_pipeline_stage: { text: "Where would sales help make the biggest difference?", options: ["Finding qualified prospects", "Research before outreach", "Writing personalized outreach", "Following up consistently", "Preparing proposals", "Updating the CRM", "Not sure yet"] },
  family_sources: { text: "Where do your personal or family updates arrive?", options: ["Email", "Text messages or group chats", "School or sports apps", "Shared calendar", "Paper notices", "Several places that do not sync"] },
  family_coordination: { text: "What is hardest to keep coordinated?", options: ["Schedule changes", "Conflicting events", "Pickups and rides", "Registration or payment deadlines", "Remembering tasks", "Sharing updates with the right people"] },
  travel_needs: { text: "What would make travel easier?", options: ["Itineraries in one place", "Comparing travel options", "Departure and arrival reminders", "Packing lists", "Handling schedule changes", "Coordinating a group"] },
  ai_tools_today: { text: "Which AI tools have you tried?", options: ["ChatGPT", "Claude", "Grok", "Microsoft Copilot", "Google Gemini", "None yet", "Not sure which tools I use"] },
  data_boundaries: { text: "Which boundaries should we plan around?", options: ["Keep work and family separate", "Employer approval is required", "Children's or school information", "Customer or confidential business information", "No access to financial accounts", "Help me decide during the consultation"] },
  pilot_owner: { text: "Who would review and manage the first workflow?", type: "choice", options: ["Me", "Me and my partner / household", "Me and a colleague", "A team manager", "I need help choosing an owner"] },
  success_definition: { text: "What results would matter most?", options: ["Less time on repetitive work", "Fewer missed tasks or deadlines", "More consistent follow-up", "Fewer errors or duplicate entries", "Less stress and better coordination", "A clear process I can trust"] },
};
/** Selected problems remain the backlog; the highest priority drives short follow-up branches. */
function selectedProblems(raw:string):string[] {
  if (!raw.trim() || raw === "(skipped)") return [];
  try {
    const parsed:unknown=JSON.parse(raw);
    if(Array.isArray(parsed)) return parsed.filter((v):v is string=>typeof v==="string"&&Boolean(v.trim())).slice(0,12);
  }catch { /* Previous text-only answers are valid. */ }
  return raw.split(/[;\n]/).map(v=>v.trim()).filter(Boolean).slice(0,12);
}
function hasMatch(raw:string,pattern:RegExp):boolean { return pattern.test(raw.toLowerCase()); }

/** A stable ordered tree. One priority gets deeper questions; others remain in the backlog. */
export function assessmentOrder(answers:Answer[]):string[] {
  const values=Object.fromEntries(answers.map(a=>[a.id,a.answer]));
  const audience=audienceFrom(answers);
  const business=audience!=="personal",personal=audience!=="business";
  const selected=selectedProblems(values.top_problems??"");
  const priority=selected.includes(values.first_priority??"")?values.first_priority:selected[0]??"";
  const industry=values.business_type??"";
  const trades=business&&hasMatch(industry,/trade|construction|home service|plumb|electri|landscap|roof|clean/);
  const sales=hasMatch(priority,/sales|prospect|outreach|lead|follow.up/);
  const marketing=hasMatch(priority,/content|marketing|social|seo|search|website|advertis/);
  const invoices=hasMatch(priority,/invoice|expense|account|finance|receivable/);
  const operational=hasMatch(priority,/admin|operat|customer request|schedul|meeting|proposal/);
  const branch:string[]=[];
  if(trades)branch.push("ops_scheduling","quote_process","lead_source","ops_volume");
  if(sales)branch.push("lead_source","sales_pipeline_stage","follow_up_process","lead_volume");
  if(marketing)branch.push("marketing_channels","marketing_goal","website_goal");
  if(invoices)branch.push("invoicing_tool","invoicing_bottleneck");
  if(operational)branch.push("ops_volume","ops_handoff_risk","ops_manual_steps");
  if(business&&!branch.length)branch.push("ops_manual_steps","lead_source");
  const branchLimit=audience==="both"?2:3;
  const branchQuestions=[...new Set(branch)].slice(0,branchLimit);
  const needsApprover=business&&/partial|^no\b/i.test(values.decision_authority??"");
  const travel=personal&&hasMatch(priority||values.top_problems??"",/travel|trip|sports/);
  const plan=[
    "contact_email","contact_name","audience",
    ...(business?["company_name","business_type","team_size","role","decision_authority",...(needsApprover?["decision_process"]:[]),"website_url"]:[]),
    "top_problems",...(selected.length>1?["first_priority"]:[]),
    "task_frequency","time_per_task","workflow_example",
    ...(audience!=="both"?["customer_impact"]:[]),
    ...(business?["core_system","current_software",...branchQuestions]:[]),
    ...(personal?["family_sources","family_coordination",...(travel?["travel_needs"]:[])]:[]),
    "ai_tools_today","approval_preference","data_boundaries","pilot_owner","success_definition","budget_range","urgency","support_preference",
  ];
  return plan;
}
export function assessmentQuestions(answers:Answer[]):Question[] {
  const values=Object.fromEntries(answers.map(a=>[a.id,a.answer]));
  const audience=audienceFrom(answers);
  return assessmentOrder(answers).map((id):Question|undefined=>{
    const base=AUDIT_MAP[id]??QUESTION_MAP[id];
    if(id==="top_problems"){
      const groups=[
        ...(audience!=="personal"?[{label:"Business",options:businessTasks}]:[]),
        ...(audience!=="business"?[{label:"Personal & household",options:personalTasks}]:[]),
      ];
      return {...base!,text:"Which tasks or problems would you most like help with?",type:"multiselect",allowOther:true,optionGroups:groups,options:groups.flatMap(g=>g.options)};
    }
    if(id==="first_priority"){
      const options=selectedProblems(values.top_problems??"");
      return {...base!,text:"Of the areas you selected, which one should we address first?",type:"choice",options,allowOther:false};
    }
    const selection=selectionQuestions[id];
    if(selection)return {id,category:base?.category??"goals",core:base?.core??true,...selection,type:selection.type??"multiselect",allowOther:true};
    return base;
  }).filter((q):q is Question=>!!q&&!q.skip?.(values));
}

/** Deterministic navigation; never request AI on the answer-save path. */
export function assessmentStep(answers:Answer[],afterQuestionId?:string){
  const questionPlan=assessmentQuestions(answers);
  const answered=new Set(answers.map(a=>a.id));
  const position=afterQuestionId?questionPlan.findIndex(q=>q.id===afterQuestionId):-1;
  const pending=questionPlan.filter(q=>!answered.has(q.id));
  const next=pending.find(q=>questionPlan.indexOf(q)>position)??pending[0];
  return {questionPlan,questions:next?[next]:[],done:!next};
}

/** Prune stale branch answers when someone changes audience or primary priority. */
export function applicableAnswers<T extends Answer>(answers:T[]):T[]{
  if(!answers.some(a=>a.id==="audience"))return answers;
  const applicable=new Set(assessmentQuestions(answers).map(q=>q.id));
  const branched=new Set([
    "company_name","business_type","team_size","role","decision_authority","decision_process",
    "website_url","first_priority","current_software","core_system","customer_impact",
    "lead_source","sales_pipeline_stage","follow_up_process","crm_tool","lead_volume",
    "ops_scheduling","quote_process","ops_volume","ops_handoff_risk","ops_manual_steps",
    "marketing_channels","marketing_goal","website_goal","invoicing_tool","invoicing_bottleneck",
    "family_sources","family_coordination","travel_needs",
    "approver_name","approver_email","approver_role",
  ]);
  return answers.filter(a=>!branched.has(a.id)||applicable.has(a.id));
}
export const ALL_ASSESSMENT_QUESTIONS = [...QUESTION_BANK, ...AUDIT_QUESTIONS];
export const ALL_ASSESSMENT_MAP = { ...QUESTION_MAP, ...AUDIT_MAP };
