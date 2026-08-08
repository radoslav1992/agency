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
    variant: 'dark',
  },
  {
    number: '02',
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
    number: '03',
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
    number: '04',
    title: 'Business websites',
    problem:
      "The site was built five years ago. It loads slowly, it doesn't show up in search, and you can't change a phone number without emailing someone.",
    solution: 'A fast site you update yourself. No heavy plugins that break on every update.',
    change: "You can see what's wrong with your current site before you even ask me.",
    points: [
      'A design made for you, not a theme from a catalogue',
      'Technical SEO foundations and a mobile version',
      'Training so you can update it yourself',
      'Managed hosting for the first year',
    ],
  },
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
    'I take on few projects at a time. Otherwise I cannot know them in detail, and that detail is precisely what you are buying.',
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
  imageCaption: 'Speaking at a technical conference in Sofia',
};

/**
 * Prices are higher than the Bulgarian ones, on purpose.
 *
 * €1,500 for an AI pilot is a sensible entry price in Sofia. Presented to a
 * buyer in London, Munich or Amsterdam the same number reads as either
 * inexperience or a hidden catch, and it attracts the price-shopping end of
 * the market — the worst possible fit for a studio whose real constraint is
 * hours, not leads.
 */
export const PLANS: Plan[] = [
  {
    name: 'AI pilot',
    pitch: 'A bounded project that proves whether the idea works on real data, before you invest in a full build.',
    price: 'from €3,500',
    features: [
      'A pilot on your own documents and processes',
      'Answers with cited sources',
      'A local model where the data is sensitive',
      'Measurement of the time actually saved',
      'A straight recommendation: is this worth continuing',
    ],
  },
  {
    name: 'Internal system',
    pitch: 'One system instead of spreadsheets, email threads and information moved by hand.',
    price: 'MVP from €8,000',
    features: [
      'Process analysis and a prototype',
      'Users, roles, reporting',
      'Integrations with your existing systems',
      'Three months of support included',
    ],
  },
  {
    name: 'Business website',
    pitch: 'Up to five core pages, built for mobile and easy to keep updated.',
    price: 'typically €2,500–6,000',
    features: [
      'A design made for you',
      'Mobile version and technical SEO foundations',
      'Contact form and map',
      'Training so you can update it',
      'Managed hosting for the first year included',
    ],
  },
];

export const PRICING_PROMO: string | null = null;

export const NEEDS = [
  'An AI agent for a repeating channel (phone, inbox, documents)',
  'Automating a repetitive process',
  'An internal system or client portal',
  'A business website',
  'Training or consulting',
  "I'm not sure yet",
];
