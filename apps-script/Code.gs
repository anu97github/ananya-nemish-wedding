/**
 * Ananya & Nemish wedding guestbook endpoint.
 * Writes guest notes to the Guestbook tab in the couple's existing spreadsheet.
 */
const CONFIG = {
  spreadsheetId: '1a_7lwgZq_hPP3Lz9hzzMgy2OHlkteaG5sJHNyra5_pI',
  sheetName: 'Guestbook',
  headers: ['Date & Time', 'Sender Name', 'Message'],
  maxNameLength: 100,
  maxMessageLength: 1200,
  dedupeSeconds: 21600
};

/** Creates or formats the Guestbook tab in the existing wedding spreadsheet. Safe to rerun. */
function setupGuestbookSheet() {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  let sheet = spreadsheet.getSheetByName(CONFIG.sheetName);
  if (!sheet) sheet = spreadsheet.insertSheet(CONFIG.sheetName);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, CONFIG.headers.length).setValues([CONFIG.headers]);
  } else {
    sheet.getRange(1, 1, 1, CONFIG.headers.length).setValues([CONFIG.headers]);
  }
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, CONFIG.headers.length)
    .setFontWeight('bold').setBackground('#e8eee4').setFontColor('#46563a');
  sheet.setColumnWidth(1, 190);
  sheet.setColumnWidth(2, 220);
  sheet.setColumnWidth(3, 560);
  sheet.getRange('A:A').setNumberFormat('dd mmm yyyy, hh:mm:ss');
  sheet.getRange('C:C').setWrap(true);
  return spreadsheet.getUrl();
}

/** Health check for the deployed guestbook endpoint. */
function doGet() {
  return HtmlService.createHtmlOutput('<!doctype html><html><body>Wedding guestbook endpoint is running.</body></html>');
}

/** Accepts the website's hidden-iframe form POST and saves one guest note. */
function doPost(event) {
  const params = (event && event.parameter) || {};
  const submissionId = String(params.submissionId || '').trim();
  try {
    if (!/^[A-Za-z0-9_-]{8,100}$/.test(submissionId)) {
      throw new Error('Invalid submission. Please refresh the page and try again.');
    }
    if (String(params.website || '').trim() !== '') {
      return responsePage(submissionId, true, 'Your note has been received.');
    }

    const name = cleanText(params.name, CONFIG.maxNameLength);
    const message = cleanText(params.message, CONFIG.maxMessageLength);
    if (!name) throw new Error('Please enter your name.');
    if (!/^[\p{L}\p{M}][\p{L}\p{M} .’'-]*$/u.test(name)) {
      throw new Error('Please use letters only in your name.');
    }
    if (!message) throw new Error('Please write a little note for the couple.');

    const cache = CacheService.getScriptCache();
    const cacheKey = 'guestbook_' + submissionId;
    if (cache.get(cacheKey)) {
      return responsePage(submissionId, true, 'Your note has already been received.');
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      if (cache.get(cacheKey)) {
        return responsePage(submissionId, true, 'Your note has already been received.');
      }
      const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
      let sheet = spreadsheet.getSheetByName(CONFIG.sheetName);
      if (!sheet) {
        sheet = spreadsheet.insertSheet(CONFIG.sheetName);
        sheet.getRange(1, 1, 1, CONFIG.headers.length).setValues([CONFIG.headers]);
        sheet.setFrozenRows(1);
        sheet.getRange(1, 1, 1, CONFIG.headers.length)
          .setFontWeight('bold').setBackground('#e8eee4').setFontColor('#46563a');
        sheet.setColumnWidth(1, 190);
        sheet.setColumnWidth(2, 220);
        sheet.setColumnWidth(3, 560);
        sheet.getRange('A:A').setNumberFormat('dd mmm yyyy, hh:mm:ss');
        sheet.getRange('C:C').setWrap(true);
      }
      sheet.appendRow([new Date(), safeCell(name), safeCell(message)]);
      cache.put(cacheKey, 'saved', CONFIG.dedupeSeconds);
    } finally {
      lock.releaseLock();
    }
    return responsePage(submissionId, true, 'Your note has been received. Thank you.');
  } catch (error) {
    console.error(error);
    return responsePage(
      submissionId || 'invalid',
      false,
      error && error.message ? error.message : 'We could not save your note. Please try again.'
    );
  }
}

/** Remove control characters while preserving paragraph breaks in notes. */
function cleanText(value, maxLength) {
  return String(value || '')
    .replace(/\u0000/g, '')
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLength);
}

/** Prevent spreadsheet formula injection in guest-provided text. */
function safeCell(value) {
  const text = String(value || '');
  return /^[=+@-]/.test(text) ? "'" + text : text;
}

/** Posts the result from the hidden iframe back to the wedding page. */
function responsePage(submissionId, ok, message) {
  const payload = JSON.stringify({
    type: 'wedding-note-result',
    submissionId: submissionId,
    ok: Boolean(ok),
    message: message
  }).replace(/</g, '\\u003c');
  const html = '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>' +
    '<body><script>(function(){var message=' + payload + ';var target=window;for(var i=0;i<10;i++){try{if(target.parent===target)break;target.parent.postMessage(message,"*");target=target.parent;}catch(e){break;}}try{window.top.postMessage(message,"*");}catch(e){}})();</script></body></html>';
  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
