/**
 * Ananya & Nemish wedding RSVP endpoint.
 * Run setupRsvpSheet() once while signed into the Google account that should own the sheet.
 */
const CONFIG = {
  spreadsheetName: 'Ananya & Nemish Wedding — RSVP Responses',
  sheetName: 'RSVP Responses',
  headers: ['Submitted At', 'Submission ID', 'Title', 'Guest Name', 'RSVP', 'Guest Count', 'Note'],
  allowedTitles: ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Other'],
  allowedAttendance: ['accept', 'decline'],
  maxGuestCount: 10,
  maxNameLength: 100,
  maxNoteLength: 500,
  dedupeSeconds: 21600
};

/** Creates the response spreadsheet in the current owner's Drive. Safe to rerun. */
function setupRsvpSheet() {
  const properties = PropertiesService.getScriptProperties();
  const existingId = properties.getProperty('RSVP_SPREADSHEET_ID');
  if (existingId) {
    const existing = SpreadsheetApp.openById(existingId);
    Logger.log('RSVP spreadsheet already configured: ' + existing.getUrl());
    return existing.getUrl();
  }

  const spreadsheet = SpreadsheetApp.create(CONFIG.spreadsheetName);
  const sheet = spreadsheet.getSheets()[0];
  sheet.setName(CONFIG.sheetName);
  sheet.getRange(1, 1, 1, CONFIG.headers.length).setValues([CONFIG.headers]);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, CONFIG.headers.length)
    .setFontWeight('bold').setBackground('#e8eee4').setFontColor('#46563a');
  sheet.setColumnWidths(1, CONFIG.headers.length, 155);
  sheet.setColumnWidth(4, 220);
  sheet.setColumnWidth(7, 320);
  sheet.getRange('A:A').setNumberFormat('dd mmm yyyy, hh:mm:ss');
  sheet.getRange('G:G').setWrap(true);
  properties.setProperty('RSVP_SPREADSHEET_ID', spreadsheet.getId());
  Logger.log('Created RSVP spreadsheet: ' + spreadsheet.getUrl());
  return spreadsheet.getUrl();
}

/** Simple endpoint health check. */
function doGet() {
  return HtmlService.createHtmlOutput('<!doctype html><html><body>Wedding RSVP endpoint is running.</body></html>')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Receives a standard HTML form POST and appends a validated response. */
function doPost(event) {
  const params = (event && event.parameter) || {};
  const submissionId = String(params.submissionId || '').trim();
  try {
    if (!/^[A-Za-z0-9_-]{8,80}$/.test(submissionId)) {
      throw new Error('Invalid submission. Please refresh the page and try again.');
    }

    // Silently discard likely bots that populate the off-screen honeypot field.
    if (String(params.website || '').trim() !== '') {
      return responsePage(submissionId, true, 'Your RSVP has been received.');
    }

    const title = String(params.title || '').trim();
    const name = cleanText(params.name, CONFIG.maxNameLength);
    const attendance = String(params.attendance || '').trim().toLowerCase();
    const note = cleanText(params.note, CONFIG.maxNoteLength);
    const requestedGuests = Number(params.guestCount || 1);
    const guestCount = attendance === 'decline' ? 1 : requestedGuests;

    if (!CONFIG.allowedTitles.includes(title)) throw new Error('Please select a valid title.');
    if (!name) throw new Error('Please enter your name.');
    if (!CONFIG.allowedAttendance.includes(attendance)) throw new Error('Please select Accept or Decline.');
    if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > CONFIG.maxGuestCount) {
      throw new Error('Please select a valid number of guests (1–10).');
    }

    const cache = CacheService.getScriptCache();
    const cacheKey = 'rsvp_' + submissionId;
    if (cache.get(cacheKey)) {
      return responsePage(submissionId, true, 'Your RSVP has already been received.');
    }

    const spreadsheetId = PropertiesService.getScriptProperties().getProperty('RSVP_SPREADSHEET_ID');
    if (!spreadsheetId) throw new Error('The RSVP sheet has not been configured yet.');

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      if (cache.get(cacheKey)) {
        return responsePage(submissionId, true, 'Your RSVP has already been received.');
      }
      const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
      const sheet = spreadsheet.getSheetByName(CONFIG.sheetName);
      if (!sheet) throw new Error('The RSVP response tab could not be found.');
      sheet.appendRow([
        new Date(), submissionId, safeCell(title), safeCell(name),
        attendance === 'accept' ? 'Accept' : 'Decline', guestCount, safeCell(note)
      ]);
      cache.put(cacheKey, 'saved', CONFIG.dedupeSeconds);
    } finally {
      lock.releaseLock();
    }

    return responsePage(submissionId, true, 'Your RSVP has been received successfully.');
  } catch (error) {
    console.error(error);
    return responsePage(
      submissionId || 'invalid',
      false,
      error && error.message ? error.message : 'We could not save your RSVP. Please try again.'
    );
  }
}

/** Strip control characters and enforce field lengths. */
function cleanText(value, maxLength) {
  return String(value || '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/** Prevent spreadsheet formula injection in guest-provided text. */
function safeCell(value) {
  const text = String(value || '');
  return /^[=+@-]/.test(text) ? "'" + text : text;
}

/** Sends the result to the parent website from the hidden response iframe. */
function responsePage(submissionId, ok, message) {
  const payload = JSON.stringify({
    type: 'wedding-rsvp-result',
    submissionId: submissionId,
    ok: Boolean(ok),
    message: message
  }).replace(/</g, '\\u003c');
  const html = '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
    '<body><script>window.parent.postMessage(' + payload + ', "*");</script></body></html>';
  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
