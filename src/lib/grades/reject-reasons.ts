export const REJECT_REASON_OPTIONS = [
  { value: 'illegible_document', label: 'Illegible or corrupted document' },
  { value: 'missing_pages', label: 'Missing required pages' },
  { value: 'mismatched_student_info', label: 'Mismatched student information' },
  { value: 'suspected_fraud', label: 'Suspected fraud or tampering' },
  { value: 'incomplete_extraction', label: 'Incomplete extraction — resubmission required' },
  { value: 'other', label: 'Other' },
] as const;

export type RejectReason = (typeof REJECT_REASON_OPTIONS)[number]['value'];

export function rejectReasonLabel(value: string | null | undefined) {
  return REJECT_REASON_OPTIONS.find((option) => option.value === value)?.label || value || 'Unknown';
}
