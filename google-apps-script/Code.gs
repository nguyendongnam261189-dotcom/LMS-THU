
/**
 * EngConnect LMS Backend - v15.0
 */

function setupSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error("Script must be bound to a Google Spreadsheet.");
  
  const sheetConfigs = {
    'Users': [['id', 'username', 'password', 'role', 'name', 'class_id', 'avatar_url']],
    'Classes': [['id', 'name', 'teacher_id', 'code']],
    'Feed': [['id', 'class_id', 'author_name', 'author_role', 'content', 'media_url', 'media_type', 'timestamp', 'likes_count', 'is_pinned', 'comments_json']],
    'Assignments': [['id', 'class_id', 'title', 'deadline', 'questions_json', 'type', 'description', 'max_attempts']],
    'Submissions': [['id', 'assignment_id', 'student_id', 'student_name', 'score', 'auto_score', 'total_possible_score', 'is_essay_confirmed', 'answers_json', 'status', 'timestamp', 'file_url', 'teacher_comments']],
    'QuestionBank': [['id', 'text', 'options_json', 'correct_answer', 'explanation', 'teacher_id', 'category', 'type', 'difficulty']],
    'GradeColumns': [['id', 'class_id', 'name', 'max_score', 'weight', 'type']],
    'Grades': [['id', 'column_id', 'student_id', 'student_name', 'score']],
    'Behaviors': [['id', 'class_id', 'name', 'points', 'icon']],
    'StudentPoints': [['id', 'student_id', 'behavior_id', 'points', 'timestamp']],
    'Seating': [['class_id', 'student_id', 'row', 'col']]
  };

  for (let name in sheetConfigs) {
    let sheet = ss.getSheetByName(name);
    if (!sheet) { 
      sheet = ss.insertSheet(name); 
    }
    const targetHeaders = sheetConfigs[name][0];
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, targetHeaders.length).setValues([targetHeaders]);
      sheet.setFrozenRows(1);
    } else {
      // Cập nhật header nếu thiếu cột (ví dụ avatar_url)
      const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      if (currentHeaders.length < targetHeaders.length) {
        sheet.getRange(1, 1, 1, targetHeaders.length).setValues([targetHeaders]);
      }
    }
  }
}

function doPost(e) {
  const action = e.parameter.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let response = { success: false, message: "" };

  try {
    setupSpreadsheet();
    const data = JSON.parse(e.postData.contents);
    
    if (action === 'updateProfile') {
      const sheet = ss.getSheetByName('Users');
      const rows = sheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === String(data.id)) {
          if (data.name) sheet.getRange(i + 1, 5).setValue(data.name);
          if (data.password) sheet.getRange(i + 1, 3).setValue(data.password);
          if (data.avatar_url !== undefined) sheet.getRange(i + 1, 7).setValue(data.avatar_url);
          response.success = true;
          break;
        }
      }
    }
    // --- CÁC ACTION KHÁC GIỮ NGUYÊN ---
    else if (action === 'createStudent') {
      ss.getSheetByName('Users').appendRow([Utilities.getUuid(), data.username, data.password, 'student', data.name, data.class_id, '']);
      response.success = true;
    }
    else if (action === 'updateStudent') {
      const sheet = ss.getSheetByName('Users');
      const rows = sheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === String(data.id)) {
          sheet.getRange(i + 1, 2).setValue(data.username);
          sheet.getRange(i + 1, 3).setValue(data.password);
          sheet.getRange(i + 1, 5).setValue(data.name);
          response.success = true;
          break;
        }
      }
    }
    else if (action === 'saveSeating') {
      const sheet = ss.getSheetByName('Seating');
      const dataRange = sheet.getDataRange();
      const values = dataRange.getValues();
      const headers = values[0];
      const remainingRows = values.slice(1).filter(row => String(row[0]) !== String(data.class_id));
      const newRows = (data.seats || []).map(s => [String(data.class_id), String(s.student_id), Number(s.row), Number(s.col)]);
      const finalData = [headers, ...remainingRows, ...newRows];
      sheet.clearContents();
      sheet.getRange(1, 1, finalData.length, headers.length).setValues(finalData);
      response.success = true;
    }
    else if (action === 'addBehavior') {
      ss.getSheetByName('Behaviors').appendRow([Utilities.getUuid(), data.class_id, data.name, data.points, data.icon]);
      response.success = true;
    }
    else if (action === 'awardPoint') {
      ss.getSheetByName('StudentPoints').appendRow([Utilities.getUuid(), data.student_id, data.behavior_id, data.points, Date.now()]);
      response.success = true;
    }
    else if (action === 'createClass') {
      const id = Utilities.getUuid();
      ss.getSheetByName('Classes').appendRow([id, data.name, data.teacher_id, data.code]);
      response.success = true;
      response.data = { id, name: data.name, code: data.code, teacher_id: data.teacher_id };
    }
    else if (action === 'createAssignment') {
      ss.getSheetByName('Assignments').appendRow([Utilities.getUuid(), data.class_id, data.title, data.deadline, data.questions_json, data.type, data.description || '', data.max_attempts || 1]);
      response.success = true;
    }
    else if (action === 'submitAssignment') {
      ss.getSheetByName('Submissions').appendRow([Utilities.getUuid(), data.assignment_id, data.student_id, data.student_name, data.score, data.auto_score, data.total_possible_score, data.is_essay_confirmed, data.answers_json, data.status, data.timestamp, '', '']);
      response.success = true;
    }
    else if (action === 'postFeed') {
      ss.getSheetByName('Feed').appendRow([Utilities.getUuid(), data.class_id, data.author_name, data.author_role, data.content, data.media_url || '', data.media_type || '', Date.now(), 0, false, '[]']);
      response.success = true;
    }
    else if (action === 'upsertGrade') {
      const sheet = ss.getSheetByName('Grades');
      const rows = sheet.getDataRange().getValues();
      let found = false;
      for (let i = 1; i < rows.length; i++) {
        if (String(rows[i][1]) === String(data.column_id) && String(rows[i][2]) === String(data.student_id)) {
          sheet.getRange(i + 1, 5).setValue(data.score);
          found = true; break;
        }
      }
      if (!found) sheet.appendRow([Utilities.getUuid(), data.column_id, data.student_id, data.student_name, data.score]);
      response.success = true;
    }

  } catch (err) { 
    response.success = false; 
    response.message = err.toString(); 
  }
  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const action = e.parameter.action;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let response = { success: false, data: null, message: "" };

  try {
    setupSpreadsheet();

    if (action === 'login') {
      const users = getSheetData(ss, 'Users');
      const user = users.find(u => String(u.username) == String(e.parameter.username) && String(u.password) == String(e.parameter.password));
      if (user) {
        user.managed_classes = getSheetData(ss, 'Classes').filter(c => String(c.teacher_id) == String(user.id));
        response.success = true; response.data = user;
      } else response.message = "Sai tài khoản hoặc mật khẩu";
    }
    else if (action === 'getStudentsByClass') {
      response.data = getSheetData(ss, 'Users').filter(u => String(u.class_id) === String(e.parameter.class_id) && u.role === 'student');
      response.success = true;
    }
    else if (action === 'getClassTools') {
      const students = getSheetData(ss, 'Users').filter(u => String(u.class_id) === String(e.parameter.class_id) && u.role === 'student');
      const pointLogs = getSheetData(ss, 'StudentPoints');
      const studentsWithPoints = students.map(s => {
        const total = pointLogs.filter(p => String(p.student_id) === String(s.id)).reduce((acc, curr) => acc + Number(curr.points), 0);
        return { id: s.id, name: s.name, total_points: total, avatar_url: s.avatar_url };
      });
      response.data = { 
        students: studentsWithPoints, 
        behaviors: getSheetData(ss, 'Behaviors').filter(b => String(b.class_id) === String(e.parameter.class_id)), 
        seats: getSheetData(ss, 'Seating').filter(s => String(s.class_id) === String(e.parameter.class_id)) 
      };
      response.success = true;
    }
    else if (action === 'getGradebook') {
      const columns = getSheetData(ss, 'GradeColumns').filter(c => String(c.class_id) === String(e.parameter.class_id));
      const grades = getSheetData(ss, 'Grades');
      const pointLogs = getSheetData(ss, 'StudentPoints');
      const students = getSheetData(ss, 'Users').filter(u => String(u.class_id) === String(e.parameter.class_id) && u.role === 'student');
      const gradebook = students.map(s => {
        let sGrades = {};
        columns.forEach(col => {
          const g = grades.find(g => String(g.column_id) === String(col.id) && String(g.student_id) === String(s.id));
          sGrades[col.id] = g ? Number(g.score) : 0;
        });
        const totalPoints = pointLogs.filter(p => String(p.student_id) === String(s.id)).reduce((acc, curr) => acc + Number(curr.points), 0);
        return { id: s.id, name: s.name, grades: sGrades, total_points: totalPoints, avatar_url: s.avatar_url };
      });
      response.data = { columns, students: gradebook };
      response.success = true;
    }
    else {
      // Các action GET khác (getAssignments, getFeed, ...) giữ nguyên logic cũ
      const sheetData = getSheetData(ss, action.replace('get', ''));
      response.data = sheetData;
      response.success = true;
    }
  } catch (err) { 
    response.success = false; 
    response.message = err.toString(); 
  }
  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
}

function getSheetData(ss, name) {
  const sheet = ss.getSheetByName(name);
  if (!sheet) return [];
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const data = sheet.getRange(1, 1, lastRow, sheet.getLastColumn()).getValues();
  const headers = data.shift();
  return data.map(row => {
    let obj = {};
    headers.forEach((h, i) => {
      let val = row[i];
      if (h && String(h).indexOf('_json') !== -1) { 
        try { obj[h] = JSON.parse(val || '[]'); } catch(e) { obj[h] = val; }
      } else obj[h] = val;
    });
    return obj;
  });
}
