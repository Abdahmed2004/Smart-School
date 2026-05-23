import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import AttendanceView from './components/AttendanceView';
import ScheduleView from './components/ScheduleView';

// ========================================================================
// 1. ترتيب المواد الوزاري المعتمد
// ========================================================================
const ministerialOrder = [
  "التربية الإسلامية", 
  "اللغة العربية", 
  "اللغة الإنجليزية", 
  "الرياضيات",
  "الفيزياء", 
  "الكيمياء", 
  "الأحياء", 
  "التاريخ", 
  "الجغرافيا", 
  "علم الاجتماع", 
  "الفلسفة", 
  "الاقتصاد", 
  "جرائم حزب البعث",
  "اللغة الكردية", 
  "الحاسوب", 
  "التربية الفنية", 
  "التربية الرياضية"
];

const SOCIAL_STUDIES_SUBJECT = "الاجتماعيات";
const SOCIAL_STUDIES_BUNDLE = [
  "التاريخ",
  "الجغرافيا",
  "علم الاجتماع",
  "الفلسفة",
  "الاقتصاد",
  "جرائم حزب البعث"
];

const teacherSubjectOptions = [
  ...ministerialOrder.filter((subject) => !SOCIAL_STUDIES_BUNDLE.includes(subject)),
  SOCIAL_STUDIES_SUBJECT
];

// ========================================================================
// 2. النصاب الافتراضي - محدّث حسب المتطلبات
// ========================================================================
const DEFAULT_QUOTAS_MAP = {
  "التربية الإسلامية": 2, 
  "رابع علمي": { 
    "اللغة العربية": 5, "اللغة الإنجليزية": 5, "اللغة الكردية": 2, 
    "الرياضيات": 4, "الكيمياء": 3, "الفيزياء": 3, "الأحياء": 3, 
    "التربية الفنية": 2, "التربية الرياضية": 1, "الحاسوب": 2 
  },
  "رابع أدبي": { 
    "اللغة العربية": 6, "اللغة الإنجليزية": 5, "اللغة الكردية": 2, 
    "الرياضيات": 3, "التاريخ": 3, "الجغرافيا": 4, "علم الاجتماع": 2, 
    "التربية الفنية": 2, "التربية الرياضية": 1, "الحاسوب": 2 
  },
  "خامس علمي": { 
    "اللغة العربية": 4, "اللغة الإنجليزية": 5, "اللغة الكردية": 1, 
    "الرياضيات": 5, "الكيمياء": 3, "الفيزياء": 3, "الأحياء": 3, 
    "التربية الفنية": 1, "التربية الرياضية": 1, "الحاسوب": 2 
  },
  "خامس أدبي": { 
    "اللغة العربية": 6, "اللغة الإنجليزية": 5, "اللغة الكردية": 1, 
    "الرياضيات": 4, "التاريخ": 3, "الجغرافيا": 3, "الفلسفة": 3, "الاقتصاد": 2, 
    "التربية الفنية": 1, "التربية الرياضية": 1, "الحاسوب": 2 
  },
  // ⚠️ السادس: لا حاسوب ولا كردية في العلمي والأدبي، لا فلسفة ولا اجتماع في الأدبي
  "سادس علمي": { 
    "اللغة العربية": 6, "اللغة الإنجليزية": 5, "الرياضيات": 5, 
    "الكيمياء": 4, "الفيزياء": 5, "الأحياء": 4, 
    "التربية الفنية": 1, "التربية الرياضية": 1 
  },
  "سادس أدبي": { 
    "اللغة العربية": 8, "اللغة الإنجليزية": 6, "الرياضيات": 4, 
    "التاريخ": 3, "الجغرافيا": 3, "الاقتصاد": 3, 
    "التربية الفنية": 1, "التربية الرياضية": 1 
  }
};

const daysList = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];
const lessonsList = ["د1", "د2", "د3", "د4", "د5", "د6", "د7"]; 
const classesNames = ["رابع أدبي", "رابع علمي", "خامس أدبي", "خامس علمي", "سادس أدبي", "سادس علمي"];
const sectionsList = ["أ", "ب", "ج", "د"];

const dayColorMap = {
  "الأحد": { bg: "#fff7ed", border: "#fb923c", text: "#9a3412" },
  "الاثنين": { bg: "#f0f9ff", border: "#38bdf8", text: "#0c4a6e" },
  "الثلاثاء": { bg: "#f0fdf4", border: "#4ade80", text: "#14532d" },
  "الأربعاء": { bg: "#fefce8", border: "#facc15", text: "#713f12" },
  "الخميس": { bg: "#fdf2f8", border: "#f472b6", text: "#831843" }
};

// ========================================================================
// توحيد المسافات
// ========================================================================
const getOfficialName = (name) => {
  if (!name) return "";
  // إزالة المسافات والأحرف الخاصة
  const t = name
    .toString()
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // إزالة المسافات والأحرف الخاصة
    .replace(/\s+/g, ' '); // توحيد المسافات
  
  const exactMatches = {
    "إسلامية": "التربية الإسلامية", 
    "اسلامية": "التربية الإسلامية",
    "التربية الاسلامية": "التربية الإسلامية", 
    "التربية الإسلامية": "التربية الإسلامية",
    "عربي": "اللغة العربية", 
    "عربية": "اللغة العربية",
    "اللغة العربية": "اللغة العربية",
    "اللغة الإنجليزية": "اللغة الإنجليزية", 
    "الاجازة": "اللغة الإنجليزية",
    "حاسوب": "الحاسوب", 
    "حاسبات": "الحاسوب", 
    "كمبيوتر": "الحاسوب",
    "computer": "الحاسوب", 
    "computers": "الحاسوب", 
    "حاسبة": "الحاسوب",
    "رياضيات": "الرياضيات",
    "فيزياء": "الفيزياء", 
    "كيمياء": "الكيمياء",
    "احياء": "الأحياء", 
    "أحياء": "الأحياء", 
    "الاحياء": "الأحياء", 
    "الأحياء": "الأحياء",
    "كردي": "اللغة الكردية", 
    "كردية": "اللغة الكردية", 
    "اللغة الكردية": "اللغة الكردية",
    "فنية": "التربية الفنية", 
    "فنيه": "التربية الفنية",
    "التربية الفنية": "التربية الفنية",
    "رياضة": "التربية الرياضية", 
    "رياضية": "التربية الرياضية", 
    "رياضيه": "التربية الرياضية",
    "التربية الرياضية": "التربية الرياضية",
    "تاريخ": "التاريخ", 
    "التاريخ": "التاريخ",
    "جغرافيا": "الجغرافيا", 
    "جغرافية": "الجغرافيا", 
    "الجغرافيا": "الجغرافيا",
    "اجتماع": "علم الاجتماع", 
    "علم الاجتماع": "علم الاجتماع",
    "اجتماعيات": "الاجتماعيات", 
    "الاجتماعيات": "الاجتماعيات",
    "مواد اجتماعية": "الاجتماعيات", 
    "مواد اجتماعيه": "الاجتماعيات",
    "علوم اجتماعية": "الاجتماعيات", 
    "علوم اجتماعيه": "الاجتماعيات",
    "الفلسفة": "الفلسفة",
    "الاقتصاد": "الاقتصاد",
    "جرائم": "جرائم حزب البعث", 
    "جرائم البعث": "جرائم حزب البعث",
    "جرائم حزب البعث": "جرائم حزب البعث", 
    "جرائم حزب": "جرائم حزب البعث"
  };
  
  if (exactMatches[t]) return exactMatches[t];
  // إذا كان الاسم موجود بالفعل في القائمة الرسمية أو لا يزال غير موحد
  if (ministerialOrder.includes(t)) return t;

  const compactT = t.replace(/\s+/g, '');
  const noSpaceMatch = ministerialOrder.find(
    (subject) => subject.replace(/\s+/g, '') === compactT
  );
  if (noSpaceMatch) return noSpaceMatch;

  // إذا لم يتم العثور على تطابق دقيق، أرجع الاسم الأصلي لتجنب التعيينات الخاطئة.
  return t;
};

const parseMultipleSubjects = (subjectString) => {
  if (!subjectString) return [];
  // إزالة المسافات والأحرف الخاصة
  const cleanString = subjectString
    .toString()
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // إزالة المسافات والأحرف الخاصة
    .replace(/\s+/g, ' '); // توحيد المسافات
  
  // قسم النص بفواصل أو " و " كأداة ربط، بدون أن تستطيع فصها.
  const normalizedSeparators = cleanString.replace(/\s+(?:\u0648|and)\s+/gi, ',');
  const parts = normalizedSeparators
    .split(/[,\u060C;\u061B/|+\r\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  const officialSubjects = [];
  for (let part of parts) {
    const official = getOfficialName(part);
    if (official === SOCIAL_STUDIES_SUBJECT) {
      officialSubjects.push(...SOCIAL_STUDIES_BUNDLE);
      continue;
    }
    // فقط أضف المواد التي تم توحيدها وتوجد بالضبط في القائمة الرسمية
    // لا تضف أي مادة غير معروفة أو خاصة
    if (ministerialOrder.includes(official)) {
      officialSubjects.push(official);
    }
  }
  return [...new Set(officialSubjects)];
};

// ========================================================================
// 4. دالة التحقق من صلاحية مادة للصف
// ========================================================================
const isSubjectValidForClass = (subject, className) => {
  // جرائم حزب البعث: فقط رابع أدبي.
  if (subject === "جرائم حزب البعث" && className !== "رابع أدبي") {
    return false;
  }

  // الخامس الأدبي: لا توجد مادة علم الاجتماع.
  if (className === "خامس أدبي" && subject === "علم الاجتماع") {
    return false;
  }

  // السادس الأدبي: لا فلسفة، لا اجتماع، لا حاسوب، لا كردية
  if (className === "سادس أدبي") {
    if (["الفلسفة", "علم الاجتماع", "الحاسوب", "اللغة الكردية"].includes(subject)) {
      return false;
    }
  }
  
  // السادس العلمي: لا حاسوب، لا كردية
  if (className === "سادس علمي") {
    if (["الحاسوب", "اللغة الكردية"].includes(subject)) {
      return false;
    }
  }
  
  // القواعد العامة
  const isSci = className.includes("علمي");
  if (isSci && ["التاريخ", "الجغرافيا", "علم الاجتماع", "الفلسفة", "الاقتصاد", "جرائم حزب البعث"].includes(subject)) {
    return false;
  }
  if (!isSci && ["الفيزياء", "الكيمياء", "الأحياء"].includes(subject)) {
    return false;
  }
  if (className === "رابع أدبي" && ["الفلسفة", "الاقتصاد"].includes(subject)) {
    return false;
  }
  
  return true;
};

const readStoredJson = (key, fallback) => {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const ATTENDANCE_WARNING_THRESHOLDS = [7, 14, 21, 26];
const MAX_ATTENDANCE_HISTORY_ENTRIES = 180;
const ATTENDANCE_STATUS_OPTIONS = [
  { code: "H", short: "ح", label: "حاضر", key: "presentDays", color: "#166534", bg: "#dcfce7", border: "#86efac" },
  { code: "M", short: "م", label: "إجازة", key: "leaveDays", color: "#92400e", bg: "#fef3c7", border: "#fcd34d" },
  { code: "R", short: "ر", label: "رخصة", key: "licenseDays", color: "#1d4ed8", bg: "#dbeafe", border: "#93c5fd" },
  { code: "G", short: "غ", label: "غائب", key: "absenceDays", color: "#b91c1c", bg: "#fee2e2", border: "#fca5a5" }
];
const ATTENDANCE_STATUS_LOOKUP = ATTENDANCE_STATUS_OPTIONS.reduce((acc, status) => {
  acc[status.code] = status;
  return acc;
}, {});
const ATTENDANCE_STATUS_VISIBLE = ATTENDANCE_STATUS_OPTIONS.filter((status) => status.code !== "H");
const ATTENDANCE_STATUS_VISUALS = {
  H: { color: "#166534", bg: "#dcfce7", border: "#86efac" },
  M: { color: "#1d4ed8", bg: "#dbeafe", border: "#93c5fd" },
  R: { color: "#a16207", bg: "#fef3c7", border: "#fcd34d" },
  G: { color: "#b91c1c", bg: "#fee2e2", border: "#fca5a5" }
};
const ATTENDANCE_WARNING_BUTTONS = [
  { key: "first", label: "إنذار أولي: ", color: "#1d4ed8", bg: "#dbeafe", border: "#93c5fd" },
  { key: "second", label: "إنذار ثاني", color: "#854d0e", bg: "#fef9c3", border: "#facc15" },
  { key: "final", label: "إنذار أخير", color: "#9a3412", bg: "#ffedd5", border: "#fdba74" },
  { key: "dismissal", label: "إنذار الفصل", color: "#b91c1c", bg: "#fee2e2", border: "#fca5a5" }
];

const normalizeAttendanceNumber = (value) => Math.max(0, Number(value) || 0);

const normalizeSectionName = (value) => {
  const raw = (value || "").toString().trim();
  if (!raw) return "";

  const compact = raw.replace(/[.\-_\s]+/g, "").toUpperCase();
  const sectionMap = {
    "A": "أ", "B": "ب", "C": "ج", "D": "د",
    "1": "أ", "2": "ب", "3": "ج", "4": "د",
    "١": "أ", "٢": "ب", "٣": "ج", "٤": "د",
    "ا": "أ", "أ": "أ", "ب": "ب", "ج": "ج", "د": "د"
  };

  return sectionMap[compact] || sectionMap[raw] || raw;
};

const normalizeKnownSectionName = (value) => {
  const normalized = normalizeSectionName(value);
  return sectionsList.includes(normalized) ? normalized : null;
};

const isIsoDateKey = (value) => /^\d{4}-\d{2}-\d{2}$/.test((value || "").toString().trim());

const parseIsoDateKey = (value) => {
  if (!isIsoDateKey(value)) return null;
  const [year, month, day] = value.split("-").map((part) => Number(part));
  const parsed = new Date(year, month - 1, day);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
};

const isWeekendDay = (dateObj) => {
  const day = dateObj.getDay();
  return day === 5 || day === 6;
};

const moveToNearestSchoolDay = (dateObj, direction = 1) => {
  const step = direction >= 0 ? 1 : -1;
  const next = new Date(dateObj);
  while (isWeekendDay(next)) {
    next.setDate(next.getDate() + step);
  }
  return next;
};

const getTodayDateKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatDateKeyForDisplay = (value) => {
  const parsed = parseIsoDateKey(value);
  if (!parsed) return value || "";
  return parsed.toLocaleDateString('ar-IQ', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatWeekdayForDisplay = (value) => {
  const parsed = parseIsoDateKey(value);
  if (!parsed) return "";
  return parsed.toLocaleDateString('ar-IQ', { weekday: 'long' });
};

const formatAttendanceAbsenceLabel = (entry) => {
  if (!entry) return "غير محدد";
  const dateKey = entry?.attendanceDateKey;
  if (isIsoDateKey(dateKey)) {
    const parsed = parseIsoDateKey(dateKey);
    if (parsed) {
      const weekday = parsed.toLocaleDateString('ar-IQ', { weekday: 'long' });
      const dateText = formatDateKeyForDisplay(dateKey);
      return weekday ? `${weekday} - ${dateText}` : dateText;
    }
  }
  return entry?.dateText || "غير محدد";
};

const normalizeHeaderText = (value) => (
  value
    .toString()
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ي0/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[^\u0621-\u064A0-9A-Za-z\s:]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
);

const detectClassNameFromHeader = (line) => {
  const normalized = normalizeHeaderText(line);
  const isFourth = /(الرابع|رابع)/.test(normalized);
  const isFifth = /(خامس)/.test(normalized);
  const isSixth = /(السادس|سادس)/.test(normalized);
  const isScientific = /(العلمي|علمي)/.test(normalized);
  const isLiterary = /(الادبي|ادبي)/.test(normalized);

  if (isFourth && isLiterary) return "رابع أدبي";
  if (isFourth && isScientific) return "رابع علمي";
  if (isFifth && isLiterary) return "خامس أدبي";
  if (isFifth && isScientific) return "خامس علمي";
  if (isSixth && isLiterary) return "سادس أدبي";
  if (isSixth && isScientific) return "سادس علمي";
  return null;
};

const normalizeClassName = (value) => {
  const raw = (value || "").toString().trim();
  if (!raw) return "";
  if (classesNames.includes(raw)) return raw;

  const detected = detectClassNameFromHeader(raw);
  if (detected) return detected;

  const normalized = normalizeHeaderText(raw);
  const isScientific = /(العلمي|علمي)/.test(normalized);
  const isLiterary = /(الادبي|ادبي)/.test(normalized);
  const hasFourth = /(4|الرابع|رابع)/.test(normalized);
  const hasFifth = /(5|خامس)/.test(normalized);
  const hasSixth = /(6|السادس|سادس)/.test(normalized);

  if (hasFourth && isLiterary) return "رابع أدبي";
  if (hasFourth && isScientific) return "رابع علمي";
  if (hasFifth && isLiterary) return "خامس أدبي";
  if (hasFifth && isScientific) return "خامس علمي";
  if (hasSixth && isLiterary) return "سادس أدبي";
  if (hasSixth && isScientific) return "سادس علمي";
  return "";
};

const _detectSectionFromHeader = (line) => {
  const rawLine = (line || "")
    .toString()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();

  if (!rawLine) return null;

  const normalized = normalizeHeaderText(rawLine);
  const hasSectionKeyword = /(?:الصف\s*و?\s*شعبة[هة]|شعبة[هة]|شعب[هة]|الاسم|section|sec)/i.test(rawLine);

  const directTokenPattern = /(?:الشعبة|شعبه|شعبة|الاسم|section|sec)\s*[:\s\-/]?\s*[({[]?\s*([A-Za-z\u0621-\u064A0-9])\s*[)\]}]?(?![A-Za-z\u0621-\u064A0-9])/i;
  const directRawMatch = rawLine.match(directTokenPattern);
  const directNormalizedMatch = normalized.match(directTokenPattern);
  const directToken = directRawMatch?.[1] || directNormalizedMatch?.[1] || "";
  const directSection = normalizeKnownSectionName(directToken);
  if (directSection) return directSection;

  if (hasSectionKeyword) {
    const contextAfterKeyword = rawLine.replace(
      /^.*?(?:الصف\s*و?\s*شعبة[هة]|شعبة[هة]|شعب[هة]|الاسم|section|sec)\s*[:\s\-/]?\s*/i,
      ""
    );
    const sectionContext = contextAfterKeyword.split(/(?:المادة|مادة|subject)/i)[0];
    const contextTailTokenMatch = sectionContext.match(/([A-Za-z\u0621-\u064A0-9])\s*[)\]}]?\s*$/);
    const contextTailSection = normalizeKnownSectionName(contextTailTokenMatch?.[1] || "");
    if (contextTailSection) return contextTailSection;
  }

  // نمط شائع في الملفات: "الصف والشعبة : السادس الادبي أ"
  if (hasSectionKeyword || detectClassNameFromHeader(rawLine)) {
    const tailTokenMatch = rawLine.match(/([A-Za-z\u0621-\u064A0-9])\s*[)\]}]?\s*$/);
    const tailSection = normalizeKnownSectionName(tailTokenMatch?.[1] || "");
    if (tailSection) return tailSection;
  }

  return null;
};

const _extractBestStudentName = (line) => {
  const cleanedLine = line
    .toString()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\u00A0/g, " ")
    .trim();

  if (!cleanedLine) return null;

  const ignoreTokens = [
    "اسم الطالب", "الصف", "الشعبة", "المادة", "الملاحظات",
    "الدرجة", "الفصل", "الامتحان", "السعي", "السنة",
    "سجل درجات", "اكتساب", "السادس", "الخامس", "الرابع"
  ];
  const normalizedLine = normalizeSearchText(cleanedLine);
  if (ignoreTokens.some((token) => normalizedLine.includes(normalizeSearchText(token)))) {
    return null;
  }

  const cells = cleanedLine.split(/\t+|\|/).map((cell) => cell.trim()).filter(Boolean);
  const sourceParts = cells.length > 0 ? cells : [cleanedLine];

  let bestCandidate = "";
  sourceParts.forEach((part) => {
    let candidate = part
      .replace(/^[\d\u0660-\u0669]+\s*[-.)/\\:]?\s*/g, "")
      .replace(/[^\u0600-\u06FF\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!candidate) return;
    const words = candidate.split(" ").filter(Boolean);
    if (words.length < 2) return;
    if (candidate.length > bestCandidate.length) {
      bestCandidate = candidate;
    }
  });

  return bestCandidate || null;
};

const buildAttendanceStudentKey = (student) => {
  const className = (student?.className || "").toString().trim();
  const section = normalizeSectionName(student?.section || "");
  const name = normalizeSearchText(student?.name || "");
  return `${className}|${section}|${name}`;
};

const normalizeAttendanceStudentRecord = (student, fallback = {}) => {
  const statusCode = ATTENDANCE_STATUS_LOOKUP[student?.dailyStatus] ? student.dailyStatus : "H";
  const normalizedHistory = Array.isArray(student?.attendanceHistory)
    ? student.attendanceHistory
        .filter(Boolean)
        .map((entry, index) => {
          const safeStatus = ATTENDANCE_STATUS_LOOKUP[entry?.statusCode] || ATTENDANCE_STATUS_LOOKUP.H;
          const action = entry?.action === "undo" ? "undo" : "apply";
          const parsedDate = new Date(entry?.timestamp || entry?.dateIso || Date.now());
          const safeDate = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
          const attendanceDateKey = isIsoDateKey(entry?.attendanceDateKey)
            ? entry.attendanceDateKey
            : (isIsoDateKey(entry?.dateIso) ? entry.dateIso : "");

          return {
            id: entry?.id || `${safeDate.getTime()}-${action}-${safeStatus.code}-${index}`,
            action,
            statusCode: safeStatus.code,
            statusLabel: safeStatus.label,
            note: entry?.note || "",
            timestamp: safeDate.toISOString(),
            attendanceDateKey,
            dateText: entry?.dateText || (attendanceDateKey ? formatDateKeyForDisplay(attendanceDateKey) : safeDate.toLocaleDateString('ar-IQ', { day: '2-digit', month: '2-digit', year: 'numeric' })),
            timeText: entry?.timeText || safeDate.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })
          };
        })
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, MAX_ATTENDANCE_HISTORY_ENTRIES)
    : [];

  const normalizedAttendanceByDate = (student?.attendanceByDate && typeof student.attendanceByDate === "object")
    ? Object.entries(student.attendanceByDate).reduce((acc, [dateKey, rawStatus]) => {
        if (!isIsoDateKey(dateKey)) return acc;
        const safeStatus = ATTENDANCE_STATUS_LOOKUP[rawStatus] ? rawStatus : "H";
        acc[dateKey] = safeStatus;
        return acc;
      }, {})
    : {};

  return {
    id: student?.id || Date.now() + Math.floor(Math.random() * 1000000),
    name: (student?.name || "").toString().trim(),
    className: (student?.className || fallback.className || classesNames[0]).toString().trim(),
    section: normalizeSectionName(student?.section || fallback.section || sectionsList[0]),
    presentDays: normalizeAttendanceNumber(student?.presentDays),
    leaveDays: normalizeAttendanceNumber(student?.leaveDays),
    licenseDays: normalizeAttendanceNumber(student?.licenseDays),
    absenceDays: normalizeAttendanceNumber(student?.absenceDays),
    dailyStatus: statusCode,
    licenseReasonDraft: (student?.licenseReasonDraft || "").toString(),
    attendanceHistory: normalizedHistory,
    attendanceByDate: normalizedAttendanceByDate
  };
};

const extractStudentsFromExcelRows = (rows) => {
  const parsedStudents = [];
  const seen = new Set();
  let skippedRows = 0;
  let missingName = 0;
  let missingClass = 0;
  let missingSection = 0;

  (Array.isArray(rows) ? rows : []).forEach((row) => {
    if (!row || typeof row !== "object") return;

    const rawName = getSheetValue(row, ["اسم الطالب", "اسم الطالب", "الطلاب: ", "الاسم", "اسم", "student name", "student", "name"]).toString().trim();
    const rawClass = getSheetValue(row, ["الصف", "المادة المختارة غير صالحة", "تسجيل الكادر التدريسي", "تسجيل الكادر التدريسي", "إدارة المدرسين", "الرابع", "class", "grade"]).toString().trim();
    const rawSection = getSheetValue(row, ["الشعبة", " | الشعب: ", "شعبة", "الاسم", "الفصل", "section", "sec"]).toString().trim();

    if (!rawName) {
      missingName += 1;
      skippedRows += 1;
      return;
    }

    const className = normalizeClassName(rawClass);
    const section = normalizeSectionName(rawSection);

    if (!className) {
      missingClass += 1;
      skippedRows += 1;
      return;
    }

    if (!section) {
      missingSection += 1;
      skippedRows += 1;
      return;
    }

    const item = { name: rawName, className, section };
    const key = buildAttendanceStudentKey(item);
    if (seen.has(key)) return;

    seen.add(key);
    parsedStudents.push(item);
  });

  return { parsedStudents, skippedRows, missingName, missingClass, missingSection };
};

const getAttendanceWarning = (absenceDays) => {
  const safeDays = normalizeAttendanceNumber(absenceDays);

  if (safeDays >= 26) {
    return {
      key: "dismissal",
      label: "إدارة الفصل",
      color: "#b91c1c",
      bg: "#fee2e2",
      border: "#fca5a5"
    };
  }
  if (safeDays >= 21) {
    return {
      key: "final",
      label: "الإنذار الأخير",
      color: "#9a3412",
      bg: "#ffedd5",
      border: "#fdba74"
    };
  }
  if (safeDays >= 14) {
    return {
      key: "second",
      label: "الإنذار الثاني",
      color: "#854d0e",
      bg: "#fef9c3",
      border: "#facc15"
    };
  }
  if (safeDays >= 7) {
    return {
      key: "first",
      label: "الإنذار الأولي",
      color: "#1d4ed8",
      bg: "#dbeafe",
      border: "#93c5fd"
    };
  }

  return {
    key: "regular",
    label: "منتظم",
    color: "#166534",
    bg: "#dcfce7",
    border: "#86efac"
  };
};

const getNextAttendanceThreshold = (absenceDays) => {
  const safeDays = normalizeAttendanceNumber(absenceDays);
  return ATTENDANCE_WARNING_THRESHOLDS.find((threshold) => safeDays < threshold) ?? null;
};

const getStudentStatusForDate = (student, attendanceDateKey) => {
  if (!isIsoDateKey(attendanceDateKey)) return "H";
  const statusCode = student?.attendanceByDate?.[attendanceDateKey];
  return ATTENDANCE_STATUS_LOOKUP[statusCode] ? statusCode : "H";
};

const hasAttendanceRecordForDate = (student, attendanceDateKey) => (
  !!(isIsoDateKey(attendanceDateKey) && Object.prototype.hasOwnProperty.call(student?.attendanceByDate || {}, attendanceDateKey))
);

const createAttendanceHistoryEntry = (statusCode, action = "apply", attendanceDateKey = "", note = "") => {
  const safeStatus = ATTENDANCE_STATUS_LOOKUP[statusCode] || ATTENDANCE_STATUS_LOOKUP.H;
  const safeAction = action === "undo" ? "undo" : "apply";
  const now = new Date();
  const effectiveDateKey = isIsoDateKey(attendanceDateKey) ? attendanceDateKey : "";
  const safeNote = (note || "").toString().trim();

  return {
    id: `${now.getTime()}-${Math.floor(Math.random() * 1000000)}-${safeStatus.code}`,
    action: safeAction,
    statusCode: safeStatus.code,
    statusLabel: safeStatus.label,
    note: safeNote,
    timestamp: now.toISOString(),
    attendanceDateKey: effectiveDateKey,
    dateText: effectiveDateKey ? formatDateKeyForDisplay(effectiveDateKey) : now.toLocaleDateString('ar-IQ', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    timeText: now.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })
  };
};

const getAttendanceActionLabel = (action) => (
  action === "undo" ? "تراجع" : "تثبيت"
);

const _getLatestAttendanceEvent = (student) => (
  Array.isArray(student?.attendanceHistory) && student.attendanceHistory.length > 0
    ? student.attendanceHistory[0]
    : null
);

const getLatestAbsenceEvent = (student) => (
  Array.isArray(student?.attendanceHistory)
    ? student.attendanceHistory.find((entry) => entry?.action === "apply" && entry?.statusCode === "G") || null
    : null
);

const getLatestStatusEvent = (student, statusCode) => (
  Array.isArray(student?.attendanceHistory)
    ? student.attendanceHistory.find((entry) => entry?.action === "apply" && entry?.statusCode === statusCode) || null
    : null
);

const getAttendanceStatusVisual = (statusCode) => (
  ATTENDANCE_STATUS_VISUALS[statusCode] || ATTENDANCE_STATUS_VISUALS.H
);

const getAttendanceNoteForDate = (student, attendanceDateKey, statusCode = "R") => (
  Array.isArray(student?.attendanceHistory)
    ? student.attendanceHistory.find((entry) =>
        entry?.action === "apply" &&
        entry?.statusCode === statusCode &&
        entry?.attendanceDateKey === attendanceDateKey &&
        entry?.note
      )?.note || ""
    : ""
);

const getAttendanceTimeForDate = (student, attendanceDateKey, statusCode = "R") => (
  Array.isArray(student?.attendanceHistory)
    ? student.attendanceHistory.find((entry) =>
        entry?.action === "apply" &&
        entry?.statusCode === statusCode &&
        entry?.attendanceDateKey === attendanceDateKey
      )?.timeText || ""
    : ""
);

const expandTeacherSubjects = (subjects = []) => {
  const expanded = [];
  subjects.forEach((rawSubject) => {
    const official = getOfficialName(rawSubject) || rawSubject;
    if (official === SOCIAL_STUDIES_SUBJECT) {
      expanded.push(...SOCIAL_STUDIES_BUNDLE);
      return;
    }
    if (ministerialOrder.includes(official)) {
      expanded.push(official);
    }
  });
  return [...new Set(expanded)];
};

const getTeacherSubjects = (teacher) => {
  const baseSubjects = teacher?.subjects?.length
    ? teacher.subjects
    : (teacher?.subject ? [teacher.subject] : []);
  return expandTeacherSubjects(baseSubjects);
};

const getUniqueTeacherClasses = (schedule = []) => {
  const classNames = schedule
    .map((lesson) => lesson?.class?.toString().trim())
    .filter(Boolean);
  return [...new Set(classNames)].sort((a, b) => a.localeCompare(b, 'ar'));
};

const formatTeacherClassList = (classes = []) => (
  classes.length ? classes.join('، ') : 'لا توجد حصص'
);

const getSubjectQuota = (className, subject) => {
  if (DEFAULT_QUOTAS_MAP[className] && DEFAULT_QUOTAS_MAP[className][subject] !== undefined) {
    return DEFAULT_QUOTAS_MAP[className][subject];
  }
  return DEFAULT_QUOTAS_MAP[subject] || 0;
};

const getCountConfigKey = (className, subject) => `${className}-${subject}`;
const getClassSubjectKey = (classId, subject) => `${classId}-${subject}`;
const getClassSubjectDayKey = (day, classId, subject) => `${day}-${classId}-${subject}`;
const getTeacherClassKey = (teacherId, classId) => `${teacherId}-${classId}`;
const getTeacherClassDayKey = (day, teacherId, classId) => `${day}-${teacherId}-${classId}`;
const getTeacherClassSubjectKey = (teacherId, classId, subject) => `${teacherId}-${classId}-${subject}`;
const getMaxDailySubjectLessons = (weeklyRequired) => {
  if (weeklyRequired <= 0) return 0;
  if (weeklyRequired === 1) return 1;
  return 2;
};

const _getConsecutiveStats = (lessonsIndexes) => {
  if (!lessonsIndexes?.length) {
    return { consecutivePairs: 0, longestStreak: 0 };
  }

  const sorted = [...new Set(lessonsIndexes)].sort((a, b) => a - b);
  let consecutivePairs = 0;
  let longestStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === sorted[i - 1] + 1) {
      consecutivePairs += 1;
      currentStreak += 1;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }

  return { consecutivePairs, longestStreak };
};

const getSheetValue = (row, keys) => {
  for (const key of keys) {
    const val = row[key];
    if (val !== undefined && val !== null && val !== '') return val;
  }

  const normalizedKeys = keys.map((key) => key.toString().trim().replace(/\s+/g, ' '));
  for (const [rawKey, val] of Object.entries(row)) {
    const normalizedRawKey = rawKey.toString().trim().replace(/\s+/g, ' ');
    if (normalizedKeys.includes(normalizedRawKey) && val !== undefined && val !== null && val !== '') {
      return val;
    }
  }

  return '';
};

const normalizeDayName = (value) => {
  if (!value) return '';

  const cleaned = value
    .toString()
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ');

  if (!cleaned) return '';
  if (daysList.includes(cleaned)) return cleaned;

  const key = cleaned
    .replace(/[أإآ]/g, 'ا')
    .replace(/ي0/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/\s+/g, '')
    .toLowerCase();

  const dayMap = {
    'الاحد': 'الأحد',
    'احد': 'الأحد',
    'الاثنين': 'الاثنين',
    'اثنين': 'الاثنين',
    'الثلاثاء': 'الثلاثاء',
    'ثلاثاء': 'الثلاثاء',
    'الاربعاء': 'الأربعاء',
    'اربعاء': 'الأربعاء',
    'الخميس': 'الخميس'
  };

  return dayMap[key] || '';
};

const DEFAULT_DAILY_LESSON_COUNT = 6;
const EXTENDED_DAILY_LESSON_COUNT = 7;
const EXTENDED_DAYS_FOR_FOURTH_AND_FIFTH = new Set(["الأحد", "الاثنين"]);
const EXTENDED_DAYS_FOR_SIXTH = new Set(["الأحد", "الاثنين", "الثلاثاء"]);

const getBaseDailyLessonLimitForClass = (className, day) => {
  const safeClassName = className?.toString().trim() || "";
  const safeDay = day?.toString().trim() || "";

  const isSixthGrade = safeClassName.includes("سادس");
  if (isSixthGrade && EXTENDED_DAYS_FOR_SIXTH.has(safeDay)) {
    return EXTENDED_DAILY_LESSON_COUNT;
  }

  const isFourthOrFifthGrade =
    safeClassName.includes("رابع") || safeClassName.includes("خامس");
  if (isFourthOrFifthGrade && EXTENDED_DAYS_FOR_FOURTH_AND_FIFTH.has(safeDay)) {
    return EXTENDED_DAILY_LESSON_COUNT;
  }

  return DEFAULT_DAILY_LESSON_COUNT;
};

const getMaxTeacherClassDailyLoad = (weeklyRequired, { aggressive = false, activeDays = daysList.length } = {}) => {
  const safeWeeklyRequired = Number(weeklyRequired) || 0;
  if (safeWeeklyRequired <= 0) return 1;

  const safeActiveDays = Math.max(1, Number(activeDays) || daysList.length);
  const baseLimit = Math.max(1, Math.ceil(safeWeeklyRequired / safeActiveDays));
  const practicalFloor = safeWeeklyRequired >= 4 ? 2 : 1;
  const relaxedLimit = aggressive ? baseLimit + 1 : Math.max(baseLimit, practicalFloor);
  return Math.max(1, Math.min(lessonsList.length, relaxedLimit));
};

const normalizeSearchText = (value) => {
  if (!value) return "";
  return value
    .toString()
    .trim()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ي0/g, "ي")
    .replace(/\s+/g, " ")
    .toLowerCase();
};

const hasPositiveLeaveFlag = (value) => {
  const normalized = normalizeSearchText(value);
  if (!normalized) return false;

  const compact = normalized.replace(/\s+/g, '');
  const normalizeFlag = (flag) => normalizeSearchText(flag).replace(/\s+/g, '');

  const negativeFlags = ['لا', 'لا يوجد', 'غير موجود', 'بدون', 'no', 'false', '0'];
  if (negativeFlags.some((flag) => compact === normalizeFlag(flag))) return false;

  const positiveFlags = ['يوجد', 'نعم', 'yes', 'true', '1', 'موجود'];
  return positiveFlags.some((flag) => {
    const normalizedFlag = normalizeFlag(flag);
    return compact === normalizedFlag || compact.startsWith(normalizedFlag);
  });
};

const buildSearchTokens = (query) => {
  const official = getOfficialName(query);
  const tokens = [query, official]
    .map((value) => normalizeSearchText(value))
    .filter(Boolean)
    .flatMap((value) => value.split(" ").filter(Boolean));
  return [...new Set(tokens)];
};

const getSubjectSortIndex = (subject) => {
  const official = getOfficialName(subject);
  const idx = ministerialOrder.indexOf(official);
  return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
};

const toSafeFileName = (value) => {
  const base = value?.toString().trim() || "teacher";
  return base.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, "-");
};

const hexToRgba = (hex, alpha = 1) => {
  const safeHex = (hex || "").toString().trim().replace("#", "");
  if (![3, 6].includes(safeHex.length)) return hex;

  const normalized = safeHex.length === 3
    ? safeHex.split("").map((char) => `${char}${char}`).join("")
    : safeHex;

  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);

  if ([r, g, b].some((value) => Number.isNaN(value))) return hex;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// ========================================================================
// 5. المكون الرئيسي
// ========================================================================
export default function App() {
  const [activeSystem, setActiveSystem] = useState('home');
  const [activeTab, setActiveTab] = useState('teachers');
  const [teachers, setTeachers] = useState(() => readStoredJson('teachers', []));
  const [classes, setClasses] = useState(() => readStoredJson('classes', [])); 
  const [assignments, setAssignments] = useState(() => readStoredJson('assignments', [])); 
  const [lessonCounts, setLessonCounts] = useState(() => readStoredJson('lessonCounts', {})); 
  const [showFinalTable, setShowFinalTable] = useState(false);
  const [showTeacherSchedule, setShowTeacherSchedule] = useState(false);
  const [studentScheduleMode, setStudentScheduleMode] = useState('teachers');
  const [errorMessage, setErrorMessage] = useState(""); 

  const [tName, setTName] = useState('');
  const [tRole, setTRole] = useState('مدرس');
  const [tSubject, setTSubject] = useState(""); 
  const [hasOffDay, setHasOffDay] = useState('no');
  const [tOffDay, setTOffDay] = useState('الأحد');
  const [selClass, setSelClass] = useState(classesNames[0]);
  const [selSection, setSelSection] = useState(sectionsList[0]);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const [teacherSearchInput, setTeacherSearchInput] = useState('');
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState(null);
  const [hoveredTeacherCardKey, setHoveredTeacherCardKey] = useState(null);
  const [editingTeacherId, setEditingTeacherId] = useState(null);
  const [attendanceStudents, setAttendanceStudents] = useState([]);
  const [attendanceStudentName, setAttendanceStudentName] = useState('');
  const [attendanceClassName, setAttendanceClassName] = useState(classesNames[0]);
  const [attendanceSection, setAttendanceSection] = useState(sectionsList[0]);
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [attendanceSelectedClass, setAttendanceSelectedClass] = useState(classesNames[0]);
  const [attendanceSelectedSection, setAttendanceSelectedSection] = useState('');
  const [attendanceSelectedDate, setAttendanceSelectedDate] = useState(getTodayDateKey);
  const [attendanceImportMessage, setAttendanceImportMessage] = useState('');
  const [attendanceDateMessage, setAttendanceDateMessage] = useState('');
  const [isAttendanceImporting, setIsAttendanceImporting] = useState(false);
  const [attendanceWarningFilter, setAttendanceWarningFilter] = useState(null);
  const [attendanceWarningStudentId, setAttendanceWarningStudentId] = useState(null);
  const [attendanceEditStudentId, setAttendanceEditStudentId] = useState(null);
  const [attendanceEditDrafts, setAttendanceEditDrafts] = useState({});
  // used for popping up a simple window showing why a license was recorded
  const [attendanceLicenseStudentId, setAttendanceLicenseStudentId] = useState(null);
  const [showAttendanceExcelInfo, setShowAttendanceExcelInfo] = useState(false);

  const studentScheduleRef = useRef(null);
  const teacherScheduleRef = useRef(null);
  const teacherDetailRef = useRef(null);

  const resetTeacherExplorerState = () => {
    setSelectedTeacherId(null);
    setTeacherSearchInput('');
    setTeacherSearchQuery('');
    setHoveredTeacherCardKey(null);
  };

  const closeTeacherScheduleExplorer = () => {
    setShowTeacherSchedule(false);
    resetTeacherExplorerState();
  };

  const openScheduleSystem = () => {
    closeTeacherScheduleExplorer();
    setShowFinalTable(false);
    setActiveSystem('schedule');
  };

  const openAttendanceSystem = () => {
    closeTeacherScheduleExplorer();
    setShowFinalTable(false);
    setActiveSystem('attendance');
  };

  const _openHomeSystem = () => {
    closeTeacherScheduleExplorer();
    setShowFinalTable(false);
    setActiveSystem('home');
  };

  const resetTeacherForm = () => {
    setTName('');
    setTRole('مدرس');
    setTSubject('');
    setHasOffDay('no');
    setTOffDay(daysList[0]);
    setEditingTeacherId(null);
  };

  const resetAttendanceForm = () => {
    setAttendanceStudentName('');
    setAttendanceClassName(attendanceSelectedClass || classesNames[0]);
    setAttendanceSection(attendanceSelectedSection || sectionsList[0]);
  };

  const buildDefaultAttendancePayloadForDate = (attendanceDateKey = attendanceSelectedDate) => {
    if (!isIsoDateKey(attendanceDateKey)) {
      return { presentDays: 0, attendanceByDate: {} };
    }

    return {
      presentDays: 1,
      attendanceByDate: { [attendanceDateKey]: "H" }
    };
  };

  const handleAddAttendanceStudent = () => {
    const safeName = attendanceStudentName.toString().trim();
    const safeClass = (attendanceClassName || attendanceSelectedClass || classesNames[0]).toString().trim();
    const safeSection = normalizeSectionName(attendanceSection || attendanceSelectedSection || sectionsList[0]);

    if (!safeName) {
      return setErrorMessage("الرجاء إدخال اسم الطالب");
    }

    const candidate = normalizeAttendanceStudentRecord({
      name: safeName,
      className: safeClass,
      section: safeSection,
      ...buildDefaultAttendancePayloadForDate(),
      dailyStatus: "H"
    });
    const candidateKey = buildAttendanceStudentKey(candidate);

    const duplicateExists = attendanceStudents.some((student) => buildAttendanceStudentKey(student) === candidateKey);

    if (duplicateExists) {
      return setErrorMessage("هذا الطالب مسجل مسبقاً في نفس الصف والشعبة");
    }

    setAttendanceStudents((prev) => [...prev, candidate]);
    setAttendanceSelectedClass(candidate.className);
    setAttendanceSelectedSection(candidate.section);
    setAttendanceImportMessage('');
    setAttendanceDateMessage('');
    resetAttendanceForm();
  };

  const updateAttendanceStudent = (studentId, updates) => {
    setAttendanceStudents((prev) =>
      prev.map((student) => {
        if (student.id !== studentId) return student;
        return normalizeAttendanceStudentRecord({ ...student, ...updates }, student);
      })
    );
  };

  // when license-status button is clicked, switch to R and open the reason input
  const handleLicenseClick = (student) => {
    if (!student) return;
    const alreadyLicense = student.dailyStatus === "R";
    updateAttendanceStudent(student.id, { dailyStatus: "R", licenseReasonDraft: student.licenseReasonDraft || "" });
    setAttendanceLicenseStudentId((prev) => (alreadyLicense && prev === student.id ? null : student.id));
  };

  const applyAttendanceDateForAllStudents = () => {
    if (!isIsoDateKey(attendanceSelectedDate)) {
      setErrorMessage("يرجى تحديد تاريخ صحيح أولاً.");
      return;
    }

    let addedStudentsCount = 0;
    setAttendanceStudents((prev) =>
      prev.map((student) => {
        if (hasAttendanceRecordForDate(student, attendanceSelectedDate)) return student;

        addedStudentsCount += 1;
        const nextAttendanceByDate = {
          ...(student.attendanceByDate || {}),
          [attendanceSelectedDate]: "H"
        };

        return normalizeAttendanceStudentRecord({
          ...student,
          presentDays: normalizeAttendanceNumber(student.presentDays) + 1,
          attendanceByDate: nextAttendanceByDate,
          dailyStatus: "H"
        }, student);
      })
    );

    const formattedDate = formatDateKeyForDisplay(attendanceSelectedDate);
    if (addedStudentsCount === 0) {
      setAttendanceDateMessage(`تاريخ ${formattedDate} مُعتمد مسبقاً لجميع الطلاب المسجلين.`);
    } else {
      setAttendanceDateMessage(`تم اعتماد تاريخ ${formattedDate} كحضور افتراضي لـ ${addedStudentsCount} طالب.`);
    }
  };

  const shiftAttendanceSelectedDate = (daysDelta) => {
    const baseDate = parseIsoDateKey(attendanceSelectedDate) || parseIsoDateKey(getTodayDateKey());
    if (!baseDate) return;
    const nextDate = new Date(baseDate);
    nextDate.setDate(nextDate.getDate() + Number(daysDelta || 0));
    const adjustedDate = moveToNearestSchoolDay(nextDate, daysDelta >= 0 ? 1 : -1);
    const year = adjustedDate.getFullYear();
    const month = `${adjustedDate.getMonth() + 1}`.padStart(2, "0");
    const day = `${adjustedDate.getDate()}`.padStart(2, "0");
    setAttendanceSelectedDate(`${year}-${month}-${day}`);
    setAttendanceDateMessage('');
  };

  const handleAttendanceDateChange = (event) => {
    const nextDate = event.target.value;
    const parsed = parseIsoDateKey(nextDate);
    if (!parsed) {
      setAttendanceSelectedDate(getTodayDateKey());
      setAttendanceDateMessage('');
      return;
    }
    const adjusted = moveToNearestSchoolDay(parsed, 1);
    const year = adjusted.getFullYear();
    const month = `${adjusted.getMonth() + 1}`.padStart(2, "0");
    const day = `${adjusted.getDate()}`.padStart(2, "0");
    setAttendanceSelectedDate(`${year}-${month}-${day}`);
    setAttendanceDateMessage('');
  };

  const applyDailyAttendanceStatus = (student) => {
    if (!isIsoDateKey(attendanceSelectedDate)) {
      setErrorMessage("يرجى تحديد تاريخ اليوم أولاً.");
      return;
    }

    setAttendanceStudents((prev) =>
      prev.map((currentStudent) => {
        if (currentStudent.id !== student.id) return currentStudent;

        const targetStatusCode = ATTENDANCE_STATUS_LOOKUP[currentStudent.dailyStatus] ? currentStudent.dailyStatus : "H";
        const targetStatus = ATTENDANCE_STATUS_LOOKUP[targetStatusCode] || ATTENDANCE_STATUS_LOOKUP.H;
        const previousStatusCode = getStudentStatusForDate(currentStudent, attendanceSelectedDate);
        const previousStatus = ATTENDANCE_STATUS_LOOKUP[previousStatusCode] || ATTENDANCE_STATUS_LOOKUP.H;
        const hadRecordForDate = hasAttendanceRecordForDate(currentStudent, attendanceSelectedDate);

        const nextAttendanceByDate = {
          ...(currentStudent.attendanceByDate || {}),
          [attendanceSelectedDate]: targetStatus.code
        };

        let nextPresent = normalizeAttendanceNumber(currentStudent.presentDays);
        let nextLeave = normalizeAttendanceNumber(currentStudent.leaveDays);
        let nextLicense = normalizeAttendanceNumber(currentStudent.licenseDays);
        let nextAbsence = normalizeAttendanceNumber(currentStudent.absenceDays);

        if (!hadRecordForDate) {
          if (targetStatus.key === "presentDays") nextPresent += 1;
          if (targetStatus.key === "leaveDays") nextLeave += 1;
          if (targetStatus.key === "licenseDays") nextLicense += 1;
          if (targetStatus.key === "absenceDays") nextAbsence += 1;
        } else if (previousStatus.code !== targetStatus.code) {
          if (previousStatus.key === "presentDays") nextPresent = Math.max(0, nextPresent - 1);
          if (previousStatus.key === "leaveDays") nextLeave = Math.max(0, nextLeave - 1);
          if (previousStatus.key === "licenseDays") nextLicense = Math.max(0, nextLicense - 1);
          if (previousStatus.key === "absenceDays") nextAbsence = Math.max(0, nextAbsence - 1);

          if (targetStatus.key === "presentDays") nextPresent += 1;
          if (targetStatus.key === "leaveDays") nextLeave += 1;
          if (targetStatus.key === "licenseDays") nextLicense += 1;
          if (targetStatus.key === "absenceDays") nextAbsence += 1;
        }

        const licenseNote = targetStatus.code === "R"
          ? (currentStudent.licenseReasonDraft || "").toString().trim()
          : "";
        const historyEntry = createAttendanceHistoryEntry(targetStatus.code, "apply", attendanceSelectedDate, licenseNote);
        const nextHistory = [
          historyEntry,
          ...(Array.isArray(currentStudent.attendanceHistory) ? currentStudent.attendanceHistory : [])
        ].slice(0, MAX_ATTENDANCE_HISTORY_ENTRIES);

        return normalizeAttendanceStudentRecord({
          ...currentStudent,
          presentDays: nextPresent,
          leaveDays: nextLeave,
          licenseDays: nextLicense,
          absenceDays: nextAbsence,
          attendanceByDate: nextAttendanceByDate,
          attendanceHistory: nextHistory,
          dailyStatus: targetStatus.code,
          licenseReasonDraft: ""
        }, currentStudent);
      })
    );
  };

  const applyAttendanceStatusForDate = (student, attendanceDateKey, statusCode, note = "") => {
    if (!isIsoDateKey(attendanceDateKey)) {
      setErrorMessage("يرجى تحديد تاريخ صحيح أولاً.");
      return;
    }

    setAttendanceStudents((prev) =>
      prev.map((currentStudent) => {
        if (currentStudent.id !== student.id) return currentStudent;

        const targetStatusCode = ATTENDANCE_STATUS_LOOKUP[statusCode] ? statusCode : "H";
        const targetStatus = ATTENDANCE_STATUS_LOOKUP[targetStatusCode] || ATTENDANCE_STATUS_LOOKUP.H;
        const previousStatusCode = getStudentStatusForDate(currentStudent, attendanceDateKey);
        const previousStatus = ATTENDANCE_STATUS_LOOKUP[previousStatusCode] || ATTENDANCE_STATUS_LOOKUP.H;
        const hadRecordForDate = hasAttendanceRecordForDate(currentStudent, attendanceDateKey);

        const nextAttendanceByDate = {
          ...(currentStudent.attendanceByDate || {}),
          [attendanceDateKey]: targetStatus.code
        };

        let nextPresent = normalizeAttendanceNumber(currentStudent.presentDays);
        let nextLeave = normalizeAttendanceNumber(currentStudent.leaveDays);
        let nextLicense = normalizeAttendanceNumber(currentStudent.licenseDays);
        let nextAbsence = normalizeAttendanceNumber(currentStudent.absenceDays);

        if (!hadRecordForDate) {
          if (targetStatus.key === "presentDays") nextPresent += 1;
          if (targetStatus.key === "leaveDays") nextLeave += 1;
          if (targetStatus.key === "licenseDays") nextLicense += 1;
          if (targetStatus.key === "absenceDays") nextAbsence += 1;
        } else if (previousStatus.code !== targetStatus.code) {
          if (previousStatus.key === "presentDays") nextPresent = Math.max(0, nextPresent - 1);
          if (previousStatus.key === "leaveDays") nextLeave = Math.max(0, nextLeave - 1);
          if (previousStatus.key === "licenseDays") nextLicense = Math.max(0, nextLicense - 1);
          if (previousStatus.key === "absenceDays") nextAbsence = Math.max(0, nextAbsence - 1);

          if (targetStatus.key === "presentDays") nextPresent += 1;
          if (targetStatus.key === "leaveDays") nextLeave += 1;
          if (targetStatus.key === "licenseDays") nextLicense += 1;
          if (targetStatus.key === "absenceDays") nextAbsence += 1;
        }

        const safeNote = targetStatus.code === "R" ? (note || "").toString().trim() : "";
        const historyEntry = createAttendanceHistoryEntry(targetStatus.code, "apply", attendanceDateKey, safeNote);
        const nextHistory = [
          historyEntry,
          ...(Array.isArray(currentStudent.attendanceHistory) ? currentStudent.attendanceHistory : [])
        ].slice(0, MAX_ATTENDANCE_HISTORY_ENTRIES);

        const shouldUpdateDailyStatus = attendanceDateKey === attendanceSelectedDate;

        return normalizeAttendanceStudentRecord({
          ...currentStudent,
          presentDays: nextPresent,
          leaveDays: nextLeave,
          licenseDays: nextLicense,
          absenceDays: nextAbsence,
          attendanceByDate: nextAttendanceByDate,
          attendanceHistory: nextHistory,
          dailyStatus: shouldUpdateDailyStatus ? targetStatus.code : currentStudent.dailyStatus
        }, currentStudent);
      })
    );
  };

  const handleAttendanceEditSave = (student, attendanceDateKey) => {
    if (!student || !isIsoDateKey(attendanceDateKey)) return;
    const draft = attendanceEditDrafts[attendanceDateKey] || {};
    const nextStatusCode = ATTENDANCE_STATUS_LOOKUP[draft.statusCode]
      ? draft.statusCode
      : getStudentStatusForDate(student, attendanceDateKey);
    const note = nextStatusCode === "R"
      ? ((draft.note ?? getAttendanceNoteForDate(student, attendanceDateKey, "R")) || "").toString().trim()
      : "";

    applyAttendanceStatusForDate(student, attendanceDateKey, nextStatusCode, note);
    setAttendanceEditDrafts((prev) => {
      const next = { ...prev };
      delete next[attendanceDateKey];
      return next;
    });
  };

  const undoDailyAttendanceStatus = (student) => {
    if (!isIsoDateKey(attendanceSelectedDate)) {
      setErrorMessage("يرجى تحديد تاريخ اليوم أولاً.");
      return;
    }

    setAttendanceStudents((prev) =>
      prev.map((currentStudent) => {
        if (currentStudent.id !== student.id) return currentStudent;

        if (!hasAttendanceRecordForDate(currentStudent, attendanceSelectedDate)) {
          return currentStudent;
        }

        const previousStatusCode = getStudentStatusForDate(currentStudent, attendanceSelectedDate);
        const previousStatus = ATTENDANCE_STATUS_LOOKUP[previousStatusCode] || ATTENDANCE_STATUS_LOOKUP.H;

        const nextAttendanceByDate = {
          ...(currentStudent.attendanceByDate || {}),
          [attendanceSelectedDate]: "H"
        };

        let nextPresent = normalizeAttendanceNumber(currentStudent.presentDays);
        let nextLeave = normalizeAttendanceNumber(currentStudent.leaveDays);
        let nextLicense = normalizeAttendanceNumber(currentStudent.licenseDays);
        let nextAbsence = normalizeAttendanceNumber(currentStudent.absenceDays);

        if (previousStatus.code !== "H") {
          if (previousStatus.key === "leaveDays") nextLeave = Math.max(0, nextLeave - 1);
          if (previousStatus.key === "licenseDays") nextLicense = Math.max(0, nextLicense - 1);
          if (previousStatus.key === "absenceDays") nextAbsence = Math.max(0, nextAbsence - 1);
          if (previousStatus.key === "presentDays") nextPresent = Math.max(0, nextPresent - 1);
          nextPresent += 1;
        }

        const historyEntry = createAttendanceHistoryEntry("H", "undo", attendanceSelectedDate);
        const nextHistory = [
          historyEntry,
          ...(Array.isArray(currentStudent.attendanceHistory) ? currentStudent.attendanceHistory : [])
        ].slice(0, MAX_ATTENDANCE_HISTORY_ENTRIES);

        return normalizeAttendanceStudentRecord({
          ...currentStudent,
          presentDays: nextPresent,
          leaveDays: nextLeave,
          licenseDays: nextLicense,
          absenceDays: nextAbsence,
          attendanceByDate: nextAttendanceByDate,
          attendanceHistory: nextHistory,
          dailyStatus: "H",
          licenseReasonDraft: ""
        }, currentStudent);
      })
    );
  };

  const handleAttendanceExcelUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
      return setErrorMessage("يرجى اختيار ملف Excel بصيغة .xlsx أو .xls أو .csv");
    }

    setIsAttendanceImporting(true);
    setAttendanceImportMessage('');
    setAttendanceDateMessage('');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
      const { parsedStudents, skippedRows } = extractStudentsFromExcelRows(rows);

      if (parsedStudents.length === 0) {
        return setErrorMessage("لم يتم العثور على أسماء طلاب واضحة داخل ملف Excel. تأكد أن الجدول يحتوي اسم الطالب مع الصف والشعبة.");
      }

      const importedSectionGroups = new Set(
        parsedStudents.map((student) => `${student.className}|${normalizeSectionName(student.section)}`)
      );

      let addedCount = 0;
      setAttendanceStudents((prev) => {
        const next = [...prev];
        const existingKeys = new Set(prev.map((student) => buildAttendanceStudentKey(student)));

        parsedStudents.forEach((student) => {
          const normalizedStudent = normalizeAttendanceStudentRecord({
            ...student,
            id: Date.now() + Math.floor(Math.random() * 1000000),
            ...buildDefaultAttendancePayloadForDate(),
            dailyStatus: "H"
          });
          const key = buildAttendanceStudentKey(normalizedStudent);
          if (existingKeys.has(key)) return;

          existingKeys.add(key);
          next.push(normalizedStudent);
          addedCount += 1;
        });

        return next;
      });

      const firstImported = parsedStudents[0];
      if (firstImported) {
        const importedClass = firstImported.className || classesNames[0];
        const importedSection = normalizeSectionName(firstImported.section || sectionsList[0]);
        setAttendanceSelectedClass(importedClass);
        setAttendanceSelectedSection(importedSection);
        setAttendanceClassName(importedClass);
        setAttendanceSection(importedSection);
      }

      if (addedCount === 0) {
        setAttendanceImportMessage('الملف تم قراءته ولكن كل الأسماء موجودة مسبقاً.');
      } else {
        const skippedNote = skippedRows > 0 ? `تم استيراد ${skippedRows} | جميع الطلاب يُسجلون حضوراً افتراضياً بعد الضغط على "اعتماد التاريخ لجميع الصفوف"، ثم عدّل فقط حالات الإجازة/الرخصة/الغياب. يتم حفظ وقت الجهاز الفعلي عند كل تثبيت/تراجع.` : '';
      setAttendanceImportMessage(`تم استيراد ${addedCount} طالب بنجاح وتوزيعهم على ${importedSectionGroups.size} صف/شعبة من ملف Excel.${skippedNote}`);
      }
    } catch (error) {
      console.error('Excel import error:', error);
      setErrorMessage("❌ خطأ في قراءة ملف الإكسل. تأكد من صحة التنسيق.");
    } finally {
      setIsAttendanceImporting(false);
    }
  };

  const _removeAttendanceStudent = (studentId) => {
    setAttendanceStudents((prev) => prev.filter((student) => student.id !== studentId));
  };

  const handleSaveTeacher = () => {
    const safeName = tName.toString().trim();
    if (!safeName || !tSubject) {
      return setErrorMessage("الرجاء إدخال الاسم والمادة");
    }

    const selectedSubjects = expandTeacherSubjects([tSubject]);
    if (selectedSubjects.length === 0) {
      return setErrorMessage("المادة المختارة غير صالحة");
    }

    const teacherPayload = {
      name: safeName,
      role: tRole,
      subjects: selectedSubjects,
      subjectsDisplay: selectedSubjects.join(", "),
      subject: selectedSubjects[0],
      offDay: hasOffDay === 'yes' ? tOffDay : 'لا يوجد'
    };

    if (editingTeacherId) {
      setTeachers((prev) =>
        prev.map((teacher) =>
          teacher.id === editingTeacherId
            ? { ...teacher, ...teacherPayload }
            : teacher
        )
      );

      setAssignments((prev) =>
        prev.filter((assignment) => {
          if (assignment.tId !== editingTeacherId) return true;
          const normalizedSubject = getOfficialName(assignment.subject);
          return selectedSubjects.includes(normalizedSubject);
        })
      );
    } else {
      setTeachers((prev) => [
        ...prev,
        {
          id: Date.now(),
          ...teacherPayload
        }
      ]);
    }

    resetTeacherForm();
  };

  const startTeacherEdit = (teacher) => {
    const teacherSubjects = getTeacherSubjects(teacher);
    const normalizedOffDay = normalizeDayName(teacher.offDay);

    setEditingTeacherId(teacher.id);
    setTName(teacher.name || '');
    setTRole(teacher.role || 'مدرس');
    setTSubject(teacherSubjects[0] || teacher.subject || '');
    setHasOffDay(normalizedOffDay ? 'yes' : 'no');
    setTOffDay(normalizedOffDay || daysList[0]);
  };

  const availableSections = sectionsList.filter(s => 
    !classes.some(c => c.name === selClass && c.section === s)
  );
  const effectiveSelSection = availableSections.includes(selSection)
    ? selSection
    : (availableSections[0] || "");

  const classDailyLessonPlan = useMemo(() => {
    const plan = new Map();

    classes.forEach((classInfo) => {
      const dayCapacities = daysList.map((day) => getBaseDailyLessonLimitForClass(classInfo.name, day));
      const totalCapacity = dayCapacities.reduce((sum, count) => sum + count, 0);
      const totalRequired = ministerialOrder.reduce((sum, subject) => {
        if (!isSubjectValidForClass(subject, classInfo.name)) return sum;
        const configuredCount =
          lessonCounts[getCountConfigKey(classInfo.name, subject)] ?? getSubjectQuota(classInfo.name, subject);
        return sum + Math.max(0, Number(configuredCount) || 0);
      }, 0);

      let remainingLessons = Math.max(0, Math.min(totalRequired, totalCapacity));

      daysList.forEach((day, dayIndex) => {
        const dayCapacity = dayCapacities[dayIndex] || 0;
        const remainingCapWithToday = dayCapacities
          .slice(dayIndex)
          .reduce((sum, count) => sum + count, 0);
        const remainingFutureCapacity = dayCapacities
          .slice(dayIndex + 1)
          .reduce((sum, count) => sum + count, 0);
        const minTodayNeeded = Math.max(0, remainingLessons - remainingFutureCapacity);
        const balancedTarget = Math.ceil(remainingLessons / Math.max(daysList.length - dayIndex, 1));
        const weightedTarget = Math.ceil(
          (remainingLessons * dayCapacity) / Math.max(remainingCapWithToday, 1)
        );
        const plannedLessons = Math.min(
          dayCapacity,
          Math.max(minTodayNeeded, Math.max(balancedTarget, weightedTarget))
        );

        plan.set(`${classInfo.id}|${day}`, plannedLessons);
        remainingLessons = Math.max(0, remainingLessons - plannedLessons);
      });
    });

    return plan;
  }, [classes, lessonCounts]);

  const getPlannedDailyLessonLimitForClass = (classInfo, day) => {
    const classId = classInfo?.id;
    const className = classInfo?.name || classInfo?.toString?.().trim() || "";
    const plannedById =
      classId !== undefined && classId !== null
        ? classDailyLessonPlan.get(`${classId}|${day}`)
        : undefined;

    if (plannedById !== undefined) return plannedById;

    const matchingClass = className
      ? classes.find((item) => item.name === className)
      : null;
    if (matchingClass) {
      const matchingPlan = classDailyLessonPlan.get(`${matchingClass.id}|${day}`);
      if (matchingPlan !== undefined) return matchingPlan;
    }

    return getBaseDailyLessonLimitForClass(className, day);
  };

  const getPlannedDailyLessonLimitForDay = (classItems = [], day) => {
    const maxForDay = classItems.reduce(
      (maxCount, classInfo) =>
        Math.max(maxCount, getPlannedDailyLessonLimitForClass(classInfo, day)),
      0
    );

    return Math.max(0, Math.min(lessonsList.length, maxForDay));
  };

  const isPlannedLessonEnabledForClassDay = (classInfo, day, lessonIndex) =>
    lessonIndex < getPlannedDailyLessonLimitForClass(classInfo, day);

  useEffect(() => {
    localStorage.setItem('teachers', JSON.stringify(teachers));
  }, [teachers]);

  useEffect(() => {
    localStorage.setItem('classes', JSON.stringify(classes));
  }, [classes]);

  useEffect(() => {
    localStorage.setItem('assignments', JSON.stringify(assignments));
  }, [assignments]);

  useEffect(() => {
    localStorage.setItem('lessonCounts', JSON.stringify(lessonCounts));
  }, [lessonCounts]);

  useEffect(() => {
    localStorage.removeItem('attendanceStudents');
  }, []);

  const attendanceClassesOverview = useMemo(() => (
    classesNames.map((className) => {
      const studentsInClass = attendanceStudents.filter((student) => student.className === className);
      const sections = [...new Set(studentsInClass.map((student) => normalizeSectionName(student.section)).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'ar'));
      return {
        className,
        studentsCount: studentsInClass.length,
        sections,
        sectionsCount: sections.length
      };
    })
  ), [attendanceStudents]);

  const attendanceSectionsForSelectedClass = useMemo(() => {
    const sections = [...new Set(
      attendanceStudents
        .filter((student) => student.className === attendanceSelectedClass)
        .map((student) => normalizeSectionName(student.section))
        .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b, 'ar'));

    return sections;
  }, [attendanceStudents, attendanceSelectedClass]);

  useEffect(() => {
    if (!attendanceStudents.length) return;

    const classExists = attendanceStudents.some((student) => student.className === attendanceSelectedClass);
    if (classExists) return;

    const firstClassWithStudents = classesNames.find((className) =>
      attendanceStudents.some((student) => student.className === className)
    );

    if (firstClassWithStudents) {
      setAttendanceSelectedClass(firstClassWithStudents);
      setAttendanceClassName(firstClassWithStudents);
    }
  }, [attendanceStudents, attendanceSelectedClass]);

  useEffect(() => {
    if (attendanceClassName !== attendanceSelectedClass) {
      setAttendanceClassName(attendanceSelectedClass || classesNames[0]);
    }
  }, [attendanceSelectedClass, attendanceClassName]);

  useEffect(() => {
    if (attendanceSectionsForSelectedClass.length === 0) {
      if (attendanceSelectedSection) {
        setAttendanceSelectedSection('');
      }
      return;
    }

    if (!attendanceSectionsForSelectedClass.includes(attendanceSelectedSection)) {
      const nextSection = attendanceSectionsForSelectedClass[0];
      setAttendanceSelectedSection(nextSection);
      setAttendanceSection(nextSection);
    }
  }, [attendanceSectionsForSelectedClass, attendanceSelectedSection]);

  useEffect(() => {
    if (!isIsoDateKey(attendanceSelectedDate)) return;

    setAttendanceStudents((prev) =>
      prev.map((student) => {
        const statusForDate = getStudentStatusForDate(student, attendanceSelectedDate);
        if (statusForDate === student.dailyStatus) return student;
        return normalizeAttendanceStudentRecord({ ...student, dailyStatus: statusForDate }, student);
      })
    );
  }, [attendanceSelectedDate]);

  const attendanceStudentsInSelectedSection = useMemo(() => {
    const normalizedQuery = normalizeSearchText(attendanceSearch);
    const primaryQuery = normalizedQuery ? normalizedQuery.split(' ')[0] : '';

    return attendanceStudents
      .filter((student) => {
        const inClass = student.className === attendanceSelectedClass;
        const inSection = attendanceSelectedSection
          ? normalizeSectionName(student.section) === attendanceSelectedSection
          : true;
        const matchesSearch = primaryQuery
          ? (() => {
            const normalizedName = normalizeSearchText(student.name || '');
            const firstName = normalizedName.split(' ')[0] || '';
            return firstName.startsWith(primaryQuery);
          })()
          : true;

        return inClass && inSection && matchesSearch;
      });
  }, [attendanceStudents, attendanceSelectedClass, attendanceSelectedSection, attendanceSearch]);

  const attendanceStats = useMemo(() => {
    const summary = {
      totalStudents: attendanceStudents.length,
      totalPresentDays: 0,
      totalLeaveDays: 0,
      totalLicenseDays: 0,
      totalAbsenceDays: 0,
      daily: {
        present: 0,
        leave: 0,
        license: 0,
        absence: 0,
        recorded: 0
      },
      warningCounts: {
        regular: 0,
        first: 0,
        second: 0,
        final: 0,
        dismissal: 0
      }
    };

    attendanceStudents.forEach((student) => {
      const safePresent = normalizeAttendanceNumber(student.presentDays);
      const safeLeave = normalizeAttendanceNumber(student.leaveDays);
      const safeLicense = normalizeAttendanceNumber(student.licenseDays);
      const safeAbsence = normalizeAttendanceNumber(student.absenceDays);
      const warning = getAttendanceWarning(safeAbsence);

      summary.totalPresentDays += safePresent;
      summary.totalLeaveDays += safeLeave;
      summary.totalLicenseDays += safeLicense;
      summary.totalAbsenceDays += safeAbsence;
      summary.warningCounts[warning.key] = (summary.warningCounts[warning.key] || 0) + 1;

      if (isIsoDateKey(attendanceSelectedDate) && hasAttendanceRecordForDate(student, attendanceSelectedDate)) {
        const statusCode = getStudentStatusForDate(student, attendanceSelectedDate);
        if (statusCode === "H") summary.daily.present += 1;
        if (statusCode === "M") summary.daily.leave += 1;
        if (statusCode === "R") summary.daily.license += 1;
        if (statusCode === "G") summary.daily.absence += 1;
        summary.daily.recorded += 1;
      }
    });

    return summary;
  }, [attendanceStudents, attendanceSelectedDate]);

  const attendanceWarningRoster = useMemo(() => {
    const roster = {
      first: [],
      second: [],
      final: [],
      dismissal: []
    };

    attendanceStudents.forEach((student) => {
      const safeAbsence = normalizeAttendanceNumber(student.absenceDays);
      const warning = getAttendanceWarning(safeAbsence);
      if (!roster[warning.key]) return;

      const latestAbsence = getLatestAbsenceEvent(student);
      roster[warning.key].push({
        id: student.id,
        name: student.name || 'بدون اسم',
        className: student.className || '',
        section: student.section || '',
        absenceLabel: formatAttendanceAbsenceLabel(latestAbsence),
        absenceDays: safeAbsence
      });
    });

    return roster;
  }, [attendanceStudents]);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const dataArray = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(dataArray, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);

        const newTeachers = [];

        for (let idx = 0; idx < rows.length; idx++) {
          const item = rows[idx];
          const rawName = getSheetValue(item, ["اسم المدرس", "الاسم"]).toString().trim();
          // إزالة المسافات والأحرف الخاصة
          const rawSubject = getSheetValue(item, ["الاختصاص", "المادة"])
            .toString()
            .trim()
            .replace(/[\u200B-\u200D\uFEFF]/g, '') // إزالة المسافات والأحرف الخاصة
            .replace(/\s+/g, ' ');
          const rawRole = getSheetValue(item, ["المنصب"]).toString().trim() || "مدرس";
          const rawLeaveFlag = getSheetValue(item, ["الإجازة", "الاجازة", "إجازة", "اجازة"]).toString().trim();
          const rawOffDay = getSheetValue(item, ["اليوم", "يوم"]).toString().trim();
          const normalizedOffDay = normalizeDayName(rawOffDay);
          const hasConfiguredOffDay = hasPositiveLeaveFlag(rawLeaveFlag) || Boolean(normalizedOffDay);

          if (!rawName || rawName === 'nan') continue;

          const subjects = parseMultipleSubjects(rawSubject);
          
          // تخطي المدرسين الذين لم يتم التعرف على اختصاصهم
          if (subjects.length === 0) {
            console.warn(`⚠️ لم يتم التعرف على اختصاص المدرس: ${rawName} (${rawSubject})`);
            continue;
          }

          newTeachers.push({
            id: Date.now() + idx + Math.random() * 1000,
            name: rawName,
            subjects: subjects,
            subjectsDisplay: subjects.join(", "),
            subject: subjects[0] || '',
            role: rawRole,
            offDay: hasConfiguredOffDay && normalizedOffDay ? normalizedOffDay : "لا يوجد"
          });

          if (hasConfiguredOffDay && !normalizedOffDay) {
            console.warn(`⚠️ المدرس ${rawName} لديه إجازة بدون يوم صالح في عمود اليوم.`);
          }
        }

        setTeachers(prev => [...prev, ...newTeachers]);

        if (newTeachers.length === 0) {
          setErrorMessage("⚠️ لم يتم العثور على مدرسين بتخصصات معروفة. تحقق من ملف الإكسل.");
        } else {
          // رسالة نجاح مع معلومات توضيحية
          setErrorMessage(`✅ تم استيراد ${newTeachers.length} مدرس بنجاح!`);
          setTimeout(() => setErrorMessage(""), 3000);
        }

      } catch (err) {
        console.error("❌ خطأ في قراءة الملف:", err);
        setErrorMessage("❌ خطأ في قراءة ملف الإكسل. تأكد من صحة التنسيق.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const shouldBuildSchedule = showFinalTable || showTeacherSchedule;

  // ========================================================================
  // خوارزمية التوزيع المحسوبة (بدون تضارب + احترام الإجازات + تفضيل الاستراحة)
  // ========================================================================
  const finalScheduleData = useMemo(() => {
    if (!shouldBuildSchedule) return [];

    const teacherById = new Map(teachers.map((t) => [t.id, t]));
    const classById = new Map(classes.map((c) => [c.id, c]));
    const assignmentsByClass = new Map();
    const teacherAssignments = new Map();
    const teacherClassIds = new Map();
    const teacherActiveDaysMap = new Map();
    const remainingCounts = {};
    const remainingTeacherLinkCounts = {};
    const teacherTargetWeeklyLoad = {};
    const teacherDailyCapMap = {};
    const classSubjectLessonsByDay = {};
    const teacherLessonsByDay = {};
    const teacherClassLessonsByDay = {};
    const teacherWeeklyLoad = {};
    const teacherClassWeeklyLoad = {};
    const result = [];
    const normalizedAssignmentMap = new Map();

    assignments.forEach((assignment) => {
      const classInfo = classById.get(assignment.cId);
      const teacher = teacherById.get(assignment.tId);
      const subject = getOfficialName(assignment.subject);

      if (!classInfo || !teacher || !subject) return;
      if (!isSubjectValidForClass(subject, classInfo.name)) return;

      // ضمان ربط واحد فقط في صف/شعبة + مادة.
      normalizedAssignmentMap.set(getClassSubjectKey(classInfo.id, subject), {
        ...assignment,
        subject
      });
    });

    const normalizedAssignments = Array.from(normalizedAssignmentMap.values());

    classes.forEach((c) => {
      assignmentsByClass.set(
        c.id,
        normalizedAssignments.filter((a) => a.cId === c.id)
      );

      ministerialOrder.forEach((subject) => {
        if (!isSubjectValidForClass(subject, c.name)) return;
        const configKey = getCountConfigKey(c.name, subject);
        const key = getClassSubjectKey(c.id, subject);
        remainingCounts[key] = lessonCounts[configKey] ?? getSubjectQuota(c.name, subject);
        daysList.forEach((day) => {
          classSubjectLessonsByDay[getClassSubjectDayKey(day, c.id, subject)] = 0;
        });
      });
    });

    normalizedAssignments.forEach((a) => {
      const classInfo = classById.get(a.cId);
      if (!classInfo) return;

      if (!teacherAssignments.has(a.tId)) teacherAssignments.set(a.tId, []);
      teacherAssignments.get(a.tId).push(a);

      if (!teacherClassIds.has(a.tId)) teacherClassIds.set(a.tId, new Set());
      teacherClassIds.get(a.tId).add(a.cId);

      const teacherLinkKey = getTeacherClassSubjectKey(a.tId, a.cId, a.subject);
      remainingTeacherLinkCounts[teacherLinkKey] =
        lessonCounts[getCountConfigKey(classInfo.name, a.subject)] ?? getSubjectQuota(classInfo.name, a.subject);
      teacherTargetWeeklyLoad[a.tId] =
        (teacherTargetWeeklyLoad[a.tId] || 0) + (remainingTeacherLinkCounts[teacherLinkKey] || 0);
    });

    teachers.forEach((t) => {
      const normalizedOffDay = normalizeDayName(t.offDay);
      const activeDays = daysList.filter((day) => day !== normalizedOffDay);
      teacherActiveDaysMap.set(t.id, activeDays.length ? activeDays : [...daysList]);
      teacherWeeklyLoad[t.id] = 0;
      daysList.forEach((day) => {
        teacherLessonsByDay[`${day}-${t.id}`] = [];
      });
    });

    teachers.forEach((t) => {
      const activeDays = teacherActiveDaysMap.get(t.id) || daysList;
      const totalTargetLoad = teacherTargetWeeklyLoad[t.id] || 0;

      if (totalTargetLoad <= 0) {
        teacherDailyCapMap[t.id] = lessonsList.length;
        return;
      }

      const baseCap = Math.ceil(totalTargetLoad / Math.max(activeDays.length, 1));
      const capBuffer = activeDays.length <= 4 ? 2 : 1;
      teacherDailyCapMap[t.id] = Math.min(lessonsList.length, Math.max(1, baseCap + capBuffer));
    });

    const shouldForceTeacherDayCoverage = (teacherId) => {
      const activeDays = teacherActiveDaysMap.get(teacherId) || daysList;
      const targetLoad = teacherTargetWeeklyLoad[teacherId] || 0;
      return targetLoad >= activeDays.length;
    };

    const hasUncoveredWorkDay = (teacherId) => {
      const activeDays = teacherActiveDaysMap.get(teacherId) || daysList;
      return activeDays.some((activeDay) => (teacherLessonsByDay[`${activeDay}-${teacherId}`] || []).length === 0);
    };

    const getTeacherDayCoverageCap = (teacherId, { aggressive = false } = {}) => {
      if (aggressive) return lessonsList.length;
      const activeDays = teacherActiveDaysMap.get(teacherId) || daysList;
      const targetLoad = teacherTargetWeeklyLoad[teacherId] || 0;
      if (targetLoad <= activeDays.length) return 1;
      return Math.min(lessonsList.length, Math.max(1, Math.ceil(targetLoad / Math.max(activeDays.length, 1))));
    };

    const estimateTeacherPendingLoad = (teacherId) => {
      const links = teacherAssignments.get(teacherId) || [];
      let total = 0;

      links.forEach((link) => {
        const key = getTeacherClassSubjectKey(teacherId, link.cId, link.subject);
        total += remainingTeacherLinkCounts[key] || 0;
      });

      return total;
    };

    daysList.forEach((day, dayIndex) => {
      const dayLessons = lessonsList.slice(0, getPlannedDailyLessonLimitForDay(classes, day));
      dayLessons.forEach((lesson, lessonIndex) => {
        const busyTeachersInSlot = new Set();
        const rotationIndex =
          classes.length > 0
            ? (dayIndex * dayLessons.length + lessonIndex) % classes.length
            : 0;
        const rotatedClasses =
          classes.length > 0
            ? [...classes.slice(rotationIndex), ...classes.slice(0, rotationIndex)]
            : [];

        rotatedClasses.forEach((c, classIndex) => {
          if (!isPlannedLessonEnabledForClassDay(c, day, lessonIndex)) return;
          const classLinks = assignmentsByClass.get(c.id) || [];
          const candidates = [];

          classLinks.forEach((link, linkIndex) => {
            const teacher = teacherById.get(link.tId);
            if (!teacher) return;
            const teacherOffDay = normalizeDayName(teacher.offDay);
            if (teacherOffDay === day) return;
            if (busyTeachersInSlot.has(teacher.id)) return;

            const quotaKey = getClassSubjectKey(c.id, link.subject);
            const remainingNeed = remainingCounts[quotaKey] || 0;
            if (remainingNeed <= 0) return;

            const teacherQuotaKey = getTeacherClassSubjectKey(link.tId, c.id, link.subject);
            const teacherRemainingNeed = remainingTeacherLinkCounts[teacherQuotaKey] || 0;
            if (teacherRemainingNeed <= 0) return;

            const requiredWeeklyLessons =
              lessonCounts[getCountConfigKey(c.name, link.subject)] ?? getSubjectQuota(c.name, link.subject);
            const classSubjectDayKey = getClassSubjectDayKey(day, c.id, link.subject);
            const classSubjectDayLoad = classSubjectLessonsByDay[classSubjectDayKey] || 0;
            if (classSubjectDayLoad >= getMaxDailySubjectLessons(requiredWeeklyLessons)) return;

            const dayKey = `${day}-${teacher.id}`;
            const todayLessons = teacherLessonsByDay[dayKey] || [];
            const activeTeacherDays = teacherActiveDaysMap.get(teacher.id) || daysList;
            const dayCoverageCap = getTeacherDayCoverageCap(teacher.id);
            if (
              shouldForceTeacherDayCoverage(teacher.id) &&
              todayLessons.length >= dayCoverageCap &&
              hasUncoveredWorkDay(teacher.id)
            ) {
              return;
            }
            const teacherDailyCap = teacherDailyCapMap[teacher.id] || lessonsList.length;
            if (todayLessons.length >= teacherDailyCap) return;
            const teacherClassDayKey = getTeacherClassDayKey(day, teacher.id, c.id);
            const teacherClassTodayLoad = teacherClassLessonsByDay[teacherClassDayKey] || 0;
            const maxTeacherClassDaily = getMaxTeacherClassDailyLoad(requiredWeeklyLessons, {
              activeDays: activeTeacherDays.length
            });
            if (teacherClassTodayLoad >= maxTeacherClassDaily) return;

            const dailyLoad = todayLessons.length;
            const weeklyLoad = teacherWeeklyLoad[teacher.id] || 0;
            const pendingLoad = estimateTeacherPendingLoad(teacher.id);
            const activeDayLoads = activeTeacherDays.map(
              (activeDay) => (teacherLessonsByDay[`${activeDay}-${teacher.id}`] || []).length
            );
            const minActiveDayLoad = activeDayLoads.length ? Math.min(...activeDayLoads) : 0;
            const maxActiveDayLoad = activeDayLoads.length ? Math.max(...activeDayLoads) : 0;
            const dayLoadGapFromMin = dailyLoad - minActiveDayLoad;
            const unusedActiveDaysCount = activeDayLoads.filter((load) => load === 0).length;
            const activeDaysCount = Math.max(activeTeacherDays.length, 1);
            const estimatedTotalWeeklyLoad = weeklyLoad + pendingLoad;
            const targetPerDay = estimatedTotalWeeklyLoad / activeDaysCount;
            const projectedDayOverflow = Math.max(0, (dailyLoad + 1) - Math.ceil(targetPerDay));
            const distributionPenalty =
              dayLoadGapFromMin * 20 +
              projectedDayOverflow * 24 +
              Math.max(0, dailyLoad - 1) * 6 +
              Math.max(0, maxActiveDayLoad - minActiveDayLoad - 1) * 4;
            const emptyDayPenalty = unusedActiveDaysCount > 0 && dailyLoad > minActiveDayLoad ? 16 : 0;
            const newDayBonus = dailyLoad === 0 ? 28 : 0;
            const teacherClassKey = getTeacherClassKey(teacher.id, c.id);
            const teacherClassLoad = teacherClassWeeklyLoad[teacherClassKey] || 0;
            const linkedClassIds = teacherClassIds.get(teacher.id);
            const linkedClassCount = linkedClassIds?.size || 1;
            const minTeacherClassLoad = linkedClassIds?.size
              ? Math.min(
                  ...Array.from(linkedClassIds).map(
                    (classId) => teacherClassWeeklyLoad[getTeacherClassKey(teacher.id, classId)] || 0
                  )
                )
              : 0;
            const classLoadGap = teacherClassLoad - minTeacherClassLoad;
            let sameClassFocusPenalty = teacherClassTodayLoad * 22;
            if (linkedClassCount > 1) {
              sameClassFocusPenalty += teacherClassLoad * 2.5 + classLoadGap * 7;
            }

            const score =
              dailyLoad * 4 +
              weeklyLoad * 1.5 +
              classSubjectDayLoad * 18 +
              sameClassFocusPenalty +
              distributionPenalty +
              emptyDayPenalty -
              remainingNeed * 5 -
              teacherRemainingNeed * 6 -
              newDayBonus -
              Math.min(pendingLoad, 12) * 0.6 +
              dayIndex * 0.2 +
              classIndex * 0.1 +
              linkIndex * 0.05;

            candidates.push({
              teacher,
              link,
              quotaKey,
              teacherQuotaKey,
              classSubjectDayKey,
              teacherClassDayKey,
              teacherClassKey,
              score
            });
          });

          candidates.sort((a, b) => a.score - b.score);

          let assigned = null;
          const bestCandidate = candidates[0];

          if (bestCandidate) {
            const dayKey = `${day}-${bestCandidate.teacher.id}`;
            teacherLessonsByDay[dayKey].push(lessonIndex);
            teacherWeeklyLoad[bestCandidate.teacher.id] =
              (teacherWeeklyLoad[bestCandidate.teacher.id] || 0) + 1;
            classSubjectLessonsByDay[bestCandidate.classSubjectDayKey] =
              (classSubjectLessonsByDay[bestCandidate.classSubjectDayKey] || 0) + 1;
            teacherClassLessonsByDay[bestCandidate.teacherClassDayKey] =
              (teacherClassLessonsByDay[bestCandidate.teacherClassDayKey] || 0) + 1;
            teacherClassWeeklyLoad[bestCandidate.teacherClassKey] =
              (teacherClassWeeklyLoad[bestCandidate.teacherClassKey] || 0) + 1;
            busyTeachersInSlot.add(bestCandidate.teacher.id);
            remainingCounts[bestCandidate.quotaKey] -= 1;
            remainingTeacherLinkCounts[bestCandidate.teacherQuotaKey] -= 1;

            assigned = {
              id: bestCandidate.teacher.id,
              name: bestCandidate.teacher.name,
              role: bestCandidate.teacher.role,
              subject: bestCandidate.link.subject
            };
          }

          result.push({
            day,
            lesson,
            classId: c.id,
            teacher: assigned,
            assignmentMode: assigned ? 'initial' : 'empty',
            autoExpanded: false
          });
        });
      });
    });

    const resultIndexByKey = new Map();
    result.forEach((entry, index) => {
      resultIndexByKey.set(`${entry.day}|${entry.lesson}|${entry.classId}`, index);
    });

    const hasSchedulableRemainingNeeds = () =>
      normalizedAssignments.some((link) => {
        const classQuotaKey = getClassSubjectKey(link.cId, link.subject);
        const teacherQuotaKey = getTeacherClassSubjectKey(link.tId, link.cId, link.subject);
        return (remainingCounts[classQuotaKey] || 0) > 0 && (remainingTeacherLinkCounts[teacherQuotaKey] || 0) > 0;
      });

    const fillUnassignedSlots = ({ aggressive = false } = {}) => {
      let assignmentsDone = 0;
      const slotTeacherMap = new Map();

      result.forEach((entry) => {
        if (!entry.teacher) return;
        const slotKey = `${entry.day}-${entry.lesson}`;
        if (!slotTeacherMap.has(slotKey)) slotTeacherMap.set(slotKey, new Set());
        slotTeacherMap.get(slotKey).add(entry.teacher.id);
      });

      daysList.forEach((day, dayIndex) => {
        const dayLessons = lessonsList.slice(0, getPlannedDailyLessonLimitForDay(classes, day));
        dayLessons.forEach((lesson, lessonIndex) => {
          const slotKey = `${day}-${lesson}`;
          const busyTeachersInSlot = slotTeacherMap.get(slotKey) || new Set();

          classes.forEach((c, classIndex) => {
            if (!isPlannedLessonEnabledForClassDay(c, day, lessonIndex)) return;
            const entryKey = `${day}|${lesson}|${c.id}`;
            const entryIndex = resultIndexByKey.get(entryKey);
            if (entryIndex === undefined) return;
            if (result[entryIndex].teacher) return;

            const classLinks = assignmentsByClass.get(c.id) || [];
            const candidates = [];

            classLinks.forEach((link, linkIndex) => {
              const teacher = teacherById.get(link.tId);
              if (!teacher) return;

              const teacherOffDay = normalizeDayName(teacher.offDay);
              if (teacherOffDay === day) return;
              if (busyTeachersInSlot.has(teacher.id)) return;

              const quotaKey = getClassSubjectKey(c.id, link.subject);
              const remainingNeed = remainingCounts[quotaKey] || 0;
              if (remainingNeed <= 0) return;

              const teacherQuotaKey = getTeacherClassSubjectKey(link.tId, c.id, link.subject);
              const teacherRemainingNeed = remainingTeacherLinkCounts[teacherQuotaKey] || 0;
              if (teacherRemainingNeed <= 0) return;

              const requiredWeeklyLessons =
                lessonCounts[getCountConfigKey(c.name, link.subject)] ?? getSubjectQuota(c.name, link.subject);
              const classSubjectDayKey = getClassSubjectDayKey(day, c.id, link.subject);
              const classSubjectDayLoad = classSubjectLessonsByDay[classSubjectDayKey] || 0;
              const allowedDailySubjectLoad = aggressive
                ? Math.max(3, getMaxDailySubjectLessons(requiredWeeklyLessons) + 1)
                : getMaxDailySubjectLessons(requiredWeeklyLessons) + 1;
              if (classSubjectDayLoad >= allowedDailySubjectLoad) return;

              const dayKey = `${day}-${teacher.id}`;
              const todayLessons = teacherLessonsByDay[dayKey] || [];
              const activeTeacherDays = teacherActiveDaysMap.get(teacher.id) || daysList;
              const dayCoverageCap = getTeacherDayCoverageCap(teacher.id, { aggressive });
              if (
                shouldForceTeacherDayCoverage(teacher.id) &&
                todayLessons.length >= dayCoverageCap &&
                hasUncoveredWorkDay(teacher.id)
              ) {
                return;
              }
              const teacherDailyCap = teacherDailyCapMap[teacher.id] || lessonsList.length;
              const allowedDailyCap = aggressive
                ? lessonsList.length
                : Math.min(lessonsList.length, teacherDailyCap + 1);
              if (todayLessons.length >= allowedDailyCap) return;
              const teacherClassDayKey = getTeacherClassDayKey(day, teacher.id, c.id);
              const teacherClassTodayLoad = teacherClassLessonsByDay[teacherClassDayKey] || 0;
              const maxTeacherClassDaily = getMaxTeacherClassDailyLoad(requiredWeeklyLessons, {
                aggressive,
                activeDays: activeTeacherDays.length
              });
              if (teacherClassTodayLoad >= maxTeacherClassDaily) return;

              const dailyLoad = todayLessons.length;
              const weeklyLoad = teacherWeeklyLoad[teacher.id] || 0;
              const pendingLoad = estimateTeacherPendingLoad(teacher.id);
              const activeDayLoads = activeTeacherDays.map(
                (activeDay) => (teacherLessonsByDay[`${activeDay}-${teacher.id}`] || []).length
              );
              const minActiveDayLoad = activeDayLoads.length ? Math.min(...activeDayLoads) : 0;
              const dayLoadGapFromMin = dailyLoad - minActiveDayLoad;
              const unusedActiveDaysCount = activeDayLoads.filter((load) => load === 0).length;
              const distributionPenalty =
                dayLoadGapFromMin * (aggressive ? 10 : 16) +
                Math.max(0, dailyLoad - 1) * (aggressive ? 4 : 8);
              const emptyDayPenalty = unusedActiveDaysCount > 0 && dailyLoad > minActiveDayLoad
                ? (aggressive ? 6 : 12)
                : 0;
              const newDayBonus = dailyLoad === 0 ? (aggressive ? 10 : 18) : 0;
              const teacherClassKey = getTeacherClassKey(teacher.id, c.id);
              const teacherClassLoad = teacherClassWeeklyLoad[teacherClassKey] || 0;
              const sameClassFocusPenalty = teacherClassTodayLoad * (aggressive ? 8 : 14) + teacherClassLoad * 1.2;

              const score =
                dailyLoad * (aggressive ? 2.4 : 3.5) +
                weeklyLoad * (aggressive ? 0.9 : 1.25) +
                classSubjectDayLoad * (aggressive ? 7 : 13) +
                sameClassFocusPenalty +
                distributionPenalty +
                emptyDayPenalty -
                remainingNeed * (aggressive ? 13 : 10) -
                teacherRemainingNeed * (aggressive ? 13 : 10) -
                newDayBonus -
                Math.min(pendingLoad, 14) * 0.5 +
                dayIndex * 0.12 +
                classIndex * 0.08 +
                linkIndex * 0.05;

              candidates.push({
                teacher,
                link,
                quotaKey,
                teacherQuotaKey,
                classSubjectDayKey,
                teacherClassDayKey,
                teacherClassKey,
                score
              });
            });

            candidates.sort((a, b) => a.score - b.score);
            const bestCandidate = candidates[0];
            if (!bestCandidate) return;

            const dayKey = `${day}-${bestCandidate.teacher.id}`;
            teacherLessonsByDay[dayKey].push(lessonIndex);
            teacherWeeklyLoad[bestCandidate.teacher.id] =
              (teacherWeeklyLoad[bestCandidate.teacher.id] || 0) + 1;
            classSubjectLessonsByDay[bestCandidate.classSubjectDayKey] =
              (classSubjectLessonsByDay[bestCandidate.classSubjectDayKey] || 0) + 1;
            teacherClassLessonsByDay[bestCandidate.teacherClassDayKey] =
              (teacherClassLessonsByDay[bestCandidate.teacherClassDayKey] || 0) + 1;
            teacherClassWeeklyLoad[bestCandidate.teacherClassKey] =
              (teacherClassWeeklyLoad[bestCandidate.teacherClassKey] || 0) + 1;
            remainingCounts[bestCandidate.quotaKey] = Math.max(
              0,
              (remainingCounts[bestCandidate.quotaKey] || 0) - 1
            );
            remainingTeacherLinkCounts[bestCandidate.teacherQuotaKey] = Math.max(
              0,
              (remainingTeacherLinkCounts[bestCandidate.teacherQuotaKey] || 0) - 1
            );

            if (!slotTeacherMap.has(slotKey)) slotTeacherMap.set(slotKey, new Set());
            slotTeacherMap.get(slotKey).add(bestCandidate.teacher.id);
            busyTeachersInSlot.add(bestCandidate.teacher.id);

            result[entryIndex] = {
              ...result[entryIndex],
              assignmentMode: aggressive ? 'fill-aggressive' : 'fill',
              teacher: {
                id: bestCandidate.teacher.id,
                name: bestCandidate.teacher.name,
                role: bestCandidate.teacher.role,
                subject: bestCandidate.link.subject
              }
            };
            assignmentsDone += 1;
          });
        });
      });

      return assignmentsDone;
    };

    const repairUnmetLessons = () => {
      let assignmentsDone = 0;
      const slotTeacherMap = new Map();

      result.forEach((entry) => {
        if (!entry.teacher) return;
        const slotKey = `${entry.day}-${entry.lesson}`;
        if (!slotTeacherMap.has(slotKey)) slotTeacherMap.set(slotKey, new Set());
        slotTeacherMap.get(slotKey).add(entry.teacher.id);
      });

      const unmetLinks = normalizedAssignments
        .map((link) => {
          const classInfo = classById.get(link.cId);
          const quotaKey = getClassSubjectKey(link.cId, link.subject);
          const teacherQuotaKey = getTeacherClassSubjectKey(link.tId, link.cId, link.subject);
          return {
            link,
            classInfo,
            quotaKey,
            teacherQuotaKey,
            remainingNeed: remainingCounts[quotaKey] || 0,
            teacherRemainingNeed: remainingTeacherLinkCounts[teacherQuotaKey] || 0
          };
        })
        .filter((item) => item.classInfo && item.remainingNeed > 0 && item.teacherRemainingNeed > 0)
        .sort((a, b) => {
          const needDiff = b.remainingNeed - a.remainingNeed;
          if (needDiff !== 0) return needDiff;
          return (a.classInfo.name || "").localeCompare(b.classInfo.name || "", "ar");
        });

      unmetLinks.forEach((item) => {
        const { link, classInfo, quotaKey, teacherQuotaKey } = item;
        const teacher = teacherById.get(link.tId);
        if (!teacher) return;

        while ((remainingCounts[quotaKey] || 0) > 0 && (remainingTeacherLinkCounts[teacherQuotaKey] || 0) > 0) {
          const requiredWeeklyLessons =
            lessonCounts[getCountConfigKey(classInfo.name, link.subject)] ?? getSubjectQuota(classInfo.name, link.subject);
          const activeTeacherDays = teacherActiveDaysMap.get(teacher.id) || daysList;
          const candidates = [];

          daysList.forEach((day, dayIndex) => {
            if (normalizeDayName(teacher.offDay) === day) return;

            const dayKey = `${day}-${teacher.id}`;
            const todayLessons = teacherLessonsByDay[dayKey] || [];
            if (todayLessons.length >= lessonsList.length) return;

            const classSubjectDayKey = getClassSubjectDayKey(day, classInfo.id, link.subject);
            const classSubjectDayLoad = classSubjectLessonsByDay[classSubjectDayKey] || 0;
            const repairDailySubjectCap = Math.max(3, getMaxDailySubjectLessons(requiredWeeklyLessons) + 2);
            if (classSubjectDayLoad >= repairDailySubjectCap) return;

            const teacherClassDayKey = getTeacherClassDayKey(day, teacher.id, classInfo.id);
            const teacherClassTodayLoad = teacherClassLessonsByDay[teacherClassDayKey] || 0;
            const repairTeacherClassCap = Math.max(
              3,
              getMaxTeacherClassDailyLoad(requiredWeeklyLessons, {
                aggressive: true,
                activeDays: activeTeacherDays.length
              }) + 1
            );
            if (teacherClassTodayLoad >= repairTeacherClassCap) return;

            const plannedDayLimit = getPlannedDailyLessonLimitForClass(classInfo, day);
            const baseDayLimit = getBaseDailyLessonLimitForClass(classInfo.name, day);

            for (let lessonIndex = 0; lessonIndex < baseDayLimit; lessonIndex += 1) {
              const lesson = lessonsList[lessonIndex];
              const slotKey = `${day}-${lesson}`;
              const busyTeachersInSlot = slotTeacherMap.get(slotKey) || new Set();
              if (busyTeachersInSlot.has(teacher.id)) continue;

              const entryKey = `${day}|${lesson}|${classInfo.id}`;
              const entryIndex = resultIndexByKey.get(entryKey);
              const existingEntry = entryIndex !== undefined ? result[entryIndex] : null;
              if (existingEntry?.teacher) continue;

              const isExpansion = lessonIndex >= plannedDayLimit;
              const score =
                (isExpansion ? 24 : 0) +
                (entryIndex === undefined ? 8 : 0) +
                todayLessons.length * 3.2 +
                teacherClassTodayLoad * 4 +
                classSubjectDayLoad * 7 +
                lessonIndex * 0.45 +
                dayIndex * 0.25;

              candidates.push({
                entryIndex,
                day,
                lesson,
                lessonIndex,
                score,
                isExpansion,
                classSubjectDayKey,
                teacherClassDayKey,
                quotaKey,
                teacherQuotaKey,
                teacherClassKey: getTeacherClassKey(teacher.id, classInfo.id)
              });
            }
          });

          candidates.sort((a, b) => a.score - b.score);
          const bestCandidate = candidates[0];
          if (!bestCandidate) break;

          let entryIndex = bestCandidate.entryIndex;
          if (entryIndex === undefined) {
            result.push({
              day: bestCandidate.day,
              lesson: bestCandidate.lesson,
              classId: classInfo.id,
              teacher: null,
              autoExpanded: bestCandidate.isExpansion
            });
            entryIndex = result.length - 1;
            resultIndexByKey.set(`${bestCandidate.day}|${bestCandidate.lesson}|${classInfo.id}`, entryIndex);
          }

          const slotKey = `${bestCandidate.day}-${bestCandidate.lesson}`;
          if (!slotTeacherMap.has(slotKey)) slotTeacherMap.set(slotKey, new Set());
          slotTeacherMap.get(slotKey).add(teacher.id);

          const dayKey = `${bestCandidate.day}-${teacher.id}`;
          teacherLessonsByDay[dayKey].push(bestCandidate.lessonIndex);
          teacherWeeklyLoad[teacher.id] = (teacherWeeklyLoad[teacher.id] || 0) + 1;
          classSubjectLessonsByDay[bestCandidate.classSubjectDayKey] =
            (classSubjectLessonsByDay[bestCandidate.classSubjectDayKey] || 0) + 1;
          teacherClassLessonsByDay[bestCandidate.teacherClassDayKey] =
            (teacherClassLessonsByDay[bestCandidate.teacherClassDayKey] || 0) + 1;
          teacherClassWeeklyLoad[bestCandidate.teacherClassKey] =
            (teacherClassWeeklyLoad[bestCandidate.teacherClassKey] || 0) + 1;
          remainingCounts[bestCandidate.quotaKey] = Math.max(0, (remainingCounts[bestCandidate.quotaKey] || 0) - 1);
          remainingTeacherLinkCounts[bestCandidate.teacherQuotaKey] = Math.max(
            0,
            (remainingTeacherLinkCounts[bestCandidate.teacherQuotaKey] || 0) - 1
          );

          result[entryIndex] = {
            ...result[entryIndex],
            autoExpanded: result[entryIndex]?.autoExpanded || bestCandidate.isExpansion,
            assignmentMode: 'repair',
            teacher: {
              id: teacher.id,
              name: teacher.name,
              role: teacher.role,
              subject: link.subject
            }
          };

          assignmentsDone += 1;
        }
      });

      return assignmentsDone;
    };

    for (let i = 0; i < 3 && hasSchedulableRemainingNeeds(); i++) {
      const progress = fillUnassignedSlots({ aggressive: false });
      if (progress === 0) break;
    }

    if (hasSchedulableRemainingNeeds()) {
      for (let i = 0; i < 4 && hasSchedulableRemainingNeeds(); i++) {
        const progress = fillUnassignedSlots({ aggressive: true });
        if (progress === 0) break;
      }
    }

    if (hasSchedulableRemainingNeeds()) {
      for (let i = 0; i < 4 && hasSchedulableRemainingNeeds(); i++) {
        const progress = repairUnmetLessons();
        if (progress === 0) break;
      }
    }

    // حاجز آمن صارم: يمنع أي مدرس من الظهور في أكثر من صف بنفس الوقت.
    const strictTeacherSlotMap = new Set();
    let clearedConflictAssignments = 0;
    result.forEach((entry) => {
      if (!entry.teacher) return;
      const key = `${entry.day}|${entry.lesson}|${entry.teacher.id}`;
      if (strictTeacherSlotMap.has(key)) {
        entry.teacher = null;
        clearedConflictAssignments += 1;
        return;
      }
      strictTeacherSlotMap.add(key);
    });

    if (clearedConflictAssignments > 0 && hasSchedulableRemainingNeeds()) {
      repairUnmetLessons();
    }

    return result;
  }, [shouldBuildSchedule, classes, teachers, assignments, lessonCounts]);

  const finalClassDayLessonPlan = useMemo(() => {
    const plan = new Map(classDailyLessonPlan);

    finalScheduleData.forEach((entry) => {
      const lessonIndex = lessonsList.indexOf(entry.lesson);
      if (lessonIndex === -1) return;
      const planKey = `${entry.classId}|${entry.day}`;
      plan.set(planKey, Math.max(plan.get(planKey) || 0, lessonIndex + 1));
    });

    return plan;
  }, [classDailyLessonPlan, finalScheduleData]);

  const getDailyLessonLimitForClass = (classInfo, day) => {
    const classId = classInfo?.id;
    const className = classInfo?.name || classInfo?.toString?.().trim() || "";
    const plannedById =
      classId !== undefined && classId !== null
        ? finalClassDayLessonPlan.get(`${classId}|${day}`)
        : undefined;

    if (plannedById !== undefined) return plannedById;

    const matchingClass = className
      ? classes.find((item) => item.name === className)
      : null;
    if (matchingClass) {
      const matchingPlan = finalClassDayLessonPlan.get(`${matchingClass.id}|${day}`);
      if (matchingPlan !== undefined) return matchingPlan;
    }

    return getBaseDailyLessonLimitForClass(className, day);
  };

  const getDailyLessonLimitForDay = (classItems = [], day) => {
    const maxForDay = classItems.reduce(
      (maxCount, classInfo) =>
        Math.max(maxCount, getDailyLessonLimitForClass(classInfo, day)),
      0
    );

    return Math.max(0, Math.min(lessonsList.length, maxForDay));
  };

  const isLessonEnabledForClassDay = (classInfo, day, lessonIndex) =>
    lessonIndex < getDailyLessonLimitForClass(classInfo, day);

  const scheduleLookup = useMemo(() => {
    const map = new Map();
    finalScheduleData.forEach((entry) => {
      map.set(`${entry.day}|${entry.lesson}|${entry.classId}`, entry);
    });
    return map;
  }, [finalScheduleData]);

  // ========================================================================
  // توليد جدول المدرسين
  // ========================================================================
  const teacherSchedules = useMemo(() => {
    const schedules = {};
    const classById = new Map(classes.map((c) => [c.id, c]));

    teachers.forEach((t) => {
      schedules[t.id] = {
        teacher: t,
        schedule: [],
        countsPerDay: {}
      };
    });

    finalScheduleData.forEach((entry) => {
      if (!entry.teacher) return;

      const classInfo = classById.get(entry.classId);
      const teacherSchedule = schedules[entry.teacher.id];
      if (!teacherSchedule || !classInfo) return;

      teacherSchedule.schedule.push({
        day: entry.day,
        lesson: entry.lesson,
        class: `${classInfo.name} (${classInfo.section})`,
        subject: entry.teacher.subject
      });

      teacherSchedule.countsPerDay[entry.day] =
        (teacherSchedule.countsPerDay[entry.day] || 0) + 1;
    });

    Object.values(schedules).forEach((item) => {
      item.schedule.sort((a, b) => {
        const dayDiff = daysList.indexOf(a.day) - daysList.indexOf(b.day);
        if (dayDiff !== 0) return dayDiff;
        return lessonsList.indexOf(a.lesson) - lessonsList.indexOf(b.lesson);
      });
    });

    return schedules;
  }, [teachers, classes, finalScheduleData]);

  const selectedTeacherDetails = useMemo(() => {
    if (!selectedTeacherId) return null;
    return teacherSchedules[selectedTeacherId] || null;
  }, [selectedTeacherId, teacherSchedules]);

  const teacherCardsBySubject = useMemo(() => {
    const tokens = buildSearchTokens(teacherSearchQuery);
    const hasQuery = tokens.length > 0;
    const grouped = new Map();

    Object.values(teacherSchedules).forEach((item) => {
      const subjects = getTeacherSubjects(item.teacher);
      const effectiveSubjects = subjects.length ? subjects : [item.teacher.subject || 'غير محدد'];
      const teacherNameCandidate = normalizeSearchText(item.teacher.name);
      const teacherNameMatches = hasQuery
        ? tokens.every((token) => teacherNameCandidate.includes(token))
        : true;

      effectiveSubjects.forEach((rawSubject) => {
        const subject = getOfficialName(rawSubject) || rawSubject || 'غير محدد';
        const subjectCandidates = [
          normalizeSearchText(rawSubject),
          normalizeSearchText(subject)
        ];
        const subjectMatches = hasQuery
          ? tokens.every((token) => subjectCandidates.some((candidate) => candidate.includes(token)))
          : true;

        if (!teacherNameMatches && !subjectMatches) return;

        if (!grouped.has(subject)) grouped.set(subject, []);
        grouped.get(subject).push(item);
      });
    });

    const sortedGroups = Array.from(grouped.entries())
      .sort((a, b) => {
        const rankDiff = getSubjectSortIndex(a[0]) - getSubjectSortIndex(b[0]);
        if (rankDiff !== 0) return rankDiff;
        return a[0].localeCompare(b[0], 'ar');
      })
      .map(([subject, items]) => {
        const uniqueItems = [];
        const seenTeacherIds = new Set();

        items.forEach((item) => {
          if (seenTeacherIds.has(item.teacher.id)) return;
          seenTeacherIds.add(item.teacher.id);
          uniqueItems.push(item);
        });

        uniqueItems.sort((a, b) => a.teacher.name.localeCompare(b.teacher.name, 'ar'));
        return { subject, items: uniqueItems };
      });

    return sortedGroups;
  }, [teacherSchedules, teacherSearchQuery]);

  // ========================================================================
  // مؤشرات الجودة (احترافية + تقديم سريع)
  // ========================================================================
  const scheduleQuality = useMemo(() => {
    if (!shouldBuildSchedule) return null;

    const classById = new Map(classes.map((c) => [c.id, c]));
    const teacherById = new Map(teachers.map((t) => [t.id, t]));
    const slotTeacherMap = new Set();
    const classEntryMap = new Map();
    const normalizedAssignmentMap = new Map();
    const scheduledCounts = {};
    let teacherConflicts = 0;
    let offDayViolations = 0;

    assignments.forEach((assignment) => {
      const classInfo = classById.get(assignment.cId);
      const teacher = teacherById.get(assignment.tId);
      const subject = getOfficialName(assignment.subject);

      if (!classInfo || !teacher || !subject) return;
      if (!isSubjectValidForClass(subject, classInfo.name)) return;

      normalizedAssignmentMap.set(getClassSubjectKey(classInfo.id, subject), {
        ...assignment,
        subject
      });
    });

    finalScheduleData.forEach((entry) => {
      classEntryMap.set(`${entry.day}|${entry.lesson}|${entry.classId}`, entry);
      if (!entry.teacher) return;

      const teacher = teacherById.get(entry.teacher.id);
      if (!teacher) return;

      const conflictKey = `${entry.day}-${entry.lesson}-${entry.teacher.id}`;
      if (slotTeacherMap.has(conflictKey)) teacherConflicts += 1;
      slotTeacherMap.add(conflictKey);

      if (normalizeDayName(teacher.offDay) === entry.day) offDayViolations += 1;

      const classInfo = classById.get(entry.classId);
      if (!classInfo) return;
      const countKey = getClassSubjectKey(entry.classId, entry.teacher.subject);
      scheduledCounts[countKey] = (scheduledCounts[countKey] || 0) + 1;
    });

    let unmetLessons = 0;
    const unmetExamples = [];
    const unmetDetails = [];

    classes.forEach((c) => {
      ministerialOrder.forEach((subject) => {
        if (!isSubjectValidForClass(subject, c.name)) return;
        const key = getClassSubjectKey(c.id, subject);
        const required = lessonCounts[getCountConfigKey(c.name, subject)] ?? getSubjectQuota(c.name, subject);
        if (required <= 0) return;
        const done = scheduledCounts[key] || 0;
        if (done < required) {
          const missing = required - done;
          unmetLessons += missing;
          if (unmetExamples.length < 5) {
            unmetExamples.push(`${c.name} (${c.section}) - ${subject}: ${done}/${required}`);
          }

          const assignment = normalizedAssignmentMap.get(key);
          const linkedTeacher = assignment ? teacherById.get(assignment.tId) : null;
          let reason = "تعذر توزيع الحصص المطلوبة بالكامل.";
          let suggestion = "راجع الربط أو أعد توليد الجدول بعد تعديل القيود.";

          if (!assignment) {
            reason = "لا يوجد ربط لهذه المادة مع أي مدرس في هذا الصف.";
            suggestion = "اربط مدرساً للمادة من تبويب ربط المهام.";
          } else if (!linkedTeacher) {
            reason = "الربط موجود لكن المدرس المرتبط غير متاح في بيانات الجدول الحالية.";
            suggestion = "أعد ربط المادة بمدرس موجود.";
          } else {
            let freePlannedSlots = 0;
            let freeExpandableSlots = 0;
            let offDayBlockedSlots = 0;
            let teacherBusySlots = 0;
            let classOccupiedSlots = 0;

            daysList.forEach((day) => {
              const isTeacherOff = normalizeDayName(linkedTeacher.offDay) === day;
              const baseDayLimit = getBaseDailyLessonLimitForClass(c.name, day);
              const plannedDayLimit = classDailyLessonPlan.get(`${c.id}|${day}`) || 0;

              for (let lessonIndex = 0; lessonIndex < baseDayLimit; lessonIndex += 1) {
                const lesson = lessonsList[lessonIndex];
                const classEntry = classEntryMap.get(`${day}|${lesson}|${c.id}`);

                if (isTeacherOff) {
                  offDayBlockedSlots += 1;
                  continue;
                }

                if (slotTeacherMap.has(`${day}-${lesson}-${linkedTeacher.id}`)) {
                  teacherBusySlots += 1;
                  continue;
                }

                if (classEntry?.teacher) {
                  classOccupiedSlots += 1;
                  continue;
                }

                if (lessonIndex < plannedDayLimit) {
                  freePlannedSlots += 1;
                } else {
                  freeExpandableSlots += 1;
                }
              }
            });

            if (freePlannedSlots > 0 || freeExpandableSlots > 0) {
              reason = freeExpandableSlots > 0
                ? "المادة ما زالت تحتاج حصصاً إضافية وتتوفر لها فترات تعويض ممكنة ضمن السقف اليومي الأصلي."
                : "توجد فترات داخل الخطة الحالية لكن القيود المتقاطعة منعت الاستكمال الكامل.";
              suggestion = freeExpandableSlots > 0
                ? "أعد التوليد بعد التعديل الحالي أو راجع توزيع ربط المدرس على الصفوف الأخرى."
                : "خفف تضارب المدرس مع الصفوف الأخرى أو أضف مدرساً مسانداً.";
            } else if (teacherBusySlots > 0 && offDayBlockedSlots > 0) {
              reason = "يوم إجازة المدرس مع تضارب وقته في الحصص الأخرى يمنعان استكمال النصاب.";
              suggestion = "بدّل يوم إجازة المدرس أو وفر مدرساً آخر للمادة.";
            } else if (teacherBusySlots > 0) {
              reason = "المدرس المرتبط مشغول بحصص أخرى في الفترات المتاحة لهذه المادة.";
              suggestion = "خفف ربط نفس المدرس مع صفوف أخرى أو أضف مدرساً موازياً.";
            } else if (offDayBlockedSlots > 0) {
              reason = "يوم إجازة المدرس يقلل الفترات الممكنة لهذه المادة.";
              suggestion = "غيّر يوم الإجازة أو اربط المادة بمدرس دون إجازة في هذا اليوم.";
            } else if (classOccupiedSlots > 0) {
              reason = "فترات الصف المتاحة امتلأت بمواد أخرى قبل إكمال هذه المادة.";
              suggestion = "خفف نصاب بعض المواد أو اسمح بمدرس بديل يملك وقتاً مختلفاً.";
            }
          }

          unmetDetails.push({
            key,
            classId: c.id,
            classLabel: `${c.name} (${c.section})`,
            subject,
            teacherName: linkedTeacher?.name || null,
            done,
            required,
            missing,
            reason,
            suggestion
          });
        }
      });
    });

    unmetDetails.sort((a, b) => {
      const missingDiff = b.missing - a.missing;
      if (missingDiff !== 0) return missingDiff;
      return a.classLabel.localeCompare(b.classLabel, 'ar');
    });

    const emptySlotDetails = finalScheduleData
      .filter((entry) => !entry.teacher)
      .map((entry) => {
        const classInfo = classById.get(entry.classId);
        if (!classInfo) return null;

        const pendingClassItems = unmetDetails.filter((item) => item.classId === entry.classId);
        let reason = "خانة غير مشغولة بعد التوزيع النهائي.";
        let suggestion = "راجع ربط المواد الناقصة لهذا الصف.";

        if (pendingClassItems.length === 0) {
          reason = "هذه الخانة أصبحت احتياطية بعد ضغط الجدول ولا توجد مادة ناقصة مرتبطة بها.";
          suggestion = "لا يلزم إجراء إلا إذا رغبت بتوسيع اليوم الدراسي لهذا الصف.";
        } else {
          let noLinkCount = 0;
          let offDayCount = 0;
          let busyCount = 0;
          let openTeacherCount = 0;

          pendingClassItems.forEach((item) => {
            const assignment = normalizedAssignmentMap.get(getClassSubjectKey(entry.classId, item.subject));
            const teacher = assignment ? teacherById.get(assignment.tId) : null;

            if (!teacher) {
              noLinkCount += 1;
              return;
            }

            if (normalizeDayName(teacher.offDay) === entry.day) {
              offDayCount += 1;
              return;
            }

            if (slotTeacherMap.has(`${entry.day}-${entry.lesson}-${teacher.id}`)) {
              busyCount += 1;
              return;
            }

            openTeacherCount += 1;
          });

          if (noLinkCount === pendingClassItems.length) {
            reason = "كل المواد الناقصة في هذا الصف غير مرتبطة بمدرسين.";
            suggestion = "أكمل الربط من تبويب ربط المهام.";
          } else if (offDayCount === pendingClassItems.length) {
            reason = "كل المدرسين المرتبطين بالمواد الناقصة مجازون في هذا اليوم.";
            suggestion = "بدّل يوم الإجازة أو أضف مدرساً مسانداً.";
          } else if (busyCount === pendingClassItems.length) {
            reason = "كل المدرسين المرتبطين بالمواد الناقصة مشغولون في نفس الحصة بصفوف أخرى.";
            suggestion = "قلل تضارب نفس المدرسين عبر إعادة الربط أو إضافة بدلاء.";
          } else if (openTeacherCount > 0) {
            reason = "توجد مواد ناقصة ومدرس متاح نظرياً، لكن القيود اليومية لبقية الحصص منعت استخدام هذه الخانة.";
            suggestion = "أعد التوليد بعد تعديل توزيع بعض المواد أو راجع النصاب اليومي للمادة.";
          }
        }

        return {
          key: `${entry.classId}-${entry.day}-${entry.lesson}`,
          classLabel: `${classInfo.name} (${classInfo.section})`,
          day: entry.day,
          lesson: entry.lesson,
          reason,
          suggestion
        };
      })
      .filter(Boolean)
      .slice(0, 18);

    const totalSlots = finalScheduleData.length;
    const assignedSlots = finalScheduleData.filter((entry) => entry.teacher).length;
    const repairedLessons = finalScheduleData.filter(
      (entry) => entry.teacher && entry.assignmentMode === 'repair'
    ).length;
    const expandedLessons = finalScheduleData.filter(
      (entry) => entry.teacher && entry.autoExpanded
    ).length;

    return {
      teacherConflicts,
      offDayViolations,
      unmetLessons,
      totalSlots,
      assignedSlots,
      emptySlots: totalSlots - assignedSlots,
      unmetExamples,
      unmetDetails,
      emptySlotDetails,
      repairedLessons,
      expandedLessons
    };
  }, [shouldBuildSchedule, classes, teachers, assignments, lessonCounts, finalScheduleData, classDailyLessonPlan]);

  const exportElementAsImage = async (element, fileName) => {
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight
      });

      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = fileName;
      link.click();
    } catch (error) {
      console.error("خطأ في تصدير الصورة:", error);
      setErrorMessage("❌ تعذر تصدير الصورة. حاول مرة أخرى.");
    }
  };

  const exportElementAsPdf = async (element, fileName, options = {}) => {
    if (!element) return;

    const {
      orientation = "p",
      singlePage = false,
      margin = 8,
      scale = 2
    } = options;

    try {
      const canvas = await html2canvas(element, {
        scale,
        useCORS: true,
        backgroundColor: "#ffffff",
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight
      });

      const resolvedOrientation = orientation === "landscape" || orientation === "l" ? "l" : "p";
      const pdf = new jsPDF(resolvedOrientation, "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const printableWidth = pageWidth - margin * 2;
      const printableHeight = pageHeight - margin * 2;

      const imageData = canvas.toDataURL("image/png");
      const imageHeight = (canvas.height * printableWidth) / canvas.width;

      if (singlePage) {
        let drawWidth = printableWidth;
        let drawHeight = imageHeight;

        if (drawHeight > printableHeight) {
          drawHeight = printableHeight;
          drawWidth = (canvas.width * drawHeight) / canvas.height;
        }

        const x = margin + (printableWidth - drawWidth) / 2;
        const y = margin + (printableHeight - drawHeight) / 2;
        pdf.addImage(imageData, "PNG", x, y, drawWidth, drawHeight, undefined, "FAST");
        pdf.save(fileName);
        return;
      }

      let heightLeft = imageHeight;
      let position = margin;

      pdf.addImage(imageData, "PNG", margin, position, printableWidth, imageHeight, undefined, "FAST");
      heightLeft -= printableHeight;

      while (heightLeft > 0) {
        pdf.addPage();
        position = margin - (imageHeight - heightLeft);
        pdf.addImage(imageData, "PNG", margin, position, printableWidth, imageHeight, undefined, "FAST");
        heightLeft -= printableHeight;
      }

      pdf.save(fileName);
    } catch (error) {
      console.error("خطأ في تصدير PDF:", error);
      setErrorMessage("❌ تعذر تصدير PDF. حاول مرة أخرى.");
    }
  };

  // ========================================================================
  // دالة التصدير
  // ========================================================================
  const exportStudentAsImage = () => exportElementAsImage(
    studentScheduleRef.current,
    studentScheduleMode === 'subjects'
      ? "student-schedule-subjects.png"
      : "student-schedule-with-teachers.png"
  );
  const exportStudentAsPdf = () => (
    studentScheduleMode === 'subjects'
      ? exportElementAsPdf(studentScheduleRef.current, "student-schedule-subjects-a4.pdf", {
          orientation: "l",
          singlePage: true,
          margin: 0,
          scale: 4
        })
      : exportElementAsPdf(studentScheduleRef.current, "student-schedule-with-teachers.pdf")
  );
  const exportTeachersAsImage = () => exportElementAsImage(teacherScheduleRef.current, "teacher-schedule.png");
  const exportTeachersAsPdf = () => exportElementAsPdf(teacherScheduleRef.current, "teacher-schedule.pdf");
  const exportSelectedTeacherAsImage = () => {
    if (!selectedTeacherDetails) return;
    const safeName = toSafeFileName(selectedTeacherDetails.teacher.name);
    exportElementAsImage(teacherDetailRef.current, `teacher-${safeName}.png`);
  };

  const selectedTeacherSubjects = selectedTeacherDetails
    ? getTeacherSubjects(selectedTeacherDetails.teacher)
    : [];
  const selectedTeacherClasses = selectedTeacherDetails
    ? getUniqueTeacherClasses(selectedTeacherDetails.schedule)
    : [];
  const selectedTeacherClassesLabel = formatTeacherClassList(selectedTeacherClasses);
  const showSelectedSubjectColumn = selectedTeacherSubjects.length > 1;

  const getClassStyle = (name) => {
    const styles = {
      "رابع أدبي": { bg: '#f472b6', c: '#000' }, 
      "رابع علمي": { bg: '#a855f7', c: '#000' },
      "خامس أدبي": { bg: '#3b82f6', c: '#000' }, 
      "خامس علمي": { bg: '#4338ca', c: '#fff' },
      "سادس أدبي": { bg: '#000000', c: '#fff' }, 
      "سادس علمي": { bg: '#ef4444', c: '#fff' }
    };
    return styles[name] || { bg: '#fff', c: '#000' };
  };

  const getClassPrintStyle = (name) => {
    const baseStyle = getClassStyle(name);
    const baseBg = baseStyle.bg || '#ffffff';
    return {
      headerBg: baseBg,
      headerText: baseStyle.c || '#000',
      sectionBg: hexToRgba(baseBg, 0.18),
      sectionText: '#0f172a',
      cellBg: hexToRgba(baseBg, 0.08),
      cellText: '#0f172a',
      border: hexToRgba(baseBg, 0.55),
      entryBg: '#ffffff'
    };
  };

  const getClassSectionStyle = (name, sectionIndex = 0, sectionCount = 1) => {
    const baseStyle = getClassStyle(name);
    const baseBg = baseStyle.bg || '#ffffff';
    const spread = Math.max(sectionCount - 1, 1);
    const ratio = Math.max(0, Math.min(1, sectionIndex / spread));
    const sectionAlpha = 0.22 + ratio * 0.18;
    const cellAlpha = 0.1 + ratio * 0.1;
    const entryAlpha = 0.05 + ratio * 0.08;
    const borderAlpha = 0.42 + ratio * 0.2;

    return {
      headerBg: hexToRgba(baseBg, sectionAlpha),
      cellBg: hexToRgba(baseBg, cellAlpha),
      border: hexToRgba(baseBg, borderAlpha),
      text: '#0f172a',
      entryBg: hexToRgba(baseBg, entryAlpha)
    };
  };

  const systemSubtitle = activeSystem === 'home'
    ? 'اختر الواجهة التي تريد العمل عليها'
    : activeSystem === 'schedule'
      ? 'إعداد الجدول الأسبوعي وإدارة الكادر'
      : 'تسجيل الحضور والغياب ومتابعة الإنذارات';
  const attendanceFormSectionOptions = [
    ...new Set(
      [
        ...sectionsList.map((section) => normalizeSectionName(section)),
        ...attendanceSectionsForSelectedClass,
        normalizeSectionName(attendanceSection),
        normalizeSectionName(attendanceSelectedSection)
      ].filter(Boolean)
    )
  ];
  const activeWarningMeta = attendanceWarningFilter
    ? ATTENDANCE_WARNING_BUTTONS.find((item) => item.key === attendanceWarningFilter) || null
    : null;
  const activeWarningList = attendanceWarningFilter
    ? (attendanceWarningRoster[attendanceWarningFilter] || [])
    : [];
  const activeWarningStudent = attendanceWarningStudentId
    ? attendanceStudents.find((student) => student.id === attendanceWarningStudentId) || null
    : null;
  const activeWarningStudentHistory = Array.isArray(activeWarningStudent?.attendanceHistory)
    ? activeWarningStudent.attendanceHistory
    : [];
  const activeWarningStudentAbsence = activeWarningStudent ? getLatestAbsenceEvent(activeWarningStudent) : null;
  const activeWarningStudentLeave = activeWarningStudent ? getLatestStatusEvent(activeWarningStudent, "M") : null;
  const activeWarningStudentLicense = activeWarningStudent ? getLatestStatusEvent(activeWarningStudent, "R") : null;
  const activeWarningStudentWarning = activeWarningStudent
    ? getAttendanceWarning(normalizeAttendanceNumber(activeWarningStudent.absenceDays))
    : null;
  const attendanceEditStudent = attendanceEditStudentId
    ? attendanceStudents.find((student) => student.id === attendanceEditStudentId) || null
    : null;
  const attendanceEditEntries = useMemo(() => {
    if (!attendanceEditStudent?.attendanceByDate) return [];
    return Object.entries(attendanceEditStudent.attendanceByDate)
      .filter(([dateKey]) => isIsoDateKey(dateKey))
      .sort((a, b) => new Date(b[0]) - new Date(a[0]))
      .map(([dateKey, statusCode]) => ({
        dateKey,
        statusCode: ATTENDANCE_STATUS_LOOKUP[statusCode] ? statusCode : "H"
      }));
  }, [attendanceEditStudent]);

  const attendanceStyles = {
    whiteCard,
    attendanceTopRow,
    attendanceTopActions,
    attendanceDatePickerGroup,
    attendanceDateArrowBtn,
    attendanceDateField,
    attendanceDateInput,
    attendanceWeekdayLabel,
    attendanceDateApplyBtn,
    attendanceUploadBtn,
    attendanceUploadGroup,
    attendanceInfoBtn,
    attendanceSearchInput,
    attendanceImportMessageBox,
    attendanceDateMessageBox,
    attendanceStatsGrid,
    attendanceStatCard,
    attendanceStatLabel,
    attendanceStatValue,
    attendanceWarningSummaryRow,
    attendanceWarningPill,
    attendanceWarningPillActive,
    attendanceWarningPanel,
    attendanceWarningPanelHeader,
    attendanceWarningHint,
    attendanceWarningList,
    attendanceWarningCard,
    attendanceWarningName,
    attendanceWarningMeta,
    attendanceDetailOverlay,
    attendanceDetailCard,
    attendanceDetailHeader,
    attendanceDetailTitle,
    attendanceDetailSubtitle,
    attendanceDetailCloseBtn,
    attendanceDetailBadges,
    attendanceDetailBadge,
    attendanceDetailInfoGrid,
    attendanceDetailInfoCard,
    attendanceDetailInfoTitle,
    attendanceDetailInfoValue,
    attendanceDetailHistoryHeader,
    attendanceDetailHistoryList,
    attendanceDetailHistoryItem,
    attendanceDetailHistoryRow,
    attendanceDetailHistoryDate,
    attendanceDetailHistoryStatus,
    attendanceDetailHistoryAction,
    attendanceDetailNote,
    attendanceDetailHistoryEmpty,
    attendanceStatusBadge,
    attendanceEditOverlay,
    attendanceEditCard,
    attendanceEditHeader,
    attendanceEditTitle,
    attendanceEditSubtitle,
    attendanceEditCloseBtn,
    attendanceEditList,
    attendanceEditItem,
    attendanceEditDate,
    attendanceEditCurrent,
    attendanceEditControls,
    attendanceEditSelect,
    attendanceEditReasonInput,
    attendanceEditSaveBtn,
    attendanceEditEmpty,
    attendanceReasonPopover,
    attendanceCalendarWrapper,
    attendanceCalendarHeader,
    attendanceCalendarNavBtn,
    attendanceCalendarMonthLabel,
    attendanceCalendarWeekRow,
    attendanceCalendarWeekCell,
    attendanceCalendarGrid,
    attendanceCalendarDayBtn,
    attendanceCalendarDayBtnDisabled,
    attendanceCalendarDayCircle,
    attendanceCalendarDayCircleActive,
    attendanceCalendarEditPanel,
    attendanceCalendarSelectedLabel,
    attendanceCalendarNoteCard,
    attendanceCalendarNoteTitle,
    attendanceCalendarNoteBody,
    attendanceCalendarNoteMeta,
    attendanceClassRow,
    attendanceClassBtn,
    attendanceClassBtnActive,
    attendanceClassTitle,
    attendanceClassMeta,
    attendanceSectionRow,
    attendanceSectionBtn,
    attendanceSectionBtnActive,
    attendanceDeviceTimeHint,
    attendanceEmptyHint,
    attendanceFormGrid,
    attendanceWarningBadge,
    attendanceWarningNote,
    modernTable,
    thStyle,
    tdStyle,
    attendanceStatusOptionsRow,
    attendanceStatusOptionBtn,
    attendanceStatusOptionActive,
    attendanceStatusOptionLeave,
    attendanceStatusOptionLeaveActive,
    attendanceStatusOptionLicense,
    attendanceStatusOptionLicenseActive,
    attendanceStatusOptionAbsence,
    attendanceStatusOptionAbsenceActive,
    attendanceReasonInput,
    attendanceLicenseTimeLabel,
    attendanceActionRow,
    attendanceApplyIconBtn,
    attendanceUndoIconBtn,
    attendanceEditBtn,
    inputS,
    greenBtn
  };

  const attendanceHelpers = {
    ATTENDANCE_WARNING_BUTTONS,
    ATTENDANCE_STATUS_OPTIONS,
    ATTENDANCE_STATUS_LOOKUP,
    getAttendanceWarning,
    getNextAttendanceThreshold,
    normalizeAttendanceNumber,
    getAttendanceStatusVisual,
    getAttendanceActionLabel,
    getAttendanceNoteForDate,
    getAttendanceTimeForDate,
    formatDateKeyForDisplay,
    formatWeekdayForDisplay,
    normalizeSectionName
  };

  const attendanceData = {
    attendanceSelectedDate,
    attendanceDateMessage,
    attendanceImportMessage,
    attendanceStats,
    attendanceWarningFilter,
    activeWarningMeta,
    activeWarningList,
    activeWarningStudent,
    activeWarningStudentHistory,
    activeWarningStudentAbsence,
    activeWarningStudentLicense,
    activeWarningStudentLeave,
    activeWarningStudentWarning,
    attendanceEditStudent,
    attendanceEditEntries,
    attendanceEditDrafts,
    attendanceLicenseStudentId,
    attendanceClassesOverview,
    attendanceSectionsForSelectedClass,
    attendanceStudentsInSelectedSection,
    attendanceSelectedClass,
    attendanceSelectedSection,
    attendanceClassName,
    attendanceSection,
    attendanceStudentName,
    attendanceSearch,
    attendanceFormSectionOptions,
    isAttendanceImporting,
    classesNames
  };

  const attendanceHandlers = {
    shiftAttendanceSelectedDate,
    handleAttendanceDateChange,
    applyAttendanceDateForAllStudents,
    handleAttendanceExcelUpload,
    setShowAttendanceExcelInfo,
    setAttendanceSearch,
    setAttendanceSelectedClass,
    setAttendanceClassName,
    setAttendanceSelectedSection,
    setAttendanceSection,
    setAttendanceStudentName,
    handleAddAttendanceStudent,
    setAttendanceWarningFilter,
    setAttendanceWarningStudentId,
    setAttendanceEditStudentId,
    setAttendanceEditDrafts,
    setAttendanceLicenseStudentId,
    updateAttendanceStudent,
    handleLicenseClick,
    applyDailyAttendanceStatus,
    undoDailyAttendanceStatus,
    handleAttendanceEditSave
  };

  const scheduleStyles = {
    navBarStyle,
    activeBtn,
    whiteBtn,
    generateNavBtn,
    whiteCard,
    uploadBtn,
    formGrid,
    field,
    labelS,
    inputS,
    yellowInput,
    blueBtn,
    secondaryBtn,
    modernTable,
    thStyle,
    tdStyle,
    editIconBtn,
    deleteIconBtn,
    chipBase,
    greenBtn,
    cancelBtn,
    dropdownStyle,
    linkMatrix,
    linkModule,
    overlayStyle,
    topActionsBar,
    closeBtn,
    pdfBtn,
    imageBtn,
    switchBtn,
    finalTable,
    fTh,
    dayCell,
    lessonCell,
    fTd,
    entryBox,
    studentEntrySubject,
    studentEntryTeacher,
    qualityPanel,
    qualityChip,
    qualityDetails,
    qualityLine,
    teacherSearchRow,
    teacherSearchHint,
    teacherSearchForm,
    teacherSearchInputStyle,
    teacherSearchBtn,
    teacherClearSearchBtn,
    teacherNoResults,
    teacherSubjectBlock,
    teacherSubjectHeader,
    teacherSubjectCount,
    teacherCardsGrid,
    teacherCardBtn,
    teacherCardBtnHover,
    teacherCardName,
    teacherCardMetaRow,
    teacherCardMetaChip,
    teacherCardMetaChipWide,
    teacherDetailOverlay,
    teacherDetailDialog,
    teacherDetailActions,
    teacherDetailBody,
    teacherDetailTitle,
    teacherDetailSubtitle,
    teacherDetailBadges,
    teacherDetailBadge,
    teacherDetailWideBadge,
    teacherTable,
    teacherTh,
    teacherTd,
    mainContainer
  };

  const scheduleHelpers = {
    daysList,
    lessonsList,
    classesNames,
    sectionsList,
    ministerialOrder,
    dayColorMap,
    getClassStyle,
    getClassPrintStyle,
    getClassSectionStyle,
    isSubjectValidForClass,
    getSubjectQuota,
    getTeacherSubjects,
    getDailyLessonLimitForDay,
    isLessonEnabledForClassDay,
    normalizeDayName,
    getUniqueTeacherClasses,
    formatTeacherClassList
  };

  const scheduleData = {
    activeTab,
    showFinalTable,
    showTeacherSchedule,
    teachers,
    tName,
    tSubject,
    tRole,
    hasOffDay,
    tOffDay,
    editingTeacherId,
    teacherSubjectOptions,
    selClass,
    effectiveSelSection,
    isCustomMode,
    customValue,
    availableSections,
    classes,
    assignments,
    lessonCounts,
    scheduleQuality,
    scheduleLookup,
    studentScheduleRef,
    teacherScheduleRef,
    teacherSearchInput,
    teacherSearchQuery,
    studentScheduleMode,
    teacherCardsBySubject,
    selectedTeacherDetails,
    selectedTeacherId,
    hoveredTeacherCardKey,
    selectedTeacherClassesLabel,
    showSelectedSubjectColumn,
    teacherDetailRef
  };

  const scheduleHandlers = {
    setActiveTab,
    handleFileUpload,
    handleSaveTeacher,
    resetTeacherForm,
    startTeacherEdit,
    setTeachers,
    setAssignments,
    setTName,
    setTSubject,
    setTRole,
    setHasOffDay,
    setTOffDay,
    setSelClass,
    setSelSection,
    setIsCustomMode,
    setCustomValue,
    setClasses,
    setErrorMessage,
    setLessonCounts,
    setShowFinalTable,
    setShowTeacherSchedule,
    closeTeacherScheduleExplorer,
    resetTeacherExplorerState,
    exportStudentAsPdf,
    exportStudentAsImage,
    exportTeachersAsPdf,
    exportTeachersAsImage,
    exportSelectedTeacherAsImage,
    setTeacherSearchInput,
    setTeacherSearchQuery,
    setStudentScheduleMode,
    setSelectedTeacherId,
    setHoveredTeacherCardKey
  };

  const attendanceViewProps = {
    styles: attendanceStyles,
    helpers: attendanceHelpers,
    data: attendanceData,
    handlers: attendanceHandlers
  };

  const scheduleViewProps = {
    styles: scheduleStyles,
    helpers: scheduleHelpers,
    data: scheduleData,
    handlers: scheduleHandlers
  };

  return (
    <div dir="rtl" style={pageLayout}>
      {errorMessage && (
        <div style={overlayModal}>
          <div style={modalCard}>
            <p style={{fontSize:'18px', fontWeight:'bold', marginBottom:'15px', color:'#000'}}>
              {errorMessage}
            </p>
            <button onClick={()=>setErrorMessage("")} style={closeModalBtn}>فهمت</button>
          </div>
        </div>
      )}

      {showAttendanceExcelInfo && (
        <div style={overlayModal}>
          <div style={modalCard}>
            <p style={{fontSize:'16px', fontWeight:'800', marginBottom:'12px', color:'#000', lineHeight: '1.8'}}>
              يجب رفع ملف إكسل يحتوي على أربعة أعمدة بالترتيب التالي:
              <br />اكتساب<br />اسم الطالب<br />3) الصف
              <br />4) الشعبة
            </p>
            <button onClick={() => setShowAttendanceExcelInfo(false)} style={closeModalBtn}>✕ إغلاق</button>
          </div>
        </div>
      )}

      <header style={headerStyle}>
        <h1 style={headerTitleStyle}>نظام إدارة المدرسة الذكي</h1>
        <p style={headerSubtitleStyle}>{systemSubtitle}</p>
      </header>

      {activeSystem !== 'home' && (
        <div style={systemSwitchBar}>
          <button
            onClick={openScheduleSystem}
            style={activeSystem === 'schedule' ? systemNavBtnActive : systemNavBtn}
          >إعداد الجدول</button>
          <button
            onClick={openAttendanceSystem}
            style={activeSystem === 'attendance' ? systemNavBtnActive : systemNavBtn}
          >الحضور والغياب</button>
        </div>
      )}

      {activeSystem === 'schedule' ? (
        <ScheduleView {...scheduleViewProps} />
      ) : (
        <main style={activeSystem === 'home' ? homeMainContainer : mainContainer}>
        {activeSystem === 'home' && (
          <div style={homeChooserWrapper}>
            <div style={homeChooserGrid}>
              <button
                type="button"
                onClick={openScheduleSystem}
                style={{ ...homeChooserCard, ...homeScheduleCard }}
              >
                <span style={homeCardIcon}>الجدول</span>
                <h2 style={homeCardTitle}>إعداد الجدول</h2>
                <p style={homeCardDesc}>إدارة الكادر، الصفوف، النصاب، وربط المهام ثم توليد الجدول الأسبوعي.</p>
                <span style={homeCardAction}>فتح الواجهة</span>
              </button>

              <button
                type="button"
                onClick={openAttendanceSystem}
                style={{ ...homeChooserCard, ...homeAttendanceCard }}
              >
                <span style={homeCardIcon}>الدوام</span>
                <h2 style={homeCardTitle}>الحضور والغياب</h2>
                <p style={homeCardDesc}>تسجيل الحضور والغياب ومتابعة الإنذار الأولي والثاني والأخير وإنذار الفصل.</p>
                <span style={homeCardAction}>فتح الواجهة</span>
              </button>
            </div>
          </div>
        )}

          {activeSystem === 'attendance' && (
            <AttendanceView {...attendanceViewProps} />
          )}
        </main>
      )}
    </div>
  );
}

// ========================================================================
// الإعدادات
// ========================================================================
const pageLayout = {
  minHeight: '100vh',
  width: '100%',
  background: 'linear-gradient(145deg, #e0f2fe 0%, #f8fafc 48%, #dcfce7 100%)',
  color: '#000',
  fontWeight: '800',
  fontSize: '16px'
};
const headerStyle = {
  background: 'linear-gradient(115deg, #0f766e 0%, #1d4ed8 55%, #0284c7 100%)',
  color: '#fff',
  padding: '24px 18px',
  textAlign: 'center',
  boxShadow: '0 10px 25px rgba(15, 23, 42, 0.18)'
};
const headerTitleStyle = { margin: 0, fontSize: '36px', fontWeight: '900', letterSpacing: '0.3px' };
const headerSubtitleStyle = { margin: '8px 0 0', fontSize: '17px', fontWeight: '700', opacity: 0.95 };
const navBarStyle = { display:'flex', justifyContent:'center', gap:'10px', padding:'15px', backgroundColor:'#fff', borderBottom:'1px solid #cbd5e1' };
const activeBtn = { padding:'10px 20px', backgroundColor:'#1e40af', color:'#fff', borderRadius:'8px', cursor:'pointer', fontWeight:'bold', border:'none', fontSize:'15px' };
const whiteBtn = { padding:'10px 20px', backgroundColor:'#fff', color:'#1e40af', border:'1px solid #1e40af', borderRadius:'8px', cursor:'pointer', fontWeight:'bold', fontSize:'15px' };
const generateNavBtn = { padding:'10px 20px', backgroundColor:'#059669', color:'#fff', border:'1px solid #059669', borderRadius:'8px', cursor:'pointer', fontWeight:'bold', fontSize:'15px' };
const mainContainer = { padding:'30px', maxWidth:'1400px', margin:'0 auto' };
const homeMainContainer = { minHeight: 'calc(100vh - 180px)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '30px 20px' };
const whiteCard = { backgroundColor:'#fff', padding:'25px', borderRadius:'15px', boxShadow:'0 4px 15px rgba(0,0,0,0.05)', color:'#000' };
const systemSwitchBar = { display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', margin: '8px 0 20px' };
const _homeNavBtn = { padding: '10px 16px', borderRadius: '10px', border: '1px solid #94a3b8', backgroundColor: '#fff', color: '#0f172a', fontWeight: '800', cursor: 'pointer', fontSize: '14px' };
const systemNavBtn = { padding: '12px 30px', borderRadius: '14px', border: '1px solid #1d4ed8', background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#fff', fontWeight: '900', cursor: 'pointer', fontSize: '15px', boxShadow: '0 8px 18px rgba(37, 99, 235, 0.35)', transition: 'transform 0.15s ease, box-shadow 0.15s ease' };
const systemNavBtnActive = { ...systemNavBtn, background: 'linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%)', borderColor: '#1e40af', boxShadow: '0 10px 22px rgba(30, 64, 175, 0.45)', transform: 'translateY(-1px)' };
const homeChooserWrapper = { width: '100%', display: 'flex', justifyContent: 'center' };
const homeChooserGrid = { width: 'min(980px, 100%)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' };
const homeChooserCard = {
  textAlign: 'right',
  border: 'none',
  borderRadius: '20px',
  padding: '24px',
  cursor: 'pointer',
  boxShadow: '0 15px 32px rgba(15, 23, 42, 0.15)',
  color: '#fff',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  minHeight: '280px'
};
const homeScheduleCard = { background: 'linear-gradient(135deg, #1d4ed8 0%, #0f766e 100%)' };
const homeAttendanceCard = { background: 'linear-gradient(135deg, #0891b2 0%, #2563eb 100%)' };
const homeCardIcon = {
  marginBottom: '10px',
  backgroundColor: 'rgba(255,255,255,0.17)',
  border: '1px solid rgba(255,255,255,0.3)',
  borderRadius: '999px',
  padding: '6px 12px',
  fontSize: '13px',
  fontWeight: '900'
};
const homeCardTitle = { margin: '0 0 10px', fontSize: '30px', fontWeight: '900' };
const homeCardDesc = { margin: 0, lineHeight: '1.9', fontSize: '16px', opacity: 0.97, flex: 1 };
const homeCardAction = { marginTop: '16px', backgroundColor: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.35)', borderRadius: '999px', padding: '8px 14px', fontSize: '14px', fontWeight: '800' };
const formGrid = { display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:'15px', marginBottom:'20px' };
const field = { display:'flex', flexDirection:'column', gap:'5px' };
const labelS = { fontSize:'14px', fontWeight:'bold', color:'#000' };
const inputS = { padding:'10px', borderRadius:'8px', border:'1px solid #94a3b8', color:'#000', backgroundColor:'#fff', fontSize:'15px', fontWeight:'700' };
const yellowInput = { ...inputS, backgroundColor:'#fef9c3' };
const dropdownStyle = { padding:'5px', borderRadius:'5px', border:'1px solid #1e40af', color:'#000', fontWeight:'bold', backgroundColor:'#fff', fontSize:'15px' };
const blueBtn = { width:'100%', padding:'12px', backgroundColor:'#1e40af', color:'#fff', borderRadius:'8px', cursor:'pointer', fontWeight:'bold', border:'none', fontSize:'15px', minWidth:'220px' };
const secondaryBtn = { padding:'12px 18px', backgroundColor:'#fff', color:'#1e3a8a', border:'1px solid #93c5fd', borderRadius:'8px', cursor:'pointer', fontWeight:'800', fontSize:'15px' };
const greenBtn = { padding:'12px 25px', backgroundColor:'#059669', color:'#fff', borderRadius:'8px', cursor:'pointer', fontWeight:'bold', border:'none', fontSize:'15px' };
const uploadBtn = { padding:'10px 20px', backgroundColor:'#059669', color:'#fff', borderRadius:'8px', cursor:'pointer', fontWeight:'bold', display:'inline-block', fontSize:'15px' };
const editIconBtn = { border:'1px solid #2563eb', backgroundColor:'#dbeafe', color:'#1e40af', borderRadius:'7px', padding:'6px 10px', cursor:'pointer', fontWeight:'800', fontSize:'13px' };
const deleteIconBtn = { border:'1px solid #ef4444', backgroundColor:'#fee2e2', color:'#b91c1c', borderRadius:'7px', padding:'6px 10px', cursor:'pointer', fontWeight:'800', fontSize:'13px' };
const modernTable = { width:'100%', borderCollapse:'collapse', textAlign:'right' };
const thStyle = { padding:'15px 12px', color:'#475569', fontSize:'15px', fontWeight:'800' };
const tdStyle = { padding:'15px 12px', color:'#000', fontSize:'15px' };
const cancelBtn = { backgroundColor:'#ef4444', color:'#fff', padding:'0 16px', minWidth:'78px', borderRadius:'8px', cursor:'pointer', border:'none', fontWeight:'800', fontSize:'14px' };
const chipBase = { padding:'8px 15px', borderRadius:'50px', fontWeight:'bold' };
const linkMatrix = { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px', color:'#000' };
const linkModule = { padding:'16px', border:'1px solid #e2e8f0', borderRadius:'10px', color:'#000', backgroundColor:'#fff', fontSize:'15px' };
const overlayStyle = { position:'fixed', top:0, left:0, width:'100vw', height:'100vh', zIndex:2000, overflow:'auto', backgroundColor:'#f8fafc', padding: '15px' };
const topActionsBar = { display: 'flex', justifyContent: 'flex-start', marginBottom: '15px', flexWrap: 'wrap', gap: '8px' };
const closeBtn = { display: 'flex', alignItems: 'center', padding: '10px 25px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: '800', fontSize: '15px', boxShadow: '0 4px 10px rgba(239, 68, 68, 0.3)' };
const pdfBtn = { display: 'flex', alignItems: 'center', padding: '10px 25px', backgroundColor: '#0f766e', color: '#fff', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: '800', fontSize: '15px', boxShadow: '0 4px 10px rgba(15, 118, 110, 0.3)' };
const imageBtn = { display: 'flex', alignItems: 'center', padding: '10px 25px', backgroundColor: '#ea580c', color: '#fff', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: '800', fontSize: '15px', boxShadow: '0 4px 10px rgba(234, 88, 12, 0.3)' };
const switchBtn = { display: 'flex', alignItems: 'center', padding: '10px 25px', backgroundColor: '#1e40af', color: '#fff', border: 'none', borderRadius: '50px', cursor: 'pointer', fontWeight: '800', fontSize: '15px', boxShadow: '0 4px 10px rgba(30, 64, 175, 0.3)' };
const finalTable = { width:'100%', borderCollapse:'collapse', border:'2px solid #cbd5e1', color:'#000', tableLayout:'fixed' };
const dayCell = { backgroundColor:'#f8fafc', textAlign:'center', width:'82px', border:'1px solid #cbd5e1', color:'#1e3a8a', fontWeight:'900', fontSize:'15px', padding:'10px 8px' };
const lessonCell = { textAlign:'center', border:'1px solid #e2e8f0', fontWeight:'900', padding:'10px 8px', color:'#0f172a', backgroundColor:'#fff', fontSize:'14px' };
const fTd = { textAlign:'center', border:'1px solid #e2e8f0', padding:'6px', color:'#000', verticalAlign:'middle' };
const entryBox = { padding:'5px 4px', backgroundColor:'#eff6ff', borderRadius:'8px', border:'1px solid #bfdbfe', color:'#000', display:'flex', flexDirection:'column', gap:'2px', lineHeight:'1.35' };
const studentEntrySubject = { fontSize:'12px', fontWeight:'900', color:'#0f172a', lineHeight:'1.35' };
const studentEntryTeacher = { fontSize:'9px', fontWeight:'700', color:'#334155', lineHeight:'1.3' };
const fTh = { padding:'12px 8px', border:'1px solid #e2e8f0', textAlign:'center', fontWeight:'900', backgroundColor:'#f8fafc', color:'#0f172a', fontSize:'14px' };
const qualityPanel = { display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px' };
const qualityChip = { backgroundColor: '#fff', border: '1px solid #dbeafe', color: '#1e3a8a', borderRadius: '999px', padding: '6px 12px', fontSize: '13px', fontWeight: 'bold' };
const qualityDetails = { marginBottom: '10px', padding: '10px', borderRadius: '10px', border: '1px dashed #cbd5e1', backgroundColor: '#ffffff' };
const qualityLine = { fontSize: '13px', color: '#475569', marginBottom: '3px' };
const overlayModal = { position:'fixed', top:0, left:0, width:'100vw', height:'100vh', backgroundColor:'rgba(0,0,0,0.4)', backdropFilter:'blur(5px)', zIndex:5000, display:'flex', justifyContent:'center', alignItems:'center' };
const modalCard = { backgroundColor:'#fff', padding:'30px', borderRadius:'15px', textAlign:'center', boxShadow:'0 10px 30px rgba(0,0,0,0.2)', minWidth:'300px' };
const closeModalBtn = { padding:'10px 30px', backgroundColor:'#1e40af', color:'#fff', border:'none', borderRadius:'8px', cursor:'pointer', fontWeight:'bold', fontSize:'15px' };
const teacherTable = { width:'100%', borderCollapse:'collapse', border:'1px solid #cbd5e1', marginBottom:'20px' };
const teacherTh = { padding:'12px 10px', backgroundColor:'#f8fafc', border:'1px solid #e2e8f0', textAlign:'center', fontWeight:'800', fontSize:'15px', color:'#0f172a' };
const teacherTd = { padding:'11px 10px', border:'1px solid #e2e8f0', textAlign:'center', fontSize:'15px', fontWeight:'700', color:'#0f172a' };
const teacherSearchRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '15px', flexWrap: 'wrap' };
const teacherSearchHint = { color: '#334155', fontSize: '16px', fontWeight: '800' };
const teacherSearchForm = { display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' };
const teacherSearchInputStyle = { width: '280px', maxWidth: '70vw', padding: '10px 12px', borderRadius: '10px', border: '1px solid #94a3b8', color: '#000', backgroundColor: '#fff', fontSize: '15px', fontWeight: '700' };
const teacherSearchBtn = { padding: '10px 16px', borderRadius: '10px', border: 'none', backgroundColor: '#1e40af', color: '#fff', cursor: 'pointer', fontWeight: '800', fontSize: '15px' };
const teacherClearSearchBtn = { padding: '10px 14px', borderRadius: '10px', border: '1px solid #94a3b8', backgroundColor: '#fff', color: '#1e293b', cursor: 'pointer', fontWeight: '800', fontSize: '15px' };
const teacherNoResults = { marginTop: '20px', textAlign: 'center', padding: '20px', borderRadius: '12px', border: '1px dashed #cbd5e1', color: '#64748b', fontWeight: '800', fontSize: '15px' };
const teacherSubjectBlock = { border: '1px solid #dbeafe', borderRadius: '14px', marginBottom: '20px', overflow: 'hidden', backgroundColor: '#fff' };
const teacherSubjectHeader = { backgroundColor: '#1e40af', color: '#fff', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '800', fontSize: '19px' };
const teacherSubjectCount = { backgroundColor: 'rgba(255,255,255,0.22)', border: '1px solid rgba(255,255,255,0.35)', borderRadius: '999px', padding: '5px 12px', fontSize: '14px', fontWeight: '800' };
const teacherCardsGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px', padding: '14px' };
const teacherCardBtn = { textAlign: 'right', backgroundColor: '#f8fbff', border: '1px solid #bfdbfe', borderRadius: '12px', padding: '12px', cursor: 'pointer', transition: 'all 0.2s ease', boxShadow: '0 2px 6px rgba(15, 23, 42, 0.06)', fontSize: '15px' };
const teacherCardBtnHover = { transform: 'translateY(-4px)', boxShadow: '0 12px 24px rgba(30, 64, 175, 0.18)' };
const teacherCardName = { fontSize: '22px', fontWeight: '800', color: '#1e40af', marginBottom: '8px' };
const teacherCardMetaRow = { display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '6px' };
const teacherCardMetaChip = { backgroundColor: '#fff', border: '1px solid #dbeafe', borderRadius: '999px', padding: '5px 10px', color: '#334155', fontSize: '14px', fontWeight: '800' };
const teacherCardMetaChipWide = { ...teacherCardMetaChip, borderRadius: '12px', width: '100%', lineHeight: '1.7', textAlign: 'right', whiteSpace: 'normal' };
const teacherDetailOverlay = { position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(2px)', zIndex: 3000, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' };
const teacherDetailDialog = { width: 'min(1100px, 96vw)', maxHeight: '92vh', overflow: 'auto', backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 20px 45px rgba(15, 23, 42, 0.28)', padding: '16px', fontSize: '15px' };
const teacherDetailActions = { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' };
const teacherDetailBody = { backgroundColor: '#fff', border: '1px solid #dbeafe', borderRadius: '12px', padding: '16px' };
const teacherDetailTitle = { margin: 0, color: '#1e40af', fontSize: '28px', fontWeight: '800' };
const teacherDetailSubtitle = { margin: '6px 0 12px', color: '#334155', fontWeight: '800', fontSize: '20px' };
const teacherDetailBadges = { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' };
const teacherDetailBadge = { backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '999px', padding: '8px 14px', color: '#334155', fontSize: '14px', fontWeight: '800' };
const teacherDetailWideBadge = { ...teacherDetailBadge, borderRadius: '12px', lineHeight: '1.7', whiteSpace: 'normal', maxWidth: '100%', flex: '1 1 360px' };
const attendanceTopRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' };
const attendanceTopActions = { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap', width: 'min(760px, 100%)' };
const attendanceDatePickerGroup = { display: 'flex', alignItems: 'center', gap: '6px' };
const attendanceDateArrowBtn = { padding: '8px 10px', borderRadius: '10px', border: '1px solid #93c5fd', backgroundColor: '#eff6ff', color: '#1e3a8a', fontWeight: '900', cursor: 'pointer' };
const attendanceDateField = { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' };
const attendanceDateInput = { padding: '10px 12px', borderRadius: '10px', border: '1px solid #93c5fd', fontWeight: '800', fontSize: '14px', color: '#0f172a', backgroundColor: '#fff' };
const attendanceWeekdayLabel = { fontSize: '12px', fontWeight: '800', color: '#475569' };
const attendanceDateApplyBtn = { padding: '10px 14px', borderRadius: '10px', border: '1px solid #2563eb', backgroundColor: '#dbeafe', color: '#1e3a8a', fontWeight: '800', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '14px' };
const attendanceUploadBtn = { padding: '10px 16px', borderRadius: '10px', border: '1px solid #ef4444', backgroundColor: '#ef4444', color: '#fff', fontWeight: '800', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '14px' };
const attendanceUploadGroup = { display: 'flex', alignItems: 'center', gap: '6px' };
const attendanceInfoBtn = { width: '28px', height: '28px', borderRadius: '999px', border: '1px solid #0f172a', backgroundColor: '#fff', color: '#0f172a', fontWeight: '900', cursor: 'pointer', fontSize: '13px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };
const attendanceImportMessageBox = { marginBottom: '12px', border: '1px solid #86efac', backgroundColor: '#f0fdf4', color: '#166534', borderRadius: '10px', padding: '10px 12px', fontWeight: '800', fontSize: '14px' };
const attendanceDateMessageBox = { marginBottom: '12px', border: '1px solid #93c5fd', backgroundColor: '#eff6ff', color: '#1e3a8a', borderRadius: '10px', padding: '10px 12px', fontWeight: '800', fontSize: '14px' };
const attendanceSearchInput = { width: '320px', maxWidth: '100%', padding: '11px 12px', borderRadius: '10px', border: '1px solid #94a3b8', fontSize: '15px', fontWeight: '700' };
const attendanceStatsGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))', gap: '10px', marginBottom: '12px' };
const attendanceStatCard = { border: '1px solid #bfdbfe', borderRadius: '12px', backgroundColor: '#eff6ff', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '4px' };
const attendanceStatLabel = { color: '#334155', fontSize: '13px', fontWeight: '800' };
const attendanceStatValue = { color: '#1e40af', fontSize: '28px', fontWeight: '900', lineHeight: 1.1 };
const attendanceWarningSummaryRow = { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '15px' };
const attendanceWarningPill = { border: '1px solid', borderRadius: '999px', padding: '7px 11px', fontSize: '13px', fontWeight: '800', cursor: 'pointer', whiteSpace: 'nowrap' };
const attendanceWarningPillActive = { boxShadow: '0 8px 18px rgba(15, 23, 42, 0.18)' };
const attendanceWarningPanel = { border: '1px dashed #cbd5e1', borderRadius: '12px', padding: '12px', backgroundColor: '#f8fafc', marginBottom: '12px' };
const attendanceWarningPanelHeader = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '800', color: '#0f172a', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' };
const attendanceWarningHint = { marginBottom: '8px', color: '#64748b', fontWeight: '700', fontSize: '12px' };
const attendanceWarningList = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' };
const attendanceWarningCard = { backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px', textAlign: 'right', cursor: 'pointer', width: '100%', fontFamily: 'inherit' };
const attendanceWarningName = { fontWeight: '900', color: '#0f172a', marginBottom: '6px' };
const attendanceWarningMeta = { color: '#475569', fontWeight: '700', fontSize: '13px' };
const _attendanceStudentMeta = { color: '#64748b', fontWeight: '700', fontSize: '12px', marginTop: '4px' };
const attendanceDetailOverlay = { position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(2px)', zIndex: 4200, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' };
const attendanceDetailCard = { width: 'min(980px, 96vw)', maxHeight: '92vh', overflow: 'auto', backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 20px 45px rgba(15, 23, 42, 0.28)', padding: '16px', color: '#0f172a' };
const attendanceDetailHeader = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' };
const attendanceDetailTitle = { margin: 0, fontSize: '26px', fontWeight: '900', color: '#1e40af' };
const attendanceDetailSubtitle = { color: '#334155', fontWeight: '800', fontSize: '15px' };
const attendanceDetailCloseBtn = { padding: '8px 16px', borderRadius: '10px', border: '1px solid #94a3b8', backgroundColor: '#fff', color: '#0f172a', fontWeight: '800', cursor: 'pointer' };
const attendanceDetailBadges = { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' };
const attendanceDetailBadge = { backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '999px', padding: '6px 12px', fontSize: '13px', fontWeight: '800', color: '#334155' };
const attendanceDetailInfoGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', marginBottom: '12px' };
const attendanceDetailInfoCard = { border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px', backgroundColor: '#f8fafc' };
const attendanceDetailInfoTitle = { fontWeight: '800', color: '#0f172a', marginBottom: '6px' };
const attendanceDetailInfoValue = { color: '#334155', fontWeight: '700', fontSize: '13px' };
const attendanceDetailHistoryHeader = { fontWeight: '900', color: '#0f172a', marginBottom: '8px' };
const attendanceDetailHistoryList = { display: 'grid', gap: '6px' };
const attendanceDetailHistoryItem = { display: 'flex', flexDirection: 'column', gap: '6px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px 10px' };
const attendanceDetailHistoryRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' };
const attendanceDetailHistoryDate = { color: '#0f172a', fontWeight: '800', fontSize: '13px' };
const attendanceDetailHistoryStatus = { color: '#334155', fontWeight: '700', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' };
const attendanceDetailHistoryAction = { marginInlineStart: '6px', fontWeight: '800', color: '#1e293b' };
const attendanceDetailNote = { color: '#0f172a', fontWeight: '700', fontSize: '12px' };
const attendanceDetailHistoryEmpty = { border: '1px dashed #cbd5e1', borderRadius: '10px', padding: '10px', color: '#64748b', fontWeight: '700', backgroundColor: '#fff' };
const attendanceStatusBadge = { display: 'inline-block', border: '1px solid', borderRadius: '999px', padding: '4px 10px', fontSize: '12px', fontWeight: '800' };
const attendanceEditOverlay = { position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', backdropFilter: 'blur(2px)', zIndex: 4300, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' };
const attendanceEditCard = { width: 'min(980px, 96vw)', maxHeight: '92vh', overflow: 'auto', backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 20px 45px rgba(15, 23, 42, 0.28)', padding: '16px', color: '#0f172a' };
const attendanceEditHeader = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' };
const attendanceEditTitle = { margin: 0, fontSize: '24px', fontWeight: '900', color: '#0f172a' };
const attendanceEditSubtitle = { color: '#334155', fontWeight: '800', fontSize: '14px' };
const attendanceEditCloseBtn = { padding: '8px 16px', borderRadius: '10px', border: '1px solid #94a3b8', backgroundColor: '#fff', color: '#0f172a', fontWeight: '800', cursor: 'pointer' };
const attendanceEditList = { display: 'grid', gap: '8px' };
const attendanceEditItem = { display: 'grid', gridTemplateColumns: '140px 140px 1fr 110px', gap: '10px', alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '10px', backgroundColor: '#f8fafc' };
const attendanceEditDate = { fontWeight: '800', color: '#0f172a' };
const attendanceEditCurrent = { display: 'flex', justifyContent: 'flex-start' };
const attendanceEditControls = { display: 'flex', flexDirection: 'column', gap: '6px' };
const attendanceEditSelect = { padding: '7px 10px', borderRadius: '8px', border: '1px solid #93c5fd', fontWeight: '800', backgroundColor: '#fff', color: '#1e3a8a' };
const attendanceEditReasonInput = { padding: '7px 10px', borderRadius: '8px', border: '1px solid #f59e0b', backgroundColor: '#fff7ed', fontWeight: '700', fontSize: '13px' };
const attendanceEditSaveBtn = { padding: '7px 12px', borderRadius: '8px', border: '1px solid #16a34a', backgroundColor: '#dcfce7', color: '#166534', fontWeight: '800', cursor: 'pointer' };
const attendanceEditEmpty = { border: '1px dashed #cbd5e1', borderRadius: '10px', padding: '10px', color: '#64748b', fontWeight: '700', backgroundColor: '#fff' };
const attendanceReasonPopover = { marginTop: '6px', padding: '8px 10px', borderRadius: '10px', border: '1px solid #fde68a', backgroundColor: '#fffbeb', boxShadow: '0 6px 14px rgba(15, 23, 42, 0.08)' };
const attendanceCalendarWrapper = { border: '1px solid #e2e8f0', borderRadius: '14px', padding: '12px', backgroundColor: '#f8fafc' };
const attendanceCalendarHeader = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '10px' };
const attendanceCalendarNavBtn = { padding: '6px 10px', borderRadius: '10px', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer', fontWeight: '900', color: '#0f172a' };
const attendanceCalendarMonthLabel = { fontWeight: '900', color: '#0f172a', fontSize: '16px' };
const attendanceCalendarWeekRow = { display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '6px', marginBottom: '6px' };
const attendanceCalendarWeekCell = { textAlign: 'center', fontSize: '12px', fontWeight: '800', color: '#475569' };
const attendanceCalendarGrid = { display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: '6px' };
const attendanceCalendarDayBtn = { position: 'relative', border: '1px solid #e2e8f0', borderRadius: '12px', backgroundColor: '#fff', padding: '8px 6px', minHeight: '68px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' };
const attendanceCalendarDayBtnDisabled = { cursor: 'not-allowed', opacity: 0.5, backgroundColor: '#f8fafc' };
const attendanceCalendarDayCircle = { width: '38px', height: '38px', borderRadius: '999px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900', fontSize: '14px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a' };
const attendanceCalendarDayCircleActive = { boxShadow: '0 8px 18px rgba(15, 23, 42, 0.18)', transform: 'translateY(-1px)' };
const attendanceCalendarEditPanel = { marginTop: '12px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', justifyContent: 'space-between' };
const attendanceCalendarSelectedLabel = { fontWeight: '800', color: '#0f172a' };
const attendanceCalendarNoteCard = { marginTop: '12px', border: '1px solid #fcd34d', background: 'linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%)', borderRadius: '14px', padding: '12px 14px', boxShadow: '0 12px 24px rgba(15, 23, 42, 0.12)' };
const attendanceCalendarNoteTitle = { fontWeight: '900', color: '#92400e', marginBottom: '6px', fontSize: '15px' };
const attendanceCalendarNoteBody = { color: '#78350f', fontWeight: '800', lineHeight: '1.7' };
const attendanceCalendarNoteMeta = { marginTop: '6px', color: '#92400e', fontWeight: '700', fontSize: '12px' };
const attendanceClassRow = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(185px, 1fr))', gap: '10px', marginBottom: '10px' };
const attendanceClassBtn = { border: '1px solid #cbd5e1', backgroundColor: '#fff', borderRadius: '12px', textAlign: 'right', padding: '10px 12px', cursor: 'pointer' };
const attendanceClassBtnActive = { borderColor: '#1d4ed8', backgroundColor: '#eff6ff', boxShadow: '0 8px 20px rgba(37, 99, 235, 0.18)' };
const attendanceClassTitle = { color: '#0f172a', fontSize: '16px', fontWeight: '900', marginBottom: '4px' };
const attendanceClassMeta = { color: '#475569', fontSize: '13px', fontWeight: '700' };
const attendanceSectionRow = { display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' };
const attendanceSectionBtn = { padding: '8px 14px', borderRadius: '10px', border: '1px solid #93c5fd', backgroundColor: '#eff6ff', color: '#1e3a8a', fontWeight: '800', cursor: 'pointer', fontSize: '14px' };
const attendanceSectionBtnActive = { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8', color: '#fff' };
const attendanceDeviceTimeHint = { marginBottom: '12px', border: '1px dashed #7dd3fc', backgroundColor: '#f0f9ff', color: '#0c4a6e', borderRadius: '10px', padding: '9px 12px', fontWeight: '700', fontSize: '13px', lineHeight: '1.6' };
const attendanceEmptyHint = { border: '1px dashed #94a3b8', borderRadius: '10px', padding: '12px', color: '#475569', fontWeight: '700', marginBottom: '12px', backgroundColor: '#f8fafc' };
const attendanceFormGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '10px', alignItems: 'center' };
const _attendanceCounterInput = { width: '86px', textAlign: 'center', padding: '8px', borderRadius: '8px', border: '1px solid #94a3b8', fontWeight: '800', fontSize: '15px' };
const attendanceWarningBadge = { display: 'inline-block', border: '1px solid', borderRadius: '999px', padding: '6px 11px', fontSize: '13px', fontWeight: '900', marginBottom: '5px' };
const attendanceWarningNote = { fontSize: '12px', color: '#475569', fontWeight: '700', lineHeight: '1.5' };
const _attendanceHistoryBox = { textAlign: 'right', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '7px 8px', lineHeight: '1.45' };
const _attendanceHistoryMain = { color: '#0f172a', fontSize: '13px', fontWeight: '800' };
const _attendanceHistoryMeta = { color: '#475569', fontSize: '12px', fontWeight: '700' };
const _attendanceAbsenceProof = { color: '#b91c1c', fontSize: '12px', fontWeight: '800' };
const _attendanceHistoryDetails = { marginTop: '4px' };
const _attendanceHistorySummary = { cursor: 'pointer', color: '#1d4ed8', fontSize: '12px', fontWeight: '800' };
const _attendanceHistoryList = { marginTop: '4px', borderTop: '1px dashed #cbd5e1', paddingTop: '4px' };
const _attendanceHistoryItem = { color: '#334155', fontSize: '11px', fontWeight: '700' };
const attendanceActionRow = { display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px' };
const _attendanceStatusSelect = { width: '100%', minWidth: '100px', padding: '8px 10px', borderRadius: '8px', border: '1px solid #93c5fd', fontWeight: '800', backgroundColor: '#f8fbff', color: '#1e3a8a' };
const attendanceStatusOptionsRow = { display: 'flex', flexWrap: 'wrap', gap: '6px' };
const attendanceStatusOptionBtn = { padding: '7px 12px', borderRadius: '999px', border: '1px solid', fontWeight: '800', cursor: 'pointer', fontSize: '13px', backgroundColor: '#fff' };
const attendanceStatusOptionLeave = { color: '#1d4ed8', borderColor: '#93c5fd', backgroundColor: '#dbeafe' };
const attendanceStatusOptionLicense = { color: '#92400e', borderColor: '#fcd34d', backgroundColor: '#fef3c7' };
const attendanceStatusOptionAbsence = { color: '#b91c1c', borderColor: '#fca5a5', backgroundColor: '#fee2e2' };
const attendanceStatusOptionActive = { boxShadow: '0 10px 18px rgba(15, 23, 42, 0.18)', transform: 'translateY(-1px)' };
const attendanceStatusOptionLeaveActive = { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8', color: '#fff' };
const attendanceStatusOptionLicenseActive = { backgroundColor: '#92400e', borderColor: '#92400e', color: '#fff' };
const attendanceStatusOptionAbsenceActive = { backgroundColor: '#b91c1c', borderColor: '#b91c1c', color: '#fff' };
const attendanceReasonInput = { marginTop: '6px', width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid #f59e0b', backgroundColor: '#fff7ed', fontWeight: '700', fontSize: '13px' };
const attendanceLicenseTimeLabel = { marginTop: '4px', color: '#475569', fontSize: '12px', fontWeight: '700' };
const attendanceApplyIconBtn = { width: '36px', height: '34px', borderRadius: '10px', border: '1px solid #16a34a', backgroundColor: '#dcfce7', color: '#166534', cursor: 'pointer', fontWeight: '900', fontSize: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };
const attendanceUndoIconBtn = { width: '36px', height: '34px', borderRadius: '10px', border: '1px solid #94a3b8', backgroundColor: '#f8fafc', color: '#334155', cursor: 'pointer', fontWeight: '900', fontSize: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' };
const attendanceEditBtn = { padding: '7px 12px', borderRadius: '8px', border: '1px solid #f59e0b', backgroundColor: '#fef3c7', color: '#92400e', cursor: 'pointer', fontWeight: '800', fontSize: '13px' };
