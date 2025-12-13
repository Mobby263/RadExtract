// types.ts

export enum AppStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

// Represents a row from the initial patient list (Excel/CSV)
export interface PatientRecord {
  id: string; // Maps to Study ID or MRN
  name?: string;
  dob?: string;
  gender?: string;
  examDate?: string; // Maps to Done Stamp
  createdDate?: string; // Maps to Created Stamp
  age?: number | string; // Calculated field
  timeToStudy?: string; // Calculated field (Done - Created)
  // Dynamic fields for other columns in the initial extract
  [key: string]: any;
}

// Represents the data extracted from the Radiology Report
// Standard for Boolean-like fields: 0=No, 1=Yes, 2=N/A (Not Applicable)
export interface ExtractedData {
  // New Variable
  injury_mechanism: number; // 1=Strangulation, 2=Hanging, 0=Other/Unknown, 3=N/A

  // Fractures
  fractures: number; 
  fractures_cspine: number;
  fractures_calvarium: number;
  fractures_skull_base: number;
  fractures_leforte: number;
  fractures_cricoid: number;
  fractures_hyoid: number;
  fractures_larynx: number;

  // Vascular
  vascular_injury: number;
  vessel_carotid: number;
  vessel_vertebral: number;
  vessel_internal_jugular: number;
  vessel_other: number; // 0=No, 1=Yes, 2=N/A
  vessel_other_specify: string;
  vascular_report_comments: string;

  // Biffl Grading
  biffl_grading_used: number;
  biffl_grade: string;
  biffl_grade_comments: string;
  reviewed_biffl_grade: string;

  // Brain Pathology
  brain_pathology: number;
  brain_pathology_details: number; // 0=None, 1=Ischemia, 2=Hemorrhage, 3=N/A
  brain_pathology_comments: string;

  // Clinical History & Status
  ipv_history: number; // Intimate partner violence history
  gcs: string; // Glasgow Coma Scale
  intubated: number; 

  // Clinical Findings (Prefixes removed)
  soft_tissue_injury: number;
  loc: number; // Loss of Consciousness
  neuro_impaired: number;
  seizures: number;
  neck_pain: number;
  dysphagia: number;
  hoarseness: number;
  bruising: number;
  ligature: number;
  swelling: number;
  subconj_hemorrhages: number;
  c_spine_tenderness: number;
}

// The combined object used for the final analysis sheet
export interface MergedRecord extends PatientRecord {
  radiologyReportText?: string;
  extractionStatus: 'PENDING' | 'EXTRACTED' | 'REVIEWED';
  extractedData?: ExtractedData;
}
