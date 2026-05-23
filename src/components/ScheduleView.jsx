import React from 'react';

export default function ScheduleView(props) {
  const { styles, helpers, data, handlers } = props;

  const {
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
  } = styles;

  const {
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
    getUniqueTeacherClasses
  } = helpers;

  const {
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
    _teacherSearchQuery,
    studentScheduleMode,
    teacherCardsBySubject,
    selectedTeacherDetails,
    selectedTeacherId,
    hoveredTeacherCardKey,
    showSelectedSubjectColumn,
    teacherDetailRef
  } = data;

  const {
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
  } = handlers;

  const getSectionRank = (section) => {
    const normalized = (section || "").toString().trim();
    const knownIndex = sectionsList.indexOf(normalized);
    return knownIndex === -1 ? sectionsList.length : knownIndex;
  };

  const studentClassGroups = classesNames
    .map((className) => {
      const items = classes
        .filter((item) => item.name === className)
        .sort((a, b) => {
          const rankDiff = getSectionRank(a.section) - getSectionRank(b.section);
          if (rankDiff !== 0) return rankDiff;
          return (a.section || "").localeCompare(b.section || "", "ar");
        });

      if (items.length === 0) return null;

      return {
        name: className,
        items: items.map((item, index) => ({
          ...item,
          columnTheme: getClassSectionStyle(className, index, items.length)
        })),
        theme: getClassPrintStyle(className)
      };
    })
    .filter(Boolean);

  const orderedStudentClasses = studentClassGroups.flatMap((group) => group.items);
  const isSubjectOnlyMode = studentScheduleMode === 'subjects';
  const studentScheduleTitle = isSubjectOnlyMode
    ? 'الجدول بدون أسماء المدرسين'
    : 'الجدول مع أسماء المدرسين';
  const studentScheduleCardStyle = isSubjectOnlyMode
    ? {
        background: '#fff',
        padding: '2mm 2.4mm',
        borderRadius: '8px',
        width: '297mm',
        minWidth: '297mm',
        maxWidth: '297mm',
        height: '210mm',
        minHeight: '210mm',
        color: '#000',
        margin: '0 auto',
        border: '1px solid #cbd5e1',
        boxSizing: 'border-box',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.45mm'
      }
    : {
        background: '#fff',
        padding: '20px',
        borderRadius: '15px',
        minWidth: '1100px',
        color: '#000',
        margin: '0 auto',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      };
  const formatLessonLabel = (value) => (value || "").toString().replace(/^د\s*/, "");
  const formatScheduleSubjectLabel = (value) => {
    const normalized = (value || "").toString().trim();
    return normalized === "اللغة الإنجليزية" ? "E" : normalized;
  };
  const formatCompactSubjectLabel = (value) => {
    const normalized = (value || "").toString().trim();
    const compactMap = {
      "التربية الإسلامية": "اسلامية",
      "اللغة العربية": "عربي",
      "اللغة الإنجليزية": "E",
      "الرياضيات": "رياضيات",
      "الفيزياء": "فيزياء",
      "الكيمياء": "كيمياء",
      "الأحياء": "احياء",
      "التاريخ": "تاريخ",
      "الجغرافيا": "جغرافية",
      "علم الاجتماع": "اجتماع",
      "الفلسفة": "فلسفة",
      "الاقتصاد": "اقتصاد",
      "جرائم حزب البعث": "جرائم",
      "اللغة الكردية": "كردي",
      "الحاسوب": "حاسوب",
      "التربية الفنية": "فنية",
      "التربية الرياضية": "رياضة"
    };
    return compactMap[normalized] || formatScheduleSubjectLabel(normalized);
  };
  const parseTeacherClassChip = (label) => {
    const match = (label || "").toString().trim().match(/^(.*)\s+\((.*)\)$/);
    if (!match) return { name: label || "", section: "" };
    return {
      name: match[1].trim(),
      section: match[2].trim()
    };
  };
  const selectedTeacherClassChips = selectedTeacherDetails
    ? getUniqueTeacherClasses(selectedTeacherDetails.schedule).map(parseTeacherClassChip)
    : [];
  const renderDayLessonCell = (day, lessonNumber, dayTheme, { compact = false } = {}) => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: compact ? '3px' : '7px',
        lineHeight: 1,
        minHeight: compact ? '15px' : '28px',
        height: '100%'
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          width: compact ? '12px' : '18px',
          minWidth: compact ? '12px' : '18px',
          height: compact ? '14px' : '30px',
          overflow: 'visible'
        }}
      >
        <span
          style={{
            display: 'inline-block',
            transform: 'rotate(90deg)',
            transformOrigin: 'center',
            whiteSpace: 'nowrap',
            fontSize: compact ? '7px' : '11px',
            fontWeight: '900',
            color: dayTheme.text,
            lineHeight: 1,
            textAlign: 'center',
            letterSpacing: compact ? '0.2px' : '0.5px'
          }}
        >
          {day}
        </span>
      </span>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: compact ? '16px' : '24px',
          minHeight: compact ? '16px' : '24px',
          padding: compact ? '0px 4px' : '1px 7px',
          borderRadius: '999px',
          border: `1px solid ${dayTheme.border}`,
          backgroundColor: '#ffffff',
          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.06)',
          fontSize: compact ? '10px' : '14px',
          fontWeight: '900',
          color: '#0f172a'
        }}
      >
        {lessonNumber}
      </span>
    </div>
  );

  const renderQualityReport = () => {
    if (!scheduleQuality) return null;

    return (
      <>
        <div style={qualityPanel}>
          <span style={qualityChip}>التضاربات: {scheduleQuality.teacherConflicts}</span>
          <span style={qualityChip}>مخالفات الإجازة: {scheduleQuality.offDayViolations}</span>
          <span style={qualityChip}>الشواغر: {scheduleQuality.emptySlots}</span>
          <span style={qualityChip}>الحصص غير المكتملة: {scheduleQuality.unmetLessons}</span>
          {scheduleQuality.repairedLessons > 0 && (
            <span style={qualityChip}>حصص مُعوّضة: {scheduleQuality.repairedLessons}</span>
          )}
          {scheduleQuality.expandedLessons > 0 && (
            <span style={qualityChip}>توسعة خانات: {scheduleQuality.expandedLessons}</span>
          )}
        </div>

        {(scheduleQuality.unmetDetails?.length > 0 || scheduleQuality.emptySlotDetails?.length > 0) && (
          <div style={qualityDetails}>
            {scheduleQuality.unmetDetails?.length > 0 && (
              <>
                <div style={{ ...qualityLine, fontWeight: '900', color: '#0f172a', marginBottom: '6px' }}>
                  تقرير الحصص غير المكتملة
                </div>
                {scheduleQuality.unmetDetails.map((item) => (
                  <div key={item.key} style={qualityLine}>
                    • {item.classLabel} - {item.subject}: {item.done}/{item.required}
                    {item.teacherName ? ` | المدرس: ${item.teacherName}` : ""}
                    {` | السبب: ${item.reason} | الحل: ${item.suggestion}`}
                  </div>
                ))}
              </>
            )}

            {scheduleQuality.emptySlotDetails?.length > 0 && (
              <>
                <div style={{ ...qualityLine, fontWeight: '900', color: '#0f172a', marginTop: '10px', marginBottom: '6px' }}>
                  تقرير الشواغر
                </div>
                {scheduleQuality.emptySlotDetails.map((item) => (
                  <div key={item.key} style={qualityLine}>
                    • {item.classLabel} - {item.day} / {item.lesson}: {item.reason} | الحل: {item.suggestion}
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </>
    );
  };

  return (
    <div>
      {!showFinalTable && !showTeacherSchedule && (
        <nav style={navBarStyle}>
          <button onClick={() => setActiveTab('teachers')} 
                  style={activeTab === 'teachers' ? activeBtn : whiteBtn}>إدارة المدرسين</button>
          <button onClick={() => setActiveTab('classes')} 
                  style={activeTab === 'classes' ? activeBtn : whiteBtn}>
            إدارة الصفوف
          </button>
          <button onClick={() => setActiveTab('counts')} 
                  style={activeTab === 'counts' ? activeBtn : whiteBtn}>نصاب المواد</button>
          <button onClick={() => setActiveTab('link')} 
                  style={activeTab === 'link' ? activeBtn : whiteBtn}>ربط المهام</button>
          <button
            onClick={() => {
              closeTeacherScheduleExplorer();
              setStudentScheduleMode('teachers');
              setShowFinalTable(true);
            }}
            style={generateNavBtn}
          >توليد الجدول النهائي</button>
        </nav>
      )}
      <main style={mainContainer}>
        {/* تبويب: إدارة المدرسين */}
        {activeTab === 'teachers' && !showFinalTable && !showTeacherSchedule && (
          <div style={whiteCard}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px', alignItems:'center'}}>
               <h2 style={{color:'#000'}}>تسجيل الكادر التدريسي</h2>
               <label className="file-upload-btn" style={uploadBtn}>+ رفع إكسل المدرسين<input type="file" accept=".xlsx, .xls, .csv" 
                        onChange={handleFileUpload} style={{display:'none'}}/>
               </label>
            </div>
            
            <div style={formGrid}>
               <div style={field}>
                 <label style={labelS}>الاسم</label>
                 <input value={tName} onChange={e=>setTName(e.target.value)} style={inputS}/>
               </div>
               <div style={field}>
                 <label style={labelS}>المادة</label>
                 <select value={tSubject} onChange={e=>setTSubject(e.target.value)} style={inputS}>
                   <option value="">-- اختر المادة --</option>
                   {teacherSubjectOptions.map(s=><option key={s}>{s}</option>)}
                 </select>
               </div>
               <div style={field}>
                 <label style={labelS}>المنصب</label>
                 <select value={tRole} onChange={e=>setTRole(e.target.value)} style={inputS}>
                   <option>مدرس</option>
                   <option>معاون</option>
                   <option>مدير</option>
                 </select>
               </div>
               <div style={field}>
                 <label style={labelS}>الإجازة</label>
                 <select value={hasOffDay} onChange={e=>setHasOffDay(e.target.value)} style={yellowInput}>
                   <option value="no">لا يوجد</option>
                   <option value="yes">يوجد</option>
                 </select>
               </div>
               <div style={field}>
                 <label style={labelS}>يومها</label>
                 <select disabled={hasOffDay==='no'} value={tOffDay} 
                         onChange={e=>setTOffDay(e.target.value)} 
                         style={{...inputS, opacity: hasOffDay==='no'?0.3:1}}>
                   {daysList.map(d=><option key={d}>{d}</option>)}
                 </select>
               </div>
            </div>
            
            <div style={{display:'flex', gap:'10px', flexWrap:'wrap'}}>
              <button onClick={handleSaveTeacher} style={blueBtn}>
                {editingTeacherId ? 'حفظ التعديل' : '+ حفظ المدرس'}
              </button>
              {editingTeacherId && (
                <button onClick={resetTeacherForm} style={secondaryBtn}>إلغاء التعديل</button>
              )}
            </div>
            
            <div style={{overflowX:'auto', marginTop:'25px'}}>
              <table style={modernTable}>
                <thead>
                  <tr style={{backgroundColor:'#f8fafc', borderBottom:'2px solid #e2e8f0'}}>
                    <th style={{...thStyle, width:'5%'}}>#</th>
                    <th style={{...thStyle, width:'30%'}}>الاسم (المنصب)</th>
                    <th style={{...thStyle, width:'35%'}}>الاختصاص</th>
                    <th style={{...thStyle, width:'20%'}}>يوم الإجازة</th>
                    <th style={{...thStyle, width:'14%', textAlign:'center'}}>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((t, i)=>(
                    <tr key={t.id} style={{ 
                      backgroundColor: t.role==='مدير'?'#fef3c7':t.role==='معاون'?'#f3e8ff':'#fff', 
                      borderBottom:'1px solid #e2e8f0' 
                    }}>
                      <td style={tdStyle}>{i + 1}</td>
                      <td style={{...tdStyle, fontWeight:'bold'}}>{t.name} ({t.role})</td>
                      <td style={{...tdStyle}}>
                        <span style={{
                          color: ((t.subjects && t.subjects.length > 0) || t.subject) ? '#000' : '#dc2626',
                          fontWeight: ((t.subjects && t.subjects.length > 0) || t.subject) ? 'normal' : 'bold'
                        }}>
                          {t.subjectsDisplay || t.subjects?.join(", ") || t.subject || "غير محدد"}
                        </span>
                        {(!t.subjects || t.subjects.length === 0) && 
                          <span style={{fontSize:'10px', marginRight:'5px', color:'#dc2626', fontWeight:'800'}}>تنبيه</span>
                        }
                        {t.subjects && t.subjects.length > 1 && 
                          <span style={{fontSize:'10px', marginRight:'5px', color:'#059669'}}>
                            ({t.subjects.length} مواد)
                          </span>
                        }
                      </td>
                      <td style={{
                        ...tdStyle, 
                        color: t.offDay !== 'لا يوجد' ? '#1d4ed8' : '#000', 
                        fontWeight: t.offDay !== 'لا يوجد' ? 'bold' : 'normal'
                      }}>
                        {t.offDay}
                      </td>
                      <td style={{...tdStyle, textAlign:'center'}}>
                        <div style={{display:'flex', justifyContent:'center', gap:'8px'}}>
                          <button
                            onClick={() => startTeacherEdit(t)}
                            style={editIconBtn}
                            title="تعديل بيانات المدرس"
                          >تعديل</button>
                          <button
                            onClick={() => {
                              if (editingTeacherId === t.id) resetTeacherForm();
                              setTeachers(teachers.filter(x=>x.id!==t.id));
                              setAssignments(assignments.filter(a=>a.tId!==t.id));
                            }}
                            style={deleteIconBtn}
                            title="حذف المدرس"
                          >
                            حذف
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* تبويب: إدارة الصفوف */}
        {activeTab === 'classes' && !showFinalTable && !showTeacherSchedule && (
          <div style={whiteCard}>
            <h2 style={{color:'#000'}}>إدارة الصفوف والشعب</h2>
            <div style={formGrid}>
               <select value={selClass} onChange={e=>setSelClass(e.target.value)} style={inputS}>
                 {classesNames.map(n=><option key={n}>{n}</option>)}
               </select>
               
               {!isCustomMode ? (
                 <select value={effectiveSelSection} 
                         onChange={e=>e.target.value==="CUSTOM"?setIsCustomMode(true):setSelSection(e.target.value)} 
                         style={inputS}>
                   {availableSections.map(s=><option key={s}>{s}</option>)}
                   <option value="CUSTOM">+ شعبة مخصصة</option>
                 </select>
               ) : (
                 <div style={{display:'flex', gap:'5px'}}>
                   <input autoFocus placeholder="اسم الشعبة" value={customValue} 
                          onChange={e=>setCustomValue(e.target.value)} 
                          style={{...inputS, border:'2px solid #1e40af'}}/>
                   <button onClick={()=>{setIsCustomMode(false); setCustomValue('');}} 
                           style={cancelBtn}>إلغاء</button>
                 </div>
               )}

               <button onClick={()=>{ 
                 const finalS = isCustomMode ? customValue.trim() : effectiveSelSection;
                 if (!finalS) return;
                 if (classes.some(c => c.name === selClass && c.section === finalS)) {
                   return setErrorMessage("هذا الصف والشعبة موجودان بالفعل!");
                 }
                 setClasses([...classes,{id:Date.now(),name:selClass,section:finalS}]); 
                 if(isCustomMode) { setIsCustomMode(false); setCustomValue(''); }
               }} style={greenBtn}>إضافة هذا الصف</button>
            </div>
            
            <div style={{display:'flex', flexWrap:'wrap', gap:'10px', marginTop:'20px'}}>
              {classes.map(c=>(
                <div key={c.id} style={{
                  ...chipBase, 
                  background:getClassStyle(c.name).bg, 
                  color:getClassStyle(c.name).c,
                  display:'inline-flex',
                  alignItems:'center',
                  gap:'10px'
                }}>
                  <span>{c.name} ({c.section})</span>
                  <button
                    type="button"
                    onClick={()=>{
                      setClasses(classes.filter(x=>x.id!==c.id));
                      setAssignments(assignments.filter(a=>a.cId!==c.id));
                    }}
                    style={{
                      cursor:'pointer',
                      border:'1px solid rgba(255,255,255,0.45)',
                      backgroundColor:'rgba(255,255,255,0.18)',
                      color:getClassStyle(c.name).c,
                      borderRadius:'999px',
                      padding:'3px 10px',
                      fontSize:'12px',
                      fontWeight:'800'
                    }}
                  >
                    حذف
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* تبويب: نصاب المواد */}
        {activeTab === 'counts' && !showFinalTable && !showTeacherSchedule && (
          <div style={whiteCard}>
            <h2 style={{color:'#000'}}>تحديد النصاب الأسبوعي</h2>
            <div style={{
              display:'grid', 
              gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', 
              gap:'20px', 
              marginBottom:'20px'
            }}>
              {classesNames.filter(cn => classes.some(c => c.name === cn)).map(cn => {
                const style = getClassStyle(cn);
                return (
                  <div key={cn} style={{
                    border:`2px solid ${style.bg}`, 
                    borderRadius:'12px', 
                    overflow:'hidden', 
                    backgroundColor:'#fff'
                  }}>
                    <h4 style={{
                      backgroundColor:style.bg, 
                      color:style.c, 
                      padding:'10px', 
                      margin:0, 
                      textAlign:'center'
                    }}>{cn}</h4>
                    <div style={{padding:'15px'}}>
                      {ministerialOrder.filter(sub => isSubjectValidForClass(sub, cn)).map(sub => {
                        const key = `${cn}-${sub}`;
                        return (
                          <div key={key} style={{
                            display:'flex', 
                            justifyContent:'space-between', 
                            alignItems:'center', 
                            marginTop:'10px', 
                            borderBottom:'1px solid #eee'
                          }}>
                            <span style={{fontSize:'14px', fontWeight:'bold', color:'#000'}}>
                              {sub}
                            </span>
                            <select 
                              value={lessonCounts[key] ?? getSubjectQuota(cn, sub)} 
                              onChange={(e)=>setLessonCounts({...lessonCounts, [key]: parseInt(e.target.value)})} 
                              style={dropdownStyle}>
                              {[0,1,2,3,4,5,6,7,8].map(num => <option key={num}>{num}</option>)}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* تبويب: ربط المهام */}
        {activeTab === 'link' && !showFinalTable && !showTeacherSchedule && (
          <div style={whiteCard}>
            <h2 style={{color:'#000'}}>ربط المدرسين بالصفوف</h2>
            <p style={{fontSize:'15px', color:'#64748b', marginBottom:'15px', fontWeight:'700'}}>💡 ملاحظة: كل مدرس يظهر فقط بالمواد المحددة في ملف الإكسل</p>
            <div style={linkMatrix}>
              {teachers.map(t => {
                const subjects = getTeacherSubjects(t);
                
                if (subjects.length === 0) {
                  return (
                    <div key={t.id} style={{
                      ...linkModule, 
                      backgroundColor:'#fee2e2', 
                      borderColor:'#dc2626'
                    }}>
                      <h4 style={{
                        borderBottom:'2px solid #dc2626', 
                        paddingBottom:'5px', 
                        marginBottom:'10px', 
                        color:'#dc2626'
                      }}>
                        {t.name}
                      </h4>
                      <p style={{fontSize:'13px', color:'#991b1b', fontWeight:'700'}}>
                        تحذير: لا توجد مواد معروفة
                      </p>
                    </div>
                  );
                }
                
                return (
                  <div key={t.id} style={linkModule}>
                    <h4 style={{
                      borderBottom:'2px solid #1e40af', 
                      paddingBottom:'5px', 
                      marginBottom:'10px'
                    }}>
                      {t.name}
                      {subjects.length > 1 && 
                        <span style={{fontSize:'12px', color:'#059669', marginRight:'5px', fontWeight:'800'}}>
                          ({subjects.length} مواد)
                        </span>
                      }
                    </h4>
                    {subjects.map(subject => {
                      return (
                        <div key={subject} style={{marginTop:'10px'}}>
                          <p style={{
                            fontSize:'13px', 
                            fontWeight:'bold', 
                            color:'#1e40af', 
                            marginBottom:'5px'
                          }}>
                            مادة: {subject}
                          </p>
                          <div style={{display:'flex', flexWrap:'wrap', gap:'5px'}}>
                            {classes.map(c => {
                              const isLinked = assignments.some(a => 
                                a.tId === t.id && a.cId === c.id && a.subject === subject
                              );
                              
                              // تحقق من صلاحية المادة لكل صف
                              if (!isSubjectValidForClass(subject, c.name)) {
                                return null;
                              }
                              
                              const takenByOther = teachers.some(otherT => 
                                otherT.id !== t.id && 
                                assignments.some(a => 
                                  a.cId === c.id && 
                                  a.subject === subject &&
                                  a.tId === otherT.id
                                )
                              );
                              
                              if (takenByOther && !isLinked) return null;
                              
                              return (
                                <button 
                                  key={c.id} 
                                  onClick={() => {
                                    if (isLinked) {
                                      setAssignments(prev => prev.filter(a => 
                                        !(a.tId === t.id && a.cId === c.id && a.subject === subject)
                                      ));
                                    } else {
                                      setAssignments(prev => [...prev, {
                                        tId: t.id,
                                        cId: c.id,
                                        subject: subject
                                      }]);
                                    }
                                  }} 
                                  style={{
                                    padding:'6px 12px', 
                                    borderRadius:'5px', 
                                    backgroundColor: isLinked ? getClassStyle(c.name).bg : '#fff', 
                                    color: isLinked ? getClassStyle(c.name).c : '#000', 
                                    border:'1px solid #1e40af', 
                                    fontSize:'12px',
                                    cursor:'pointer',
                                    fontWeight: isLinked ? 'bold' : '700'
                                  }}
                                >
                                  {c.name} {c.section}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* جدول الطلاب */}
        {showFinalTable && (
          <div style={overlayStyle}>
            <div style={topActionsBar}>
              <button onClick={() => setShowFinalTable(false)} style={closeBtn}>✕ إغلاق</button>
              <button onClick={exportStudentAsPdf} style={{ ...pdfBtn, marginRight: '10px' }}>📄 تصدير PDF</button>
              <button onClick={exportStudentAsImage} style={{ ...imageBtn, marginRight: '10px' }}>🖼️ تصدير صورة</button>
              <button
                onClick={() => setStudentScheduleMode(isSubjectOnlyMode ? 'teachers' : 'subjects')}
                style={{ ...switchBtn, marginRight: '10px' }}
              >
                {isSubjectOnlyMode ? 'عرض الجدول مع أسماء المدرسين' : 'عرض الجدول بدون أسماء المدرسين'}
              </button>
              <button
                onClick={() => {
                  setShowFinalTable(false);
                  resetTeacherExplorerState();
                  setShowTeacherSchedule(true);
                }}
                style={{ ...switchBtn, marginRight: '10px' }}
              >عرض جدول المدرسين</button>
            </div>
            {renderQualityReport()}
            {false && scheduleQuality && (
              <div style={qualityPanel}>
                <span style={qualityChip}>التضاربات: {scheduleQuality.teacherConflicts}</span>
                <span style={qualityChip}>مخالفات الإجازة: {scheduleQuality.offDayViolations}</span>
                <span style={qualityChip}>الشواغر: {scheduleQuality.emptySlots}</span>
                <span style={qualityChip}>الحصص غير المكتملة: {scheduleQuality.unmetLessons}</span>
              </div>
            )}

            {false && scheduleQuality?.unmetExamples?.length > 0 && (
              <div style={qualityDetails}>
                {scheduleQuality.unmetExamples.map((item) => (
                  <div key={item} style={qualityLine}>⬢ {item}</div>
                ))}
              </div>
            )}
            <div
              ref={studentScheduleRef}
              style={studentScheduleCardStyle}
            >
              <h2 style={{ textAlign: 'center', color: '#1e40af', marginBottom: isSubjectOnlyMode ? '1px' : '20px', fontSize: isSubjectOnlyMode ? '12px' : '32px', lineHeight: 1.05 }}>
                {studentScheduleTitle}
              </h2>

              <div style={{ flex: 1, minHeight: 0 }}>
              <table style={{ ...finalTable, fontSize: isSubjectOnlyMode ? '7.2px' : '14px', height: isSubjectOnlyMode ? '100%' : undefined }}>
                <thead>
                  <tr>
                    <th rowSpan={2} style={{ ...fTh, width: isSubjectOnlyMode ? '60px' : '86px', padding: isSubjectOnlyMode ? '2px 1px' : fTh.padding, fontSize: isSubjectOnlyMode ? '9px' : fTh.fontSize, lineHeight: 1.05 }}>اليوم / الحصة</th>
                    {studentClassGroups.map((group) => (
                      <th
                        key={group.name}
                        colSpan={group.items.length}
                        style={{
                          ...fTh,
                          backgroundColor: group.theme.headerBg,
                          color: group.theme.headerText,
                          borderColor: group.theme.border,
                          fontSize: isSubjectOnlyMode ? '8px' : '15px',
                          padding: isSubjectOnlyMode ? '2px 1px' : fTh.padding,
                          lineHeight: isSubjectOnlyMode ? 1.05 : 1.2
                        }}
                      >
                        {group.name}
                      </th>
                    ))}
                  </tr>
                  <tr>
                    {studentClassGroups.flatMap((group) =>
                      group.items.map((item) => (
                        <th
                          key={item.id}
                          style={{
                            ...fTh,
                            backgroundColor: item.columnTheme.headerBg,
                            color: item.columnTheme.text,
                            borderColor: item.columnTheme.border,
                            padding: isSubjectOnlyMode ? '1px 1px' : '8px 6px',
                            fontSize: isSubjectOnlyMode ? '7.2px' : '13px',
                            lineHeight: isSubjectOnlyMode ? 1 : 1.2
                          }}
                        >
                          {item.section}
                        </th>
                      ))
                    )}
                  </tr>
                </thead>
                <tbody>
                  {daysList.map((day) => {
                    const dayTheme = dayColorMap[day] || { bg: '#fff', border: '#cbd5e1', text: '#0f172a' };
                    const dayLessons = lessonsList.slice(0, getDailyLessonLimitForDay(classes, day));
                    return dayLessons.map((lesson, lessonIndex) => (
                      <tr key={`${day}-${lesson}`}>
                        <td
                          style={{
                            ...dayCell,
                            backgroundColor: dayTheme.bg,
                            color: dayTheme.text,
                            borderColor: dayTheme.border,
                            fontSize: isSubjectOnlyMode ? '7.2px' : dayCell.fontSize,
                            padding: isSubjectOnlyMode ? '0px 1px' : '8px 6px',
                            width: isSubjectOnlyMode ? '46px' : '86px'
                          }}
                        >
                          {renderDayLessonCell(day, formatLessonLabel(lesson), dayTheme, {
                            compact: isSubjectOnlyMode
                          })}
                        </td>
                        {orderedStudentClasses.map((c) => {
                          const classPrintTheme = c.columnTheme;
                          const isSeventhSlot = formatLessonLabel(lesson) === '7';
                          if (!isLessonEnabledForClassDay(c, day, lessonIndex)) {
                            return (
                              <td
                                key={c.id}
                                style={{
                                  ...fTd,
                                  backgroundColor: classPrintTheme.cellBg,
                                  borderColor: classPrintTheme.border,
                                  color: isSeventhSlot ? '#dc2626' : '#64748b',
                                  fontWeight: '800',
                                  fontSize: isSubjectOnlyMode ? '7px' : '13px',
                                  padding: isSubjectOnlyMode ? '0px 0px' : fTd.padding,
                                  lineHeight: isSubjectOnlyMode ? 1 : 1.2
                                }}
                              >
                                {isSeventhSlot ? <span style={{ color: '#dc2626', fontWeight: '900', fontSize: isSubjectOnlyMode ? '11px' : '18px' }}>X</span> : 'غير دوام'}
                              </td>
                            );
                          }

                          const entry = scheduleLookup.get(`${day}|${lesson}|${c.id}`);
                          return (
                            <td
                              key={c.id}
                              style={{
                                ...fTd,
                                backgroundColor: classPrintTheme.cellBg,
                                borderColor: classPrintTheme.border,
                                color: classPrintTheme.text,
                                padding: isSubjectOnlyMode ? '0px 0px' : fTd.padding,
                                lineHeight: isSubjectOnlyMode ? 1.02 : 1.2
                              }}
                            >
                              {entry?.teacher ? (
                                isSubjectOnlyMode ? (
                                  <div style={{ fontSize: '6.5px', fontWeight: '900', lineHeight: '1.01', color: classPrintTheme.text, padding: '0 1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'clip' }}>
                                    {formatCompactSubjectLabel(entry.teacher.subject)}
                                  </div>
                                ) : (
                                <div
                                  style={{
                                    ...entryBox,
                                    backgroundColor: classPrintTheme.entryBg,
                                    borderColor: classPrintTheme.border
                                  }}
                                >
                                  <span style={studentEntrySubject}>{formatScheduleSubjectLabel(entry.teacher.subject)}</span>
                                  <span style={studentEntryTeacher}>{entry.teacher.name}</span>
                                </div>
                                )
                              ) : <span style={{opacity:0.48, fontWeight:'800', fontSize: isSubjectOnlyMode ? '6.8px' : '13px', lineHeight: 1}}>-</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
              </div>
            </div>
          </div>
        )}

        {/* جدول المدرسين */}
        {showTeacherSchedule && (
          <div style={overlayStyle}>
            <div style={topActionsBar}>
              <button onClick={closeTeacherScheduleExplorer} style={closeBtn}>✕ إغلاق</button>
              <button onClick={exportTeachersAsPdf} style={{ ...pdfBtn, marginRight: '10px' }}>📄 تصدير PDF</button>
              <button onClick={exportTeachersAsImage} style={{ ...imageBtn, marginRight: '10px' }}>🖼️ تصدير صورة</button>
              <button
                onClick={() => {
                  closeTeacherScheduleExplorer();
                  setStudentScheduleMode('teachers');
                  setShowFinalTable(true);
                }}
                style={{ ...switchBtn, marginRight: '10px' }}
              >عرض جدول الطلاب</button>
            </div>
            {scheduleQuality && (
              <div style={qualityPanel}>
                <span style={qualityChip}>التضاربات: {scheduleQuality.teacherConflicts}</span>
                <span style={qualityChip}>مخالفات الإجازة: {scheduleQuality.offDayViolations}</span>
                <span style={qualityChip}>الشواغر: {scheduleQuality.emptySlots}</span>
                <span style={qualityChip}>الحصص غير المكتملة: {scheduleQuality.unmetLessons}</span>
              </div>
            )}
            <div
              ref={teacherScheduleRef}
              style={{
                background: '#fff',
                padding: '20px',
                borderRadius: '15px',
                minWidth: '1100px',
                color: '#000',
                margin: '0 auto'
              }}
            >
              <h2 style={{ textAlign: 'center', color: '#1e40af', marginBottom: '20px' }}>جدول المدرسين الأسبوعي</h2>

              <div style={teacherSearchRow}>
                <div style={teacherSearchHint}>اختر الاختصاص ثم انقر على اسم المدرس لعرض جدول حصصه بالتفصيل.</div>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    setTeacherSearchQuery(teacherSearchInput);
                  }}
                  style={teacherSearchForm}
                >
                  <input
                    value={teacherSearchInput}
                    onChange={(event) => setTeacherSearchInput(event.target.value)}
                    placeholder="ابحث بالاختصاص أو اسم المدرس"
                    style={teacherSearchInputStyle}
                  />
                  <button type="submit" style={teacherSearchBtn}>بحث</button>
                  <button
                    type="button"
                    onClick={() => {
                      setTeacherSearchInput('');
                      setTeacherSearchQuery('');
                    }}
                    style={teacherClearSearchBtn}
                  >
                    مسح
                  </button>
                </form>
              </div>

              {teacherCardsBySubject.length === 0 ? (
                <div style={teacherNoResults}>لا توجد نتائج مطابقة للبحث الحالي.</div>
              ) : (
                teacherCardsBySubject.map(({ subject, items }) => (
                  <section key={subject} style={teacherSubjectBlock}>
                    <div style={teacherSubjectHeader}>
                      <span>{subject}</span>
                      <span style={teacherSubjectCount}>{items.length} مدرس</span>
                    </div>

                    <div style={teacherCardsGrid}>
                      {items.map(({ teacher, schedule, countsPerDay }) => {
                        const cardKey = `${subject}-${teacher.id}`;
                        const isHovered = hoveredTeacherCardKey === cardKey;
                        const activeDays = Object.keys(countsPerDay || {}).length;

                        return (
                          <button
                            key={cardKey}
                            type="button"
                            onClick={() => setSelectedTeacherId(teacher.id)}
                            onMouseEnter={() => setHoveredTeacherCardKey(cardKey)}
                            onMouseLeave={() => setHoveredTeacherCardKey(null)}
                            onFocus={() => setHoveredTeacherCardKey(cardKey)}
                            onBlur={() => setHoveredTeacherCardKey(null)}
                            style={{
                              ...teacherCardBtn,
                              ...(isHovered ? teacherCardBtnHover : {}),
                              borderColor: selectedTeacherId === teacher.id ? '#1e40af' : '#bfdbfe'
                            }}
                          >
                            <div style={teacherCardName}>{teacher.name}</div>
                            <div style={teacherCardMetaRow}>
                              <span style={teacherCardMetaChip}>الدروس: {schedule.length}</span>
                              <span style={teacherCardMetaChip}>الإجازة: {teacher.offDay || 'لا يوجد'}</span>
                            </div>
                            <div style={teacherCardMetaRow}>
                              <span style={teacherCardMetaChip}>أيام الدوام: {activeDays}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))
              )}
            </div>

            {selectedTeacherDetails && (
              <div style={teacherDetailOverlay} onClick={() => setSelectedTeacherId(null)}>
                <div style={teacherDetailDialog} onClick={(event) => event.stopPropagation()}>
                  <div style={teacherDetailActions}>
                    <button onClick={() => setSelectedTeacherId(null)} style={closeBtn}>✕ إغلاق</button>
                    <button onClick={exportSelectedTeacherAsImage} style={imageBtn}>🖼️ تصدير صورة المدرس</button>
                  </div>

                  <div ref={teacherDetailRef} style={teacherDetailBody}>
                    <h3 style={teacherDetailTitle}>{selectedTeacherDetails.teacher.name}</h3>
                    <p style={teacherDetailSubtitle}>
                      {selectedTeacherDetails.teacher.subjectsDisplay || selectedTeacherDetails.teacher.subject || 'غير محدد'}
                    </p>

                    <div style={teacherDetailBadges}>
                      <span style={teacherDetailBadge}>
                        الإجازة: {selectedTeacherDetails.teacher.offDay || 'لا يوجد'}
                      </span>
                      <span style={teacherDetailBadge}>عدد الدروس: {selectedTeacherDetails.schedule.length}
                      </span>
                      <span style={teacherDetailBadge}>أيام الدوام: {Object.keys(selectedTeacherDetails.countsPerDay || {}).length}
                      </span>
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ color: '#334155', fontWeight: '900', marginBottom: '8px' }}>الصفوف والشعب</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {selectedTeacherClassChips.map((item) => (
                          <span
                            key={`${item.name}-${item.section}`}
                            style={{
                              ...chipBase,
                              background: getClassStyle(item.name).bg,
                              color: getClassStyle(item.name).c,
                              borderRadius: '999px',
                              padding: '7px 14px'
                            }}
                          >
                            {item.name} ({item.section})
                          </span>
                        ))}
                        {selectedTeacherClassChips.length === 0 && (
                          <span style={{ color: '#64748b', fontWeight: '800' }}>لا توجد صفوف مرتبطة</span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' }}>
                      {Object.entries(selectedTeacherDetails.countsPerDay || {}).length === 0 ? (
                        <span style={{ color: '#64748b' }}>لا توجد دروس هذا الأسبوع</span>
                      ) : (
                        Object.entries(selectedTeacherDetails.countsPerDay).map(([day, count]) => (
                          <span
                            key={day}
                            style={{
                              backgroundColor: (dayColorMap[day] || {}).bg || '#eef2ff',
                              color: (dayColorMap[day] || {}).text || '#1e3a8a',
                              padding: '6px 10px',
                              borderRadius: '8px',
                              fontSize: '14px',
                              fontWeight: '800',
                              border: `1px solid ${(dayColorMap[day] || {}).border || '#bfdbfe'}`
                            }}
                          >
                            {day}: {count}
                          </span>
                        ))
                      )}
                    </div>

                    <table style={teacherTable}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc' }}>
                          <th style={{ ...teacherTh, width: '110px' }}>اليوم / الحصة</th>
                          <th style={teacherTh}>الصف</th>
                          {showSelectedSubjectColumn && <th style={teacherTh}>المادة</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {daysList.map((day) => {
                          const dayLessons = selectedTeacherDetails.schedule.filter((item) => item.day === day);
                          const dayTheme = dayColorMap[day] || { bg: '#fff', border: '#cbd5e1', text: '#0f172a' };

                          if (dayLessons.length === 0) {
                            return (
                              <tr key={day} style={{ backgroundColor: dayTheme.bg }}>
                                <td style={{ ...teacherTd, fontWeight: 'bold', color: dayTheme.text }}>
                                  {renderDayLessonCell(day, '-', dayTheme)}
                                </td>
                                <td
                                  colSpan={showSelectedSubjectColumn ? 2 : 1}
                                  style={{ ...teacherTd, textAlign: 'center', color: '#64748b' }}
                                >
                                  {normalizeDayName(selectedTeacherDetails.teacher.offDay) === day ? 'مجاز' : 'لا توجد دروس'}
                                </td>
                              </tr>
                            );
                          }

                          return dayLessons.map((lesson, idx) => (
                            <tr key={`${day}-${lesson.lesson}-${idx}`} style={{ backgroundColor: dayTheme.bg }}>
                              <td
                                style={{
                                  ...teacherTd,
                                  borderColor: dayTheme.border
                                }}
                              >
                                {renderDayLessonCell(day, formatLessonLabel(lesson.lesson), dayTheme)}
                              </td>
                              <td style={{ ...teacherTd, borderColor: dayTheme.border }}>{lesson.class}</td>
                              {showSelectedSubjectColumn && (
                                <td style={{ ...teacherTd, borderColor: dayTheme.border }}>{lesson.subject}</td>
                              )}
                            </tr>
                          ));
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
