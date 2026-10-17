/**
 * Formatters and helper functions for codes and identifiers in Vetgo
 */

export const formatTutorCode = (tutor?: { code?: string; id?: number } | number | null): string => {
  if (!tutor) return '';
  if (typeof tutor === 'number') return `TUT-${String(tutor).padStart(4, '0')}`;
  if (tutor.code) return tutor.code;
  if (tutor.id) return `TUT-${String(tutor.id).padStart(4, '0')}`;
  return '';
};

export const formatPatientCode = (patient?: { code?: string; id?: number } | number | null): string => {
  if (!patient) return '';
  if (typeof patient === 'number') return `PAC-${String(patient).padStart(4, '0')}`;
  if (patient.code) return patient.code;
  if (patient.id) return `PAC-${String(patient.id).padStart(4, '0')}`;
  return '';
};
