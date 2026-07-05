export type ParsedGradeCourse = {
  courseCode: string;
  courseName: string;
  grade: string;
  creditsAttempted: number | null;
  creditsEarned: number | null;
};

export type ParsedAcademicSummary = {
  cga: number | null;
  totalCreditsEarned: number | null;
  transferCredits: number | null;
};

export type TranscriptParseSource = 'gemini' | 'regex' | 'tesseract_ocr' | 'gemini_ocr';
export type TranscriptRiskLevel = 'low' | 'medium' | 'high';
export type TranscriptDecision = 'auto_verify' | 'manual_review' | 'reject';

export type TranscriptRiskReason = {
  code: string;
  points: number;
  category: 'identity' | 'structure' | 'grades' | 'courses' | 'chronology' | 'credits' | 'quality' | 'metadata';
  message: string;
};

export type TranscriptPdfMetadata = {
  producer: string | null;
  creator: string | null;
  title: string | null;
  author: string | null;
  fileFingerprint: string | null;
  sourceTool: string | null;
  editedSignal: boolean;
};

export type TranscriptVerificationContext = {
  verifiedEmail: string | null;
  emailConfirmed: boolean;
  fullName: string | null;
};

type GeminiObservation = {
  severity?: unknown;
  category?: unknown;
  message?: unknown;
};

type GeminiTranscriptJson = {
  document?: {
    type?: unknown;
    isLikelyHKUSTTranscript?: unknown;
    pages?: unknown;
  };
  student?: {
    name?: unknown;
    studentId?: unknown;
    yearOfStudy?: unknown;
    registrationStatus?: unknown;
    program?: unknown;
    admitDate?: unknown;
    printDate?: unknown;
    advisors?: unknown;
  };
  semesters?: Array<{
    term?: unknown;
    studyMode?: unknown;
    tga?: unknown;
    awards?: unknown;
    courses?: Array<{
      courseCode?: unknown;
      courseTitle?: unknown;
      creditsAttempted?: unknown;
      creditsEarned?: unknown;
      grade?: unknown;
    }>;
  }>;
  transferCredits?: unknown;
  summary?: {
    cga?: unknown;
    cumulativeCreditsEarned?: unknown;
    cumulativeTransferCredits?: unknown;
  };
  analysis?: {
    structure?: {
      headerPresent?: unknown;
      footerPresent?: unknown;
      studentInfoPresent?: unknown;
      academicProgramPresent?: unknown;
      admitDatePresent?: unknown;
      advisorPresent?: unknown;
      semesterHeadingsPresent?: unknown;
      courseTablesPresent?: unknown;
      tgaPresent?: unknown;
      cgaPresent?: unknown;
      transferCreditsPresent?: unknown;
      awardsPresent?: unknown;
      missingSections?: unknown;
    };
    quality?: {
      documentReadable?: unknown;
      nativeDigitalPdf?: unknown;
      textExtractionQuality?: unknown;
      layoutConsistency?: unknown;
    };
    observations?: unknown;
    confidence?: unknown;
  };
};

export type TranscriptParseResult = {
  summary: ParsedAcademicSummary;
  courses: ParsedGradeCourse[];
  source: TranscriptParseSource;
  rawTextLength: number;
  normalizedText: string;
  metadata: TranscriptPdfMetadata;
  extractionConfidence: number;
  extractedTranscript: Record<string, unknown>;
};

export type TranscriptVerificationResult = {
  riskScore: number;
  riskLevel: TranscriptRiskLevel;
  decision: TranscriptDecision;
  reasons: TranscriptRiskReason[];
};

export type TranscriptPipelineResult = {
  parse: TranscriptParseResult;
  verification: TranscriptVerificationResult;
};

const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const VALID_GRADES = new Set(['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F', 'P', 'PP', 'T', 'I', 'W', 'AU']);
const TARGET_EXTRACTED_GRADES = new Set(['A+', 'A', 'A-', 'B+', 'B', 'B-']);
const SPECIAL_COURSE_CODES = new Set(['COREBROAD', 'OTHRFREE']);
const COURSE_CODE_PATTERN = /^[A-Z]{4}[0-9]{4}[A-Z]?$/;
const CORRUPTED_TEXT_MARKERS = ['/FILTER', '/FLATEDECODE', 'STREAM', 'ENDSTREAM', 'XREF', 'OBJ'];

function parseNumericValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== 'string') {
    return null;
  }
  const parsed = Number.parseFloat(value.replace(/,/g, '').trim());
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeText(rawText: string): string {
  return rawText
    .replace(/[￾\uFFFE]/g, '-')
    .replace(/[\u2212\u2013\u2014]/g, '-')
    .replace(/\u0000/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .trim();
}

function normalizeCourseCode(rawCode: string): string {
  return rawCode.trim().toUpperCase().replace(/\s+/g, '');
}

function normalizeGradeValue(rawGrade: string): string {
  return rawGrade
    .trim()
    .toUpperCase()
    .replace(/[＋﹢\uFF0B]/g, '+')
    .replace(/[￾\uFFFE]/g, '-')
    .replace(/[\u2212\u2013\u2014]/g, '-')
    .replace(/\s+/g, '');
}

function isValidCourseCode(code: string): boolean {
  return SPECIAL_COURSE_CODES.has(code) || COURSE_CODE_PATTERN.test(code);
}

function hasSuspiciousCharacterRatio(value: string): boolean {
  if (!value || value.length < 30) {
    return false;
  }

  const suspiciousChars = value.match(/[^A-Z0-9\s&'(),.\-/:+]/gi) || [];
  return suspiciousChars.length / value.length > 0.18;
}

function isLikelyGarbledText(value: string): boolean {
  const upper = value.toUpperCase();
  const markerHits = CORRUPTED_TEXT_MARKERS.filter((marker) => upper.includes(marker)).length;
  if (markerHits >= 2) {
    return true;
  }
  return hasSuspiciousCharacterRatio(upper);
}

function isCorruptedCourseTitle(courseName: string): boolean {
  const upper = courseName.toUpperCase();
  if (upper.length > 180) {
    return true;
  }
  if (CORRUPTED_TEXT_MARKERS.some((marker) => upper.includes(marker))) {
    return true;
  }
  return hasSuspiciousCharacterRatio(upper);
}

function sanitizeParsedCourses(courses: ParsedGradeCourse[]): ParsedGradeCourse[] {
  const seen = new Set<string>();
  const sanitized: ParsedGradeCourse[] = [];

  for (const course of courses) {
    const courseCode = normalizeCourseCode(course.courseCode);
    const grade = normalizeGradeValue(course.grade);
    const courseName = course.courseName.replace(/\s+/g, ' ').trim();

    if (!isValidCourseCode(courseCode) || !TARGET_EXTRACTED_GRADES.has(grade) || isCorruptedCourseTitle(courseName)) {
      continue;
    }

    const key = `${courseCode}:${grade}:${courseName}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    sanitized.push({
      ...course,
      courseCode,
      courseName,
      grade,
    });
  }

  return sanitized;
}


function extractJsonText(rawModelText: string): string {
  const fenced = rawModelText.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }
  return rawModelText.trim();
}

function normalizeName(name: string | null | undefined): string {
  return (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasNameMismatch(verifiedName: string | null, transcriptName: string | null): boolean {
  const left = normalizeName(verifiedName);
  const right = normalizeName(transcriptName);
  if (!left || !right) {
    return false;
  }
  return !(left === right || left.includes(right) || right.includes(left));
}


function toBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function toString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter(Boolean);
}

function extractCoursesFromLines(transcriptText: string): ParsedGradeCourse[] {
  const lines = transcriptText
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const courses: ParsedGradeCourse[] = [];
  const seen = new Set<string>();
  const codePattern = /\b([A-Z]{4,10}\s?\d{4}[A-Z]?|COREBROAD|OTHRFREE)\b/;
  const gradePattern = /(?:^|[^A-Z0-9])(A\+|A-|A|B\+|B-|B|C\+|C-|C|D|F|PP|P|T|I|W|AU)(?=$|[^A-Z0-9])/g;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].toUpperCase();
    const codeMatch = line.match(codePattern);
    if (!codeMatch) {
      continue;
    }

    const gradeCandidates = Array.from(line.matchAll(gradePattern));
    let grade = gradeCandidates.length > 0 ? normalizeGradeValue(gradeCandidates[gradeCandidates.length - 1][1]) : '';

    let mergedLine = line;
    if (!grade) {
      const lookahead = lines
        .slice(index, Math.min(lines.length, index + 6))
        .map((entry) => entry.toUpperCase())
        .join(' ');
      mergedLine = lookahead;
      const mergedGrades = Array.from(mergedLine.matchAll(gradePattern));
      if (mergedGrades.length > 0) {
        grade = normalizeGradeValue(mergedGrades[mergedGrades.length - 1][1]);
      }
    }

    if (!grade || !VALID_GRADES.has(grade)) {
      continue;
    }

    const rawCode = normalizeCourseCode(codeMatch[1]);
    if (!isValidCourseCode(rawCode)) {
      continue;
    }

    const gradeIndex = mergedLine.lastIndexOf(grade);
    const codeIndex = mergedLine.indexOf(codeMatch[1]);
    const title = mergedLine
      .slice(codeIndex + codeMatch[1].length, gradeIndex > codeIndex ? gradeIndex : mergedLine.length)
      .replace(/\b\d+(?:\.\d+)?\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const key = `${rawCode}:${grade}:${title}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    courses.push({
      courseCode: rawCode,
      courseName: title,
      grade,
      creditsAttempted: null,
      creditsEarned: null,
    });
  }

  return courses;
}

function extractCoursesFromTextWindows(transcriptText: string): ParsedGradeCourse[] {
  const upperText = transcriptText.toUpperCase();
  const courses: ParsedGradeCourse[] = [];
  const seen = new Set<string>();
  const codePattern = /\b([A-Z]{4,10}\s?\d{4}[A-Z]?|COREBROAD|OTHRFREE)\b/g;
  const gradePattern = /(?:^|[^A-Z0-9])(A\+|A-|A|B\+|B-|B|C\+|C-|C|D|F|PP|P|T|I|W|AU)(?=$|[^A-Z0-9])/;

  let codeMatch: RegExpExecArray | null = codePattern.exec(upperText);
  while (codeMatch) {
    const normalizedCode = normalizeCourseCode(codeMatch[1]);
    if (isValidCourseCode(normalizedCode)) {
      const start = codeMatch.index + codeMatch[0].length;
      const windowText = upperText.slice(start, Math.min(upperText.length, start + 220));
      const gradeMatch = windowText.match(gradePattern);
      if (gradeMatch) {
        const grade = normalizeGradeValue(gradeMatch[1]);
        if (VALID_GRADES.has(grade)) {
          const gradeIndex = windowText.indexOf(gradeMatch[1]);
          const titleCandidate = windowText
            .slice(0, gradeIndex)
            .replace(/\s+/g, ' ')
            .replace(/\b\d+(?:\.\d+)?\b/g, ' ')
            .trim();
          const key = `${normalizedCode}:${grade}:${titleCandidate}`;
          if (!seen.has(key)) {
            seen.add(key);
            courses.push({
              courseCode: normalizedCode,
              courseName: titleCandidate,
              grade,
              creditsAttempted: null,
              creditsEarned: null,
            });
          }
        }
      }
    }

    codeMatch = codePattern.exec(upperText);
  }

  return courses;
}

function buildRegexFallback(transcriptText: string): TranscriptParseResult {
  const summary: ParsedAcademicSummary = {
    cga: parseNumericValue(transcriptText.match(/\bCGA\b\s*[:=]?\s*([0-4](?:\.\d{1,3})?)/i)?.[1]),
    totalCreditsEarned: parseNumericValue(
      transcriptText.match(/\bCUMULATIVE\s+CREDITS\s+EARNED\b\s*[:=]?\s*([0-9]+(?:\.\d+)?)/i)?.[1]
    ),
    transferCredits: parseNumericValue(
      transcriptText.match(/\bCUMULATIVE\s+TRANSFER\s+CREDITS\b\s*[:=]?\s*([0-9]+(?:\.\d+)?)/i)?.[1]
    ),
  };

  const courses: ParsedGradeCourse[] = extractCoursesFromLines(transcriptText);
  const coursePattern =
    /([A-Z]{4,10}\s?[0-9]{4}[A-Z]?)\s+([A-Z0-9&'(),.\-\/ ]{3,120}?)\s+(A\+|A-|A|B\+|B-|B|C\+|C-|C|D|F|PP|P|T|I|W|AU)(?=$|[^A-Z0-9])/g;
  if (courses.length === 0) {
    courses.push(...extractCoursesFromTextWindows(transcriptText));
  }
  if (courses.length === 0) {
    let match: RegExpExecArray | null = coursePattern.exec(transcriptText.toUpperCase());
    while (match) {
      const normalizedCode = normalizeCourseCode(match[1]);
      const grade = normalizeGradeValue(match[3]);
      if (isValidCourseCode(normalizedCode) && VALID_GRADES.has(grade)) {
        courses.push({
          courseCode: normalizedCode,
          courseName: match[2].replace(/\s+/g, ' ').trim(),
          grade,
          creditsAttempted: null,
          creditsEarned: null,
        });
      }
      match = coursePattern.exec(transcriptText.toUpperCase());
    }
  }

  const missingSections: string[] = [];
  if (!/Unofficial Transcript of Academic Record/i.test(transcriptText)) {
    missingSections.push('header');
  }
  if (!/- End of Transcript -/i.test(transcriptText)) {
    missingSections.push('footer');
  }
  if (!/\bAcademic Program\b/i.test(transcriptText)) {
    missingSections.push('academicProgram');
  }
  const garbledText = isLikelyGarbledText(transcriptText);

  return {
    summary,
    courses,
    source: 'regex',
    rawTextLength: transcriptText.length,
    normalizedText: transcriptText,
    extractionConfidence: courses.length > 0 ? 0.45 : 0.2,
    metadata: {
      producer: null,
      creator: null,
      title: null,
      author: null,
      fileFingerprint: null,
      sourceTool: null,
      editedSignal: false,
    },
    extractedTranscript: {
      document: {
        type: 'HKUST_UNOFFICIAL_TRANSCRIPT',
        isLikelyHKUSTTranscript: /Unofficial Transcript of Academic Record/i.test(transcriptText),
        pages: null,
      },
      student: {
        name: null,
        studentId: null,
        yearOfStudy: null,
        registrationStatus: null,
        program: null,
        admitDate: null,
        printDate: null,
        advisors: [],
      },
      semesters: [
        {
          term: '',
          studyMode: '',
          tga: null,
          awards: [],
          courses,
        },
      ],
      transferCredits: [],
      summary: {
        cga: summary.cga,
        cumulativeCreditsEarned: summary.totalCreditsEarned,
        cumulativeTransferCredits: summary.transferCredits,
      },
      analysis: {
        structure: {
          headerPresent: !missingSections.includes('header'),
          footerPresent: !missingSections.includes('footer'),
          studentInfoPresent: /\bStudent Name\b/i.test(transcriptText),
          academicProgramPresent: !missingSections.includes('academicProgram'),
          admitDatePresent: /\bAdmit Date\b/i.test(transcriptText),
          advisorPresent: /\bAdvisor/i.test(transcriptText),
          semesterHeadingsPresent: /\b(Fall|Winter|Spring|Summer)\b/i.test(transcriptText),
          courseTablesPresent: courses.length > 0,
          tgaPresent: /\bTGA\b/i.test(transcriptText),
          cgaPresent: summary.cga !== null,
          transferCreditsPresent: summary.transferCredits !== null,
          awardsPresent: /\bAwards\b/i.test(transcriptText),
          missingSections,
        },
        quality: {
          documentReadable: transcriptText.trim().length > 0,
          nativeDigitalPdf: !garbledText,
          textExtractionQuality: transcriptText.trim().length > 0 ? (garbledText ? 'LOW' : 'MEDIUM') : 'LOW',
          layoutConsistency: garbledText ? 'LOW' : 'MEDIUM',
        },
        observations: [],
        confidence: courses.length > 0 ? 0.45 : 0.2,
      },
    },
  };
}

function buildGeminiPrompt(transcriptText: string, maxTranscriptChars = 120000): string {
  return `You are an expert parser for Hong Kong University of Science and Technology (HKUST) academic transcripts.

You are analysing ONLY HKUST "Unofficial Transcript of Academic Record" PDFs.

Your job is NOT to decide whether the transcript is genuine or fake.

Instead:
1. Extract all academic information accurately.
2. Analyse whether the document follows HKUST's normal transcript structure.
3. Report observable inconsistencies.
4. Never invent missing information.

Return ONLY valid JSON.

OUTPUT JSON
{
  "document": {
    "type": "HKUST_UNOFFICIAL_TRANSCRIPT",
    "isLikelyHKUSTTranscript": true,
    "pages": null
  },
  "student": {
    "name": null,
    "studentId": null,
    "yearOfStudy": null,
    "registrationStatus": null,
    "program": null,
    "admitDate": null,
    "printDate": null,
    "advisors": []
  },
  "semesters": [
    {
      "term": "",
      "studyMode": "",
      "tga": null,
      "awards": [],
      "courses": [
        {
          "courseCode": "",
          "courseTitle": "",
          "creditsAttempted": null,
          "creditsEarned": null,
          "grade": ""
        }
      ]
    }
  ],
  "transferCredits": [],
  "summary": {
    "cga": null,
    "cumulativeCreditsEarned": null,
    "cumulativeTransferCredits": null
  },
  "analysis": {
    "structure": {
      "headerPresent": true,
      "footerPresent": true,
      "studentInfoPresent": true,
      "academicProgramPresent": true,
      "admitDatePresent": true,
      "advisorPresent": true,
      "semesterHeadingsPresent": true,
      "courseTablesPresent": true,
      "tgaPresent": true,
      "cgaPresent": true,
      "transferCreditsPresent": true,
      "awardsPresent": true,
      "missingSections": []
    },
    "quality": {
      "documentReadable": true,
      "nativeDigitalPdf": true,
      "textExtractionQuality": "HIGH",
      "layoutConsistency": "HIGH"
    },
    "observations": [
      {
        "severity": "LOW",
        "category": "STRUCTURE",
        "message": ""
      }
    ],
    "confidence": 0.0
  }
}

RULES:
- Extract exactly what is visible.
- Never guess.
- Never estimate or calculate GPA.
- Never accuse the document of being fake.
- Preserve duplicate courses exactly as shown.
- If text is unreadable, record this in observations.
- Return JSON ONLY.

Transcript text fallback (may be incomplete):
${transcriptText.slice(0, maxTranscriptChars)}`;
}

function mapGeminiPayloadToParseResult(payload: Record<string, unknown>, transcriptText: string): TranscriptParseResult | null {
  const modelText: string =
    (payload as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; output_text?: string }> })?.candidates?.[0]
      ?.content?.parts?.[0]?.text ||
    (payload as { candidates?: Array<{ output_text?: string }> })?.candidates?.[0]?.output_text ||
    '';
  if (!modelText) {
    return null;
  }

  const parsed = JSON.parse(extractJsonText(modelText)) as GeminiTranscriptJson;
  const semesters = Array.isArray(parsed.semesters) ? parsed.semesters : [];

  const courses: ParsedGradeCourse[] = semesters.flatMap((semester) => {
    const semesterCourses = Array.isArray(semester.courses) ? semester.courses : [];
    return semesterCourses.map((course) => ({
      courseCode: normalizeCourseCode(toString(course.courseCode)),
      courseName: toString(course.courseTitle).replace(/\s*\n\s*/g, ' '),
      grade: normalizeGradeValue(toString(course.grade)),
      creditsAttempted: parseNumericValue(course.creditsAttempted),
      creditsEarned: parseNumericValue(course.creditsEarned),
    }));
  });

  const confidence = parseNumericValue(parsed.analysis?.confidence) ?? 0.5;
  const summary: ParsedAcademicSummary = {
    cga: parseNumericValue(parsed.summary?.cga),
    totalCreditsEarned: parseNumericValue(parsed.summary?.cumulativeCreditsEarned),
    transferCredits: parseNumericValue(parsed.summary?.cumulativeTransferCredits),
  };

  const normalizedSemesters = semesters.map((semester) => ({
    term: toString(semester.term),
    studyMode: toString(semester.studyMode),
    tga: parseNumericValue(semester.tga),
    awards: toStringArray(semester.awards),
    courses: (Array.isArray(semester.courses) ? semester.courses : []).map((course) => ({
      courseCode: normalizeCourseCode(toString(course.courseCode)),
      courseTitle: toString(course.courseTitle),
      creditsAttempted: parseNumericValue(course.creditsAttempted),
      creditsEarned: parseNumericValue(course.creditsEarned),
      grade: normalizeGradeValue(toString(course.grade)),
    })),
  }));

  const observationList = Array.isArray(parsed.analysis?.observations)
    ? (parsed.analysis?.observations as GeminiObservation[]).map((entry) => ({
        severity: toString(entry.severity || 'LOW').toUpperCase(),
        category: toString(entry.category || 'STRUCTURE').toUpperCase(),
        message: toString(entry.message),
      }))
    : [];

  return {
    summary,
    courses,
    source: 'gemini',
    rawTextLength: transcriptText.length,
    normalizedText: transcriptText,
    extractionConfidence: Math.max(0, Math.min(1, confidence)),
    metadata: {
      producer: null,
      creator: null,
      title: null,
      author: null,
      fileFingerprint: null,
      sourceTool: null,
      editedSignal: false,
    },
    extractedTranscript: {
      document: {
        type: toString(parsed.document?.type) || 'HKUST_UNOFFICIAL_TRANSCRIPT',
        isLikelyHKUSTTranscript: toBoolean(parsed.document?.isLikelyHKUSTTranscript, true),
        pages: parseNumericValue(parsed.document?.pages),
      },
      student: {
        name: toString(parsed.student?.name) || null,
        studentId: toString(parsed.student?.studentId) || null,
        yearOfStudy: toString(parsed.student?.yearOfStudy) || null,
        registrationStatus: toString(parsed.student?.registrationStatus) || null,
        program: toString(parsed.student?.program) || null,
        admitDate: toString(parsed.student?.admitDate) || null,
        printDate: toString(parsed.student?.printDate) || null,
        advisors: toStringArray(parsed.student?.advisors),
      },
      semesters: normalizedSemesters,
      transferCredits: Array.isArray(parsed.transferCredits) ? parsed.transferCredits : [],
      summary: {
        cga: summary.cga,
        cumulativeCreditsEarned: summary.totalCreditsEarned,
        cumulativeTransferCredits: summary.transferCredits,
      },
      analysis: {
        structure: {
          headerPresent: toBoolean(parsed.analysis?.structure?.headerPresent, false),
          footerPresent: toBoolean(parsed.analysis?.structure?.footerPresent, false),
          studentInfoPresent: toBoolean(parsed.analysis?.structure?.studentInfoPresent, false),
          academicProgramPresent: toBoolean(parsed.analysis?.structure?.academicProgramPresent, false),
          admitDatePresent: toBoolean(parsed.analysis?.structure?.admitDatePresent, false),
          advisorPresent: toBoolean(parsed.analysis?.structure?.advisorPresent, false),
          semesterHeadingsPresent: toBoolean(parsed.analysis?.structure?.semesterHeadingsPresent, false),
          courseTablesPresent: toBoolean(parsed.analysis?.structure?.courseTablesPresent, false),
          tgaPresent: toBoolean(parsed.analysis?.structure?.tgaPresent, false),
          cgaPresent: toBoolean(parsed.analysis?.structure?.cgaPresent, false),
          transferCreditsPresent: toBoolean(parsed.analysis?.structure?.transferCreditsPresent, false),
          awardsPresent: toBoolean(parsed.analysis?.structure?.awardsPresent, false),
          missingSections: toStringArray(parsed.analysis?.structure?.missingSections),
        },
        quality: {
          documentReadable: toBoolean(parsed.analysis?.quality?.documentReadable, true),
          nativeDigitalPdf: toBoolean(parsed.analysis?.quality?.nativeDigitalPdf, true),
          textExtractionQuality: toString(parsed.analysis?.quality?.textExtractionQuality || 'MEDIUM').toUpperCase(),
          layoutConsistency: toString(parsed.analysis?.quality?.layoutConsistency || 'MEDIUM').toUpperCase(),
        },
        observations: observationList,
        confidence: Math.max(0, Math.min(1, confidence)),
      },
    },
  };
}

async function extractTranscriptWithGemini(transcriptText: string, buffer?: Buffer): Promise<TranscriptParseResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const pdfPrompt = buildGeminiPrompt(transcriptText, 8000);
  const textPrompt = buildGeminiPrompt(transcriptText, 50000);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const requestGemini = async (contents: Array<{ parts: Array<Record<string, unknown>> }>) => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      return { ok: false as const, status: response.status, body };
    }

    const payload = (await response.json()) as Record<string, unknown>;
    return { ok: true as const, payload };
  };

  if (buffer) {
    const pdfResponse = await requestGemini([
      {
        parts: [
          { text: pdfPrompt },
          {
            inline_data: {
              mime_type: 'application/pdf',
              data: buffer.toString('base64'),
            },
          },
        ],
      },
    ]);

    if (pdfResponse.ok) {
      const payload = pdfResponse.payload;
      const mapped = mapGeminiPayloadToParseResult(payload, transcriptText);
      if (mapped) {
        return mapped;
      }
    } else {
      console.error('Gemini PDF parse request failed:', pdfResponse.status, pdfResponse.body);
    }
  }

  const response = await requestGemini([{ parts: [{ text: textPrompt }] }]);
  if (!response.ok) {
    console.error('Gemini parse request failed:', response.status, response.body);
    return null;
  }

  return mapGeminiPayloadToParseResult(response.payload, transcriptText);
}

function inferSemesterIssues(terms: string[]): boolean {
  const seasonOrder = new Map([
    ['FALL', 0],
    ['WINTER', 1],
    ['SPRING', 2],
    ['SUMMER', 3],
  ]);

  let previousKey: number | null = null;
  for (const term of terms) {
    const normalized = term.toUpperCase().replace(/\s+/g, ' ').trim();
    const yearMatch = normalized.match(/(\d{4})\s*-\s*(\d{2,4})/);
    const seasonMatch = normalized.match(/\b(FALL|WINTER|SPRING|SUMMER)\b/);
    if (!yearMatch || !seasonMatch) {
      continue;
    }
    const year = Number.parseInt(yearMatch[1], 10);
    const season = seasonOrder.get(seasonMatch[1]);
    if (season === undefined) {
      continue;
    }
    const key = year * 10 + season;
    if (previousKey !== null && key < previousKey) {
      return true;
    }
    previousKey = key;
  }
  return false;
}

function addReason(reasons: TranscriptRiskReason[], reason: TranscriptRiskReason): number {
  reasons.push(reason);
  return reason.points;
}

function readOptionalBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') {
    return value;
  }
  return null;
}

export function validateTranscriptResult(
  parseResult: TranscriptParseResult,
  context: TranscriptVerificationContext
): TranscriptVerificationResult {
  const reasons: TranscriptRiskReason[] = [];
  let score = 0;
  const transcript = parseResult.extractedTranscript;
  const student = (transcript.student as Record<string, unknown>) || {};
  const analysis = (transcript.analysis as Record<string, unknown>) || {};
  const structure = (analysis.structure as Record<string, unknown>) || {};
  const quality = (analysis.quality as Record<string, unknown>) || {};
  const semesters = Array.isArray(transcript.semesters)
    ? (transcript.semesters as Array<Record<string, unknown>>)
    : [];
  const normalizedTextUpper = parseResult.normalizedText.toUpperCase();

  const hasVerifiedHkustIdentity =
    Boolean(context.verifiedEmail) &&
    Boolean(context.emailConfirmed) &&
    /@(ust\.hk|connect\.ust\.hk)$/i.test(context.verifiedEmail || '');
  if (hasVerifiedHkustIdentity) {
    score -= 4;
  } else {
    score += addReason(reasons, {
      code: 'UNVERIFIED_HKUST_IDENTITY',
      points: 4,
      category: 'identity',
      message: 'Account is not a confirmed HKUST identity.',
    });
  }

  const studentName = toString(student.name) || null;
  if (hasNameMismatch(context.fullName, studentName)) {
    score += addReason(reasons, {
      code: 'NAME_MISMATCH',
      points: 5,
      category: 'identity',
      message: 'Transcript student name does not match verified profile name.',
    });
  }

  const headerPresentFromText = /UNOFFICIAL TRANSCRIPT OF ACADEMIC RECORD/i.test(parseResult.normalizedText);
  const footerPresentFromText = /- END OF TRANSCRIPT -/i.test(parseResult.normalizedText);
  const cgaPresentFromText = /\bCGA\b/i.test(parseResult.normalizedText) || parseResult.summary.cga !== null;
  const tgaPresentFromText = /\bTGA\b/i.test(parseResult.normalizedText);

  const headerPresent = readOptionalBoolean(structure.headerPresent);
  const footerPresent = readOptionalBoolean(structure.footerPresent);
  const cgaPresent = readOptionalBoolean(structure.cgaPresent);
  const tgaPresent = readOptionalBoolean(structure.tgaPresent);

  if (!(headerPresent === true || headerPresentFromText)) {
    score += addReason(reasons, {
      code: 'MISSING_HEADER',
      points: 5,
      category: 'structure',
      message: 'Expected HKUST transcript header is missing.',
    });
  }
  if (!(footerPresent === true || footerPresentFromText)) {
    score += addReason(reasons, {
      code: 'MISSING_FOOTER',
      points: 5,
      category: 'structure',
      message: 'Expected transcript footer is missing.',
    });
  }
  if (!(cgaPresent === true || cgaPresentFromText)) {
    score += addReason(reasons, {
      code: 'MISSING_CGA',
      points: 4,
      category: 'structure',
      message: 'CGA section is missing.',
    });
  }
  if (!(tgaPresent === true || tgaPresentFromText)) {
    score += addReason(reasons, {
      code: 'MISSING_TGA',
      points: 3,
      category: 'structure',
      message: 'TGA section is missing.',
    });
  }

  const invalidGrades = parseResult.courses.filter(
    (course) => !VALID_GRADES.has(normalizeGradeValue(course.grade))
  ).length;
  if (invalidGrades > 0) {
    score += addReason(reasons, {
      code: 'INVALID_GRADE',
      points: Math.min(invalidGrades * 5, 10),
      category: 'grades',
      message: `${invalidGrades} course entries include unsupported grades.`,
    });
  }

  const invalidCodes = parseResult.courses.filter((course) => !isValidCourseCode(normalizeCourseCode(course.courseCode))).length;
  if (invalidCodes > 0) {
    score += addReason(reasons, {
      code: 'INVALID_COURSE_CODE',
      points: Math.min(invalidCodes * 3, 9),
      category: 'courses',
      message: `${invalidCodes} course entries include invalid course code format.`,
    });
  }

  const creditAnomalies = parseResult.courses.filter(
    (course) =>
      course.creditsAttempted !== null &&
      course.creditsEarned !== null &&
      course.creditsEarned > course.creditsAttempted
  ).length;
  if (creditAnomalies > 0) {
    score += addReason(reasons, {
      code: 'CREDITS_EARNED_EXCEED_ATTEMPTED',
      points: Math.min(creditAnomalies * 5, 10),
      category: 'credits',
      message: `${creditAnomalies} courses have credits earned greater than attempted.`,
    });
  }

  if (inferSemesterIssues(semesters.map((entry) => toString(entry.term)).filter(Boolean))) {
    score += addReason(reasons, {
      code: 'SEMESTER_ORDER_ANOMALY',
      points: 2,
      category: 'chronology',
      message: 'Semester order appears missing or out of chronology.',
    });
  }

  const extractionQuality = toString(quality.textExtractionQuality).toUpperCase();
  if ((extractionQuality && extractionQuality !== 'HIGH') || parseResult.rawTextLength < 200) {
    score += addReason(reasons, {
      code: 'POOR_EXTRACTION_QUALITY',
      points: 2,
      category: 'quality',
      message: 'Text extraction quality is not high.',
    });
  }

  if (parseResult.metadata.editedSignal) {
    score += addReason(reasons, {
      code: 'METADATA_EDITING_SIGNAL',
      points: 1,
      category: 'metadata',
      message: `PDF metadata indicates possible editing tool: ${parseResult.metadata.sourceTool}.`,
    });
  }

  const likelyTranscriptFlag = (transcript.document as Record<string, unknown>)?.isLikelyHKUSTTranscript;
  const likelyTranscript =
    typeof likelyTranscriptFlag === 'boolean'
      ? likelyTranscriptFlag
      : /UNOFFICIAL TRANSCRIPT OF ACADEMIC RECORD/i.test(parseResult.normalizedText);
  if (!likelyTranscript) {
    score += addReason(reasons, {
      code: 'NOT_HKUST_TRANSCRIPT_SHAPE',
      points: 4,
      category: 'structure',
      message: 'Document does not match expected HKUST transcript shape.',
    });
  }

  const hardFail =
    !likelyTranscript || (!studentName && !/\bSTUDENT NAME\b/i.test(normalizedTextUpper)) || parseResult.courses.length === 0;
  const riskLevel: TranscriptRiskLevel = score <= 1 ? 'low' : score <= 6 ? 'medium' : 'high';
  let decision: TranscriptDecision = riskLevel === 'low' ? 'auto_verify' : 'manual_review';

  if (hardFail && decision === 'auto_verify') {
    decision = 'manual_review';
  }

  return {
    riskScore: score,
    riskLevel,
    decision,
    reasons,
  };
}

export async function extractAndValidateTranscriptBuffer(
  buffer: Buffer,
  context: TranscriptVerificationContext
): Promise<TranscriptPipelineResult> {
  const transcriptText = normalizeText(buffer.toString('latin1'));
  let metadata: TranscriptPdfMetadata = {
    producer: null,
    creator: null,
    title: null,
    author: null,
    fileFingerprint: null,
    sourceTool: null,
    editedSignal: false,
  };

  const normalizedText = transcriptText;
  let parseResult: TranscriptParseResult | null = null;

  if (normalizedText) {
    try {
      parseResult = await extractTranscriptWithGemini(normalizedText, buffer);
    } catch (error) {
      console.error('Gemini transcript parse error:', error);
    }
  }

  if (!parseResult) {
    parseResult = buildRegexFallback(normalizedText || normalizeText(buffer.toString('latin1')));
  }
  if (parseResult.courses.length === 0) {
    const fallback = buildRegexFallback(normalizedText || normalizeText(buffer.toString('latin1')));
    if (fallback.courses.length > 0) {
      parseResult = {
        ...parseResult,
        courses: fallback.courses,
        summary: {
          cga: parseResult.summary.cga ?? fallback.summary.cga,
          totalCreditsEarned: parseResult.summary.totalCreditsEarned ?? fallback.summary.totalCreditsEarned,
          transferCredits: parseResult.summary.transferCredits ?? fallback.summary.transferCredits,
        },
      };
    }
  }

  parseResult.courses = sanitizeParsedCourses(parseResult.courses);
  parseResult.metadata = metadata;
  const verification = validateTranscriptResult(parseResult, context);
  return {
    parse: parseResult,
    verification,
  };
}
