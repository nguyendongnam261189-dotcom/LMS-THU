
import { GoogleGenAI, Type } from "@google/genai";

const API_URL = 'https://script.google.com/macros/s/AKfycbyo7IWQ0C7Veh9kM6pn3KU75-cD09dbYufG0ZEt3xeWABahTfCCLBzvjnwlsf1A5N0/exec';

export async function fetchFromAPI<T>(action: string, params: Record<string, string> = {}): Promise<T> {
  try {
    const query = new URLSearchParams({ action, ...params }).toString();
    const response = await fetch(`${API_URL}?${query}`, { 
      method: 'GET',
      cache: 'no-cache',
      redirect: 'follow'
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      console.error("Non-JSON response received:", text);
      throw new Error("Máy chủ trả về định dạng không hợp lệ. Vui lòng kiểm tra lại quyền truy cập của Google Apps Script.");
    }

    const result = await response.json();
    if (!result.success) throw new Error(result.message || 'API Error');
    return result.data;
  } catch (error: any) {
    console.error(`Fetch API Error [${action}]:`, error);
    if (error.message.includes("Unexpected token")) {
      throw new Error("Phản hồi từ máy chủ bị lỗi. Vui lòng thử lại sau.");
    }
    throw new Error(error.message || "Không thể kết nối với máy chủ.");
  }
}

export async function postToAPI<T>(action: string, payload: any): Promise<T> {
  try {
    const response = await fetch(`${API_URL}?action=${action}`, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      redirect: 'follow'
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("Máy chủ trả về định dạng không hợp lệ. Vui lòng kiểm tra lại quyền truy cập của Google Apps Script.");
    }

    const result = await response.json();
    if (!result.success) throw new Error(result.message || 'API Error');
    return result.data;
  } catch (error: any) {
    console.error(`Post API Error [${action}]:`, error);
    throw new Error(error.message || "Không thể kết nối với máy chủ.");
  }
}

export async function recognizeQuestionsFromText(text: string): Promise<any[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const systemInstruction = `You are an expert English teacher. Parse the text into a JSON array. 
  Recognize: multiple_choice, fill_blank, ordering, essay, true_false.
  Assign 1 point default score. Return a clean JSON array.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Parse these English exercises:\n\n${text}`,
    config: { 
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            type: { type: Type.STRING, enum: ["multiple_choice", "fill_blank", "true_false", "essay", "ordering"] },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswer: { type: Type.STRING },
            score: { type: Type.NUMBER },
            difficulty: { type: Type.STRING },
            topic: { type: Type.STRING }
          },
          required: ["text", "type", "score"]
        }
      }
    }
  });
  return JSON.parse(response.text || "[]");
}

export async function parseStudentsFromText(text: string): Promise<any[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const systemInstruction = `You are a school administrator. Parse the following text (pasted from Excel or a list) into a JSON array of students.
  Each object must have: 'name' (Full Name), 'username' (Generated if not provided, e.g., name without spaces), 'password' (Generated random 6 chars if not provided).
  Handle messy input and prioritize full names.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Parse these student details:\n\n${text}`,
    config: { 
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            username: { type: Type.STRING },
            password: { type: Type.STRING }
          },
          required: ["name", "username", "password"]
        }
      }
    }
  });
  return JSON.parse(response.text || "[]");
}

export async function evaluateStudentAnswers(questions: any[], studentAnswers: Record<string, string>): Promise<any> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `Grading task for English Teacher Assistant. 
  For objective questions (fill_blank, ordering, multiple_choice, true_false): grade strictly but ignore minor casing/extra space issues.
  For subjective questions (essay): provide a SUGGESTED score and detailed feedback on grammar, vocabulary, and relevance.
  
  Questions Data: ${JSON.stringify(questions.map(q => ({ id: q.id, text: q.text, type: q.type, key: q.correctAnswer, maxScore: q.score })))}
  Student Input: ${JSON.stringify(studentAnswers)}
  
  Return a JSON object where keys are question IDs and values are: { isCorrect: boolean, scoreEarned: number, feedback: string, isSubjective: boolean }.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: { 
      responseMimeType: "application/json",
      systemInstruction: "You are an automated English grading system. Be precise and encouraging."
    }
  });

  return JSON.parse(response.text || "{}");
}
