/* Stofftrainer – regelbasierter Fragengenerator, läuft komplett im Browser (kein Netz, kein Modell).
   window.StoffGen.erzeugen(text, {nK, nQ, name}) → {karten:[{t,f,a,art}], mc:[{t,f,o,r,e,art}], hinweise:[]}
   art: "vorhanden" (aus Prüfungsfragen im Text), "definition", "aufzaehlung", "luecke", "zahl"            */
(function(){
"use strict";
const STOP = new Set(("der die das ein eine einer eines einem einen dem den des sie wir ich er es ihr ihnen uns mich dich sich diese dieser dieses diesen diesem jeder jede jedes alle allen aller wenn bei nach vor mit ohne auch dann beim zum zur im am und oder aber auf aus für von nicht kein keine keinen keiner kann können muss müssen darf dürfen soll sollen wird werden ist sind war waren hat haben sein seine seiner ihre ihrer ihrem ihren dies das hier dort nur noch schon sehr mehr als wie so dass daß weil denn doch bis über unter durch gegen um an in zu ab seit während wegen trotz je desto sowie bzw ca usw etc man wer was wo wann warum welche welcher welches wieviel wie viele immer nie oft meist etwa rund mindestens höchstens maximal minimal jedoch dabei dazu dafür damit darauf daher deshalb außerdem zudem ferner zunächst zuerst danach anschließend schließlich beispiel beispielsweise frage antwort lösung richtig falsch seite kapitel abschnitt teil").split(" "));
const ABBR = /\b(z\.\s?B|bzw|ca|usw|etc|Nr|Abs|Art|vgl|evtl|ggf|inkl|max|min|Std|Min|Sek|km\/h|S|u\.\s?a|d\.\s?h|o\.\s?ä|sog)\.$/;
const norm = s => String(s||"").toLowerCase().replace(/[^a-z0-9äöüß]+/g," ").trim();
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const words = s => (s.match(/[A-Za-zÄÖÜäöüß][\wäöüßÄÖÜ-]*/g) || []);
const NUM = /(?:^|\s)(\d+(?:[.,]\d+)?)\s?(m|cm|mm|km|km\/h|kg|g|t|l|ml|%|°C?|€|Euro|Jahre?n?|Monate?n?|Tage?n?|Wochen?|Stunden?|Minuten?|Sekunden?|Meter|Zentimeter|Prozent|Personen|Mal|mal|Liter|Watt|Volt|bar|PS|Grad)?(?=[\s.,;:)]|$)/g;
function shuffle(a){ for (let i = a.length-1; i > 0; i--){ const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]] = [a[j],a[i]]; } return a; }

/* ---------- Vorverarbeitung ---------- */
function vorbereiten(text){
  let t = String(text||"").replace(/\r/g,"").replace(/\[Seite \d+\]\n?/g,"\n").replace(/[ \t]+/g," ");
  t = t.replace(/(\w)-\n(?=[a-zäöüß])/g,"$1");                 // Silbentrennung am Zeilenende
  t = t.replace(/\n{2,}/g,"\n\n");
  t = t.replace(/([^\n.!?:;])\n(?![a-f][\)\.]\s)(?=[a-zäöüß])/g,"$1 ");   // Zeilenumbruch mitten im Satz
  return t.split("\n").map(l => l.trim());
}
const LOES = /^(?:Lösung|Antwort|Richtig|Richtige Antwort|Korrekt)\s*[:\-–]?\s*([a-fA-F1-6](?:\s*[,\/und]+\s*[a-fA-F1-6])*)\s*\.?$/;
const OPT = /^(?:[\(\[]?([a-fA-F])[\)\.\]:]|\(?([1-6])\)|[☐☑□■○●◯•▪\-–]|\[[ xX]\]|\([xX ]\))\s*(.+)$/;
const MARK_OK = /(✓|✔|☑|■|●|\[[xX]\]|\([xX]\)|\*\s*$|\s\(richtig\)\s*$|\s—?\s*richtig\s*$)/;
const QLINE = /^(?:(?:Frage|Aufgabe)\s*)?(?:\d{1,3}\s*[\.\):]\s*)?(.+\?)\s*$/;
const isHeading = l => l.length >= 3 && !/:/.test(l) && !LOES.test(l) && l.length <= 70 && !/[.!?:,;]$/.test(l) && /^[\dA-ZÄÖÜ§]/.test(l) && words(l).length <= 9 && !OPT.test(l) && !/\?$/.test(l) && !/\b(ist|sind|wird|werden|hat|haben|kann|muss|darf)\b/.test(l);

/* ---------- 1. Vorhandene Prüfungsfragen erkennen ---------- */
function vorhandene(lines, used){
  const mc = [], karten = []; let thema = "";
  for (let i = 0; i < lines.length; i++){
    const l = lines[i]; if (!l || used.has(i)) continue;
    if (isHeading(l)){ thema = l.replace(/^[\d.\s]+/,""); continue; }
    const qm = l.match(QLINE); if (!qm) continue;
    const frage = qm[1].trim(); if (words(frage).length < 3) continue;
    // Optionen sammeln
    const opts = [], ok = []; let j = i + 1, loes = null;
    while (j < lines.length && opts.length < 6){
      const m = lines[j].match(OPT);
      if (!m){ if (lines[j] === "" && j + 1 < lines.length && OPT.test(lines[j+1])){ j++; continue; } break; }
      let txt = (m[3]||"").trim(); const marked = MARK_OK.test(lines[j]) || MARK_OK.test(txt);
      txt = txt.replace(MARK_OK,"").replace(/\s*[✓✔☑]\s*/g,"").trim();
      if (txt){ if (marked) ok.push(opts.length); opts.push(txt); }
      j++;
    }
    if (opts.length >= 2){
      // Lösungszeile direkt danach
      for (let k = j; k < Math.min(j + 3, lines.length); k++){ const lm = lines[k].match(LOES); if (lm){ loes = lm[1]; used.add(k); break; } if (lines[k] && !lines[k].match(LOES)) break; }
      let r = ok.slice();
      if (!r.length && loes) r = loes.split(/[^a-fA-F1-6]+/).filter(Boolean).map(x => /\d/.test(x) ? +x - 1 : x.toLowerCase().charCodeAt(0) - 97).filter(x => x >= 0 && x < opts.length);
      mc.push({t: thema, f: frage, o: opts, r, e: "", art: "vorhanden"});
      for (let k = i; k < j; k++) used.add(k); i = j - 1; continue;
    }
    // Frage-Antwort-Paar: nächste 1–3 Zeilen bis Leerzeile/nächste Frage
    const ans = []; j = i + 1; if (j < lines.length && lines[j] === "" && lines[j+1] && !QLINE.test(lines[j+1]) && !isHeading(lines[j+1])) j++;
    while (j < lines.length && ans.length < 3 && lines[j] && !QLINE.test(lines[j]) && !isHeading(lines[j])){ ans.push(lines[j].replace(/^(?:Antwort|Lösung)\s*[:\-–]\s*/i,"")); j++; }
    const a = ans.join(" ").trim();
    if (a && a.length >= 3 && a.length <= 400){ karten.push({t: thema, f: frage, a, art: "vorhanden"}); for (let k = i; k < j; k++) used.add(k); i = j - 1; }
  }
  return {mc, karten};
}

/* ---------- 2. Fließtext → Sätze je Thema ---------- */
function saetze(lines, used){
  const out = []; let thema = "", buf = [];
  const flush = () => { if (!buf.length) return; const para = buf.join(" "); buf = [];
    // Satztrennung mit Abkürzungsschutz
    const parts = []; let cur = "";
    for (const tok of para.split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ„"(\d])/)){ cur = cur ? cur + " " + tok : tok; if (ABBR.test(cur)) continue; parts.push(cur); cur = ""; }
    if (cur) parts.push(cur);
    for (const s of parts){ const w = words(s).length; if (w >= 6 && w <= 40 && !/[:;]$/.test(s)) out.push({t: thema, s: s.trim()}); } };
  for (let i = 0; i < lines.length; i++){
    if (used.has(i)) { flush(); continue; }
    const l = lines[i];
    if (!l){ flush(); continue; }
    if (isHeading(l)){ flush(); thema = l.replace(/^[\d.\s]+/,""); continue; }
    if (OPT.test(l)) { buf.push(l.replace(OPT, "$2")); continue; }
    buf.push(l);
  }
  flush(); return out;
}

/* ---------- 3. Aufzählungen (Zeile endet mit „:“, dann Liste) ---------- */
function aufzaehlungen(lines, used){
  const out = []; let thema = "";
  for (let i = 0; i < lines.length; i++){
    const l = lines[i]; if (!l || used.has(i)) continue;
    if (isHeading(l)){ thema = l.replace(/^[\d.\s]+/,""); continue; }
    if (!/:$/.test(l) || words(l).length < 2 || words(l).length > 18) continue;
    const items = []; let j = i + 1;
    while (j < lines.length && lines[j] && items.length < 10){ const m = lines[j].match(OPT); if (!m) break; items.push((m[3]||"").trim()); j++; }
    if (items.length >= 3){ out.push({t: thema, f: cap(l.replace(/:$/, "")) + " – nenne alle " + items.length + ".", a: items.map(x => "• " + x).join("\n"), art: "aufzaehlung"}); for (let k = i; k < j; k++) used.add(k); i = j - 1; }
  }
  return out;
}

/* ---------- 4. Definitionen ---------- */
const DEF = [
  [/^(?:Unter|Als)\s+(?:dem|der|den|einem|einer)?\s*([A-ZÄÖÜ][\wäöüß-]+(?:\s[A-ZÄÖÜ][\wäöüß-]+)?)\s+(?:versteht man|bezeichnet man|wird .{0,30}verstanden|gilt)\s+(.{15,})$/, (m) => ["Was versteht man unter " + m[1] + "?", m[2]]],
  [/^([A-ZÄÖÜ][\wäöüß-]+(?:\s[A-ZÄÖÜ][\wäöüß-]+)?)\s+(?:nennt man|werden .{0,20}genannt|wird .{0,20}genannt)\s+(.{5,})$/, (m) => ["Wie nennt man " + m[1] + "?", m[2]]],
  [/^(Der|Die|Das|Ein|Eine)?\s*([A-ZÄÖÜ][\wäöüß-]+(?:\s(?:[a-zäöüß-]+\s)?[A-ZÄÖÜ][\wäöüß-]+)?)\s+(ist|sind|bezeichnet|bedeutet|heißt|gilt als|dient|dienen|besteht aus|bestehen aus|umfasst|regelt|verpflichtet|erlaubt|verbietet)\s+(.{15,})$/, (m) => ["Was " + (m[3] === "sind" ? "sind" : "ist") + " " + (m[1] ? m[1].toLowerCase() + " " : "") + m[2] + "?", (m[1] ? m[1] + " " : "") + m[2] + " " + m[3] + " " + m[4]]],
];
function definitionen(sz){
  const out = [];
  for (const x of sz){ for (const [re, fn] of DEF){ const m = x.s.replace(/[.!]$/,"").match(re); if (m && !STOP.has((m[2] && /^(Der|Die|Das|Ein|Eine)$/.test(m[1]||"") ? m[2] : m[1]).toLowerCase()) && !/^(Als|Unter)$/.test(m[1]||"")){ const [f, a] = fn(m); out.push({t: x.t, f, a: cap(a.trim()).replace(/[^.!?]$/, "$&."), art: "definition", src: x.s}); break; } } }
  return out;
}

/* ---------- 5. Lückentexte und Zahlenfragen ---------- */
function schluessel(sz){
  // Termhäufigkeit über alle Sätze (für Distraktoren und Seltenheit)
  const freq = {}, nums = [], terms = new Set();
  for (const x of sz){
    for (const w of words(x.s).slice(1)){ if (/^[A-ZÄÖÜ]/.test(w) && w.length >= 4 && !STOP.has(w.toLowerCase())){ freq[w] = (freq[w]||0) + 1; terms.add(w); } }
    let m; NUM.lastIndex = 0; while ((m = NUM.exec(x.s))){ nums.push({v: m[1], u: m[2] || ""}); }
  }
  return {freq, nums, terms: [...terms]};
}
function luecken(sz, nKarten, nMC){
  const {freq, nums, terms} = schluessel(sz);
  const karten = [], mc = [], seen = new Set();
  // Sätze mischen, aber Themen abwechseln (Round-Robin)
  const byT = {}; sz.forEach(x => (byT[x.t] = byT[x.t] || []).push(x)); Object.values(byT).forEach(shuffle);
  const order = []; const keys = Object.keys(byT); let any = true;
  while (any){ any = false; for (const k of keys){ const x = byT[k].shift(); if (x){ order.push(x); any = true; } } }
  for (const x of order){
    if (karten.length >= nKarten && mc.length >= nMC) break;
    const s = x.s; let key = null, typ = "";
    NUM.lastIndex = 0; const nm = NUM.exec(s);
    if (nm){ key = (nm[1] + (nm[2] ? " " + nm[2] : "")); typ = "zahl"; }
    else {
      const cands = words(s).slice(1).filter(w => /^[A-ZÄÖÜ]/.test(w) && w.length >= 4 && !STOP.has(w.toLowerCase()));
      if (!cands.length) continue;
      cands.sort((a,b) => (freq[a]*2 - a.length/2) - (freq[b]*2 - b.length/2));   // selten und lang zuerst
      key = cands[0]; typ = "luecke";
    }
    if (!key || seen.has(norm(s))) continue; seen.add(norm(s));
    const idx = s.indexOf(key); if (idx < 0) continue;
    const frage = s.slice(0, idx) + "______" + s.slice(idx + key.length);
    if (karten.length < nKarten) karten.push({t: x.t, f: "Lücke füllen: " + frage, a: key, art: typ, src: s});
    if (mc.length < nMC){
      let pool;
      if (typ === "zahl"){ const u = (nm[2] || ""); pool = [...new Set(nums.filter(n => n.u === u && n.v !== nm[1]).map(n => n.v + (u ? " " + u : "")))];
        if (pool.length < 3){ const v = parseFloat(nm[1].replace(",",".")); const dec = /[.,]/.test(nm[1]); const mk = f => (dec ? (v*f).toFixed(1).replace(".",",") : String(Math.max(1, Math.round(v*f)))) + (u ? " " + u : ""); pool = [...new Set(pool.concat([mk(.5), mk(2), mk(1.5), mk(.75), mk(3)]))].filter(p => p !== key); } }
      else pool = terms.filter(w => w !== key && Math.abs(w.length - key.length) <= 4 && norm(w) !== norm(key));
      if (pool.length >= 3){ const o = shuffle(shuffle(pool).slice(0, 3).concat(key)); mc.push({t: x.t, f: "Welche Angabe passt in die Lücke? " + frage, o, r: [o.indexOf(key)], e: s, art: typ}); }
    }
  }
  return {karten, mc};
}

/* ---------- Hauptfunktion ---------- */
function erzeugen(text, opt){
  opt = Object.assign({nK: 20, nQ: 20}, opt || {});
  const lines = vorbereiten(text), used = new Set(), hinweise = [];
  const vh = vorhandene(lines, used);
  const az = aufzaehlungen(lines, used);
  const sz = saetze(lines, used);
  const df = definitionen(sz);
  const dfSrc = new Set(df.map(d => norm(d.src)));
  const rest = sz.filter(x => !dfSrc.has(norm(x.s)));
  let karten = vh.karten.concat(az, df), mc = vh.mc.slice();
  const lk = luecken(rest, Math.max(0, opt.nK - karten.length), Math.max(0, opt.nQ - mc.length));
  karten = karten.concat(lk.karten); mc = mc.concat(lk.mc);
  const ohne = mc.filter(q => !q.r.length).length;
  if (vh.mc.length) hinweise.push(vh.mc.length + " Prüfungsfragen im Text erkannt" + (ohne ? ", davon " + ohne + " ohne erkennbare Lösung (bitte im Editor markieren)" : "") + ".");
  if (!sz.length && !vh.mc.length && !vh.karten.length) hinweise.push("Kein auswertbarer Fließtext gefunden.");
  // Dubletten
  const seenF = new Set(); karten = karten.filter(k => { const n = norm(k.f); if (seenF.has(n)) return false; seenF.add(n); return true; });
  const seenQ = new Set(); mc = mc.filter(q => { const n = norm(q.f); if (seenQ.has(n)) return false; seenQ.add(n); return true; });
  return {karten, mc, hinweise, stat: {saetze: sz.length, vorhanden: vh.mc.length + vh.karten.length, definitionen: df.length, aufzaehlungen: az.length}};
}
window.StoffGen = {erzeugen, vorbereiten};
})();
