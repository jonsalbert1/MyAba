module.exports = [
"[project]/lib/storage.ts [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// lib/storage.ts
__turbopack_context__.s([
    "loadFlashcards",
    ()=>loadFlashcards,
    "loadQuiz",
    ()=>loadQuiz,
    "loadSafMedsTrials",
    ()=>loadSafMedsTrials,
    "saveFlashcards",
    ()=>saveFlashcards,
    "saveQuiz",
    ()=>saveQuiz,
    "saveSafMedsTrials",
    ()=>saveSafMedsTrials
]);
const safe = (key, fallback)=>{
    if ("TURBOPACK compile-time truthy", 1) return fallback;
    //TURBOPACK unreachable
    ;
};
const loadFlashcards = ()=>safe("safmeds:deck", []);
const saveFlashcards = (arr)=>localStorage.setItem("safmeds:deck", JSON.stringify(arr));
const loadQuiz = ()=>safe("quiz:deck", []);
const saveQuiz = (arr)=>localStorage.setItem("quiz:deck", JSON.stringify(arr));
const loadSafMedsTrials = ()=>safe("safmeds:trials", []);
const saveSafMedsTrials = (arr)=>localStorage.setItem("safmeds:trials", JSON.stringify(arr));
}),
"[project]/pages/quiz.tsx [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// pages/quiz.tsx
__turbopack_context__.s([
    "default",
    ()=>QuizPage
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react/jsx-dev-runtime [external] (react/jsx-dev-runtime, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react [external] (react, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/storage.ts [ssr] (ecmascript)");
;
;
;
const DECK_ID = "default";
function QuizPage() {
    const [deck, setDeck] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])([]);
    const [s, setS] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])({
        current: 0,
        locked: false
    });
    const [status, setStatus] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(null);
    // ---------- Helpers ----------
    async function fetchJSON(url, init) {
        const res = await fetch(url, init);
        const text = await res.text(); // read as text first (helps surface HTML errors)
        let json = null;
        try {
            json = JSON.parse(text);
        } catch  {
            // Surface status + HTML snippet if server returned a page (e.g., 404 or stacktrace)
            throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
        }
        if (!res.ok) {
            throw new Error(json?.error || `HTTP ${res.status}`);
        }
        return json;
    }
    async function hydrateFromDB() {
        setStatus("Loading quiz from database…");
        try {
            const json = await fetchJSON(`/api/quiz/list?deckId=${encodeURIComponent(DECK_ID)}`);
            if (Array.isArray(json.records) && json.records.length) {
                setDeck(json.records);
                setS({
                    current: 0,
                    locked: false,
                    selected: undefined
                });
                setStatus(`Loaded ${json.records.length} items from DB`);
                return;
            }
            // Fallback to local if DB is empty
            const local = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__["loadQuiz"])();
            setDeck(local);
            setStatus(local.length ? `Loaded ${local.length} items from local` : "No quiz items yet");
        } catch (e) {
            const local = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__["loadQuiz"])();
            setDeck(local);
            setStatus(`DB load failed (${e?.message || "error"}), loaded from local`);
        }
    }
    // ---------- Effects ----------
    (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useEffect"])(()=>{
        let cancelled = false;
        (async ()=>{
            if (!cancelled) await hydrateFromDB();
        })();
        return ()=>{
            cancelled = true;
        };
    }, []);
    // ---------- CSV Import ----------
    function onCSVUpload(e) {
        const f = e.target.files?.[0];
        if (!f) return;
        setStatus("Parsing CSV…");
        const reader = new FileReader();
        reader.onload = async ()=>{
            const txt = String(reader.result || "");
            // CSV headers: domain,question,a,b,c,d,answer,rationale
            const lines = txt.split(/\r?\n/).filter(Boolean);
            const rows = [];
            for(let i = 0; i < lines.length; i++){
                const cols = parseCSVLine(lines[i]); // handles quoted commas
                if (i === 0 && /question/i.test(cols[1] || "")) continue; // skip header row
                if (cols.length >= 7) {
                    rows.push({
                        domain: cols[0]?.trim(),
                        question: cols[1]?.trim(),
                        a: cols[2]?.trim(),
                        b: cols[3]?.trim(),
                        c: cols[4]?.trim(),
                        d: cols[5]?.trim(),
                        answer: cols[6]?.trim().toUpperCase() || "A",
                        rationale: cols[7]?.trim()
                    });
                }
            }
            // Save locally + optimistic UI
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__["saveQuiz"])(rows);
            setDeck(rows);
            setS({
                current: 0,
                locked: false,
                selected: undefined
            });
            // Persist to DB (robust error surfacing)
            setStatus("Saving to database…");
            try {
                const json = await fetchJSON("/api/quiz/bulkUpsert", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        deckId: DECK_ID,
                        records: rows
                    })
                });
                setStatus(`Saved ${json.count ?? rows.length} items to DB`);
            } catch (err) {
                setStatus(`Save to DB failed: ${err?.message || "unknown error"}`);
            }
        };
        reader.readAsText(f);
    }
    // ---------- Quiz Logic ----------
    const q = deck[s.current];
    const options = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useMemo"])(()=>q ? [
            [
                "A",
                q.a
            ],
            [
                "B",
                q.b
            ],
            [
                "C",
                q.c
            ],
            [
                "D",
                q.d
            ]
        ] : [], [
        q
    ]);
    function choose(letter) {
        if (!q || s.locked) return;
        setS((old)=>({
                ...old,
                selected: letter,
                locked: true
            }));
    }
    function next() {
        setS((old)=>({
                current: deck.length ? (old.current + 1) % deck.length : 0,
                selected: undefined,
                locked: false
            }));
    }
    // ---------- UI ----------
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("main", {
        style: {
            maxWidth: 900,
            margin: "0 auto",
            padding: 24
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("h1", {
                style: {
                    fontSize: 24,
                    marginBottom: 6
                },
                children: "Quiz"
            }, void 0, false, {
                fileName: "[project]/pages/quiz.tsx",
                lineNumber: 148,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                style: {
                    color: "#555",
                    marginBottom: 10
                },
                children: [
                    "Import CSV with headers: ",
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("code", {
                        children: "domain,question,a,b,c,d,answer,rationale"
                    }, void 0, false, {
                        fileName: "[project]/pages/quiz.tsx",
                        lineNumber: 150,
                        columnNumber: 34
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/pages/quiz.tsx",
                lineNumber: 149,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                style: {
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap"
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("label", {
                        style: importBtn,
                        children: [
                            "Import CSV",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("input", {
                                type: "file",
                                accept: ".csv",
                                onChange: onCSVUpload,
                                style: {
                                    display: "none"
                                }
                            }, void 0, false, {
                                fileName: "[project]/pages/quiz.tsx",
                                lineNumber: 156,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/pages/quiz.tsx",
                        lineNumber: 154,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                        onClick: hydrateFromDB,
                        style: ghostBtn,
                        children: "Reload from DB"
                    }, void 0, false, {
                        fileName: "[project]/pages/quiz.tsx",
                        lineNumber: 158,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/pages/quiz.tsx",
                lineNumber: 153,
                columnNumber: 7
            }, this),
            status && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                style: statusBox,
                children: status
            }, void 0, false, {
                fileName: "[project]/pages/quiz.tsx",
                lineNumber: 161,
                columnNumber: 18
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                style: {
                    marginTop: 8,
                    color: "#666"
                },
                children: [
                    "Items: ",
                    deck.length,
                    " · ",
                    deck.length ? s.current + 1 : 0,
                    " / ",
                    deck.length
                ]
            }, void 0, true, {
                fileName: "[project]/pages/quiz.tsx",
                lineNumber: 163,
                columnNumber: 7
            }, this),
            !q ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                style: card,
                children: "No questions yet. Import a CSV to begin."
            }, void 0, false, {
                fileName: "[project]/pages/quiz.tsx",
                lineNumber: 168,
                columnNumber: 9
            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("section", {
                style: {
                    marginTop: 16
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        style: {
                            ...card,
                            fontSize: 20,
                            fontWeight: 600
                        },
                        children: q.question
                    }, void 0, false, {
                        fileName: "[project]/pages/quiz.tsx",
                        lineNumber: 171,
                        columnNumber: 11
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        style: {
                            display: "grid",
                            gap: 10,
                            marginTop: 12
                        },
                        children: options.map(([letter, text])=>{
                            const isSelected = s.selected === letter;
                            const isCorrect = q.answer === letter;
                            const showColors = s.locked && (isSelected || isCorrect);
                            const bg = showColors ? isCorrect ? "#def7e5" : isSelected ? "#ffe3e3" : "#fff" : "#fff";
                            const border = showColors ? isCorrect ? "2px solid #2bb673" : isSelected ? "2px solid #d64545" : "1px solid #e5e7eb" : "1px solid #e5e7eb";
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                onClick: ()=>choose(letter),
                                style: {
                                    textAlign: "left",
                                    padding: "12px 14px",
                                    borderRadius: 10,
                                    background: bg,
                                    border,
                                    cursor: s.locked ? "default" : "pointer"
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("strong", {
                                        style: {
                                            marginRight: 8
                                        },
                                        children: [
                                            letter,
                                            "."
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/pages/quiz.tsx",
                                        lineNumber: 199,
                                        columnNumber: 19
                                    }, this),
                                    " ",
                                    text
                                ]
                            }, letter, true, {
                                fileName: "[project]/pages/quiz.tsx",
                                lineNumber: 187,
                                columnNumber: 17
                            }, this);
                        })
                    }, void 0, false, {
                        fileName: "[project]/pages/quiz.tsx",
                        lineNumber: 173,
                        columnNumber: 11
                    }, this),
                    s.locked && q.rationale && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        style: {
                            marginTop: 14,
                            padding: 12,
                            borderRadius: 10,
                            background: "#f6f7fb",
                            border: "1px solid #e5e7eb",
                            color: "#333"
                        },
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                style: {
                                    fontWeight: 700,
                                    marginBottom: 6
                                },
                                children: "Rationale"
                            }, void 0, false, {
                                fileName: "[project]/pages/quiz.tsx",
                                lineNumber: 216,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                children: q.rationale
                            }, void 0, false, {
                                fileName: "[project]/pages/quiz.tsx",
                                lineNumber: 217,
                                columnNumber: 15
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/pages/quiz.tsx",
                        lineNumber: 206,
                        columnNumber: 13
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        style: {
                            marginTop: 14
                        },
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                            onClick: next,
                            style: primaryBtn,
                            children: "Next"
                        }, void 0, false, {
                            fileName: "[project]/pages/quiz.tsx",
                            lineNumber: 222,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/pages/quiz.tsx",
                        lineNumber: 221,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/pages/quiz.tsx",
                lineNumber: 170,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/pages/quiz.tsx",
        lineNumber: 147,
        columnNumber: 5
    }, this);
}
// ---- Utils ----
function parseCSVLine(line) {
    // tiny CSV parser for quoted fields
    const out = [];
    let cur = "";
    let inQ = false;
    for(let i = 0; i < line.length; i++){
        const ch = line[i];
        if (ch === '"') {
            if (inQ && line[i + 1] === '"') {
                cur += '"';
                i++;
            } else {
                inQ = !inQ;
            }
        } else if (ch === "," && !inQ) {
            out.push(cur);
            cur = "";
        } else {
            cur += ch;
        }
    }
    out.push(cur);
    return out.map((s)=>s.trim());
}
// ---- Styles ----
const card = {
    background: "white",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 16,
    boxShadow: "0 8px 18px rgba(0,0,0,0.06)"
};
const importBtn = {
    display: "inline-block",
    padding: "10px 14px",
    background: "#0b3d91",
    color: "white",
    borderRadius: 8,
    cursor: "pointer",
    marginTop: 4
};
const ghostBtn = {
    padding: "10px 14px",
    background: "white",
    color: "#0b3d91",
    border: "1px solid #0b3d91",
    borderRadius: 8,
    cursor: "pointer"
};
const primaryBtn = {
    padding: "10px 14px",
    background: "#0b3d91",
    color: "white",
    border: "none",
    borderRadius: 8,
    cursor: "pointer"
};
const statusBox = {
    marginTop: 10,
    padding: "8px 12px",
    borderRadius: 10,
    background: "#eef3ff",
    border: "1px solid #d7e2ff",
    color: "#1f3a8a"
};
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__b752265f._.js.map