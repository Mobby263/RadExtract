// constants.ts
import { ExtractedData } from './types';

export const EMPTY_EXTRACTION: ExtractedData = {
  // Clinical History & Status
  gbv: 0,
  gcs: '',
  intubated: 0,
  soft_tissue_injury: 0,
  neckpain: 0,
  dysphagia: 0,
  bruising: 0,
  ligature: 0,
  swelling: 0,
  subconj_hemorrhages: 0,
  cspine_tenderness: 0,
  hoarseness: 0,
  focal_neuro: 0,
  limb_impaired: 0,
  loc: 0,
  seizures: 0,

  // Radiology Results (RR_ prefix)
  rr_fractures: 0,
  rr_fractures_cspine: 0,
  rr_fractures_calvarium: 0,
  rr_fractures_skullbase: 0,
  rr_fractures_leforte: 0,
  rr_fractures_cricoid: 0,
  rr_fractures_hyoid: 0,
  rr_fractures_larynx: 0,
  
  rr_vascular_injury: 0,
  vessel_carotid: 0,
  vessel_vertebral: 0,
  vessel_other: 0,
  vessel_other_specify: '',
  rr_vessel_injured_report_comments: '',
  
  rr_biffl_used: 0,
  rr_biffl_rt_carotid: '',
  rr_biffl_lt_carotid: '',
  rr_biffl_rt_vertebral: '',
  rr_biffl_lt_vertebral: '',
  
  rr_reviewed_biffl_rt_carotid: '',
  rr_reviewed_biffl_lt_carotid: '',
  rr_reviewed_biffl_rt_vertebral: '',
  rr_reviewed_biffl_lt_vertebral: '',
  
  rr_brain_pathology: 0,
  rr_brain_pathology_type: 0,
  rr_brain_pathology_report_comments: '',

  // Injury Mechanism
  injury_mechanism: 0
};

export const SAMPLE_CSV_HEADER = [
  "Exam Number", "MRN", "Name", "Surname", "Modality", "Exam Location", "Procedure", "Gender", "Patient DOB", "Priority", "Created Stamp", "Done Stamp", "Workflow step", "Clinic Info"
];