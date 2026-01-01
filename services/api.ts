import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI, Type } from "@google/genai";

// =====================
// Supabase client
// =====================
// Vite chỉ đọc biến môi trường bắt đầu bằng VITE_
const SUPABASE_URL =
  (import.meta as any).env?.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY =
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || "";

// Tạo client Supabase
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper: báo lỗi rõ ràng cho người không chuyên
function requireSupabaseEnv() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Thiếu cấu hình Supabase. Hãy thêm biến môi trường VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY trên Vercel."
    );
  }
}

// =====================
// API compatibility layer
// (giữ nguyên cách gọi fetchFromAPI/postToAPI của các trang)
// =====================

export async function fetchFromAPI<T>(
  action: string,
  params: Record<string, string> = {}
): Promise<T> {
  requireSupabaseEnv();

  try {
    // 1) LOGIN (đang dùng username/password như cũ)
    if (action === "login") {
      const username = params.username || "";
      const password = params.password || "";

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("username", username)
        .eq("password", password)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Sai tài khoản hoặc mật khẩu");

      // lấy các lớp mà giáo viên quản lý (managed_classes)
      if (data.role === "teacher") {
        const { data: classes, error: classErr } = await supabase
          .from("classes")
          .select("id,name,code")
          .eq("teacher_id", data.id);

        if (classErr) throw classErr;
        (data as any).managed_classes = classes || [];
      } else {
        (data as any).managed_classes = [];
      }

      return data as T;
    }

    // 2) NEWSFEED
    if (action === "getFeed") {
      const class_id = params.class_id || "";
      const { data, error } = await supabase
        .from("feed")
        .select("*")
        .eq("class_id", class_id)
        .order("timestamp", { ascending: false });

      if (error) throw error;
      return (data || []) as T;
    }

    // 3) ASSIGNMENTS (danh sách)
    if (action === "getAssignments") {
      const class_id = params.class_id || "";
      const student_id = params.student_id || "";

      const { data: assignments, error } = await supabase
        .from("assignments")
        .select("*")
        .eq("class_id", class_id)
        .order("deadline", { ascending: true });

      if (error) throw error;

      // Nếu là học sinh: tính attempt_count dựa trên submissions
      if (student_id) {
        const { data: subs, error: subErr } = await supabase
          .from("submissions")
          .select("assignment_id")
          .eq("student_id", student_id);

        if (subErr) throw subErr;

        const counts = new Map<string, number>();
        (subs || []).forEach((s: any) => {
          counts.set(s.assignment_id, (counts.get(s.assignment_id) || 0) + 1);
        });

        const enriched = (assignments || []).map((a: any) => ({
          ...a,
          attempt_count: counts.get(a.id) || 0
        }));

        return enriched as T;
      }

      return (assignments || []) as T;
    }

    // 4) ASSIGNMENT BY ID
    if (action === "getAssignmentById") {
      const id = params.id || "";
      const student_id = params.student_id || "";

      const { data: assignment, error } = await supabase
        .from("assignments")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      if (!assignment) throw new Error("Không tìm thấy bài tập");

      // Nếu là học sinh: lấy last_submission
      if (student_id) {
        const { data: lastSub, error: subErr } = await supabase
          .from("submissions")
          .select("*")
          .eq("assignment_id", id)
          .eq("student_id", student_id)
          .order("timestamp", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (subErr) throw subErr;
        (assignment as any).last_submission = lastSub || null;

        // attempt_count
        const { count, error: countErr } = await supabase
          .from("submissions")
          .select("*", { count: "exact", head: true })
          .eq("assignment_id", id)
          .eq("student_id", student_id);

        if (countErr) throw countErr;
        (assignment as any).attempt_count = count || 0;
      }

      return assignment as T;
    }

    // 5) SUBMISSIONS BY ASSIGNMENT
    if (action === "getSubmissionsByAssignment") {
      const assignment_id = params.assignment_id || "";
      const { data, error } = await supabase
        .from("submissions")
        .select("*")
        .eq("assignment_id", assignment_id)
        .order("timestamp", { ascending: false });

      if (error) throw error;
      return (data || []) as T;
    }

    // 6) QUESTION BANK (theo teacher_id)
    if (action === "getQuestionBank") {
      const teacher_id = params.teacher_id || "";
      const { data, error } = await supabase
        .from("question_bank")
        .select("*")
        .eq("teacher_id", teacher_id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as T;
    }

    // 7) STUDENTS BY CLASS
    if (action === "getStudentsByClass") {
      const class_id = params.class_id || "";
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("class_id", class_id)
        .eq("role", "student")
        .order("name", { ascending: true });

      if (error) throw error;
      return (data || []) as T;
    }

    // 8) CLASS TOOLS
    if (action === "getClassTools") {
      const class_id = params.class_id || "";
      const { data, error } = await supabase
        .from("class_tools")
        .select("*")
        .eq("class_id", class_id);

      if (error) throw error;
      return (data || []) as T;
    }

    // 9) GRADEBOOK (ghép từ nhiều bảng)
    if (action === "getGradebook") {
      const class_id = params.class_id || "";

      const { data: columns, error: colErr } = await supabase
        .from("grade_columns")
        .select("*")
        .eq("class_id", class_id)
        .order("created_at", { ascending: true });

      if (colErr) throw colErr;

      const { data: students, error: stuErr } = await supabase
        .from("users")
        .select("*")
        .eq("class_id", class_id)
        .eq("role", "student");

      if (stuErr) throw stuErr;

      const { data: grades, error: gradeErr } = await supabase
        .from("grades")
        .select("*");

      if (gradeErr) throw gradeErr;

      const { data: pointLogs, error: pointErr } = await supabase
        .from("student_points")
        .select("*");

      if (pointErr) throw pointErr;

      const gradebook = (students || []).map((s: any) => {
        const sGrades: Record<string, number> = {};
        (columns || []).forEach((col: any) => {
          const g = (grades || []).find(
            (gg: any) =>
              String(gg.column_id) === String(col.id) &&
              String(gg.student_id) === String(s.id)
          );
          sGrades[col.id] = g ? Number(g.score) : 0;
        });

        const totalPoints = (pointLogs || [])
          .filter((p: any) => String(p.student_id) === String(s.id))
          .reduce((acc: number, curr: any) => acc + Number(curr.points || 0), 0);

        return {
          id: s.id,
          name: s.name,
          grades: sGrades,
          total_points: totalPoints,
          avatar_url: s.avatar_url
        };
      });

      return ({ columns: columns || [], students: gradebook } as any) as T;
    }

    // Nếu action lạ
    throw new Error(`Action không hỗ trợ: ${action}`);
  } catch (error: any) {
    console.error(`Supabase Error [${action}]:`, error);
    throw new Error(error.message || "Không thể kết nối với Supabase.");
  }
}

export async function postToAPI<T>(action: string, payload: any): Promise<T> {
  requireSupabaseEnv();

  try {
    // CREATE CLASS
    if (action === "createClass") {
      const { name, code, teacher_id } = payload;

      const { data, error } = await supabase
        .from("classes")
        .insert([{ name, code, teacher_id }])
        .select("*")
        .maybeSingle();

      if (error) throw error;
      return data as T;
    }

    throw new Error(`Action không hỗ trợ: ${action}`);
  } catch (error: any) {
    console.error(`Supabase Post Error [${action}]:`, error);
    throw new Error(error.message || "Không thể ghi dữ liệu lên Supabase.");
  }
}

// =====================
// Gemini functions (giữ nguyên, chỉ sửa cách lấy API key cho Vite)
// =====================

function getGeminiKey(): string {
  // ưu tiên VITE_GEMINI_API_KEY; nếu bạn đang dùng VITE_API_KEY thì vẫn chạy
  return (
    (import.meta as any).env?.VITE_GEMINI_API_KEY ||
    (import.meta as any).env?.VITE_API_KEY ||
    ""
  );
}

export async function recognizeQuestionsFromText(text: string): Promise<any[]> {
  const apiKey = getGeminiKey();
  if (!apiKey) throw new Error("Thiếu GEMINI API KEY (VITE_GEMINI_API_KEY).");

  const ai = new GoogleGenAI({ apiKey });
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
            type: {
              type: Type.STRING,
              enum: ["multiple_choice", "fill_blank", "true_false", "essay", "ordering"]
            },
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

  return JSON.parse((response as any).text || "[]");
}

export async function parseStudentsFromText(text: string): Promise<any[]> {
  const apiKey = getGeminiKey();
  if (!apiKey) throw new Error("Thiếu GEMINI API KEY (VITE_GEMINI_API_KEY).");

  const ai = new GoogleGenAI({ apiKey });
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

  return JSON.parse((response as any).text || "[]");
}

export async function evaluateStudentAnswers(
  questions: any[],
  studentAnswers: Record<string, string>
): Promise<any> {
  const apiKey = getGeminiKey();
  if (!apiKey) throw new Error("Thiếu GEMINI API KEY (VITE_GEMINI_API_KEY).");

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `Grading task for English Teacher Assistant. 
  For objective questions (fill_blank, ordering, multiple_choice, true_false): grade strictly but ignore minor casing/extra space issues.
  For subjective questions (essay): provide a SUGGESTED score and detailed feedback on grammar, vocabulary, and relevance.
  
  Questions Data: ${JSON.stringify(
    questions.map((q) => ({
      id: q.id,
      text: q.text,
      type: q.type,
      key: q.correctAnswer,
      maxScore: q.score
    }))
  )}
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

  return JSON.parse((response as any).text || "{}");
}
