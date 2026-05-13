// services/geminiService.ts
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ExtractedData } from "../types";
import { EMPTY_EXTRACTION } from "../constants";

// Initialize Gemini once at module level
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

// Define the schema for the AI response to ensure strict JSON output matching our variables
const extractionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    // Clinical History & Status
    gbv: { type: Type.INTEGER, description: "Gender-Based Violence history (1=Yes, 0=No, 9=N/A, 999=Missing)" },
    gcs: { type: Type.STRING, description: "Glasgow Coma Scale score (e.g., '15', '3')" },
    intubated: { type: Type.INTEGER, description: "1=Yes, 0=No, 9=N/A, 999=Missing" },
    soft_tissue_injury: { type: Type.INTEGER, description: "1=Yes, 0=No, 9=N/A, 999=Missing. Note: Include neck swelling here." },
    neckpain: { type: Type.INTEGER, description: "1=Yes, 0=No, 9=N/A, 999=Missing" },
    dysphagia: { type: Type.INTEGER, description: "1=Yes, 0=No, 9=N/A, 999=Missing" },
    bruising: { type: Type.INTEGER, description: "1=Yes, 0=No, 9=N/A, 999=Missing" },
    ligature: { type: Type.INTEGER, description: "1=Yes, 0=No, 9=N/A, 999=Missing" },
    swelling: { type: Type.INTEGER, description: "1=Yes, 0=No, 9=N/A, 999=Missing" },
    subconj_hemorrhages: { type: Type.INTEGER, description: "1=Yes, 0=No, 9=N/A, 999=Missing" },
    cspine_tenderness: { type: Type.INTEGER, description: "1=Yes, 0=No, 9=N/A, 999=Missing" },
    hoarseness: { type: Type.INTEGER, description: "1=Yes, 0=No, 9=N/A, 999=Missing" },
    focal_neuro: { type: Type.INTEGER, description: "1=Yes, 0=No, 9=N/A, 999=Missing" },
    limb_impaired: { type: Type.INTEGER, description: "1=Yes, 0=No, 9=N/A, 999=Missing" },
    loc: { type: Type.INTEGER, description: "1=Yes, 0=No, 9=N/A, 999=Missing" },
    seizures: { type: Type.INTEGER, description: "1=Yes, 0=No, 9=N/A, 999=Missing" },

    // Radiology Results (RR_ prefix)
    rr_fractures: { type: Type.INTEGER, description: "1=Yes, 0=No, 9=N/A, 999=Missing" },
    rr_fractures_cspine: { type: Type.INTEGER, description: "1=Yes, 0=No, 9=N/A, 999=Missing" },
    rr_fractures_calvarium: { type: Type.INTEGER, description: "1=Yes, 0=No, 9=N/A, 999=Missing" },
    rr_fractures_skullbase: { type: Type.INTEGER, description: "1=Yes, 0=No, 9=N/A, 999=Missing" },
    rr_fractures_leforte: { type: Type.INTEGER, description: "1=Yes, 0=No, 9=N/A, 999=Missing" },
    rr_fractures_cricoid: { type: Type.INTEGER, description: "1=Yes, 0=No, 9=N/A, 999=Missing" },
    rr_fractures_hyoid: { type: Type.INTEGER, description: "1=Yes, 0=No, 9=N/A, 999=Missing" },
    rr_fractures_larynx: { type: Type.INTEGER, description: "1=Yes, 0=No, 9=N/A, 999=Missing" },
    
    rr_vascular_injury: { type: Type.INTEGER, description: "1=Yes, 0=No, 9=N/A, 999=Missing" },
    vessel_carotid: { type: Type.INTEGER, description: "1=Yes, 0=No, 9=N/A, 999=Missing" },
    vessel_vertebral: { type: Type.INTEGER, description: "1=Yes, 0=No, 9=N/A, 999=Missing" },
    vessel_other: { type: Type.INTEGER, description: "1=Yes, 0=No, 9=N/A, 999=Missing" },
    vessel_other_specify: { type: Type.STRING },
    rr_vessel_injured_report_comments: { type: Type.STRING },
    
    rr_biffl_used: { type: Type.INTEGER, description: "1=Yes, 0=No, 9=N/A, 999=Missing" },
    rr_biffl_rt_carotid: { type: Type.STRING, description: "Biffl Grade for Right Carotid (raw)" },
    rr_biffl_lt_carotid: { type: Type.STRING, description: "Biffl Grade for Left Carotid (raw)" },
    rr_biffl_rt_vertebral: { type: Type.STRING, description: "Biffl Grade for Right Vertebral (raw)" },
    rr_biffl_lt_vertebral: { type: Type.STRING, description: "Biffl Grade for Left Vertebral (raw)" },

    rr_reviewed_biffl_rt_carotid: { type: Type.STRING, description: "Reviewed Biffl Grade for Right Carotid" },
    rr_reviewed_biffl_lt_carotid: { type: Type.STRING, description: "Reviewed Biffl Grade for Left Carotid" },
    rr_reviewed_biffl_rt_vertebral: { type: Type.STRING, description: "Reviewed Biffl Grade for Right Vertebral" },
    rr_reviewed_biffl_lt_vertebral: { type: Type.STRING, description: "Reviewed Biffl Grade for Left Vertebral" },
    
    rr_brain_pathology: { type: Type.INTEGER, description: "1=Yes, 0=No, 9=N/A, 999=Missing" },
    rr_brain_pathology_type: { type: Type.INTEGER, description: "1=Ischemia/Infarct, 2=Hemorrhage, 0=None, 9=N/A, 999=Missing" },
    rr_brain_pathology_report_comments: { type: Type.STRING },

    // Injury Mechanism
    injury_mechanism: { type: Type.INTEGER, description: "1=Strangulation, 2=Hanging, 0=Other/Unknown, 9=N/A, 999=Missing" },
  },
  required: [
    "rr_fractures", "rr_vascular_injury", "rr_brain_pathology", 
    "gbv", "gcs", "intubated", "injury_mechanism"
  ]
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const extractDataFromReport = async (reportText: string, clinicInfo?: string, retries = 3): Promise<ExtractedData> => {
  // Debug check: This ensures the env var is actually loaded
  if (!process.env.GEMINI_API_KEY || !genAI) {
    throw new Error("Gemini API Key is missing. Please ensure it is set in your environment.");
  }

  const prompt = `
    You are a specialized medical data extractor for a research project.
    Analyze the following Radiology Report text and the associated Clinical Info from the patient list.
    Extract the specific variables defined in the schema.
    
    Rules:
    - Use 1 for Yes/Present and 0 for No/Absent.
    - Use 9 for Not Applicable (N/A).
    - Use 999 for Missing if not mentioned.
    - BIFFL GRADING WORKFLOW:
        1. FIRST: Check for an explicit Biffl grade (e.g., "Biffl Grade II") in the report's comments or summary. If found, populate the raw Biffl columns (rr_biffl_rt_carotid, etc.) and leave the "Reviewed" columns empty.
        2. SECOND (IF NO EXPLICIT GRADE FOUND): Look in the "Findings" section for descriptive key terms. Map these to the Reviewed Biffl columns (rr_reviewed_biffl_rt_carotid, etc.) using this classification:
            - Grade I: minimal luminal irregularity or intramural hematoma/dissection with <25% luminal narrowing.
            - Grade II: intramural hematoma/dissection with ≥25% luminal narrowing, intraluminal thrombus, or raised intimal flap.
            - Grade III: pseudoaneurysm.
            - Grade IV: occlusion.
            - Grade V: transection with free extravasation.
    - INJURY MECHANISM: Look for context. Code 1=Strangulation, 2=Hanging, 0=Other/Unknown.
    - RR Brain Pathology: Use the 'type' field to specify 1 for ischemia or 2 for hemorrhage.
    - MAPPING: If 'neck swelling' is mentioned, populate soft_tissue_injury as 1.

    Clinical Info (from Spreadsheet):
    """
    ${clinicInfo || 'No extra clinical info provided'}
    """

    Radiology Report Text:
    """
    ${reportText}
    """
  `;

  try {
    const response = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: extractionSchema,
        temperature: 0.1,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const parsed = JSON.parse(text);
    
    // Merge with empty to ensure all keys exist even if AI omits optional ones
    return { ...EMPTY_EXTRACTION, ...parsed };

  } catch (error: any) {
    // Retry Logic for Rate Limits (429) or Server Errors (503)
    const isRetryable = error.message?.includes('429') || error.message?.includes('503') || error.status === 429 || error.status === 503;
    
    if (isRetryable && retries > 0) {
        console.warn(`Gemini API rate limit/error hit. Retrying in ${(4 - retries) * 2} seconds... (${retries} attempts left)`);
        await delay((4 - retries) * 2000); // Exponential backoff: 2s, 4s, 6s
        return extractDataFromReport(reportText, clinicInfo, retries - 1);
    }

    console.error("Extraction error:", error);
    throw error;
  }
};