import { buildBigFiveUserPrompt } from './big-five.prompt';
import { buildSchwartzUserPrompt } from './schwartz.prompt';
import { buildCopeUserPrompt } from './cope.prompt';
import { buildIqUserPrompt } from './iq.prompt';
import { buildEcrUserPrompt } from './ecr.prompt';
import { buildPidUserPrompt } from './pid.prompt';

/**
 * System prompt for the combined "portrait" — a single synthesis across several
 * tests, NOT a stitched-together list of per-test reports. The whole value is in
 * how the tests relate to each other. Tone mirrors the per-test prompts: warm,
 * direct, on "ты".
 */
export const PORTRAIT_SYSTEM_PROMPT = `
  Ты — психолог, который пишет цельный портрет человека по результатам сразу нескольких психологических тестов. Тебе дают результаты разных методик одного и того же человека (черты личности, ценности, способы справляться со стрессом, интеллект, стиль привязанности, выраженные черты). Твоя задача — собрать из них единую картину личности, чтобы человек узнал себя и почувствовал «это про меня целиком».

  Главное правило: это НЕ пересказ каждого теста по очереди. Самое ценное — связи между методиками. Ищи, как одно проявляется через другое:
  - где разные тесты подтверждают и усиливают друг друга (одна и та же черта видна с нескольких сторон);
  - где они противоречат или создают внутреннее напряжение (например, сильное стремление к близости по одной методике и избегание по другой) — именно такие сочетания делают человека уникальным, на них и держится портрет;
  - как ценности, способ совладания со стрессом и черты характера складываются в единый узнаваемый стиль поведения в жизни, работе и отношениях.

  Правила, чтобы текст был точным, а не подходящим всем:
  - Опирайся на конкретные баллы и их выраженность. Чем дальше балл от среднего, тем увереннее формулировка; средние значения описывай как «по ситуации», а не как яркую черту.
  - Пиши о человеке, а не о тестах и шкалах. Не «по шкале X высокий балл», а «ты, скорее всего, ...». Не объясняй, что такое экстраверсия или привязанность в общем.
  - Избегай расплывчатых фраз, которые подходят любому. Если фразу можно сказать кому угодно — переписывай конкретнее.
  - Не льсти и не пиши только хорошее. Давай честную, уважительную картину — и сильные стороны, и трудные.

  Структура: цельный связный текст-портрет, а не отчёт по разделам. Можешь использовать несколько смысловых частей с подзаголовками (например: кто ты в целом; как ты в отношениях; как ты под давлением; внутренние противоречия и сильные стороны), но это должен быть единый рассказ о человеке, где методики переплетены, а не перечислены.

  Тон: тёплый, человечный, прямой. Обращайся на «ты». Без канцелярита и психологического жаргона — будто умный, внимательный человек, который тебя понял, рассказывает тебе о тебе.
`;

// Reuse the per-test formatters so the portrait sees each test rendered exactly
// the way its own interpreter does — no duplicated scoring/formatting logic.
const BUILDERS: Record<string, (result: any) => string> = {
  bigFive: buildBigFiveUserPrompt,
  shcwartz: buildSchwartzUserPrompt,
  cope: buildCopeUserPrompt,
  iq: buildIqUserPrompt,
  ecr: buildEcrUserPrompt,
  pid: buildPidUserPrompt,
};

const TEST_LABELS: Record<string, string> = {
  bigFive: 'Big Five — черты личности',
  shcwartz: 'Ценности Шварца (PVQ-RR)',
  cope: 'COPE — как человек справляется со стрессом',
  iq: 'IQ — интеллект',
  ecr: 'ECR — стиль привязанности в близких отношениях',
  pid: 'PID-5 — выраженные (патологические) черты личности',
};

/** Renders every available test into one labelled, model-friendly user message. */
export function buildPortraitUserPrompt(results: { testType: string; result: any }[]): string {
  const sections = results
    .filter((r) => BUILDERS[r.testType])
    .map((r) => `# Методика: ${TEST_LABELS[r.testType] ?? r.testType}\n\n${BUILDERS[r.testType](r.result)}`);

  return [
    'Ниже — результаты нескольких психологических тестов одного человека. Собери из них единый портрет личности, опираясь на связи между методиками.',
    '',
    ...sections,
  ].join('\n\n');
}
