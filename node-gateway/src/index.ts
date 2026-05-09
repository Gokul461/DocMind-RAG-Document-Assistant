import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import multer from 'multer';
import axios from 'axios';
import FormData from 'form-data';

const app = express();
const PORT = 4000;
const AI = 'http://localhost:8000';

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(morgan('dev'));
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

app.post('/api/ingest', upload.single('file'), async (req, res) => {
  if (!req.file) { res.status(400).json({ error: 'No file' }); return; }
  const form = new FormData();
  form.append('file', req.file.buffer, { filename: req.file.originalname, contentType: req.file.mimetype });
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  try {
    const r = await axios.post(AI + '/api/ingest', form, { headers: form.getHeaders(), responseType: 'stream' });
    r.data.on('data', (c) => res.write(c.toString()));
    r.data.on('end', () => res.end());
  } catch (e) {
    res.write('data: ' + JSON.stringify({ status: 'error', message: e.message }) + '\n\n');
    res.end();
  }
});

app.post('/api/query', async (req, res) => {
  const { question, doc_ids, chat_history } = req.body;
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Cache-Control', 'no-cache');
  try {
    const r = await axios.post(AI + '/api/query', { question, doc_ids, chat_history }, { responseType: 'stream' });
    r.data.on('data', (c) => res.write(c.toString()));
    r.data.on('end', () => res.end());
  } catch (e) {
    res.write('Error: ' + e.message);
    res.end();
  }
});

app.get('/api/documents', async (_req, res) => {
  try {
    const { data } = await axios.get(AI + '/api/documents');
    res.json(data);
  } catch { res.json({ documents: [] }); }
});

app.delete('/api/documents/:docId', async (req, res) => {
  try {
    const { data } = await axios.delete(AI + '/api/documents/' + req.params.docId);
    res.json(data);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'docmind-gateway', port: PORT });
});

app.listen(PORT, () => {
  console.log('DocMind Gateway running at http://localhost:' + PORT);
  console.log('Proxying AI requests to ' + AI);
});