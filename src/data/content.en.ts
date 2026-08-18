/**
 * English mirror of `content.ts`. Same shapes, same order — the components
 * pick one or the other by locale and never branch on language themselves.
 *
 * Two things are deliberately NOT literal translations:
 *
 *   1. Prices. The Bulgarian numbers are set for the Bulgarian market. The
 *      same figures read as junior-rate abroad and pull in buyers shopping
 *      on price, which is the wrong end of the market for a one-person
 *      studio with limited hours.
 *
 *   2. Anything that only makes sense inside Bulgaria — a Bulgarian
 *      university, clients "across the country", the free site analyser
 *      that exists only in Bulgarian.
 */

import type { Plan, ProcessStep, Service } from './content.ts';

export const SERVICES: Service[] = [
  {
    number: '01',
    title: 'A website and an AI agent, launched together',
    problem:
      'A new site brings visitors, but they write in the evening and on Saturdays, ask the same handful of questions, and half of them leave before anyone replies. A site with nobody answering is a brochure.',
    solution:
      'The site and the agent are built and launched at once, for the same job: the agent knows what the site says, answers from it, books a slot and takes a contact. The domain and the first year of hosting are included.',
    changes: [
      {
        title: 'One price, one deadline',
        body: 'Nothing gets negotiated twice, and the agent does not wait for the site to be finished. The published price is €1,200 once, plus the agent\'s monthly fee, which I state up front.',
      },
      {
        title: 'Answers outside office hours',
        body: 'A visitor gets an answer the moment they have a question — including in the evening, on a Sunday, and while you are on the other line.',
      },
      {
        title: 'The site alone is fine too',
        body: 'If you do not need the agent yet, the site ships on its own and the agent is added later without rebuilding anything.',
      },
    ],
    link: { href: '/services/#pricing', label: "See what's included →" },
    variant: 'dark',
    wide: true,
  },
  {
    number: '02',
    title: 'AI agents for the work that repeats',
    problem:
      'Hours disappear into routine every day: calls nobody picks up, the same questions over email and chat, invoices and quotes retyped by hand, appointments that get forgotten. Separately, minutes. Together, a full-time position a day.',
    solution:
      'A specialised AI agent takes one of those channels end to end — voice, chat, email or documents. It works strictly from your own material, cites the source of every answer, keeps a record, and hands over to a person the moment the case needs judgement.',
    changes: [
      {
        title: 'It never clocks off',
        body: 'Customers get an answer, service and a booked slot around the clock — in the evening, on a Saturday, and while the line is busy.',
      },
      {
        title: 'Your team gets its hours back',
        body: 'People stop retyping and stop repeating themselves, and go back to the deals and decisions that actually need them.',
      },
      {
        title: 'Control and privacy stay yours',
        body: 'The agent stops where human judgement begins, and for sensitive data the model can run entirely on your own infrastructure.',
      },
    ],
    link: { href: '/agents/', label: 'See the ready-made agents →' },
  },
  {
    number: '03',
    title: 'Automating the tasks that repeat',
    problem:
      'Someone copies data from emails into a spreadsheet. Every day, two hours at a time, with mistakes that only surface a month later.',
    solution:
      'The system takes over the entry, the recognition and the preparation. A person reviews and approves.',
    change:
      'Processing time drops. Transcription errors disappear — errors of judgement do not, which is why a person stays at the end of the line.',
    points: [
      'Less manual data entry',
      'A traceable record of who approved what, and when',
      'It runs even when nobody is there to do it',
    ],
  },
  {
    number: '04',
    wide: true,
    title: 'Internal systems and client portals',
    problem:
      'The business has outgrown spreadsheets, but off-the-shelf CRM and ERP are heavy, expensive and shaped nothing like the way you actually work. The process lives in spreadsheets, email threads and "can you send me that again".',
    solution:
      'One application built around your process — users, roles, reporting, and connections to the tools you already run.',
    change: 'The information sits in one place and stops depending on who saved it in which file.',
    points: [
      'One system instead of scattered spreadsheets',
      'Different permissions for different people',
      'Integrations with the services you already use',
    ],
  },
];

export const SECONDARY_SERVICES: Service[] = [
  {
    number: '05',
    title: 'Generative AI training',
    body: 'The same material I teach at university, with your documents and your processes in the exercises.',
  },
];

export const PROCESS: ProcessStep[] = [
  {
    number: '01',
    title: 'First call',
    body: "Thirty minutes, free. You show me how the process runs today. I tell you whether automating it makes sense — and if it doesn't, I say so.",
  },
  {
    number: '02',
    title: 'A one-page quote',
    body: 'Scope, deadline and price. No vague extras and no important terms left for later.',
  },
  {
    number: '03',
    title: 'Work in small stages',
    body: 'You see a working version while I build it, not at the end. AI projects start with a limited pilot before you commit a serious budget.',
  },
  {
    number: '04',
    title: 'Launch and support',
    body: 'Documentation, every credential, and training so you can run the system without me. What I cover after launch is written in the quote.',
  },
];

export const TERMS: { title: string; body: string }[] = [
  {
    title: 'Who owns the code?',
    body: 'After the final payment, the code, the design and the project data are yours.',
  },
  {
    title: 'How does payment work?',
    body: 'In stages, against an invoice. The exact schedule is in the quote.',
  },
  {
    title: 'What if the scope changes?',
    body: 'If new requirements come up, I first tell you how they affect the deadline and the price. I start work on them only after your go-ahead.',
  },
  {
    title: 'What does support include?',
    body: 'Monitoring, bug fixing and the small changes we agreed. The exact scope is written in the quote.',
  },
  {
    title: 'How is data protected?',
    body: 'I sign an NDA where needed. For sensitive data I use local models or infrastructure you control.',
  },
  {
    title: 'How is the project handed over?',
    body: 'The code goes into your repository, with documentation, every credential and training on running the system.',
  },
];

export const ABOUT = {
  heading: "Hello — I'm Radoslav.",
  paragraphs: [
    'I founded Kova Studio. For over six years I have been building corporate software — internal systems and AI over real business data. I teach generative AI and natural language processing at university and I am a PhD candidate in computer science.',
    'I lead every project myself. When a job needs design, security or marketing, I bring in people I have worked with before — but I stay the person you deal with, and the responsibility stays mine.',
    /*
     * This used to read "I take on few projects at a time" with no
     * qualifier. It stopped being true the day the site-and-agent package
     * launched: that one is a product, not bespoke work. A promise your own
     * price list contradicts is worse than no promise.
     */
    'Bespoke projects I take on few at a time — otherwise I cannot know them in detail, and that detail is precisely what you are buying. The site-and-agent package is different: the work is described up front and does not cost the same hours.',
  ],
  stats: [
    { value: '6+', label: 'years as a software engineer' },
    { value: 'PhD candidate', label: 'in computer science, university lecturer in generative AI' },
  ],
  skills: [
    'AI agents',
    'Automation',
    'Internal systems',
    'RAG',
    'Generative AI',
    'SEO & GEO',
  ],
};

/**
 * Same three rungs as the Bulgarian ladder, at roughly 2.5× the price.
 *
 * €490 for a site and an agent is a sensible entry price in Sofia. Put in
 * front of a buyer in London, Munich or Amsterdam, that number reads as
 * either inexperience or a hidden catch, and it attracts the price-shopping
 * end of the market — the worst possible fit for a studio whose real
 * constraint is hours, not leads.
 *
 * Monthly fees are deliberately absent here, in both languages. They differ
 * per agent and change more often than this file does; they belong in the
 * quote and on the product's own site.
 */
export const PLANS: Plan[] = [
  {
    name: 'Site and agent',
    pitch: 'A packaged offer with a published price: the site and the AI agent are built together and go live on the same day.',
    price: '€1,200 once',
    note: 'Plus a monthly fee for the agent — it depends which one, and I state it before you pay anything.',
    featured: true,
    badge: 'Most chosen',
    features: [
      'A design made for you, not a theme from a catalogue',
      'Mobile version and technical SEO foundations',
      'Domain and managed hosting for the first year',
      'An AI agent that knows what the site says',
      'Training so you can update the content yourself',
    ],
  },
  {
    name: 'Agent on your site',
    pitch: 'Your site works and we leave it alone. I put an agent on top of it and connect it to your material.',
    price: 'setup from €400',
    /*
     * Само поддръжката следва множителя на английските цени. Ползването е
     * това, което доставчикът взима, и е еднакво навсякъде — удвоено, то би
     * било точно надценката, която съседното изречение отрича.
     */
    note: "Plus a monthly fee depending on the agent — for the AI receptionist, €85 a month: €25 usage at cost, €60 support.",
    features: [
      'Choosing the right agent for the channel',
      'Connecting it to your content, and tuning',
      'Going live, with the answers checked',
      'Bespoke changes are quoted separately',
    ],
  },
  {
    name: 'Bespoke build',
    pitch: 'For when a ready-made agent will not do: an internal system, a portal, or a process with no equivalent.',
    price: 'from €8,000',
    features: [
      'We start with a bounded pilot on real data',
      'Users, roles and reporting',
      'Integrations with the systems you already run',
      'A local model where the data is sensitive',
      'Three months of support included',
    ],
  },
];

export const PRICING_PROMO: string | null = null;

export const NEEDS = [
  'A website and an AI agent together',
  'An AI agent on a site I already have',
  'Automating a repetitive process',
  'An internal system or client portal',
  'Training or consulting',
  "I'm not sure yet",
];
