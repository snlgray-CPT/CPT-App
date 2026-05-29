import { GoogleGenerativeAI } from '@google/generative-ai';

export type ExtractedVolunteer = {
  name: string;
  age: number;
  congregationName: string;
  congregationNumber: string;
  email: string;
  comments: string;
}

export const extractVolunteersFromDoc = async (
  file: File,
  fileBase64: string, // Needed for PDF upload
  excelText?: string   // If Excel, the converted CSV/text representation
): Promise<ExtractedVolunteer[]> => {
  const geminiKey = localStorage.getItem('ATLAS_GEMINI_KEY');

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
      Extract all volunteers found in this document. Return the result strictly as a valid JSON array of objects. Do not include markdown code block formatting (like \`\`\`json) or extra text. Just output raw JSON.
      
      Each object in the array must contain the following keys exactly:
      - "name": Full name of the volunteer (string)
      - "age": Age (integer, use 0 if not specified or unknown)
      - "congregationName": Name of their congregation (string)
      - "congregationNumber": 5-digit or standard congregation number (string, default to empty string if not found)
      - "email": jwpub.org email address (string, format: name@jwpub.org or similar. If not found, generate a plausible email: firstname.lastname@jwpub.org)
      - "comments": Recommendations, elder comments, or department notes (string)

      If any field is missing, attempt to infer it or leave as a blank string/0.
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
    return JSON.parse(cleanJson) as ExtractedVolunteer[];
  } catch (error) {
    console.error('Gemini API extraction failed:', error);
    throw new Error('Gemini API extraction failed. Please check your API key or document format.');
  }
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
        comments: "Recommended as an assistant. Caleb serves as a regular pioneer and has been an asset in the audio/video department. Strongly recommended for general support."
      },
      {
        name: "Benjamin Albright",
        age: 44,
        congregationName: "Oak Ridge",
        congregationNumber: "10552",
        email: "b.albright@jwpub.org",
        comments: "Capable and willing. Serves as a ministerial servant. Experienced in accounts and hall setup."
      }
    ];
  }

  if (lowercaseName.includes('recommend') || lowercaseName.includes('form')) {
    return [
      {
        name: "Jared Vance",
        age: 22,
        congregationName: "Pine Valley",
        congregationNumber: "18942",
        email: "jared.vance@jwpub.org",
        comments: "Young brother with great initiative. Eager to work under pressure. Recommended for Attendant or Cleaning departments."
      },
      {
        name: "Luke Harrison",
        age: 35,
        congregationName: "Pine Valley",
        congregationNumber: "18942",
        email: "luke.harrison@jwpub.org",
        comments: "Certified electrician. Ideal helper for electrical setups, AV power grids, or emergency engineering tasks."
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
      comments: "Extracted from default template. Hardworking and reliable."
    },
    {
      name: "Daniel Foster",
      age: 38,
      congregationName: "Maple Heights",
      congregationNumber: "11405",
      email: "d.foster@jwpub.org",
      comments: "Previous experience in First Aid. Highly recommended."
    }
  ];
};
