/**
 * English mirror of `agents.ts`. Same ids, same order, same images.
 *
 * The two rules from the Bulgarian file carry over unchanged:
 *   1. Nothing here claims a result that has not been measured.
 *   2. Every agent states where it does NOT work — `limits`. The site
 *      promises that limitations are named upfront, and this is that place.
 */

import type { Agent } from './agents.ts';

export const AGENTS: Agent[] = [
  {
    id: 'receptionist',
    alt: 'A clinic reception desk: the phone on the counter is ringing while the receptionist is already with a patient.',
    name: 'AI phone receptionist',
    channel: 'Voice',
    short: 'Answers the calls you miss, handles questions and books appointments.',
    problem:
      'The call comes in while you are with a customer. Nobody picks up, the caller rings the next name on their list, and never comes back.',
    does: [
      'Answers the calls that would otherwise be missed — out of hours, or while the line is busy',
      'Handles the usual questions: opening hours, address, prices, parking, what to bring',
      'Books a slot in the calendar and sends a confirmation by SMS or messenger',
      'Transfers to a person when the question goes beyond what it was taught',
      'Leaves a recording and a summary of every call, so you can see what was said',
    ],
    bestFor: 'Dental and medical practices, salons, garages, law firms, small hotels',
    needs: [
      'A phone number to forward (or a new virtual number)',
      'A calendar with available slots',
      'A list of the questions customers ask most often',
    ],
    limits:
      'It does not diagnose, does not give medical or legal advice and does not negotiate prices. On those it transfers to a person. Calls are recorded only after a clear announcement at the start.',
    demo: true,
  },
  {
    id: 'sms',
    alt: 'A hand holding a phone with an open message thread, beside a desk calendar of booked appointments, one of them cancelled.',
    name: 'SMS and messaging agent',
    channel: 'Messaging',
    short: 'Confirms, reminds and reschedules appointments without anyone making a call.',
    problem:
      'Reminders get written by hand, or not at all. People forget, and the reserved slot sits empty.',
    does: [
      'Confirms a booking the moment it is made',
      'Reminds a day ahead and accepts "yes", "no" or "another day" as a reply',
      'Offers the freed slot to the next person waiting',
      'Answers short questions on the same channel',
    ],
    bestFor: 'Any business that runs on booked appointments',
    needs: ['The calendar of booked appointments', 'Customer consent to receive messages'],
    limits:
      'It sends no marketing messages without explicit consent — that is both a legal requirement and the fastest way to lose trust. Confirmations and reminders for real bookings only.',
  },
  {
    id: 'chat',
    alt: 'Someone at a laptop with a website open late in the evening, beside a window onto a night city.',
    name: 'Website chat agent',
    channel: 'Chat',
    short: 'Answers visitors in the words of your own site and documents, and captures the enquiry.',
    problem:
      'The visitor has one question. The answer is somewhere on the site, but they will not go looking — they close the tab and go elsewhere.',
    does: [
      'Answers from the content of your site, your price list and your internal documents',
      'Cites the source of every answer, so it can be checked',
      'Collects an enquiry with a name and contact when the question needs a person',
      'Handles English and Bulgarian in the same conversation',
    ],
    bestFor: 'Service businesses whose customers ask the same things over and over',
    needs: ['Access to the site and the documents it should answer from', 'Where enquiries should go'],
    limits:
      'It answers only from the material it was given. If the answer is not in there, it says so and offers a contact — instead of inventing one.',
    demo: true,
  },
  {
    id: 'documents',
    alt: 'Hands going through an open folder of documents and signing a page, next to an open laptop.',
    name: 'Agent over your company documents',
    channel: 'Documents',
    short: 'Ask in plain language, get an answer with the document and page it came from.',
    problem:
      'The answer is in the contract, the handbook or an old email. The person who knows where is on leave — and everyone is waiting for them.',
    does: [
      'Searches contracts, procedures, instructions, minutes and internal databases',
      'Answers with a quotation and a link to the specific document',
      'Respects who is allowed to see what',
      'Handles PDF, Word, Excel and scanned documents',
    ],
    bestFor: 'Accountancy firms, law firms, manufacturing, companies with ISO documentation',
    needs: ['Access to the documents', 'Who is allowed to see what'],
    limits:
      'Answers are checked against the cited source before they are used for an important decision. Where data is sensitive, the model runs on your own infrastructure and nothing leaves it.',
  },
  {
    id: 'documents-in',
    alt: 'One hand holding an invoice from a tall stack of documents, the other typing its details into the keyboard.',
    name: 'Incoming document agent',
    channel: 'Documents',
    short: 'Reads invoices and orders and passes them ready into your accounting system.',
    problem:
      'Every invoice is retyped by hand into the system. Two minutes a document, every day, with errors that surface months later.',
    does: [
      'Reads invoices, delivery notes, orders and contracts — scans included',
      'Extracts number, date, counterparty, totals and line items',
      'Pushes them into your accounting or inventory system',
      'Sets aside anything it is unsure about for a person to check',
    ],
    bestFor: 'Accountancy firms, wholesale, manufacturing, logistics',
    needs: ['Samples of your typical documents', 'Access to the system the data goes into'],
    limits:
      'No document enters the books automatically without a confidence threshold and human approval on the doubtful ones. The goal is less retyping, not less control.',
  },
  {
    id: 'email',
    alt: 'A woman at a large screen with an overloaded inbox and more than ninety unread messages.',
    name: 'Inbox agent',
    channel: 'Email',
    short: 'Sorts the mail, pulls out what matters and drafts a reply for approval.',
    problem:
      'The shared mailbox collects enquiries, invoices, marketing and emergencies in one pile. Half an hour every morning goes on sorting alone.',
    does: [
      'Sorts messages by type and urgency',
      'Pulls out the essential point in two sentences',
      'Drafts a reply from your own templates',
      'Creates a task or a CRM record where one is needed',
    ],
    bestFor: 'Companies with a shared office@ or info@ mailbox that everything passes through',
    needs: ['Access to the mailbox', 'Examples of typical messages and replies'],
    limits:
      'It sends drafts for approval only, unless you explicitly decide otherwise for a specific kind of message. An automatic reply to a customer without review is a risk not worth taking.',
  },
  {
    id: 'quotes',
    alt: 'Hands building a quote by hand from a printed price list, with a calculator between the two sheets.',
    name: 'Quoting agent',
    channel: 'Documents',
    short: 'Turns an enquiry into a prepared quote based on your own price list.',
    problem:
      'Every quote is assembled by hand from a price list in Excel and the last quote you sent. It takes an hour, and the customer is waiting.',
    does: [
      'Reads the enquiry and finds the matching line items',
      'Calculates against your price list and discount rules',
      'Assembles the quote in your format, ready for review',
      'Keeps a record of what was offered and at what price',
    ],
    bestFor: 'Manufacturing, services priced by calculation, construction, B2B trade',
    needs: ['A price list and discount rules', 'A few example quotes'],
    limits:
      'A person signs the quote. The agent prepares it; it does not negotiate and does not commit on your behalf.',
  },
  {
    id: 'reports',
    alt: 'Someone assembling a report across two screens — a table of figures on one, charts on the other.',
    name: 'Reporting agent',
    channel: 'Reporting',
    short: 'Collects the numbers from your systems and sends the finished report on schedule.',
    problem:
      'The weekly report is assembled by hand from three systems and a spreadsheet. Every Monday, by the same person.',
    does: [
      'Pulls the data from the systems you already run',
      'Builds the report to your template',
      'Sends it by email or into Slack or Teams on a schedule',
      'Flags the outliers instead of leaving every figure looking equal',
    ],
    bestFor: 'Companies reporting regularly to management, an owner or a head office',
    needs: ['Access to the data sources', 'Your current report template'],
    limits:
      'It calculates on what the systems contain. If the data in there is wrong, the report will repeat it — faster.',
  },
];

export const AGENTS_ON_HOME = 5;

export const AGENT_PROCESS = [
  {
    title: 'A conversation, and one process chosen',
    body: 'We look at which channel costs you the most lost time — phone, inbox, documents. We start with that one only.',
  },
  {
    title: 'A pilot on real data',
    body: 'The agent is trained on your own material and runs for a few weeks alongside a person, so the results can be compared.',
  },
  {
    title: 'Measurement, then a decision',
    body: 'You see how many cases it handled, how often it was wrong and what it saved. Then you decide whether we continue.',
  },
  {
    title: 'Launch and support',
    body: 'We put it live, watch it and keep training it. You see every conversation and can switch it off at any time.',
  },
];
