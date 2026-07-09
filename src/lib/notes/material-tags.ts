const TAG_RULES: Array<{ tag: string; patterns: RegExp[] }> = [
  { tag: 'Midterm', patterns: [/midterm/i, /mid.?term/i, /\bmt\b/i] },
  { tag: 'Final', patterns: [/final/i, /fin.?exam/i] },
  { tag: 'Cheatsheet', patterns: [/cheat/i, /crib/i, /formula.?sheet/i] },
  { tag: 'Tutorial', patterns: [/tutorial/i, /tut/i, /section/i] },
  { tag: 'Lab', patterns: [/lab/i, /laboratory/i] },
  { tag: 'Lecture Notes', patterns: [/lecture/i, /notes/i, /slide/i, /ppt/i] },
  { tag: 'Homework', patterns: [/homework/i, /assignment/i, /hw/i, /problem.?set/i] },
  { tag: 'Exam', patterns: [/exam/i, /test/i, /quiz/i] },
];

export function extractMaterialTags(fileNames: string[], maxTags = 5): string[] {
  const tags = new Set<string>();
  const joined = fileNames.join(' ');

  for (const rule of TAG_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(joined))) {
      tags.add(rule.tag);
    }
    if (tags.size >= maxTags) {
      break;
    }
  }

  if (tags.size === 0 && fileNames.length > 0) {
    tags.add('Study Materials');
  }

  return Array.from(tags).slice(0, maxTags);
}
