/**
 * Единственото място, което знае кой набор данни отива с кой език.
 *
 * Компонентите викат `content(lang)` и получават същите имена, каквито
 * внасяха преди — `SERVICES`, `PROCESS`, `TERMS`. Така преминаването към
 * двуезичие не преправя нито един компонент по същество, а само подменя
 * източника.
 */

import * as bgContent from '../data/content.ts';
import * as enContent from '../data/content.en.ts';
import * as bgAgents from '../data/agents.ts';
import * as enAgents from '../data/agents.en.ts';
import * as bgProjects from '../data/projects.ts';
import * as bgCases from '../data/cases.ts';
import * as enCases from '../data/cases.en.ts';
import * as enProjects from '../data/projects.en.ts';
import { UI } from './ui.ts';
import { META, NAV_BY_LOCALE, CTA_BY_LOCALE, OWNER_BY_LOCALE, LEGAL_NAME_BY_LOCALE } from '../data/site.mjs';
import type { Locale } from './index.ts';

export function content(locale: Locale) {
  return locale === 'en' ? enContent : bgContent;
}

export function agents(locale: Locale) {
  return locale === 'en' ? enAgents : bgAgents;
}

export function projects(locale: Locale) {
  return locale === 'en' ? enProjects : bgProjects;
}

export function cases(locale: Locale) {
  return locale === 'en' ? enCases : bgCases;
}

export function ui(locale: Locale) {
  return UI[locale];
}

export function owner(locale: Locale) {
  return OWNER_BY_LOCALE[locale] ?? OWNER_BY_LOCALE.bg;
}

export function legalName(locale: Locale) {
  return LEGAL_NAME_BY_LOCALE[locale] ?? LEGAL_NAME_BY_LOCALE.bg;
}

export function meta(locale: Locale) {
  return META[locale] ?? META.bg;
}

export function nav(locale: Locale) {
  return NAV_BY_LOCALE[locale] ?? NAV_BY_LOCALE.bg;
}

export function cta(locale: Locale) {
  return CTA_BY_LOCALE[locale] ?? CTA_BY_LOCALE.bg;
}
