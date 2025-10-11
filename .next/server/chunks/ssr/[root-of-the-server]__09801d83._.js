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
"[project]/pages/safmeds.tsx [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// pages/safmeds.tsx
__turbopack_context__.s([
    "default",
    ()=>SafMedsPage
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react/jsx-dev-runtime [external] (react/jsx-dev-runtime, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react [external] (react, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/storage.ts [ssr] (ecmascript)");
;
;
;
function SafMedsPage() {
    const [deck, setDeck] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])([]);
    const [secs, setSecs] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(60);
    const [running, setRunning] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(false);
    const [correct, setCorrect] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(0);
    const [errors, setErrors] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(0);
    const [current, setCurrent] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(0);
    const [trials, setTrials] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])([]);
    const [flipped, setFlipped] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(false);
    // keep latest counts for saving at stop/auto-stop
    const correctRef = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useRef"])(0);
    const errorsRef = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useRef"])(0);
    const stoppingRef = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useRef"])(false);
    const timerRef = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useRef"])(null);
    // Hydrate from DB first; fall back to localStorage
    (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useEffect"])(()=>{
        let cancelled = false;
        async function loadAll() {
            // flashcards from DB
            try {
                const fc = await fetch("/api/flashcards/list?deckId=default").then((r)=>r.json());
                if (!cancelled && Array.isArray(fc.records) && fc.records.length) {
                    setDeck(fc.records);
                } else if (!cancelled) {
                    setDeck((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__["loadFlashcards"])());
                }
            } catch  {
                if (!cancelled) setDeck((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__["loadFlashcards"])());
            }
            // trials from DB
            try {
                const tr = await fetch("/api/safmeds/listTrials?deckId=default").then((r)=>r.json());
                if (!cancelled && Array.isArray(tr.records)) {
                    const mapped = tr.records.map((r)=>({
                            timestamp: Number(r.timestamp_ms),
                            correct: Number(r.correct),
                            errors: Number(r.errors),
                            secs: Number(r.secs)
                        }));
                    setTrials(mapped);
                } else if (!cancelled) {
                    setTrials((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__["loadSafMedsTrials"])());
                }
            } catch  {
                if (!cancelled) setTrials((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__["loadSafMedsTrials"])());
            }
        }
        loadAll();
        return ()=>{
            cancelled = true;
        };
    }, []);
    // mirror counts into refs
    (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useEffect"])(()=>{
        correctRef.current = correct;
    }, [
        correct
    ]);
    (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useEffect"])(()=>{
        errorsRef.current = errors;
    }, [
        errors
    ]);
    // timer
    (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useEffect"])(()=>{
        if (!running) return;
        timerRef.current = setInterval(()=>{
            setSecs((s)=>{
                if (s <= 1) {
                    stopTrial(true); // auto-stop at 0
                    return 0;
                }
                return s - 1;
            });
        }, 1000);
        return ()=>{
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [
        running
    ]);
    const card = deck[current];
    function startTrial() {
        setCorrect(0);
        setErrors(0);
        correctRef.current = 0;
        errorsRef.current = 0;
        stoppingRef.current = false;
        setSecs(60);
        setFlipped(false);
        setRunning(true);
    }
    function stopTrial(auto = false) {
        if (stoppingRef.current) return;
        stoppingRef.current = true;
        setRunning(false);
        if (timerRef.current) clearInterval(timerRef.current);
        // Save to local history
        const rec = {
            timestamp: Date.now(),
            correct: correctRef.current,
            errors: errorsRef.current,
            secs: 60
        };
        const next = [
            ...trials,
            rec
        ];
        setTrials(next);
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__["saveSafMedsTrials"])(next);
        // Persist to DB (non-blocking)
        fetch("/api/safmeds/addTrial", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                deckId: "default",
                timestamp_ms: rec.timestamp,
                correct: rec.correct,
                errors: rec.errors,
                secs: rec.secs
            })
        }).catch(()=>{});
    // If auto, keep UI calm; if manual stop, do nothing special
    }
    const accuracy = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useMemo"])(()=>{
        const total = correct + errors;
        return total === 0 ? 0 : Math.round(correct / total * 100);
    }, [
        correct,
        errors
    ]);
    function nextCard() {
        if (!deck.length) return;
        setCurrent((i)=>(i + 1) % deck.length);
        setFlipped(false); // always show Term first
    }
    // Buttons rely on live "running" (buttons disabled when not running)
    function markCorrect() {
        if (!running) return;
        setCorrect((c)=>{
            const v = c + 1;
            correctRef.current = v;
            return v;
        });
        nextCard();
    }
    function markError() {
        if (!running) return;
        setErrors((e)=>{
            const v = e + 1;
            errorsRef.current = v;
            return v;
        });
        nextCard();
    }
    function onCSVUpload(e) {
        const f = e.target.files?.[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = ()=>{
            const txt = String(reader.result || "");
            const lines = txt.split(/\r?\n/).filter(Boolean);
            const rows = [];
            for(let i = 0; i < lines.length; i++){
                const parts = lines[i].split(",");
                if (i === 0 && /term/i.test(parts[0])) continue;
                if (parts.length >= 2) rows.push({
                    term: parts[0].trim(),
                    def: parts.slice(1).join(",").trim()
                });
            }
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__["saveFlashcards"])(rows); // local
            setDeck(rows);
            setCurrent(0);
            setFlipped(false);
            // optional: also push to DB if you added the bulkUpsert route
            fetch("/api/flashcards/bulkUpsert", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    deckId: "default",
                    records: rows
                })
            }).catch(()=>{});
        };
        reader.readAsText(f);
    }
    // Shuffle deck (disabled while running)
    function shuffleDeck() {
        if (running || deck.length < 2) return;
        const arr = deck.slice();
        for(let i = arr.length - 1; i > 0; i--){
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [
                arr[j],
                arr[i]
            ];
        }
        setDeck(arr);
        setCurrent(0);
        setFlipped(false);
    }
    // Space flips card
    (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useEffect"])(()=>{
        function onKey(e) {
            if (e.code === "Space") {
                e.preventDefault();
                setFlipped((f)=>!f);
            }
        }
        window.addEventListener("keydown", onKey);
        return ()=>window.removeEventListener("keydown", onKey);
    }, []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("main", {
        style: {
            maxWidth: 1000,
            margin: "0 auto",
            padding: 24
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("h1", {
                style: {
                    fontSize: 24,
                    marginBottom: 10
                },
                children: "SAFMEDS"
            }, void 0, false, {
                fileName: "[project]/pages/safmeds.tsx",
                lineNumber: 229,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                style: {
                    color: "#555"
                },
                children: [
                    "One-minute timing. Use the same ",
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("code", {
                        children: "term,def"
                    }, void 0, false, {
                        fileName: "[project]/pages/safmeds.tsx",
                        lineNumber: 231,
                        columnNumber: 41
                    }, this),
                    " CSV as Flashcards. Click the card (or press Space) to flip."
                ]
            }, void 0, true, {
                fileName: "[project]/pages/safmeds.tsx",
                lineNumber: 230,
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
                                fileName: "[project]/pages/safmeds.tsx",
                                lineNumber: 237,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/pages/safmeds.tsx",
                        lineNumber: 235,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                        onClick: shuffleDeck,
                        style: ghostBtn,
                        disabled: running || deck.length < 2,
                        children: "Shuffle Deck"
                    }, void 0, false, {
                        fileName: "[project]/pages/safmeds.tsx",
                        lineNumber: 240,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/pages/safmeds.tsx",
                lineNumber: 234,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("section", {
                style: {
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 16,
                    marginTop: 16
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        style: panel,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                style: {
                                    fontSize: 48,
                                    fontWeight: 800,
                                    textAlign: "center"
                                },
                                children: [
                                    secs,
                                    "s"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/pages/safmeds.tsx",
                                lineNumber: 248,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                style: {
                                    display: "flex",
                                    justifyContent: "center",
                                    gap: 10,
                                    marginTop: 12
                                },
                                children: !running ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                    onClick: startTrial,
                                    style: primaryBtn,
                                    children: "Start"
                                }, void 0, false, {
                                    fileName: "[project]/pages/safmeds.tsx",
                                    lineNumber: 252,
                                    columnNumber: 15
                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                    onClick: ()=>stopTrial(false),
                                    style: dangerBtn,
                                    children: "Stop"
                                }, void 0, false, {
                                    fileName: "[project]/pages/safmeds.tsx",
                                    lineNumber: 254,
                                    columnNumber: 15
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/pages/safmeds.tsx",
                                lineNumber: 250,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                style: {
                                    display: "flex",
                                    justifyContent: "center",
                                    gap: 16,
                                    marginTop: 16
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(Stat, {
                                        label: "Correct",
                                        value: correct
                                    }, void 0, false, {
                                        fileName: "[project]/pages/safmeds.tsx",
                                        lineNumber: 259,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(Stat, {
                                        label: "Errors",
                                        value: errors
                                    }, void 0, false, {
                                        fileName: "[project]/pages/safmeds.tsx",
                                        lineNumber: 260,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(Stat, {
                                        label: "Accuracy",
                                        value: `${accuracy}%`
                                    }, void 0, false, {
                                        fileName: "[project]/pages/safmeds.tsx",
                                        lineNumber: 261,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/pages/safmeds.tsx",
                                lineNumber: 258,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                onClick: ()=>setFlipped((f)=>!f),
                                style: {
                                    marginTop: 16,
                                    background: "white",
                                    border: "1px solid #e5e7eb",
                                    borderRadius: 14,
                                    padding: 24,
                                    minHeight: 140,
                                    display: "flex",
                                    flexDirection: "column",
                                    justifyContent: "center",
                                    gap: 8,
                                    cursor: "pointer",
                                    boxShadow: "0 8px 18px rgba(0,0,0,0.06)",
                                    transition: "transform 0.15s"
                                },
                                title: "Click to flip",
                                children: !card ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                    style: {
                                        color: "#666"
                                    },
                                    children: "Import a deck to begin"
                                }, void 0, false, {
                                    fileName: "[project]/pages/safmeds.tsx",
                                    lineNumber: 285,
                                    columnNumber: 15
                                }, this) : !flipped ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["Fragment"], {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                            style: {
                                                fontWeight: 700,
                                                color: "#666"
                                            },
                                            children: "Term"
                                        }, void 0, false, {
                                            fileName: "[project]/pages/safmeds.tsx",
                                            lineNumber: 288,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                            style: {
                                                fontSize: 22
                                            },
                                            children: card.term
                                        }, void 0, false, {
                                            fileName: "[project]/pages/safmeds.tsx",
                                            lineNumber: 289,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(Hint, {}, void 0, false, {
                                            fileName: "[project]/pages/safmeds.tsx",
                                            lineNumber: 290,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["Fragment"], {
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                            style: {
                                                fontWeight: 700,
                                                color: "#666"
                                            },
                                            children: "Definition"
                                        }, void 0, false, {
                                            fileName: "[project]/pages/safmeds.tsx",
                                            lineNumber: 294,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                            style: {
                                                color: "#333"
                                            },
                                            children: card.def
                                        }, void 0, false, {
                                            fileName: "[project]/pages/safmeds.tsx",
                                            lineNumber: 295,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(Hint, {
                                            flipped: true
                                        }, void 0, false, {
                                            fileName: "[project]/pages/safmeds.tsx",
                                            lineNumber: 296,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, void 0, true)
                            }, void 0, false, {
                                fileName: "[project]/pages/safmeds.tsx",
                                lineNumber: 265,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                style: {
                                    display: "flex",
                                    gap: 10,
                                    marginTop: 12
                                },
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                        onClick: markCorrect,
                                        style: okBtn,
                                        disabled: !running,
                                        children: "Mark Correct"
                                    }, void 0, false, {
                                        fileName: "[project]/pages/safmeds.tsx",
                                        lineNumber: 302,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                        onClick: markError,
                                        style: warnBtn,
                                        disabled: !running,
                                        children: "Mark Error"
                                    }, void 0, false, {
                                        fileName: "[project]/pages/safmeds.tsx",
                                        lineNumber: 305,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/pages/safmeds.tsx",
                                lineNumber: 301,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/pages/safmeds.tsx",
                        lineNumber: 247,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        style: panel,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("h3", {
                                style: {
                                    marginTop: 0
                                },
                                children: "Session History"
                            }, void 0, false, {
                                fileName: "[project]/pages/safmeds.tsx",
                                lineNumber: 313,
                                columnNumber: 11
                            }, this),
                            trials.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                style: {
                                    color: "#666"
                                },
                                children: "No trials yet."
                            }, void 0, false, {
                                fileName: "[project]/pages/safmeds.tsx",
                                lineNumber: 315,
                                columnNumber: 13
                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["Fragment"], {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(BarChart, {
                                        trials: trials
                                    }, void 0, false, {
                                        fileName: "[project]/pages/safmeds.tsx",
                                        lineNumber: 318,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("ul", {
                                        style: {
                                            marginTop: 12,
                                            paddingLeft: 18
                                        },
                                        children: trials.slice(-8).reverse().map((t, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("li", {
                                                children: [
                                                    new Date(t.timestamp).toLocaleString(),
                                                    " — Correct: ",
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("b", {
                                                        children: t.correct
                                                    }, void 0, false, {
                                                        fileName: "[project]/pages/safmeds.tsx",
                                                        lineNumber: 322,
                                                        columnNumber: 73
                                                    }, this),
                                                    ", Errors: ",
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("b", {
                                                        children: t.errors
                                                    }, void 0, false, {
                                                        fileName: "[project]/pages/safmeds.tsx",
                                                        lineNumber: 322,
                                                        columnNumber: 101
                                                    }, this)
                                                ]
                                            }, t.timestamp + "_" + i, true, {
                                                fileName: "[project]/pages/safmeds.tsx",
                                                lineNumber: 321,
                                                columnNumber: 19
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/pages/safmeds.tsx",
                                        lineNumber: 319,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/pages/safmeds.tsx",
                        lineNumber: 312,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/pages/safmeds.tsx",
                lineNumber: 245,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/pages/safmeds.tsx",
        lineNumber: 228,
        columnNumber: 5
    }, this);
}
function Hint({ flipped = false }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
        style: {
            marginTop: 8,
            fontSize: 12,
            color: "#888"
        },
        children: flipped ? "Click (or Space) to show Term" : "Click (or Space) to show Definition"
    }, void 0, false, {
        fileName: "[project]/pages/safmeds.tsx",
        lineNumber: 336,
        columnNumber: 5
    }, this);
}
function Stat({ label, value }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
        style: {
            textAlign: "center"
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                style: {
                    fontSize: 12,
                    color: "#666"
                },
                children: label
            }, void 0, false, {
                fileName: "[project]/pages/safmeds.tsx",
                lineNumber: 345,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                style: {
                    fontSize: 20,
                    fontWeight: 700
                },
                children: value
            }, void 0, false, {
                fileName: "[project]/pages/safmeds.tsx",
                lineNumber: 346,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/pages/safmeds.tsx",
        lineNumber: 344,
        columnNumber: 5
    }, this);
}
function BarChart({ trials }) {
    const last = trials.slice(-12);
    const max = Math.max(1, ...last.map((t)=>t.correct));
    const w = 480, h = 160, pad = 24;
    const barW = (w - pad * 2) / (last.length || 1);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("svg", {
        width: w,
        height: h,
        style: {
            background: "#fafafa",
            borderRadius: 8,
            border: "1px solid #eee"
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("line", {
                x1: pad,
                y1: h - pad,
                x2: w - pad,
                y2: h - pad,
                stroke: "#ccc"
            }, void 0, false, {
                fileName: "[project]/pages/safmeds.tsx",
                lineNumber: 359,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("line", {
                x1: pad,
                y1: pad,
                x2: pad,
                y2: h - pad,
                stroke: "#ccc"
            }, void 0, false, {
                fileName: "[project]/pages/safmeds.tsx",
                lineNumber: 360,
                columnNumber: 7
            }, this),
            last.map((t, i)=>{
                const x = pad + i * barW + 6;
                const bh = t.correct / max * (h - pad * 2) | 0;
                const y = h - pad - bh;
                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("rect", {
                    x: x,
                    y: y,
                    width: barW - 12,
                    height: bh,
                    fill: "#0b3d91"
                }, t.timestamp + "_" + i, false, {
                    fileName: "[project]/pages/safmeds.tsx",
                    lineNumber: 365,
                    columnNumber: 16
                }, this);
            }),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("text", {
                x: pad,
                y: pad - 6,
                fontSize: "10",
                fill: "#555",
                children: [
                    "max ",
                    max
                ]
            }, void 0, true, {
                fileName: "[project]/pages/safmeds.tsx",
                lineNumber: 367,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/pages/safmeds.tsx",
        lineNumber: 358,
        columnNumber: 5
    }, this);
}
const panel = {
    background: "white",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 16,
    boxShadow: "0 6px 14px rgba(0,0,0,0.06)",
    minHeight: 260
};
const importBtn = {
    display: "inline-block",
    padding: "10px 14px",
    background: "#0b3d91",
    color: "white",
    borderRadius: 8,
    cursor: "pointer"
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
const dangerBtn = {
    padding: "10px 14px",
    background: "#d64545",
    color: "white",
    border: "none",
    borderRadius: 8,
    cursor: "pointer"
};
const okBtn = {
    padding: "8px 12px",
    background: "#2bb673",
    color: "white",
    border: "none",
    borderRadius: 8,
    cursor: "pointer"
};
const warnBtn = {
    padding: "8px 12px",
    background: "#ffae42",
    color: "white",
    border: "none",
    borderRadius: 8,
    cursor: "pointer"
};
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__09801d83._.js.map