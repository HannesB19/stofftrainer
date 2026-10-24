/* Stofftrainer – regelbasierter Fragengenerator, läuft komplett im Browser (kein Netz, kein Modell).
   window.StoffGen.erzeugen(text, {nK, nQ, lang:"de"|"en"}) → {karten:[{t,f,a,art}], mc:[{t,f,o,r,e,art}], hinweise:[]}
   art: "vorhanden" (aus Prüfungsfragen im Text), "definition", "aufzaehlung", "luecke", "zahl"            */
(function(){
"use strict";
const W = "[\\wäöüßÄÖÜ-]";
const LANGS = {
  de: {
    stop: "der die das ein eine einer eines einem einen dem den des sie wir ich er es ihr ihnen uns mich dich sich diese dieser dieses diesen diesem jeder jede jedes alle allen aller wenn bei nach vor mit ohne auch dann beim zum zur im am und oder aber auf aus für von nicht kein keine keinen keiner kann können muss müssen darf dürfen soll sollen wird werden ist sind war waren hat haben sein seine seiner ihre ihrer ihrem ihren dies hier dort nur noch schon sehr mehr als wie so dass daß weil denn doch bis über unter durch gegen um an in zu ab seit während wegen trotz je desto sowie bzw ca usw etc man wer was wo wann warum welche welcher welches wieviel viele immer nie oft meist etwa rund mindestens höchstens maximal minimal jedoch dabei dazu dafür damit darauf daher deshalb außerdem zudem ferner zunächst zuerst danach anschließend schließlich beispiel beispielsweise frage antwort lösung richtig falsch seite kapitel abschnitt teil",
    abbr: /\b(z\.\s?B|bzw|ca|usw|etc|Nr|Abs|Art|vgl|evtl|ggf|inkl|max|min|Std|Min|Sek|km\/h|S|u\.\s?a|d\.\s?h|o\.\s?ä|sog)\.$/,
    loes: /^(?:Lösung|Antwort|Richtig|Richtige Antwort|Korrekt)\s*[:\-–]?\s*([a-fA-F1-6](?:\s*[,\/und]+\s*[a-fA-F1-6])*)\s*\.?$/,
    markOk: /(✓|✔|☑|■|●|\[[xX]\]|\([xX]\)|\*\s*$|\s\(richtig\)\s*$|\s—?\s*richtig\s*$)/,
    qline: /^(?:(?:Frage|Aufgabe)\s*)?(?:\d{1,3}\s*[\.\):]\s*)?(.+\?)\s*$/,
    ansPrefix: /^(?:Antwort|Lösung)\s*[:\-–]\s*/i,
    verbs: /\b(ist|sind|wird|werden|hat|haben|kann|muss|darf)\b/,
    units: "m|cm|mm|km|km\\/h|kg|g|t|l|ml|%|°C?|€|Euro|Jahre?n?|Monate?n?|Tage?n?|Wochen?|Stunden?|Minuten?|Sekunden?|Meter|Zentimeter|Prozent|Personen|Mal|mal|Liter|Watt|Volt|bar|PS|Grad",
    // Schlüsselwort: großgeschrieben (Substantiv), nicht am Satzanfang
    isTerm: (w, i) => i > 0 && /^[A-ZÄÖÜ]/.test(w) && w.length >= 4,
    def: [
      [new RegExp("^(?:Unter|Als)\\s+(?:dem|der|den|einem|einer)?\\s*([A-ZÄÖÜ]" + W + "+(?:\\s[A-ZÄÖÜ]" + W + "+)?)\\s+(?:versteht man|bezeichnet man|wird .{0,30}verstanden|gilt)\\s+(.{15,})$"), m => ["Was versteht man unter " + m[1] + "?", m[2], m[1]]],
      [new RegExp("^([A-ZÄÖÜ]" + W + "+(?:\\s[A-ZÄÖÜ]" + W + "+)?)\\s+(?:nennt man|werden .{0,20}genannt|wird .{0,20}genannt)\\s+(.{5,})$"), m => ["Wie nennt man " + m[1] + "?", m[2], m[1]]],
      [new RegExp("^(Der|Die|Das|Ein|Eine)?\\s*([A-ZÄÖÜ]" + W + "+(?:\\s(?:[a-zäöüß-]+\\s)?[A-ZÄÖÜ]" + W + "+)?)\\s+(ist|sind|bezeichnet|bedeutet|heißt|gilt als|dient|dienen|besteht aus|bestehen aus|umfasst|regelt|verpflichtet|erlaubt|verbietet)\\s+(.{15,})$"), m => ["Was " + (m[3] === "sind" ? "sind" : "ist") + " " + (m[1] ? m[1].toLowerCase() + " " : "") + m[2] + "?", (m[1] ? m[1] + " " : "") + m[2] + " " + m[3] + " " + m[4], m[2]]],
    ],
    defSkip: /^(Als|Unter)$/,
    tList: (lead, n) => cap(lead) + " – nenne alle " + n + ".",
    tGap: "Lücke füllen: ", tGapMC: "Welche Angabe passt in die Lücke? ",
  },
  en: {
    stop: "the a an and or but if then than so as of to in on at by for from with without into onto over under about between among through during before after above below up down out off again further once here there when where why how all any both each few more most other some such no nor not only own same too very can could will would shall should may might must do does did done doing have has had having be is are was were been being am i you he she it we they me him her us them my your his its our their this that these those what which who whom whose while because until although though also just still yet ever never always often usually sometimes example page chapter section part question answer solution correct wrong true false",
    abbr: /\b(e\.\s?g|i\.\s?e|etc|vs|Mr|Mrs|Ms|Dr|No|St|approx|incl|max|min|mph|km\/h|cf)\.$/,
    loes: /^(?:Answer|Solution|Correct|Correct answer|Key)\s*[:\-–]?\s*([a-fA-F1-6](?:\s*[,\/and]+\s*[a-fA-F1-6])*)\s*\.?$/,
    markOk: /(✓|✔|☑|■|●|\[[xX]\]|\([xX]\)|\*\s*$|\s\(correct\)\s*$|\s—?\s*correct\s*$)/i,
    qline: /^(?:(?:Question|Q)\s*)?(?:\d{1,3}\s*[\.\):]\s*)?(.+\?)\s*$/,
    ansPrefix: /^(?:Answer|A)\s*[:\-–]\s*/i,
    verbs: /\b(is|are|was|were|has|have|can|must|should|will)\b/,
    units: "m|cm|mm|km|km\\/h|mph|kg|g|lb|lbs|oz|t|l|ml|%|°[CF]?|\\$|€|£|years?|months?|days?|weeks?|hours?|minutes?|seconds?|meters?|metres?|feet|foot|ft|inches|inch|in|miles?|percent|people|times|liters?|litres?|watts?|volts?|degrees?",
    // Schlüsselwort: langes Inhaltswort oder Eigenname, nicht am Satzanfang
    isTerm: (w, i) => i > 0 && (w.length >= 7 || (/^[A-Z]/.test(w) && w.length >= 4)),
    def: [
      [new RegExp("^(The|A|An)?\\s*([A-Za-z]" + W + "+(?:\\s[a-z]" + W + "+){0,2})\\s+(is|are|means|refers to|is defined as|is called|is known as|describes|consists of|includes|requires)\\s+(.{15,})$"), m => ["What " + (m[3] === "are" ? "are" : "is") + " " + (m[1] ? m[1].toLowerCase() + " " : "") + m[2] + "?", (m[1] ? m[1] + " " : "") + m[2] + " " + m[3] + " " + m[4], m[2].split(" ").pop()]],
    ],
    defSkip: /^(This|That|There|It|Here)$/i,
    tList: (lead, n) => cap(lead) + " – name all " + n + ".",
    tGap: "Fill in the blank: ", tGapMC: "Which word fits the blank? ",
  }
};
const norm = s => String(s||"").toLowerCase().replace(/[^a-z0-9äöüß]+/g," ").trim();
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const words = s => (s.match(/[A-Za-zÄÖÜäöüß][\wäöüßÄÖÜ-]*/g) || []);
const OPT = /^(?:[\(\[]?([a-fA-F])[\)\.\]:]|\(?([1-6])\)|[☐☑□■○●◯•▪\-–]|\[[ xX]\]|\([xX ]\))\s*(.+)$/;
function shuffle(a){ for (let i = a.length-1; i > 0; i--){ const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]] = [a[j],a[i]]; } return a; }

function vorbereiten(text){
  let t = String(text||"").replace(/\r/g,"").replace(/\[(?:Seite|Page) \d+\]\n?/g,"\n").replace(/[ \t]+/g," ");
  t = t.replace(/(\w)-\n(?=[a-zäöüß])/g,"$1");                 // Silbentrennung am Zeilenende
  t = t.replace(/\n{2,}/g,"\n\n");
  t = t.replace(/([^\n.!?:;])\n(?![a-f][\)\.]\s)(?=[a-zäöüß])/g,"$1 ");   // Zeilenumbruch mitten im Satz
  return t.split("\n").map(l => l.trim());
}

function erzeugen(text, opt){
  opt = Object.assign({nK: 20, nQ: 20, lang: "de"}, opt || {});
  const C = LANGS[opt.lang] || LANGS.de;
  const STOP = new Set(C.stop.split(" "));
  const NUM = new RegExp("(?:^|\\s)(\\d+(?:[.,]\\d+)?)\\s?(" + C.units + ")?(?=[\\s.,;:)]|$)", "g");
  const isHeading = l => l.length >= 3 && !/:/.test(l) && !C.loes.test(l) && l.length <= 70 && !/[.!?:,;]$/.test(l) && /^[\dA-ZÄÖÜ§]/.test(l) && words(l).length <= 9 && !OPT.test(l) && !/\?$/.test(l) && !C.verbs.test(l);
  const lines = vorbereiten(text), used = new Set(), hinweise = [];

  /* 1. Vorhandene Prüfungsfragen */
  const vh = {mc: [], karten: []}; let thema = "";
  for (let i = 0; i < lines.length; i++){
    const l = lines[i]; if (!l || used.has(i)) continue;
    if (isHeading(l)){ thema = l.replace(/^[\d.\s]+/,""); continue; }
    const qm = l.match(C.qline); if (!qm) continue;
    const frage = qm[1].trim(); if (words(frage).length < 3) continue;
    const opts = [], ok = []; let j = i + 1, loes = null;
    while (j < lines.length && opts.length < 6){
      const m = lines[j].match(OPT);
      if (!m){ if (lines[j] === "" && j + 1 < lines.length && OPT.test(lines[j+1])){ j++; continue; } break; }
      let txt = (m[3]||"").trim(); const marked = C.markOk.test(lines[j]) || C.markOk.test(txt);
      txt = txt.replace(C.markOk,"").replace(/\s*[✓✔☑]\s*/g,"").trim();
      if (txt){ if (marked) ok.push(opts.length); opts.push(txt); }
      j++;
    }
    if (opts.length >= 2){
      for (let k = j; k < Math.min(j + 3, lines.length); k++){ const lm = lines[k].match(C.loes); if (lm){ loes = lm[1]; used.add(k); break; } if (lines[k] && !lines[k].match(C.loes)) break; }
      let r = ok.slice();
      if (!r.length && loes) r = loes.split(/[^a-fA-F1-6]+/).filter(Boolean).map(x => /\d/.test(x) ? +x - 1 : x.toLowerCase().charCodeAt(0) - 97).filter(x => x >= 0 && x < opts.length);
      vh.mc.push({t: thema, f: frage, o: opts, r, e: "", art: "vorhanden"});
      for (let k = i; k < j; k++) used.add(k); i = j - 1; continue;
    }
    const ans = []; j = i + 1; if (j < lines.length && lines[j] === "" && lines[j+1] && !C.qline.test(lines[j+1]) && !isHeading(lines[j+1])) j++;
    while (j < lines.length && ans.length < 3 && lines[j] && !C.qline.test(lines[j]) && !isHeading(lines[j])){ ans.push(lines[j].replace(C.ansPrefix,"")); j++; }
    const a = ans.join(" ").trim();
    if (a && a.length >= 3 && a.length <= 400){ vh.karten.push({t: thema, f: frage, a, art: "vorhanden"}); for (let k = i; k < j; k++) used.add(k); i = j - 1; }
  }

  /* 3. Aufzählungen */
  const az = []; thema = "";
  for (let i = 0; i < lines.length; i++){
    const l = lines[i]; if (!l || used.has(i)) continue;
    if (isHeading(l)){ thema = l.replace(/^[\d.\s]+/,""); continue; }
    if (!/:$/.test(l) || words(l).length < 2 || words(l).length > 18) continue;
    const items = []; let j = i + 1;
    while (j < lines.length && lines[j] && items.length < 10){ const m = lines[j].match(OPT); if (!m) break; items.push((m[3]||"").trim()); j++; }
    if (items.length >= 3){ az.push({t: thema, f: C.tList(l.replace(/:$/, ""), items.length), a: items.map(x => "• " + x).join("\n"), art: "aufzaehlung"}); for (let k = i; k < j; k++) used.add(k); i = j - 1; }
  }

  /* 2. Fließtext → Sätze je Thema */
  const sz = []; thema = ""; let buf = [];
  const flush = () => { if (!buf.length) return; const para = buf.join(" "); buf = [];
    const parts = []; let cur = "";
    for (const tok of para.split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ„"(\d])/)){ cur = cur ? cur + " " + tok : tok; if (C.abbr.test(cur)) continue; parts.push(cur); cur = ""; }
    if (cur) parts.push(cur);
    for (const s of parts){ const w = words(s).length; if (w >= 6 && w <= 40 && !/[:;]$/.test(s)) sz.push({t: thema, s: s.trim()}); } };
  for (let i = 0; i < lines.length; i++){
    if (used.has(i)) { flush(); continue; }
    const l = lines[i];
    if (!l){ flush(); continue; }
    if (isHeading(l)){ flush(); thema = l.replace(/^[\d.\s]+/,""); continue; }
    if (OPT.test(l)) { buf.push(l.replace(OPT, "$3")); continue; }
    buf.push(l);
  }
  flush();

  /* 4. Definitionen */
  const df = [];
  for (const x of sz){ for (const [re, fn] of C.def){ const m = x.s.replace(/[.!]$/,"").match(re); if (!m) continue;
    const [f, a, term] = fn(m); if (STOP.has(String(term).toLowerCase()) || C.defSkip.test(m[1]||"") || C.defSkip.test(term)) continue;
    df.push({t: x.t, f, a: cap(a.trim()).replace(/[^.!?]$/, "$&."), art: "definition", src: x.s}); break; } }
  const dfSrc = new Set(df.map(d => norm(d.src)));
  const rest = sz.filter(x => !dfSrc.has(norm(x.s)));

  /* 5. Lückentexte und Zahlenfragen */
  const freq = {}, nums = [], termSet = new Set();
  for (const x of rest){
    words(x.s).forEach((w, i) => { if (C.isTerm(w, i) && !STOP.has(w.toLowerCase())){ freq[w] = (freq[w]||0) + 1; termSet.add(w); } });
    let m; NUM.lastIndex = 0; while ((m = NUM.exec(x.s))){ nums.push({v: m[1], u: m[2] || ""}); }
  }
  const terms = [...termSet];
  let karten = vh.karten.concat(az, df), mc = vh.mc.slice();
  const nKarten = Math.max(0, opt.nK - karten.length), nMC = Math.max(0, opt.nQ - mc.length);
  const byT = {}; rest.forEach(x => (byT[x.t] = byT[x.t] || []).push(x)); Object.values(byT).forEach(shuffle);
  const order = []; const keys = Object.keys(byT); let any = true;
  while (any){ any = false; for (const k of keys){ const x = byT[k].shift(); if (x){ order.push(x); any = true; } } }
  const seen = new Set(); let addK = 0, addQ = 0;
  for (const x of order){
    if (addK >= nKarten && addQ >= nMC) break;
    const s = x.s; let key = null, typ = "";
    NUM.lastIndex = 0; const nm = NUM.exec(s);
    if (nm){ key = (nm[1] + (nm[2] ? " " + nm[2] : "")); typ = "zahl"; }
    else {
      const cands = words(s).filter((w, i) => C.isTerm(w, i) && !STOP.has(w.toLowerCase()));
      if (!cands.length) continue;
      cands.sort((a,b) => (freq[a]*2 - a.length/2) - (freq[b]*2 - b.length/2));   // selten und lang zuerst
      key = cands[0]; typ = "luecke";
    }
    if (!key || seen.has(norm(s))) continue; seen.add(norm(s));
    const idx = s.indexOf(key); if (idx < 0) continue;
    const frage = s.slice(0, idx) + "______" + s.slice(idx + key.length);
    if (addK < nKarten){ karten.push({t: x.t, f: C.tGap + frage, a: key, art: typ, src: s}); addK++; }
    if (addQ < nMC){
      let pool;
      if (typ === "zahl"){ const u = (nm[2] || ""); pool = [...new Set(nums.filter(n => n.u === u && n.v !== nm[1]).map(n => n.v + (u ? " " + u : "")))];
        if (pool.length < 3){ const v = parseFloat(nm[1].replace(",",".")); const dec = /[.,]/.test(nm[1]); const mk = f => (dec ? (v*f).toFixed(1).replace(".", opt.lang === "en" ? "." : ",") : String(Math.max(1, Math.round(v*f)))) + (u ? " " + u : ""); pool = [...new Set(pool.concat([mk(.5), mk(2), mk(1.5), mk(.75), mk(3)]))].filter(p => p !== key); } }
      else pool = terms.filter(w => w !== key && Math.abs(w.length - key.length) <= 4 && norm(w) !== norm(key));
      if (pool.length >= 3){ const o = shuffle(shuffle(pool).slice(0, 3).concat(key)); mc.push({t: x.t, f: C.tGapMC + frage, o, r: [o.indexOf(key)], e: s, art: typ}); addQ++; }
    }
  }

  const ohne = mc.filter(q => !q.r.length).length;
  if (vh.mc.length) hinweise.push(vh.mc.length + " Prüfungsfragen im Text erkannt" + (ohne ? ", davon " + ohne + " ohne erkennbare Lösung (bitte im Editor markieren)" : "") + ".");
  if (!sz.length && !vh.mc.length && !vh.karten.length) hinweise.push("Kein auswertbarer Fließtext gefunden.");
  const seenF = new Set(); karten = karten.filter(k => { const n = norm(k.f); if (seenF.has(n)) return false; seenF.add(n); return true; });
  const seenQ = new Set(); mc = mc.filter(q => { const n = norm(q.f); if (seenQ.has(n)) return false; seenQ.add(n); return true; });
  return {karten, mc, hinweise, stat: {saetze: sz.length, vorhanden: vh.mc.length + vh.karten.length, definitionen: df.length, aufzaehlungen: az.length}};
}
window.StoffGen = {erzeugen, vorbereiten, sprachen: Object.keys(LANGS)};
})();
