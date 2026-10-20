/**
 * Google Apps Script Web App – Sandini & Kosala wedding RSVP
 *
 * Spreadsheet:
 * https://docs.google.com/spreadsheets/d/1TykAv68OQt3z5uhHe7FcxSrRd4vVezDCPz7Y-ub_T4E/edit
 *
 * The "RSVP" sheet and its header row are created automatically on the first
 * submission (or run setup() once from the editor to create them right away).
 */

const SPREADSHEET_ID = "1TykAv68OQt3z5uhHe7FcxSrRd4vVezDCPz7Y-ub_T4E";
const RSVP_SHEET_NAME = "RSVP";
const TIME_ZONE = "Asia/Colombo";

const RSVP_HEADERS = [
  "දිනය / වේලාව (Timestamp)",
  "නම (Name)",
  "පැමිණීම (Attendance)",
  "ආරාධිත නම (Invited As)",
];

const ATTENDING_LABEL = "පැමිණේ ✅";
const DECLINED_LABEL = "නොපැමිණේ ❌";

const MAX_FIELD_LENGTH = 200;

function doPost(e) {
  return handleRequest_(e);
}

function doGet(e) {
  // Opening the Web App URL in a browser just confirms it is live.
  if (!e || !e.parameter || !e.parameter.action) {
    return jsonResponse_({ ok: true, message: "RSVP service is running" });
  }
  return handleRequest_(e);
}

/** Run once from the Apps Script editor to authorise and create the sheet. */
function setup() {
  const sheet = getRsvpSheet_();
  Logger.log("Ready: " + sheet.getParent().getUrl() + "#gid=" + sheet.getSheetId());
}

function handleRequest_(e) {
  try {
    const params = parseParams_(e);
    const action = String(params.action || "").trim().toLowerCase();

    if (action === "rsvp") {
      return jsonResponse_(saveRsvp_(params));
    }

    return jsonResponse_({ ok: false, message: "Invalid action" });
  } catch (error) {
    return jsonResponse_({
      ok: false,
      message: error && error.message ? error.message : "Unexpected error",
    });
  }
}

function saveRsvp_(params) {
  const name = clean_(params.name);
  const invitee = clean_(params.invitee);
  const attending = String(params.guests || "1").trim() !== "0";

  if (!name) {
    return { ok: false, message: "Name is required" };
  }

  // Serialise writes so simultaneous submissions don't collide.
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getRsvpSheet_();
    sheet.appendRow([
      Utilities.formatDate(new Date(), TIME_ZONE, "yyyy-MM-dd HH:mm:ss"),
      name,
      attending ? ATTENDING_LABEL : DECLINED_LABEL,
      invitee || "-",
    ]);
  } finally {
    lock.releaseLock();
  }

  return { ok: true, message: "RSVP saved" };
}

function getRsvpSheet_() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(RSVP_SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(RSVP_SHEET_NAME, 0);
  }

  if (sheet.getLastRow() === 0) {
    writeHeader_(sheet);
  }

  return sheet;
}

function writeHeader_(sheet) {
  const header = sheet.getRange(1, 1, 1, RSVP_HEADERS.length);
  header
    .setValues([RSVP_HEADERS])
    .setFontWeight("bold")
    .setFontColor("#ffffff")
    .setBackground("#7a5c1e")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle");

  sheet.setFrozenRows(1);
  sheet.setRowHeight(1, 36);
  sheet.setColumnWidth(1, 170);
  sheet.setColumnWidth(2, 220);
  sheet.setColumnWidth(3, 150);
  sheet.setColumnWidth(4, 260);

  // Keep text as typed (names like "0771234567" or dates stay unchanged).
  sheet.getRange("A:D").setNumberFormat("@");
}

function clean_(value) {
  return String(value == null ? "" : value)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_FIELD_LENGTH);
}

function parseParams_(e) {
  const params = Object.assign({}, (e && e.parameter) || {});

  if (!(e && e.postData && e.postData.contents)) {
    return params;
  }

  const contents = String(e.postData.contents || "").trim();
  if (!contents) {
    return params;
  }

  if (contents.charAt(0) === "{") {
    return Object.assign(params, JSON.parse(contents));
  }

  return Object.assign(params, parseFormEncoded_(contents));
}

function parseFormEncoded_(raw) {
  const result = {};
  const pairs = String(raw || "").split("&");

  for (var i = 0; i < pairs.length; i++) {
    if (!pairs[i]) continue;
    var parts = pairs[i].split("=");
    var key = decodeURIComponent((parts[0] || "").replace(/\+/g, " "));
    var value = decodeURIComponent((parts.slice(1).join("=") || "").replace(/\+/g, " "));
    if (key) {
      result[key] = value;
    }
  }

  return result;
}

function jsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
