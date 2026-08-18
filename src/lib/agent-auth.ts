/**
 * Кой има право да пипа календара от името на агента.
 *
 * Пътищата `/api/agent/*` записват часове без човек насреща. Оставени
 * отворени, те са форма за спам с директен достъп до календара ти — а
 * запълненият календар не изглежда като нападение, изглежда като добра
 * седмица, докато не се обадиш на десет несъществуващи души.
 *
 * Затова: без зададен `AGENT_TOKEN` пътищата отговарят 503 и не приемат
 * нищо. Отказът е затворен нарочно — забравена настройка не бива да значи
 * отворен календар.
 */

/** Сравнение в постоянно време. Ранното излизане издава колко знака съвпадат. */
function safeEqual(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  // Дължината и без това изтича през размера на заявката; важното е при
  // еднаква дължина да не изтича КОЯ буква се разминава.
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i++) diff |= left[i] ^ right[i];
  return diff === 0;
}

export type AgentGate = { ok: true } | { ok: false; response: Response };

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

/**
 * Проверява `Authorization: Bearer …`.
 *
 * Заглавие, а не параметър в адреса: параметрите се записват в дневниците на
 * всеки междинен сървър, а това е ключ за писане в календара.
 */
export function checkAgent(request: Request, env: Env): AgentGate {
  if (!env.AGENT_TOKEN) {
    console.warn('AGENT_TOKEN не е зададен — инструментите на агента са изключени.');
    return {
      ok: false,
      response: json({ error: 'not_configured', message: 'Календарът не е свързан с агента.' }, 503),
    };
  }

  const header = request.headers.get('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (!token || !safeEqual(token, env.AGENT_TOKEN)) {
    return { ok: false, response: json({ error: 'unauthorized' }, 401) };
  }

  return { ok: true };
}

export { json as agentJson };
