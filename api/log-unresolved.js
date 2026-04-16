const { google } = require('googleapis');

function formatTimestamp() {
  const now = new Date();

  const local = new Date(
    now.toLocaleString('en-US', { timeZone: 'Europe/Madrid' })
  );

  const day = String(local.getDate()).padStart(2, '0');
  const month = String(local.getMonth() + 1).padStart(2, '0');
  const year = local.getFullYear();

  const hours = String(local.getHours()).padStart(2, '0');
  const minutes = String(local.getMinutes()).padStart(2, '0');
  const seconds = String(local.getSeconds()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

function buildRequestSummary(req) {
  const userAgent = req.headers['user-agent'] || '';
  const forwardedFor = req.headers['x-forwarded-for'] || '';
  const referer = req.headers['referer'] || '';
  const origin = req.headers['origin'] || '';

  let clientGuess = 'unknown';

  const ua = userAgent.toLowerCase();

  if (
    ua.includes('android') ||
    ua.includes('iphone') ||
    ua.includes('ipad') ||
    ua.includes('mobile')
  ) {
    clientGuess = 'possible_mobile';
  } else if (
    ua.includes('windows') ||
    ua.includes('macintosh') ||
    ua.includes('linux') ||
    ua.includes('x11')
  ) {
    clientGuess = 'possible_desktop';
  }

  const sourceType = 'chatgpt_action';
  const uaStatus = userAgent ? 'ua_present' : 'ua_missing';
  const ipStatus = forwardedFor ? 'ip_present' : 'ip_missing';
  const refStatus = referer ? 'referer_present' : 'referer_missing';
  const originStatus = origin ? 'origin_present' : 'origin_missing';

  return `${sourceType} | ${clientGuess} | ${uaStatus} | ${ipStatus} | ${refStatus} | ${originStatus}`;
}

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

    const requestSummary = buildRequestSummary(req);

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
      formatTimestamp(),
      chatbot,
      question,
      user_language,
      context_hint,
      source,
      status,
      requestSummary
    ]];

    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
      range: 'Logs!A:H',
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