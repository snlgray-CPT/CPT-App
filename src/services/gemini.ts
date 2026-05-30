import { GoogleGenerativeAI } from '@google/generative-ai';
import { HARDCODED_GEMINI_API_KEY } from '../config';

export type ExtractedVolunteer = {
  name: string;
  age: number;
  congregationName: string;
  congregationNumber: string;
  email: string;
  comments: string;
  department: string;
  assignment: string;
  rating: 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-';
}

export const extractVolunteersFromDoc = async (
  file: File,
  fileBase64: string, // Needed for PDF upload
  excelText?: string   // If Excel, the converted CSV/text representation
): Promise<ExtractedVolunteer[]> => {
  const geminiKey = HARDCODED_GEMINI_API_KEY || 
                    import.meta.env.VITE_GEMINI_API_KEY || 
                    localStorage.getItem('ATLAS_GEMINI_KEY');

  if (!geminiKey) {
    // Return mock parsed results so the interface is 100% testable
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(getMockExtractedData(file.name));
      }, 1500);
    });
  }

  try {
    // We instantiate GoogleGenerativeAI using the configured key.
    // We'll use gemini-1.5-flash as it is fast and supports PDF processing.
    const ai = new GoogleGenerativeAI(geminiKey);
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

    let prompt = `
      You are an expert document data extractor. You are parsing a volunteer recommendation list, letter, or database export for a regional convention.
      The input document may be in Spanish. You MUST translate all Spanish departments, assignments, and comments/recommendations to English.
      
      Extract all volunteers found in this document. Return the result strictly as a valid JSON array of objects. Do not include markdown code block formatting (like \`\`\`json) or extra text. Just output raw JSON.
      
      Each object in the array must contain the following keys exactly:
      - "name": Full name of the volunteer (string)
      - "age": Age (integer, default to 0 if not specified or unknown)
      - "congregationName": Name of their congregation (string, e.g. "Dean Road Spanish" or "Lake Helen Spanish")
      - "congregationNumber": 5-digit or standard congregation number (string, default to empty string if not found)
      - "email": jwpub.org email address (string. If not found, generate a plausible email: firstname.lastname@jwpub.org)
      - "comments": Recommendations/comments translated to English (string, e.g. "Older brother, but in good health. Very hard worker.")
      - "department": The department translated to English (string, e.g., "Acomodador" -> "Attendants", "Alojamiento" -> "Lodging", "Audio/Video" -> "Audio/Video", "Bautismo" -> "Baptism")
      - "assignment": The assignment/details translated to English (string, e.g., "Aux. (Asientos)" -> "Assistant (Seating)", "Supte." -> "Superintendent", "Aux. (Plataforma)" -> "Assistant (Platform)")
      - "rating": Enforced custom rating bracket (must be one of: 'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-'). Map the input column "Ratin" or "Rating" (like B, C, A) directly.

      Ensure any Spanish notes are fully translated to clear English.
    `;

    let response;

    if (excelText) {
      // Excel text analysis
      prompt += `\nHere is the text extracted from the spreadsheet:\n${excelText}`;
      response = await model.generateContent([prompt]);
    } else {
      // PDF base64 analysis
      response = await model.generateContent([
        {
          inlineData: {
            data: fileBase64.split(',')[1] || fileBase64,
            mimeType: 'application/pdf'
          }
        },
        prompt
      ]);
    }

    const responseText = response.response.text().trim();
    // Clean up potential markdown formatting that Gemini might return
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    return normalizeExtractedVolunteers(Array.isArray(parsed) ? parsed : [parsed]);
  } catch (error) {
    console.error('Gemini API extraction failed:', error);
    throw new Error('Gemini API extraction failed. Please check your API key or document format.');
  }
};

const normalizeExtractedVolunteers = (rawList: any[]): ExtractedVolunteer[] => {
  return rawList.map(item => {
    const getVal = (keys: string[]) => {
      for (const k of keys) {
        if (item[k] !== undefined && item[k] !== null) return item[k];
      }
      return undefined;
    };

    const name = getVal(['name', 'fullName', 'full_name', 'nombre']) || '';
    const age = Number(getVal(['age', 'edad']) || 0);
    const congregationName = getVal(['congregationName', 'congregation_name', 'congregation', 'congregacion']) || '';
    const congregationNumber = String(getVal(['congregationNumber', 'congregation_number', 'number', 'numero', 'cong_number']) || '');
    const email = getVal(['email', 'email_address', 'mail', 'correo']) || '';
    const comments = getVal(['comments', 'comment', 'notes', 'recomendacion', 'comentarios', 'comentario']) || '';
    const department = getVal(['department', 'department_name', 'departamento']) || '';
    const assignment = getVal(['assignment', 'assignment_name', 'asignacion', 'puesto']) || '';
    const rating = getVal(['rating', 'ratin', 'calificacion', 'rate']) || 'A';

    return {
      name,
      age,
      congregationName,
      congregationNumber,
      email,
      comments,
      department,
      assignment,
      rating: normalizeRating(rating)
    };
  });
};

const normalizeRating = (r: any): 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' => {
  const s = String(r).toUpperCase().trim();
  const valid = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-'];
  if (valid.includes(s)) return s as 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-';
  if (s.startsWith('A')) return 'A';
  if (s.startsWith('B')) return 'B';
  if (s.startsWith('C')) return 'C';
  return 'B'; // default fallback
};

// Realistic mock data depending on filename to demonstrate the review staging grid
const getMockExtractedData = (fileName: string): ExtractedVolunteer[] => {
  const lowercaseName = fileName.toLowerCase();
  
  if (lowercaseName.includes('elder') || lowercaseName.includes('letter')) {
    return [
      {
        name: "Caleb Sterling",
        age: 26,
        congregationName: "Oak Ridge",
        congregationNumber: "10552",
        email: "c.sterling@jwpub.org",
        comments: "Recommended as an assistant. Caleb serves as a regular pioneer and has been an asset in the audio/video department. Strongly recommended for general support.",
        department: "Audio / Video",
        assignment: "Assistant (Sound)",
        rating: "A+"
      },
      {
        name: "Benjamin Albright",
        age: 44,
        congregationName: "Oak Ridge",
        congregationNumber: "10552",
        email: "b.albright@jwpub.org",
        comments: "Capable and willing. Serves as a ministerial servant. Experienced in accounts and hall setup.",
        department: "Staging & Setup",
        assignment: "Assistant (Attendant)",
        rating: "B"
      }
    ];
  }

  if (lowercaseName.includes('recommend') || lowercaseName.includes('form') || lowercaseName.includes('cpt')) {
    return [
      {
        name: "Fernando Menendez",
        age: 62,
        congregationName: "Dean Road Spanish",
        congregationNumber: "25000",
        email: "fernando.menendez@jwpub.org",
        comments: "Older brother, but in good health. Very hard worker.",
        department: "Attendants",
        assignment: "Assistant (Seating)",
        rating: "B"
      },
      {
        name: "Byron Chavez Jr.",
        age: 24,
        congregationName: "Lake Helen Spanish",
        congregationNumber: "15000",
        email: "byron.chavez@jwpub.org",
        comments: "Young brother with potential. For now, he is a good department assistant who will benefit from more training.",
        department: "Attendants",
        assignment: "Assistant (Exterior)",
        rating: "C"
      },
      {
        name: "Daniel Gatica",
        age: 28,
        congregationName: "Port Saint John Spanish",
        congregationNumber: "25001",
        email: "daniel.gatica@jwpub.org",
        comments: "Very capable, humble, organized young man. Does very well with large departments. Has worked with parking and seating at regional conventions.",
        department: "Attendants",
        assignment: "Superintendent",
        rating: "A"
      }
    ];
  }

  // Default fallback data for generic file uploads
  return [
    {
      name: "Ethan Wright",
      age: 29,
      congregationName: "Oak Ridge",
      congregationNumber: "10552",
      email: "e.wright@jwpub.org",
      comments: "Extracted from default template. Hardworking and reliable.",
      department: "Cleaning & Maintenance",
      assignment: "Assistant",
      rating: "A"
    },
    {
      name: "Daniel Foster",
      age: 38,
      congregationName: "Maple Heights",
      congregationNumber: "11405",
      email: "d.foster@jwpub.org",
      comments: "Previous experience in First Aid. Highly recommended.",
      department: "First Aid",
      assignment: "Row Captain",
      rating: "A-"
    }
  ];
};

export type ExtractedCongregation = {
  name: string;
  number: string;
}

export const extractCongregationsFromDoc = async (
  _file: File,
  fileBase64: string,
  excelText?: string
): Promise<ExtractedCongregation[]> => {
  const geminiKey = HARDCODED_GEMINI_API_KEY || 
                    import.meta.env.VITE_GEMINI_API_KEY || 
                    localStorage.getItem('ATLAS_GEMINI_KEY');

  if (!geminiKey) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(getMockCongregations());
      }, 1500);
    });
  }

  try {
    const ai = new GoogleGenerativeAI(geminiKey);
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });

    let prompt = `
      You are an expert document data extractor. You are parsing a congregation list, registry, or directory for a regional convention.
      
      Extract all congregations found in this document. Return the result strictly as a valid JSON array of objects. Do not include markdown code block formatting (like \`\`\`json) or extra text. Just output raw JSON.
      
      Each object in the array must contain the following keys exactly:
      - "name": Full name of the congregation (string, e.g. "Ridgefield Congregation" or "Lake Helen Spanish")
      - "number": 5-digit or standard congregation number (string, e.g., "12304". If not specified or unknown, generate a random 5-digit number)
    `;

    let response;
    if (excelText) {
      prompt += `\nHere is the text extracted from the spreadsheet:\n${excelText}`;
      response = await model.generateContent([prompt]);
    } else {
      response = await model.generateContent([
        {
          inlineData: {
            data: fileBase64.split(',')[1] || fileBase64,
            mimeType: 'application/pdf'
          }
        },
        prompt
      ]);
    }

    const responseText = response.response.text().trim();
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    return normalizeExtractedCongregations(Array.isArray(parsed) ? parsed : [parsed]);
  } catch (error) {
    console.error('Gemini API congregation extraction failed:', error);
    throw new Error('Gemini API congregation extraction failed. Please check your API key or document format.');
  }
};

const normalizeExtractedCongregations = (rawList: any[]): ExtractedCongregation[] => {
  return rawList.map(item => {
    const getVal = (keys: string[]) => {
      for (const k of keys) {
        if (item[k] !== undefined && item[k] !== null) return item[k];
      }
      return undefined;
    };

    const name = getVal(['name', 'congregationName', 'congregation_name', 'congregacion']) || '';
    const number = String(getVal(['number', 'congregationNumber', 'congregation_number', 'numero']) || '');

    return { name, number };
  });
};

const getMockCongregations = (): ExtractedCongregation[] => {
  return [
    { name: "Ridgefield Congregation", number: "12304" },
    { name: "Sunset Park Congregation", number: "24890" },
    { name: "Bayview Congregation", number: "31045" },
    { name: "Lake Helen Spanish", number: "15000" },
    { name: "Dean Road Spanish", number: "25000" },
    { name: "Oak Ridge", number: "10552" }
  ];
};
