/** Параметри на обхождането (т. 10 от спецификацията). */

export const RESEARCH_URL = 'https://kova.bg/research';

/** Трите UA варианта — задължителни за откриване на cloaking (т. 4). */
export const UA_VARIANTS = {
  research: `KovaResearchBot/1.0 (+${RESEARCH_URL})`,
  browser:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  aicrawler: 'Mozilla/5.0 (compatible; GPTBot/1.0; +https://openai.com/gptbot)',
} as const;

export type UaVariant = keyof typeof UA_VARIANTS;

export const LIMITS = {
  /** Паралелни домейна (никога две едновременни заявки към един хост). */
  domainConcurrency: 4,
  /** Пауза между заявките към един и същ хост, ms. */
  perHostDelayMs: 1500,
  /** Таймаут на артефакт, ms. */
  artifactTimeoutMs: 20_000,
  /** Таймаут за рендиране в браузъра, ms. */
  renderTimeoutMs: 25_000,
  /** Един повторен опит при 5xx или таймаут. */
  retries: 1,
  /** Таван страници на домейн (т. 3). Етап 2 работи само с началната. */
  maxPagesPerDomain: 10,
  /** Горна граница на записвания HTML, за да не се раздуят артефактите. */
  maxHtmlBytes: 3_000_000,
} as const;

/**
 * Път до Chromium. В тази среда има pre-installed на `/opt/pw-browsers/chromium`;
 * в CI Playwright сваля свой и го намира сам, затова тогава оставяме undefined.
 * `CHROMIUM_PATH` env има приоритет.
 */
import { existsSync } from 'node:fs';
export const CHROMIUM_PATH: string | undefined =
  process.env.CHROMIUM_PATH ??
  (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

export const TOOL_VERSION = '0.1.0';
