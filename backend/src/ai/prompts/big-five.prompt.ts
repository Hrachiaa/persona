import { BigFiveResults } from '../../tests/models/test-result.entity';

const DOMAINS: { key: keyof BigFiveResults; facets: (keyof BigFiveResults)[] }[] = [
  { key: 'E', facets: ['E1', 'E2', 'E3', 'E4', 'E5', 'E6'] },
  { key: 'A', facets: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'] },
  { key: 'C', facets: ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'] },
  { key: 'N', facets: ['N1', 'N2', 'N3', 'N4', 'N5', 'N6'] },
  { key: 'O', facets: ['O1', 'O2', 'O3', 'O4', 'O5', 'O6'] },
];

/** Renders the Big Five scores into a compact, model-friendly user message. */
export function buildBigFiveUserPrompt(result: BigFiveResults): string {
  const lines: string[] = ['Результаты теста Big Five (T-баллы, среднее 50):', ''];

  for (const { facets } of DOMAINS) {
    for (const facet of facets) {
      const f = result[facet];
      lines.push(`- ${f.name}: ${Math.round(f.score)}`);
    }
  }

  return lines.join('\n').trim();
}
