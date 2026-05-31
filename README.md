# SAH Microtests

Local dashboard for Scholars Academic Home microtests.

## Run Locally

```sh
npm start
```

Open:

```text
http://localhost:3029
```

## Connect Google Sheets

1. Open the Google Sheet question bank.
2. Go to `Extensions` -> `Apps Script`.
3. Paste the contents of `google-apps-script/Code.gs`.
4. Deploy -> `New deployment` -> type `Web app`.
5. Set:
   - Execute as: `Me`
   - Who has access: `Anyone with the link`
6. Copy the Web App URL.
7. Create `config.json` beside this README:

```json
{
  "googleSheetApiUrl": "PASTE_WEB_APP_URL_HERE"
}
```

8. Restart the local server.

When `googleSheetApiUrl` is present, the app reads the question bank from Google Sheets. If the Sheet API is unavailable, it falls back to `data/class-9-science.json`.
