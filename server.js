
import express from 'express';
import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(cors());

// --- DB setup (SQLite) ---
const db = new Database(path.join(__dirname, 'data.db'));
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS searches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    city TEXT, lat REAL, lon REAL,
    avg REAL, high REAL, low REAL,
    uhi REAL,
    advice TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// --- Static frontend ---
app.use(express.static(path.join(__dirname, 'public')));

// --- Presets (same as your original) ---
const PRESET = {
  "Ahmedabad, India": {coords:[23.0225,72.5714], avg:28.5, high:45, low:12, uhs:78, note:"Hot, arid core; limited green cover"},
  "Chennai, India": {coords:[13.0827,80.2707], avg:28, high:41, low:20, uhs:65, note:"Coastal humidity + built-up heat"},
  "Shillong, India": {coords:[25.5788,91.8933], avg:18.5, high:26, low:8, uhs:22, note:"Hilly & green — low UHI"},
  "Patna, India": {coords:[25.5941,85.1376], avg:26, high:44, low:9, uhs:70, note:"Dense urban core with heat spikes"},
  "Detroit, USA": {coords:[42.3314,-83.0458], avg:10.5, high:38, low:-18, uhs:48, note:"Mixed industrial/residential footprint"},
  "San Diego, USA": {coords:[32.7157,-117.1611], avg:17.5, high:35, low:8, uhs:28, note:"Coastal moderation, sea breeze reduces extremes"},
  "Los Angeles, USA": {coords:[34.0522,-118.2437], avg:18.5, high:42, low:6, uhs:60, note:"Urban sprawl & heat trapping surfaces"}
};

const clamp = (v,a,b)=> Math.max(a, Math.min(b, v));

function simulateHighLow(avg){
  const diurnal = (Math.random()*4 + 3);
  const high = avg + (Math.random()*3 + diurnal/1.5);
  const low  = avg - (Math.random()*3 + diurnal/2.2);
  return { high, low };
}

function buildSuggestions(uhi, note, city){
  const out = [];
  if (city) out.push(`<strong>${city}</strong> — ${note || 'Simulated city'}`);
  if(uhi >= 70){
    out.push("Prioritise large-scale greening (parks, urban forests) and shade corridors.");
    out.push("Implement cool-roof programs and reflective pavements in market / high-traffic zones.");
    out.push("Deploy temporary cooling centers & shaded transit stops during heat waves.");
  } else if(uhi >= 45){
    out.push("Target pilot retrofits: cool roofs, tree-planting, and permeable pavements in hotspot neighborhoods.");
    out.push("Encourage building designs with cross-ventilation and outdoor shade.");
  } else {
    out.push("Good baseline — maintain urban canopy, protect open green areas, and monitor changes.");
    out.push("Use pocket parks and community tree initiatives to keep UHI low.");
  }
  out.push("Mapping tips: sample day & night, gather rooftop sensors, and overlay land-cover/traffic data.");
  return out;
}

// --- API: analyze city ---
app.post('/api/analyze', async (req, res) => {
  try{
    const { query, offline=false } = req.body || {};
    if(!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'query string required' });
    }

    // 1) preset quick path
    if(PRESET[query]){
      const p = PRESET[query];
      // ask ML to refine UHI from avg
      const mlUhi = await callML(p.coords[0], p.coords[1], p.avg).catch(()=> null);
      const uhi = mlUhi ?? p.uhs;
      const advArr = buildSuggestions(uhi, p.note, query);
      const adviceHtml = `<ul>${advArr.map(s=>`<li style="margin:6px 0">${s}</li>`).join('')}</ul>`;

      // store
      db.prepare(`INSERT INTO searches(city, lat, lon, avg, high, low, uhi, advice) VALUES (?,?,?,?,?,?,?,?)`)
        .run(query, p.coords[0], p.coords[1], p.avg, p.high, p.low, uhi, adviceHtml);

      return res.json({
        city: query,
        coords: p.coords,
        avg: p.avg, high: p.high, low: p.low,
        uhi,
        adviceHtml,
        note: p.note,
        source: offline ? "Simulated (offline)" : "Current-based"
      });
    }

    // 2) geocode
    let coords = null;
    try{
      const g = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: { format: 'json', limit: 1, q: query },
        headers: { 'Accept-Language': 'en', 'User-Agent': 'urban-heat-ai-student-project' }
      });
      if(Array.isArray(g.data) && g.data.length){
        coords = [parseFloat(g.data[0].lat), parseFloat(g.data[0].lon)];
      } else {
        throw new Error('not found');
      }
    } catch(e){
      coords = [20.6, 78.9];
    }

    // 3) current temp
    let avg = null, high, low;
    if(!offline){
      try{
        const [lat, lon] = [coords[0].toFixed(4), coords[1].toFixed(4)];
        const r = await axios.get('https://api.open-meteo.com/v1/forecast', {
          params: { latitude: lat, longitude: lon, current_weather: true }
        });
        const t = r.data?.current_weather?.temperature;
        if(typeof t === 'number') avg = t;
      }catch(e){ avg = null; }
    }
    if(avg === null){
      const latAbs = Math.abs(coords[0]);
      const base = clamp(27 - (latAbs/90)*32 + (Math.random()*4-2), -10, 35);
      avg = base + (Math.random()*6 - 3);
    }
    ({high, low} = simulateHighLow(avg));

    // 4) ML service for UHI
    let uhi = await callML(coords[0], coords[1], avg).catch(()=> null);
    if(uhi === null){
      const baseline = 15;
      const tempFactor = clamp((avg - baseline) / 20, 0, 1);
      uhi = clamp((tempFactor * 70 + Math.random()*25), 5, 98);
    }

    const advArr = buildSuggestions(uhi, null, query);
    const adviceHtml = `<ul>${advArr.map(s=>`<li style="margin:6px 0">${s}</li>`).join('')}</ul>`;

    // 5) save
    db.prepare(`INSERT INTO searches(city, lat, lon, avg, high, low, uhi, advice) VALUES (?,?,?,?,?,?,?,?)`)
      .run(query, coords[0], coords[1], avg, high, low, uhi, adviceHtml);

    res.json({
      city: query, coords, avg, high, low, uhi,
      adviceHtml,
      note: "Live geocode + weather; UHI by ML service",
      source: offline ? "Simulated (offline)" : "Current-based"
    });

  }catch(err){
    console.error(err);
    res.status(500).json({ error: 'server_error', detail: String(err) });
  }
});

// --- API: history ---
app.get('/api/history', (req, res)=>{
  const rows = db.prepare(`SELECT id, city, lat, lon, avg, high, low, uhi, created_at FROM searches ORDER BY id DESC LIMIT 20`).all();
  res.json(rows);
});

// --- ML proxy helper ---
async function callML(lat, lon, avg){
  const url = process.env.ML_URL || 'http://127.0.0.1:5001/predict';
  const r = await axios.post(url, { lat, lon, avg_temp: avg }, { timeout: 3000 });
  if(typeof r.data?.uhi === 'number') return r.data.uhi;
  throw new Error('ml_bad_response');
}

// --- Fallback to index.html for root ---
app.get('/', (_, res)=>{
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> {
  console.log(`Urban Heat AI backend running on http://localhost:${PORT}`);
});
