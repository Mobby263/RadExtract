// constants.ts
import { ExtractedData } from './types';

export const EMPTY_EXTRACTION: ExtractedData = {
  injury_mechanism: 0,
  
  fractures: 0,
  fractures_cspine: 0,
  fractures_calvarium: 0,
  fractures_skull_base: 0,
  fractures_leforte: 0,
  fractures_cricoid: 0,
  fractures_hyoid: 0,
  fractures_larynx: 0,
  
  vascular_injury: 0,
  vessel_carotid: 0,
  vessel_vertebral: 0,
  vessel_internal_jugular: 0,
  vessel_other: 0,
  vessel_other_specify: '',
  vascular_report_comments: '',
  
  biffl_grading_used: 0,
  biffl_grade: '',
  biffl_grade_comments: '',
  reviewed_biffl_grade: '',
  
  brain_pathology: 0,
  brain_pathology_details: 0,
  brain_pathology_comments: '',
  
  // Clinical Fields
  ipv_history: 0,
  gcs: '',
  intubated: 0,
  soft_tissue_injury: 0,
  loc: 0,
  neuro_impaired: 0,
  seizures: 0,
  neck_pain: 0,
  dysphagia: 0,
  hoarseness: 0,
  bruising: 0,
  ligature: 0,
  swelling: 0,
  subconj_hemorrhages: 0,
  c_spine_tenderness: 0
};

export const SAMPLE_CSV_HEADER = [
  "Study ID", "Name", "Date_time injury occurred", "Date_time order created", "Gender", "Age", "Injury mechanism"
];