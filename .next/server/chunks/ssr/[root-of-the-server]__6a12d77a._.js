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
"[project]/pages/flashcards.tsx [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// pages/flashcards.tsx
__turbopack_context__.s([
    "default",
    ()=>FlashcardsPage
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react/jsx-dev-runtime [external] (react/jsx-dev-runtime, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react [external] (react, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/storage.ts [ssr] (ecmascript)");
;
;
;
function FlashcardsPage() {
    const [deck, setDeck] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])([]);
    const [idx, setIdx] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(0);
    const [flipped, setFlipped] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(false);
    const card = deck[idx];
    // Hydrate from Supabase first; fallback to localStorage
    (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useEffect"])(()=>{
        let cancelled = false;
        async function load() {
            try {
                const res = await fetch("/api/flashcards/list?deckId=default");
                const json = await res.json();
                if (!cancelled && Array.isArray(json.records) && json.records.length) {
                    setDeck(json.records);
                    setIdx(0);
                    setFlipped(false);
                    return;
                }
            } catch  {
            // ignore and fall back
            }
            if (!cancelled) setDeck((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__["loadFlashcards"])());
        }
        load();
        return ()=>{
            cancelled = true;
        };
    }, []);
    const progress = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useMemo"])(()=>{
        if (deck.length === 0) return "0 / 0";
        return `${idx + 1} / ${deck.length}`;
    }, [
        idx,
        deck.length
    ]);
    const next = ()=>{
        setFlipped(false);
        setIdx((i)=>deck.length ? (i + 1) % deck.length : 0);
    };
    const prev = ()=>{
        setFlipped(false);
        setIdx((i)=>deck.length ? (i - 1 + deck.length) % deck.length : 0);
    };
    function onCSVUpload(e) {
        const f = e.target.files?.[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = ()=>{
            const txt = String(reader.result || "");
            // CSV with header: term,def
            const lines = txt.split(/\r?\n/).filter(Boolean);
            const rows = [];
            for(let i = 0; i < lines.length; i++){
                const parts = lines[i].split(",");
                if (i === 0 && /term/i.test(parts[0])) continue;
                if (parts.length >= 2) {
                    rows.push({
                        term: parts[0].trim(),
                        def: parts.slice(1).join(",").trim()
                    });
                }
            }
            // persist locally
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__["saveFlashcards"])(rows);
            // optimistic UI
            setDeck(rows);
            setIdx(0);
            setFlipped(false);
            // persist to DB (non-blocking)
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
                    marginBottom: 10
                },
                children: "Flashcards"
            }, void 0, false, {
                fileName: "[project]/pages/flashcards.tsx",
                lineNumber: 82,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                style: {
                    color: "#555",
                    marginBottom: 16
                },
                children: [
                    "Click the card to flip. Import CSV with headers ",
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("code", {
                        children: "term,def"
                    }, void 0, false, {
                        fileName: "[project]/pages/flashcards.tsx",
                        lineNumber: 84,
                        columnNumber: 57
                    }, this),
                    "."
                ]
            }, void 0, true, {
                fileName: "[project]/pages/flashcards.tsx",
                lineNumber: 83,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("label", {
                style: {
                    display: "inline-block",
                    padding: "10px 14px",
                    background: "#0b3d91",
                    color: "white",
                    borderRadius: 8,
                    cursor: "pointer",
                    marginBottom: 16
                },
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
                        fileName: "[project]/pages/flashcards.tsx",
                        lineNumber: 99,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/pages/flashcards.tsx",
                lineNumber: 87,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                style: {
                    marginBottom: 12,
                    color: "#666"
                },
                children: [
                    "Cards: ",
                    deck.length,
                    " · ",
                    progress
                ]
            }, void 0, true, {
                fileName: "[project]/pages/flashcards.tsx",
                lineNumber: 102,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                onClick: ()=>setFlipped((f)=>!f),
                style: {
                    userSelect: "none",
                    background: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: 16,
                    padding: 30,
                    minHeight: 180,
                    boxShadow: "0 8px 18px rgba(0,0,0,0.06)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 22,
                    cursor: "pointer",
                    transition: "transform 0.2s"
                },
                children: card ? flipped ? card.def : card.term : "No cards yet. Import a CSV."
            }, void 0, false, {
                fileName: "[project]/pages/flashcards.tsx",
                lineNumber: 106,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                style: {
                    display: "flex",
                    gap: 10,
                    marginTop: 14
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                        onClick: prev,
                        style: btn,
                        children: "Prev"
                    }, void 0, false, {
                        fileName: "[project]/pages/flashcards.tsx",
                        lineNumber: 128,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                        onClick: next,
                        style: btn,
                        children: "Next"
                    }, void 0, false, {
                        fileName: "[project]/pages/flashcards.tsx",
                        lineNumber: 129,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/pages/flashcards.tsx",
                lineNumber: 127,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/pages/flashcards.tsx",
        lineNumber: 81,
        columnNumber: 5
    }, this);
}
const btn = {
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    background: "#fafafa",
    cursor: "pointer"
};
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__6a12d77a._.js.map