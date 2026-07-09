export const NOTE_REJECT_REASON_OPTIONS = [
  { value: 'inappropriate_content', label: 'Inappropriate or offensive content' },
  { value: 'copyright_concern', label: 'Copyright or academic integrity concern' },
  { value: 'insufficient_quality', label: 'Insufficient quality or incomplete materials' },
  { value: 'wrong_course_or_metadata', label: 'Wrong course or incorrect listing metadata' },
  { value: 'duplicate_listing', label: 'Duplicate listing' },
  { value: 'other', label: 'Other' },
] as const;

export const NOTE_REJECT_REASONS = NOTE_REJECT_REASON_OPTIONS.map((option) => option.value);

export type NoteRejectReason = (typeof NOTE_REJECT_REASON_OPTIONS)[number]['value'];

export function noteRejectReasonLabel(value: string | null | undefined) {
  return NOTE_REJECT_REASON_OPTIONS.find((option) => option.value === value)?.label || value || 'Unknown';
}
