const SHEET_NAME = 'state';
const CELL = 'A1';

function doGet() {
  const sheet = getStateSheet_();
  const raw = sheet.getRange(CELL).getValue();
  const fallback = {
    app: 'FELICE COMPANY 운영 매뉴얼',
    updatedAt: new Date().toISOString(),
    tasks: [],
    checklists: [],
    manualSections: [],
  };
  return json_(raw ? JSON.parse(raw) : fallback);
}

function doPost(e) {
  const payload = e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
  if (!Array.isArray(payload.tasks) || !Array.isArray(payload.checklists) || !Array.isArray(payload.manualSections)) {
    return json_({ ok: false, error: 'INVALID_PAYLOAD' });
  }

  payload.app = payload.app || 'FELICE COMPANY 운영 매뉴얼';
  payload.updatedAt = new Date().toISOString();
  getStateSheet_().getRange(CELL).setValue(JSON.stringify(payload));
  return json_({ ok: true, updatedAt: payload.updatedAt });
}

function getStateSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);
  return sheet;
}

function json_(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
