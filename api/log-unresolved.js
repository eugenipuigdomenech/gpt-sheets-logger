const { google } = require('googleapis');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({
      ok: false,
      error: 'Method not allowed'
    });
  }

  try {
    const {
      chatbot = '',
      question = '',
      user_language = '',
      context_hint = '',
      source = 'chatgpt_action',
      status = 'unresolved'
    } = req.body || {};

    if (!chatbot || !question) {
      return res.status(400).json({
        ok: false,
        error: 'Missing required fields: chatbot and question'
      });
    }

    const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const values = [[
      new Date().toISOString(),
      chatbot,
      question,
      user_language,
      context_hint,
      source,
      status
    ]];

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
      range: 'Logs!A:G',
      valueInputOption: 'RAW',
      requestBody: {
        values,
      },
    });

    return res.status(200).json({
      ok: true,
      message: 'Question logged successfully'
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: String(error.message || error)
    });
  }
};