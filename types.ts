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
  age?: number | string; // Calculated field
  // Dynamic fields for other columns in the initial extract
  [key: string]: any;
}

// Represents the data extracted from the Radiology Report
// Standard for Boolean-like fields: 0=No, 1=Yes, 9=N/A, 999=Missing
export interface ExtractedData {
  // Clinical History & Status
  gbv: number; 
  gcs: string;
  intubated: number;
  soft_tissue_injury: number;
  neckpain: number;
  dysphagia: number;
  bruising: number;
  ligature: number;
  swelling: number;
  subconj_hemorrhages: number;
  cspine_tenderness: number;
  hoarseness: number;
  focal_neuro: number; 
  limb_impaired: number; 
  loc: number;
  seizures: number;

  // Radiology Results (RR_ prefix)
  rr_fractures: number;
  rr_fractures_cspine: number;
  rr_fractures_calvarium: number;
  rr_fractures_skullbase: number;
  rr_fractures_leforte: number;
  rr_fractures_cricoid: number;
  rr_fractures_hyoid: number;
  rr_fractures_larynx: number;
  
  rr_vascular_injury: number;
  vessel_carotid: number;
  vessel_vertebral: number;
  vessel_other: number;
  vessel_other_specify: string;
  rr_vessel_injured_report_comments: string;
  
  rr_biffl_used: number;
  rr_biffl_rt_carotid: string;
  rr_biffl_lt_carotid: string;
  rr_biffl_rt_vertebral: string;
  rr_biffl_lt_vertebral: string;
  
  rr_reviewed_biffl_rt_carotid: string;
  rr_reviewed_biffl_lt_carotid: string;
  rr_reviewed_biffl_rt_vertebral: string;
  rr_reviewed_biffl_lt_vertebral: string;
  
  rr_brain_pathology: number; // yes/no
  rr_brain_pathology_type: number; // ischemia=1, hemorrhage=2
  rr_brain_pathology_report_comments: string;

  // Injury Mechanism
  injury_mechanism: number; // 1=Strangulation, 2=Hanging, 0=Other/Unknown
}

// The combined object used for the final analysis sheet
export interface MergedRecord extends PatientRecord {
  radiologyReportText?: string;
  clinicInfo?: string;
  reportFilename?: string;
  extractionStatus: 'PENDING' | 'EXTRACTED' | 'REVIEWED' | 'ERROR';
  extractionError?: string;
  extractedData?: ExtractedData;
}
