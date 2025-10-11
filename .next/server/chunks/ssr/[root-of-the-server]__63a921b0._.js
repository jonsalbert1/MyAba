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
"[project]/pages/index.tsx [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// pages/index.tsx
__turbopack_context__.s([
    "default",
    ()=>Home
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react/jsx-dev-runtime [external] (react/jsx-dev-runtime, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react [external] (react, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$link$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/link.js [ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/storage.ts [ssr] (ecmascript)");
;
;
;
;
function Home() {
    const [fcCount, setFcCount] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(0);
    const [qCount, setQCount] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(0);
    (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useEffect"])(()=>{
        let cancelled = false;
        async function loadCounts() {
            // Try DB first
            try {
                const [fcRes, qRes] = await Promise.allSettled([
                    fetch("/api/flashcards/list?deckId=default").then((r)=>r.json()),
                    fetch("/api/quiz/list?deckId=default").then((r)=>r.json())
                ]);
                if (!cancelled) {
                    if (fcRes.status === "fulfilled" && Array.isArray(fcRes.value.records)) {
                        setFcCount(fcRes.value.records.length);
                    } else {
                        setFcCount((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__["loadFlashcards"])().length);
                    }
                    if (qRes.status === "fulfilled" && Array.isArray(qRes.value.records)) {
                        setQCount(qRes.value.records.length);
                    } else {
                        setQCount((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__["loadQuiz"])().length);
                    }
                }
            } catch  {
                if (!cancelled) {
                    setFcCount((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__["loadFlashcards"])().length);
                    setQCount((0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$storage$2e$ts__$5b$ssr$5d$__$28$ecmascript$29$__["loadQuiz"])().length);
                }
            }
        }
        loadCounts();
        return ()=>{
            cancelled = true;
        };
    }, []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("main", {
        style: {
            maxWidth: 1000,
            margin: "0 auto",
            padding: "24px 16px"
        },
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("section", {
            style: {
                background: "white",
                borderRadius: 12,
                padding: 24,
                boxShadow: "0 6px 16px rgba(0,0,0,0.08)"
            },
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("h1", {
                    style: {
                        fontSize: 28,
                        marginBottom: 10
                    },
                    children: "Welcome back, Jon"
                }, void 0, false, {
                    fileName: "[project]/pages/index.tsx",
                    lineNumber: 56,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                    style: {
                        color: "#444",
                        marginBottom: 20
                    },
                    children: "Jump into a deck, run a quick quiz, or time a SAFMEDS trial."
                }, void 0, false, {
                    fileName: "[project]/pages/index.tsx",
                    lineNumber: 57,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                    style: {
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
                        gap: 16
                    },
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(Card, {
                            title: "Flashcards",
                            meta: `${fcCount} terms`,
                            href: "/flashcards"
                        }, void 0, false, {
                            fileName: "[project]/pages/index.tsx",
                            lineNumber: 68,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(Card, {
                            title: "Quiz",
                            meta: `${qCount} items`,
                            href: "/quiz"
                        }, void 0, false, {
                            fileName: "[project]/pages/index.tsx",
                            lineNumber: 69,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(Card, {
                            title: "SAFMEDS",
                            meta: "Timed trials & graph",
                            href: "/safmeds"
                        }, void 0, false, {
                            fileName: "[project]/pages/index.tsx",
                            lineNumber: 70,
                            columnNumber: 11
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/pages/index.tsx",
                    lineNumber: 61,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/pages/index.tsx",
            lineNumber: 48,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/pages/index.tsx",
        lineNumber: 47,
        columnNumber: 5
    }, this);
}
function Card({ title, meta, href }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$link$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["default"], {
        href: href,
        style: {
            display: "block",
            textDecoration: "none",
            color: "inherit",
            border: "1px solid #e6e6e6",
            borderRadius: 12,
            padding: 18,
            background: "#fafafa"
        },
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                style: {
                    fontSize: 18,
                    fontWeight: 700
                },
                children: title
            }, void 0, false, {
                fileName: "[project]/pages/index.tsx",
                lineNumber: 91,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                style: {
                    color: "#666",
                    marginTop: 6
                },
                children: meta
            }, void 0, false, {
                fileName: "[project]/pages/index.tsx",
                lineNumber: 92,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/pages/index.tsx",
        lineNumber: 79,
        columnNumber: 5
    }, this);
}
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__63a921b0._.js.map