// services/geminiService.ts
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { ExtractedData } from "../types";
import { EMPTY_EXTRACTION } from "../constants";

// Define the schema for the AI response to ensure strict JSON output matching our variables
const extractionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    // New variable
    injury_mechanism: { type: Type.INTEGER, description: "1=Strangulation, 2=Hanging, 0=Other/Unknown, 3=N/A" },

    // Fractures
    fractures: { type: Type.INTEGER, description: "1=Yes, 0=No, 2=N/A" },
    fractures_cspine: { type: Type.INTEGER, description: "1=Yes, 0=No, 2=N/A" },
    fractures_calvarium: { type: Type.INTEGER, description: "1=Yes, 0=No, 2=N/A" },
    fractures_skull_base: { type: Type.INTEGER, description: "1=Yes, 0=No, 2=N/A" },
    fractures_leforte: { type: Type.INTEGER, description: "1=Yes, 0=No, 2=N/A" },
    fractures_cricoid: { type: Type.INTEGER, description: "1=Yes, 0=No, 2=N/A" },
    fractures_hyoid: { type: Type.INTEGER, description: "1=Yes, 0=No, 2=N/A" },
    fractures_larynx: { type: Type.INTEGER, description: "1=Yes, 0=No, 2=N/A" },
    
    // Vascular
    vascular_injury: { type: Type.INTEGER, description: "1=Yes, 0=No, 2=N/A" },
    vessel_carotid: { type: Type.INTEGER, description: "1=Yes, 0=No, 2=N/A" },
    vessel_vertebral: { type: Type.INTEGER, description: "1=Yes, 0=No, 2=N/A" },
    vessel_internal_jugular: { type: Type.INTEGER, description: "1=Yes, 0=No, 2=N/A" },
    vessel_other: { type: Type.INTEGER, description: "1=Yes, 0=No, 2=N/A" },
    vessel_other_specify: { type: Type.STRING, description: "Name of other vessel injured, empty if none" },
    vascular_report_comments: { type: Type.STRING, description: "Brief summary of vascular findings" },
    
    // Grading
    biffl_grading_used: { type: Type.INTEGER, description: "1=Yes, 0=No, 2=N/A" },
    biffl_grade: { type: Type.STRING, description: "The Biffl grade (I, II, III, IV), empty if none" },
    biffl_grade_comments: { type: Type.STRING, description: "Comments specific to the Biffl grading or why it was applied" },
    
    // Brain
    brain_pathology: { type: Type.INTEGER, description: "1=Yes, 0=No, 2=N/A" },
    brain_pathology_details: { type: Type.INTEGER, description: "1=Ischemia/Infarct, 2=Hemorrhage, 0=None, 3=N/A" },
    brain_pathology_comments: { type: Type.STRING, description: "Brief summary of brain pathology" },

    // Clinical & History
    ipv_history: { type: Type.INTEGER, description: "1=Yes, 0=No, 2=N/A" },
    gcs: { type: Type.STRING, description: "Glasgow Coma Scale score if mentioned (e.g., '15', '3', '14T')" },
    intubated: { type: Type.INTEGER, description: "1=Yes, 0=No, 2=N/A" },
    
    // Clinical Findings (renamed)
    soft_tissue_injury: { type: Type.INTEGER, description: "1=Yes, 0=No, 2=N/A" },
    loc: { type: Type.INTEGER, description: "1=Yes, 0=No, 2=N/A" },
    neuro_impaired: { type: Type.INTEGER, description: "1=Yes, 0=No, 2=N/A" },
    seizures: { type: Type.INTEGER, description: "1=Yes, 0=No, 2=N/A" },
    neck_pain: { type: Type.INTEGER, description: "1=Yes, 0=No, 2=N/A" },
    dysphagia: { type: Type.INTEGER, description: "1=Yes, 0=No, 2=N/A" },
    hoarseness: { type: Type.INTEGER, description: "1=Yes, 0=No, 2=N/A" },
    bruising: { type: Type.INTEGER, description: "1=Yes, 0=No, 2=N/A" },
    ligature: { type: Type.INTEGER, description: "1=Yes, 0=No, 2=N/A" },
    swelling: { type: Type.INTEGER, description: "1=Yes, 0=No, 2=N/A" },
    subconj_hemorrhages: { type: Type.INTEGER, description: "1=Yes, 0=No, 2=N/A" },
    c_spine_tenderness: { type: Type.INTEGER, description: "1=Yes, 0=No, 2=N/A" },
  },
  required: [
    "fractures", "fractures_cspine", "vascular_injury", "brain_pathology", 
    "ipv_history", "gcs", "intubated", "injury_mechanism"
  ]
};

export const extractDataFromReport = async (reportText: string): Promise<ExtractedData> => {
  // Debug check: This ensures the env var is actually loaded
  if (!process.env.API_KEY || process.env.API_KEY.includes("PASTE_YOUR_API_KEY")) {
    throw new Error("API Key is missing or invalid. Please check your .env file and restart the server.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
    You are a specialized medical data extractor for a research project.
    Analyze the following Radiology Report text.
    Extract the specific variables defined in the schema.
    
    Rules:
    - Use 1 for Yes/Present and 0 for No/Absent.
    - Use 2 for Not Applicable (N/A) if the finding is not mentioned, irrelevant to the study type, or explicitly stated as not applicable.
    - Be precise. If a finding is "suspected" or "possible", treat it as 0 (No) unless the conclusion confirms it.
    - For brain pathology details: Return 1 if ischemia/stroke, 2 if hemorrhage/bleed, 0 if neither/none, 3 if N/A.
    - For 'Other Vessel', if a vascular injury is present but not in the Carotid, Vertebral, or Internal Jugular, mark Other=1 and specify.
    - If specific grades aren't found, leave strings empty.
    - INJURY MECHANISM: Look for context about how the injury occurred. 
       - Code 1 = Strangulation (manual, chokehold, etc.)
       - Code 2 = Hanging
       - Code 0 = Other mechanism or Unknown.
    - Important: Also look at the 'Clinical History', 'Indication', or 'Reason for Exam' sections often found at the top of the report to extract clinical variables (e.g., GCS, Intubation, History of IPV, Signs of trauma like bruising/swelling, hoarseness).

    Report Text:
    """
    ${reportText}
    """
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: extractionSchema,
        temperature: 0.1, // Low temperature for deterministic extraction
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const parsed = JSON.parse(text);
    
    // Merge with empty to ensure all keys exist even if AI omits optional ones
    return { ...EMPTY_EXTRACTION, ...parsed };

  } catch (error) {
    console.error("Extraction error:", error);
    throw error;
  }
};