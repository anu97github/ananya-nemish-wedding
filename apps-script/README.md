# Google Sheets RSVP backend

This branch adds a Google Apps Script endpoint that writes wedding RSVP submissions to a spreadsheet owned by the Google account that deploys it.

## Guest submission flow

The existing website form posts to a Google Apps Script Web App in a hidden iframe. The script validates the submission, appends a row, and signals success or failure back to the website. The site only displays success after the script confirms the write.

## Spreadsheet structure

The setup function creates **Ananya & Nemish Wedding — RSVP Responses**, with a tab named **RSVP Responses**.

| Column | Value |
|---|---|
| Submitted At | Server timestamp |
| Submission ID | Unique request ID for duplicate protection |
| Title | Mr. / Mrs. / Ms. / Dr. / Other |
| Guest Name | Guest's name |
| RSVP | Accept / Decline |
| Guest Count | 1–10; Decline is recorded as 1 |
| Note | Optional guest message |

The current website form does not collect guest email addresses.

## One-time setup (Google account owner)

1. Sign into **sweet.nothing.7997@gmail.com** in your browser.
2. Open https://script.google.com/home and create a New project named **Ananya & Nemish RSVP Backend**.
3. Replace the starter code in Code.gs with the complete contents of this folder's Code.gs file from this branch.
4. Save, select the function setupRsvpSheet, and click Run.
5. Review and approve Google's authorization prompt. This creates the spreadsheet in the signed-in account's Drive.
6. Open the execution log and copy the spreadsheet URL. The sheet is owned by the account that ran setup.
7. Choose Deploy → New deployment → Web app.
8. Set Execute as to **Me**. Set Who has access to **Anyone**, so guests can submit without signing into Google. Deploy and complete any authorization prompt.
9. Copy the Web App URL. It must end in /exec, not /dev.
10. Edit rsvp-config.js on this PR branch and set the endpoint value to the copied URL. Commit the change to this branch so the preview website receives it.
11. Test the preview with one Accept and one Decline. Confirm both records appear in the sheet and the website displays the matching success message.

## Security and operational notes

- The endpoint is public so guests do not need Google sign-in. Do not put credentials, API keys, or the spreadsheet ID in the website.
- The Apps Script executes as the owner. Guests can submit but cannot browse or edit the spreadsheet.
- Included protections: required-field and allow-list validation, length limits, a honeypot field, unique submission IDs with a six-hour duplicate cache, a script lock around writes, and protection against spreadsheet formula injection.
- These are basic anti-abuse measures, not a substitute for CAPTCHA or dedicated rate limiting if spam becomes a problem.
- Restrict spreadsheet sharing to people who should see guest details. Names and notes are personal information.
- If the Apps Script deployment URL changes, update rsvp-config.js in this branch.
- Until the endpoint URL is configured, the preview intentionally shows that RSVP is not connected and does not claim that a response was saved.

## Test checklist

- [ ] Setup creates the sheet in the intended Google account.
- [ ] Accept with 1 guest saves an Accept row.
- [ ] Accept with multiple guests saves the selected count.
- [ ] Decline saves a Decline row with guest count 1.
- [ ] Optional note is saved.
- [ ] The website only displays success after Apps Script confirms the write.
- [ ] A missing endpoint or invalid response never produces a false success message.
