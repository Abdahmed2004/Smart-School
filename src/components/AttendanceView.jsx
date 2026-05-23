import React, { useEffect, useMemo, useState } from 'react';

export default function AttendanceView(props) {
  const { styles, helpers, data, handlers } = props;

  const {
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
    attendanceEditControls,
    attendanceEditSelect,
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
  } = styles;

  const {
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
  } = helpers;

  const {
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
  } = data;

  const {
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
  } = handlers;

  const weekdayLabels = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس"];
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [calendarSelectedDate, setCalendarSelectedDate] = useState("");
  const [calendarOpenLicenseDate, setCalendarOpenLicenseDate] = useState(null);

  const parseDateKey = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test((value || "").toString())) return null;
    const [year, month, day] = value.split("-").map((part) => Number(part));
    const parsed = new Date(year, month - 1, day);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  };

  const buildDateKey = (dateObj) => {
    if (!(dateObj instanceof Date)) return "";
    const year = dateObj.getFullYear();
    const month = `${dateObj.getMonth() + 1}`.padStart(2, "0");
    const day = `${dateObj.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    if (!attendanceEditStudent) return;
    const firstWeekdayEntry = (attendanceEditEntries || []).find((entry) => {
      const parsed = parseDateKey(entry?.dateKey);
      return parsed && parsed.getDay() < 5;
    });
    const seedKey = firstWeekdayEntry?.dateKey || attendanceSelectedDate || "";
    const parsed = parseDateKey(seedKey);
    if (parsed) {
      setCalendarMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
      setCalendarSelectedDate(seedKey);
    } else {
      setCalendarMonth(new Date());
      setCalendarSelectedDate("");
    }
    setCalendarOpenLicenseDate(null);
  }, [attendanceEditStudent, attendanceEditEntries, attendanceSelectedDate]);

  const recordedDates = useMemo(() => (
    new Set((attendanceEditEntries || []).map((entry) => entry.dateKey))
  ), [attendanceEditEntries]);

  const calendarMonthLabel = useMemo(() => (
    calendarMonth.toLocaleDateString('ar-IQ', { month: 'long', year: 'numeric' })
  ), [calendarMonth]);

  const calendarCells = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const monthIndex = calendarMonth.getMonth();
    const startOfMonth = new Date(year, monthIndex, 1);
    const endOfMonth = new Date(year, monthIndex + 1, 0);
    const startDay = startOfMonth.getDay();
    const daysInMonth = endOfMonth.getDate();
    const cells = [];

    const leadingBlanks = startDay <= 4 ? startDay : 0;
    for (let i = 0; i < leadingBlanks; i += 1) {
      cells.push({ key: `empty-start-${i}`, empty: true });
    }

    for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber += 1) {
      const cellDate = new Date(year, monthIndex, dayNumber);
      const weekDay = cellDate.getDay();
      if (weekDay === 5 || weekDay === 6) continue;

      const dateKey = buildDateKey(cellDate);
      const hasRecord = recordedDates.has(dateKey);
      const statusCode = hasRecord
        ? attendanceEditStudent?.attendanceByDate?.[dateKey]
        : null;
      const visual = statusCode ? getAttendanceStatusVisual(statusCode) : null;
      const note = statusCode === "R"
        ? getAttendanceNoteForDate(attendanceEditStudent, dateKey, "R")
        : "";

      cells.push({
        key: dateKey,
        dateKey,
        dayNumber,
        hasRecord,
        statusCode,
        visual,
        note
      });
    }

    while (cells.length % 5 !== 0) {
      cells.push({ key: `empty-end-${cells.length}`, empty: true });
    }
    return cells;
  }, [calendarMonth, recordedDates, attendanceEditStudent, getAttendanceStatusVisual, getAttendanceNoteForDate, buildDateKey]);

  const calendarSelectedHasRecord = !!(calendarSelectedDate && recordedDates.has(calendarSelectedDate));
  const selectedBaseStatusCode = calendarSelectedHasRecord
    && ATTENDANCE_STATUS_LOOKUP[attendanceEditStudent?.attendanceByDate?.[calendarSelectedDate]]
    ? attendanceEditStudent.attendanceByDate[calendarSelectedDate]
    : "H";
  const selectedDraft = attendanceEditDrafts?.[calendarSelectedDate] || {};
  const selectedDraftStatusCode = ATTENDANCE_STATUS_LOOKUP[selectedDraft.statusCode]
    ? selectedDraft.statusCode
    : selectedBaseStatusCode;
  const calendarOpenLicenseNote = useMemo(() => {
    if (!calendarOpenLicenseDate || !attendanceEditStudent) return "";
    return getAttendanceNoteForDate(attendanceEditStudent, calendarOpenLicenseDate, "R");
  }, [calendarOpenLicenseDate, attendanceEditStudent, getAttendanceNoteForDate]);

  return (
    <div style={whiteCard} className="attendance-scope">
            <style>{`
              .attendance-scope button,
              .attendance-scope .file-upload-btn {
                transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease;
              }
              .attendance-scope button:hover,
              .attendance-scope .file-upload-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 20px rgba(15, 23, 42, 0.15);
                filter: brightness(0.98);
              }
              .attendance-scope button:active,
              .attendance-scope .file-upload-btn:active {
                transform: translateY(0);
                box-shadow: 0 4px 10px rgba(15, 23, 42, 0.12);
              }
              .attendance-scope button:disabled,
              .attendance-scope .file-upload-btn[aria-disabled="true"] {
                cursor: not-allowed;
                opacity: 0.7;
                pointer-events: none;
                box-shadow: none;
                transform: none;
              }
            `}</style>
            <div style={attendanceTopRow}>
              <h2 style={{ margin: 0, color: '#0f172a' }}>نظام الحضور والغياب</h2>
              <div style={attendanceTopActions}>
                <div style={attendanceDatePickerGroup}>
                  <button
                    type="button"
                    onClick={() => shiftAttendanceSelectedDate(-1)}
                    style={attendanceDateArrowBtn}
                    aria-label="اليوم السابق"
                    title="اليوم السابق"
                  >
                    ◀
                  </button>
                  <div style={attendanceDateField}>
                    <input
                      type="date"
                      value={attendanceSelectedDate}
                      onChange={handleAttendanceDateChange}
                      style={attendanceDateInput}
                    />
                    <div style={attendanceWeekdayLabel}>
                      {formatWeekdayForDisplay(attendanceSelectedDate)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => shiftAttendanceSelectedDate(1)}
                    style={attendanceDateArrowBtn}
                    aria-label="اليوم التالي"
                    title="اليوم التالي"
                  >
                    ▶
                  </button>
                </div>
                <button
                  type="button"
                  onClick={applyAttendanceDateForAllStudents}
                  style={attendanceDateApplyBtn}
                >اعتماد التاريخ لجميع الصفوف</button>
                <div style={attendanceUploadGroup}>
                  <label className="file-upload-btn" style={attendanceUploadBtn} aria-disabled={isAttendanceImporting}>
                    {isAttendanceImporting ? 'جاري قراءة ملف Excel...' : 'رفع ملف Excel للطلاب'}
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleAttendanceExcelUpload}
                      disabled={isAttendanceImporting}
                      style={{ display: 'none' }}
                    />
                  </label>
                  <button
                    type="button"
                    style={attendanceInfoBtn}
                    onClick={() => setShowAttendanceExcelInfo(true)}
                    title="⚠️ لم يتم العثور على مدرسين بتخصصات معروفة. تحقق من ملف الإكسل."
                    aria-label="اسم الطالب"
                  >
                    i
                  </button>
                </div>
                <input
                  value={attendanceSearch}
                  onChange={(event) => setAttendanceSearch(event.target.value)}
                  placeholder="ابحث باسم الطالب داخل الشعبة الحالية"
                  style={attendanceSearchInput}
                />
              </div>
            </div>

            {attendanceImportMessage && (
              <div style={attendanceImportMessageBox}>{attendanceImportMessage}</div>
            )}
            {attendanceDateMessage && (
              <div style={attendanceDateMessageBox}>{attendanceDateMessage}</div>
            )}

            <div style={attendanceStatsGrid}>
              <div style={attendanceStatCard}>
                <span style={attendanceStatLabel}>عدد الطلاب</span>
                <strong style={attendanceStatValue}>{attendanceStats.totalStudents}</strong>
              </div>
              <div style={attendanceStatCard}>
                <span style={attendanceStatLabel}>عدد الحضور</span>
                <strong style={attendanceStatValue}>{attendanceStats.daily.present}</strong>
              </div>
              <div style={attendanceStatCard}>
                <span style={attendanceStatLabel}>عدد الغياب</span>
                <strong style={attendanceStatValue}>{attendanceStats.daily.absence}</strong>
              </div>
            </div>

            <div style={attendanceWarningSummaryRow}>
              {ATTENDANCE_WARNING_BUTTONS.map((item) => {
                const isActive = attendanceWarningFilter === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setAttendanceWarningStudentId(null);
                      setAttendanceWarningFilter((prev) => (prev === item.key ? null : item.key));
                    }}
                    style={{
                      ...attendanceWarningPill,
                      backgroundColor: item.bg,
                      borderColor: item.border,
                      color: item.color,
                      ...(isActive ? attendanceWarningPillActive : {})
                    }}
                    aria-pressed={isActive}
                  >
                    {item.label}: {attendanceStats.warningCounts[item.key] || 0}
                  </button>
                );
              })}
            </div>

            {attendanceWarningFilter && (
              <div style={attendanceWarningPanel}>
                <div style={attendanceWarningPanelHeader}>
                  <span>{activeWarningMeta?.label || ''}</span>
                  <span>عدد الطلاب: {activeWarningList.length}</span>
                </div>
                <div style={attendanceWarningHint}>جميع الطلاب يُسجلون حضوراً افتراضياً بعد الضغط على "اعتماد التاريخ لجميع الصفوف"، ثم عدّل فقط حالات الإجازة/الرخصة/الغياب. يتم حفظ وقت الجهاز الفعلي عند كل تثبيت/تراجع.</div>
                <div style={attendanceWarningList}>
                  {activeWarningList.map((student) => (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => setAttendanceWarningStudentId(student.id)}
                      style={attendanceWarningCard}
                      title="نظام الحضور والغياب"
                    >
                      <div style={attendanceWarningName}>{student.name}</div>
                      <div style={attendanceWarningMeta}>
                        الصف: {student.className || 'غير محدد'} | الشعبة: {student.section || 'غير محددة'}
                      </div>
                      <div style={attendanceWarningMeta}>أيام الغياب: {student.absenceDays}</div>
                      <div style={attendanceWarningMeta}>آخر غياب: {student.absenceLabel}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeWarningStudent && (
              <div style={attendanceDetailOverlay}>
                <div style={attendanceDetailCard}>
                  <div style={attendanceDetailHeader}>
                    <div>
                      <h3 style={attendanceDetailTitle}>{activeWarningStudent.name || 'بدون اسم'}</h3>
                      <div style={attendanceDetailSubtitle}>
                        الصف: {activeWarningStudent.className || 'غير محدد'} | الشعبة: {activeWarningStudent.section || 'غير محددة'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttendanceWarningStudentId(null)}
                      style={attendanceDetailCloseBtn}
                    >✕ إغلاق</button>
                  </div>

                  <div style={attendanceDetailBadges}>
                    <span style={attendanceDetailBadge}>مجموع الحضور{normalizeAttendanceNumber(activeWarningStudent.presentDays)}
                    </span>
                    <span style={attendanceDetailBadge}>
                      الإجازة: {normalizeAttendanceNumber(activeWarningStudent.leaveDays)}
                    </span>
                    <span style={attendanceDetailBadge}>رخصة{normalizeAttendanceNumber(activeWarningStudent.licenseDays)}
                    </span>
                    <span style={attendanceDetailBadge}>مجموع الغياب{normalizeAttendanceNumber(activeWarningStudent.absenceDays)}
                    </span>
                    {activeWarningStudentWarning && (
                      <span
                        style={{
                          ...attendanceDetailBadge,
                          color: activeWarningStudentWarning.color,
                          backgroundColor: activeWarningStudentWarning.bg,
                          borderColor: activeWarningStudentWarning.border
                        }}
                      >
                        {activeWarningStudentWarning.label}
                      </span>
                    )}
                  </div>

                  <div style={attendanceDetailInfoGrid}>
                    <div style={attendanceDetailInfoCard}>
                      <div style={attendanceDetailInfoTitle}>آخر غياب</div>
                      <div style={attendanceDetailInfoValue}>
                        {activeWarningStudentAbsence
                          ? `${activeWarningStudentAbsence.dateText} | ${activeWarningStudentAbsence.timeText}`
                          : 'لا يوجد غياب مثبت'}
                      </div>
                    </div>
                    <div style={attendanceDetailInfoCard}>
                      <div style={attendanceDetailInfoTitle}>آخر رخصة</div>
                      <div style={attendanceDetailInfoValue}>
                        {activeWarningStudentLicense ? (
                          <>
                            <div>{activeWarningStudentLicense.dateText} | {activeWarningStudentLicense.timeText}</div>
                            {activeWarningStudentLicense.note && (
                              <div style={attendanceDetailNote}>سبب الرخصة: {activeWarningStudentLicense.note}</div>
                            )}
                          </>
                        ) : 'لا توجد دروس'}
                      </div>
                    </div>
                    <div style={attendanceDetailInfoCard}>
                      <div style={attendanceDetailInfoTitle}>آخر إجازة</div>
                      <div style={attendanceDetailInfoValue}>
                        {activeWarningStudentLeave
                          ? `${activeWarningStudentLeave.dateText} | ${activeWarningStudentLeave.timeText}`
                          : ' | جميع الطلاب يُسجلون حضوراً افتراضياً بعد الضغط على "اعتماد التاريخ لجميع الصفوف"، ثم عدّل فقط حالات الإجازة/الرخصة/الغياب. يتم حفظ وقت الجهاز الفعلي عند كل تثبيت/تراجع.'}
                      </div>
                    </div>
                  </div>

                  <div style={attendanceDetailHistoryHeader}>الحضور والغياب</div>
                  {activeWarningStudentHistory.length === 0 ? (
                    <div style={attendanceDetailHistoryEmpty}>لا يوجد توثيق بعد</div>
                  ) : (
                    <div style={attendanceDetailHistoryList}>
                      {activeWarningStudentHistory.map((entry) => {
                        const visual = getAttendanceStatusVisual(entry.statusCode);
                        return (
                          <div key={entry.id} style={attendanceDetailHistoryItem}>
                            <div style={attendanceDetailHistoryRow}>
                              <span style={attendanceDetailHistoryDate}>
                                {entry.dateText} | {entry.timeText}
                              </span>
                              <span style={attendanceDetailHistoryStatus}>
                                <span
                                  style={{
                                    ...attendanceStatusBadge,
                                    color: visual.color,
                                    backgroundColor: visual.bg,
                                    borderColor: visual.border
                                  }}
                                >
                                  {entry.statusLabel}
                                </span>
                                <span style={attendanceDetailHistoryAction}>
                                  ({getAttendanceActionLabel(entry.action)})
                                </span>
                              </span>
                            </div>
                            {entry.note && entry.statusCode === "R" && (
                              <div style={attendanceDetailNote}>سبب الرخصة: {entry.note}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {attendanceEditStudent && (
              <div style={attendanceEditOverlay}>
                <div style={attendanceEditCard}>
                  <div style={attendanceEditHeader}>
                    <div>
                      <h3 style={attendanceEditTitle}>اسم الطالب</h3>
                      <div style={attendanceEditSubtitle}>
                        {attendanceEditStudent.name || 'بدون اسم'} | الصف: {attendanceEditStudent.className || 'غير محدد'} | الشعبة: {attendanceEditStudent.section || 'غير محددة'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAttendanceEditStudentId(null);
                        setAttendanceEditDrafts({});
                      }}
                      style={attendanceEditCloseBtn}
                    >✕ إغلاق</button>
                  </div>

                  {attendanceEditEntries.length === 0 ? (
                    <div style={attendanceEditEmpty}>لا توجد سجلات حضور لهذا الطالب بعد.</div>
                  ) : (
                    <>
                      <div style={attendanceCalendarWrapper}>
                        <div style={attendanceCalendarHeader}>
                          <button
                            type="button"
                            onClick={() => {
                              setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
                              setCalendarOpenLicenseDate(null);
                            }}
                            style={attendanceCalendarNavBtn}
                            aria-label="الشهر السابق"
                            title="الشهر السابق"
                          >
                            ◀
                          </button>
                          <div style={attendanceCalendarMonthLabel}>{calendarMonthLabel}</div>
                          <button
                            type="button"
                            onClick={() => {
                              setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
                              setCalendarOpenLicenseDate(null);
                            }}
                            style={attendanceCalendarNavBtn}
                            aria-label="الشهر التالي"
                            title="الشهر التالي"
                          >
                            ▶
                          </button>
                        </div>
                        <div style={attendanceCalendarWeekRow}>
                          {weekdayLabels.map((label) => (
                            <div key={label} style={attendanceCalendarWeekCell}>{label}</div>
                          ))}
                        </div>
                        <div style={attendanceCalendarGrid}>
                          {calendarCells.map((cell) => {
                            if (cell.empty) {
                              return <div key={cell.key} />;
                            }

                            const isSelected = calendarSelectedDate === cell.dateKey;
                            const circleStyle = cell.visual
                              ? {
                                  ...attendanceCalendarDayCircle,
                                  backgroundColor: cell.visual.bg,
                                  borderColor: cell.visual.border,
                                  color: cell.visual.color
                                }
                              : attendanceCalendarDayCircle;

                            return (
                              <button
                                key={cell.key}
                                type="button"
                                onClick={() => {
                                  if (!cell.hasRecord) return;
                                  setCalendarSelectedDate(cell.dateKey);
                                  if (cell.statusCode === "R") {
                                    setCalendarOpenLicenseDate((prev) => (prev === cell.dateKey ? null : cell.dateKey));
                                  } else {
                                    setCalendarOpenLicenseDate(null);
                                  }
                                }}
                                style={{
                                  ...attendanceCalendarDayBtn,
                                  ...(cell.hasRecord ? {} : attendanceCalendarDayBtnDisabled)
                                }}
                                aria-label={formatDateKeyForDisplay(cell.dateKey)}
                                title={formatDateKeyForDisplay(cell.dateKey)}
                              >
                                <div
                                  style={{
                                    ...circleStyle,
                                    ...(isSelected ? attendanceCalendarDayCircleActive : {})
                                  }}
                                >
                                  {cell.dayNumber}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {calendarOpenLicenseDate && (
                        <div style={attendanceCalendarNoteCard}>
                          <div style={attendanceCalendarNoteTitle}>سبب الرخصة</div>
                          <div style={attendanceCalendarNoteBody}>
                            {calendarOpenLicenseNote || "لم يتم تسجيل سبب للرخصة."}
                          </div>
                          <div style={attendanceCalendarNoteMeta}>
                            التاريخ: {formatDateKeyForDisplay(calendarOpenLicenseDate)} | {formatWeekdayForDisplay(calendarOpenLicenseDate)}
                          </div>
                        </div>
                      )}

                      <div style={attendanceCalendarEditPanel}>
                        {calendarSelectedHasRecord ? (
                          <>
                            <div style={attendanceCalendarSelectedLabel}>
                              التاريخ المحدد: {formatDateKeyForDisplay(calendarSelectedDate)} | {formatWeekdayForDisplay(calendarSelectedDate)}
                            </div>
                            <div style={attendanceEditControls}>
                              <select
                                value={selectedDraftStatusCode}
                                onChange={(event) => {
                                  const nextCode = event.target.value;
                                  setAttendanceEditDrafts((prev) => ({
                                    ...prev,
                                    [calendarSelectedDate]: {
                                      statusCode: nextCode,
                                      note: prev?.[calendarSelectedDate]?.note || ""
                                    }
                                  }));
                                }}
                                style={attendanceEditSelect}
                              >
                                {ATTENDANCE_STATUS_OPTIONS.map((status) => (
                                  <option key={status.code} value={status.code}>
                                    {status.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleAttendanceEditSave(attendanceEditStudent, calendarSelectedDate)}
                              style={attendanceEditSaveBtn}
                            >
                              حفظ
                            </button>
                          </>
                        ) : (
                          <div style={attendanceEditEmpty}>اختر يوماً مسجلاً لعرض الحالة.</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            <div style={attendanceClassRow}>
              {attendanceClassesOverview.map((classItem) => (
                <button
                  key={classItem.className}
                  type="button"
                  onClick={() => {
                    setAttendanceSelectedClass(classItem.className);
                    setAttendanceClassName(classItem.className);
                    const nextSection = classItem.sections[0] || '';
                    setAttendanceSelectedSection(nextSection);
                    if (nextSection) setAttendanceSection(nextSection);
                  }}
                  style={{
                    ...attendanceClassBtn,
                    ...(attendanceSelectedClass === classItem.className ? attendanceClassBtnActive : {})
                  }}
                >
                  <div style={attendanceClassTitle}>{classItem.className}</div>
                  <div style={attendanceClassMeta}>الطلاب: {classItem.studentsCount} | الشعب: {classItem.sectionsCount}
                  </div>
                </button>
              ))}
            </div>

            <div style={attendanceSectionRow}>
              {attendanceSectionsForSelectedClass.length === 0 ? (
                <div style={attendanceEmptyHint}>لا توجد شعب مسجلة لهذا الصف حالياً. يمكنك رفع ملف Excel أو إضافة طالب يدوياً.</div>
              ) : (
                attendanceSectionsForSelectedClass.map((section) => (
                  <button
                    key={`${attendanceSelectedClass}-${section}`}
                    type="button"
                    onClick={() => {
                      setAttendanceSelectedSection(section);
                      setAttendanceSection(section);
                    }}
                    style={{
                      ...attendanceSectionBtn,
                      ...(attendanceSelectedSection === section ? attendanceSectionBtnActive : {})
                    }}
                  >
                    شعبة {section}
                  </button>
                ))
              )}
            </div>

            <div style={attendanceFormGrid}>
              <input
                value={attendanceStudentName}
                onChange={(event) => setAttendanceStudentName(event.target.value)}
                placeholder="اسم الطالب"
                style={inputS}
              />
              <select
                value={attendanceClassName}
                onChange={(event) => {
                  const nextClass = event.target.value;
                  setAttendanceClassName(nextClass);
                  setAttendanceSelectedClass(nextClass);
                }}
                style={inputS}
              >
                {classesNames.map((className) => (
                  <option key={className}>{className}</option>
                ))}
              </select>
              <select
                value={attendanceSection}
                onChange={(event) => {
                  const nextSection = normalizeSectionName(event.target.value);
                  setAttendanceSection(nextSection);
                  setAttendanceSelectedSection(nextSection);
                }}
                style={inputS}
              >
                {attendanceFormSectionOptions.map((section) => (
                  <option key={section}>{section}</option>
                ))}
              </select>
              <button onClick={handleAddAttendanceStudent} style={greenBtn}>
                + إضافة طالب
              </button>
            </div>

            <div style={attendanceDeviceTimeHint}>التاريخ المعتمد حالياً: {formatDateKeyForDisplay(attendanceSelectedDate)} | جميع الطلاب يُسجلون حضوراً افتراضياً بعد الضغط على "اعتماد التاريخ لجميع الصفوف"، ثم عدّل فقط حالات الإجازة/الرخصة/الغياب. يتم حفظ وقت الجهاز الفعلي عند كل تثبيت/تراجع.</div>

            {attendanceSelectedSection ? (
              <div style={{ overflowX: 'auto', marginTop: '18px' }}>
                <table style={modernTable}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ ...thStyle, width: '6%' }}>#</th>
                      <th style={{ ...thStyle, width: '34%' }}>اسم الطالب</th>
                      <th style={{ ...thStyle, width: '18%' }}>الإنذار</th>
                      <th style={{ ...thStyle, width: '18%' }}>حالة اليوم</th>
                      <th style={{ ...thStyle, width: '24%' }}>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceStudentsInSelectedSection.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ ...tdStyle, textAlign: 'center', color: '#64748b', padding: '26px 12px' }}>لا توجد أسماء داخل {attendanceSelectedClass} - شعبة {attendanceSelectedSection} حسب البحث الحالي.</td>
                      </tr>
                    ) : (
                      attendanceStudentsInSelectedSection.map((student, index) => {
                        const safeAbsence = normalizeAttendanceNumber(student.absenceDays);
                        const warning = getAttendanceWarning(safeAbsence);
                        const nextThreshold = getNextAttendanceThreshold(safeAbsence);
                        const note = nextThreshold
                          ? `المتبقي ${nextThreshold - safeAbsence} يوم للإنذار التالي`
                          : 'تم الوصول إلى حد إنذار الفصل';
                        const licenseTimeForDate = getAttendanceTimeForDate(student, attendanceSelectedDate, "R");

                        return (
                          <tr key={student.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={tdStyle}>{index + 1}</td>
                            <td style={{ ...tdStyle, fontWeight: '800' }}>{student.name}</td>
                            <td style={tdStyle}>
                              <div
                                style={{
                                  ...attendanceWarningBadge,
                                  color: warning.color,
                                  backgroundColor: warning.bg,
                                  borderColor: warning.border
                                }}
                              >
                                {warning.label}
                              </div>
                              <div style={attendanceWarningNote}>{note}</div>
                            </td>
                            <td style={tdStyle}>
                              <div style={attendanceStatusOptionsRow}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAttendanceLicenseStudentId(null);
                                    updateAttendanceStudent(student.id, { dailyStatus: "M", licenseReasonDraft: "" });
                                  }}
                                  style={{
                                    ...attendanceStatusOptionBtn,
                                    ...attendanceStatusOptionLeave,
                                    ...(student.dailyStatus === "M"
                                      ? { ...attendanceStatusOptionActive, ...attendanceStatusOptionLeaveActive }
                                      : {})
                                  }}
                                >
                                  مجاز
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleLicenseClick(student)}
                                  style={{
                                    ...attendanceStatusOptionBtn,
                                    ...attendanceStatusOptionLicense,
                                    ...(student.dailyStatus === "R"
                                      ? { ...attendanceStatusOptionActive, ...attendanceStatusOptionLicenseActive }
                                      : {})
                                  }}
                                >
                                  رخصة
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAttendanceLicenseStudentId(null);
                                    updateAttendanceStudent(student.id, { dailyStatus: "G", licenseReasonDraft: "" });
                                  }}
                                  style={{
                                    ...attendanceStatusOptionBtn,
                                    ...attendanceStatusOptionAbsence,
                                    ...(student.dailyStatus === "G"
                                      ? { ...attendanceStatusOptionActive, ...attendanceStatusOptionAbsenceActive }
                                      : {})
                                  }}
                                >
                                  غائب
                                </button>
                              </div>
                              {student.dailyStatus === "R" && (
                                <>
                                  {attendanceLicenseStudentId === student.id && (
                                    <div style={attendanceReasonPopover}>
                                      <input
                                        value={student.licenseReasonDraft || ""}
                                        onChange={(event) => updateAttendanceStudent(student.id, { licenseReasonDraft: event.target.value })}
                                        placeholder="سبب الرخصة"
                                        style={attendanceReasonInput}
                                      />
                                    </div>
                                  )}
                                  {licenseTimeForDate && (
                                    <div style={attendanceLicenseTimeLabel}>{licenseTimeForDate}</div>
                                  )}
                                </>
                              )}
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'center' }}>
                              <div style={attendanceActionRow}>
                                <button
                                  onClick={() => {
                                    applyDailyAttendanceStatus(student);
                                    setAttendanceLicenseStudentId(null);
                                  }}
                                  style={attendanceApplyIconBtn}
                                  aria-label="تثبيت اليوم"
                                  title="تثبيت اليوم"
                                >
                                  ✔
                                </button>
                                <button
                                  onClick={() => {
                                    undoDailyAttendanceStatus(student);
                                    setAttendanceLicenseStudentId(null);
                                  }}
                                  style={attendanceUndoIconBtn}
                                  aria-label="تراجع"
                                  title="تراجع"
                                >
                                  ↺
                                </button>
                                <button
                                  onClick={() => {
                                    setAttendanceWarningStudentId(null);
                                    setAttendanceEditDrafts({});
                                    setAttendanceEditStudentId(student.id);
                                  }}
                                  style={attendanceEditBtn}
                                >تعديل الحالة</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={attendanceEmptyHint}>اختر شعبة من الأعلى لعرض قائمة الطلاب الخاصة بها.</div>
            )}
          </div>
  );
}
