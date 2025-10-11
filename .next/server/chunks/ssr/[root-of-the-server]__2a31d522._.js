module.exports = [
"[project]/pages/quiz.tsx [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// pages/quiz.tsx
__turbopack_context__.s([
    "default",
    ()=>QuizPage
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react/jsx-dev-runtime [external] (react/jsx-dev-runtime, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react [external] (react, cjs)");
;
;
/** Normalize whatever is in localStorage into QuizItem[] */ function normalizeDeck(raw) {
    if (!Array.isArray(raw)) return [];
    const out = [];
    for (const row of raw){
        // Shape 1: a/b/c/d + answer ('A'|'B'|'C'|'D')
        if (row && typeof row.question === "string" && typeof row.a === "string" && typeof row.b === "string" && typeof row.c === "string" && typeof row.d === "string" && typeof row.answer === "string") {
            const ans = String(row.answer).trim().toUpperCase();
            const valid = [
                "A",
                "B",
                "C",
                "D"
            ];
            if (!valid.includes(ans)) continue;
            out.push({
                domain: row.domain ?? undefined,
                question: row.question,
                choices: [
                    row.a,
                    row.b,
                    row.c,
                    row.d
                ],
                answer: ans,
                rationale: row.rationale ?? ""
            });
            continue;
        }
        // Shape 2: choices[] + answerIndex
        if (row && typeof row.question === "string" && Array.isArray(row.choices) && row.choices.length >= 4 && Number.isInteger(row.answerIndex)) {
            const choices = row.choices.slice(0, 4);
            const idx = Math.max(0, Math.min(3, row.answerIndex));
            const map = [
                "A",
                "B",
                "C",
                "D"
            ];
            out.push({
                domain: row.domain ?? undefined,
                question: row.question,
                choices,
                answer: map[idx],
                rationale: row.rationale ?? ""
            });
            continue;
        }
    }
    return out;
}
function loadDeck() {
    try {
        const raw = localStorage.getItem("quiz:deck");
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return normalizeDeck(parsed);
    } catch  {
        return [];
    }
}
function QuizPage() {
    const [deck, setDeck] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])([]);
    const [idx, setIdx] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(0);
    const [selected, setSelected] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(null);
    const [revealed, setRevealed] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(false);
    const [correctCount, setCorrectCount] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(0);
    const [visited, setVisited] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])([]); // track which items have been answered at least once
    // Load deck on mount
    (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useEffect"])(()=>{
        const d = loadDeck();
        if (d.length === 0) {
            // Fallback example so page renders cleanly
            setDeck([
                {
                    domain: "Demo",
                    question: "Which schedule delivers reinforcement after a fixed number of responses?",
                    choices: [
                        "VI",
                        "VR",
                        "FR",
                        "FI"
                    ],
                    answer: "C",
                    rationale: "FR delivers reinforcement after a set number of responses (e.g., FR5)."
                }
            ]);
            setVisited([
                false
            ]);
        } else {
            setDeck(d);
            setVisited(new Array(d.length).fill(false));
        }
    }, []);
    const total = deck.length;
    const current = deck[idx];
    const isCorrect = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useMemo"])(()=>{
        if (!selected || !current) return false;
        return selected === current.answer;
    }, [
        selected,
        current
    ]);
    const onChoose = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useCallback"])((choice)=>{
        if (revealed) return; // lock after reveal
        setSelected(choice);
        setRevealed(true);
        setVisited((v)=>{
            const next = v.slice();
            next[idx] = true;
            return next;
        });
        if (current && choice === current.answer) {
            setCorrectCount((n)=>n + 1);
        }
    }, [
        revealed,
        idx,
        current
    ]);
    const goNext = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useCallback"])(()=>{
        if (total === 0) return;
        setSelected(null);
        setRevealed(false);
        setIdx((i)=>i + 1 < total ? i + 1 : i);
    }, [
        total
    ]);
    const goPrev = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useCallback"])(()=>{
        if (total === 0) return;
        setSelected(null);
        setRevealed(false);
        setIdx((i)=>i - 1 >= 0 ? i - 1 : i);
    }, [
        total
    ]);
    const resetAll = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useCallback"])(()=>{
        setIdx(0);
        setSelected(null);
        setRevealed(false);
        setCorrectCount(0);
        setVisited(new Array(deck.length).fill(false));
    }, [
        deck.length
    ]);
    // Keyboard shortcuts
    (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useEffect"])(()=>{
        const onKey = (e)=>{
            const key = e.key.toLowerCase();
            if ([
                "a",
                "b",
                "c",
                "d"
            ].includes(key)) {
                const map = {
                    a: "A",
                    b: "B",
                    c: "C",
                    d: "D"
                };
                onChoose(map[key]);
            } else if (key === "n") {
                goNext();
            } else if (key === "p") {
                goPrev();
            } else if (key === "r") {
                resetAll();
            }
        };
        window.addEventListener("keydown", onKey);
        return ()=>window.removeEventListener("keydown", onKey);
    }, [
        onChoose,
        goNext,
        goPrev,
        resetAll
    ]);
    // Derived stats
    const answeredCount = visited.filter(Boolean).length;
    const scorePct = total ? Math.round(correctCount / total * 100) : 0;
    const progressPct = total ? Math.round(answeredCount / total * 100) : 0;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("main", {
        className: "min-h-screen bg-gray-50",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("section", {
                className: "mx-auto max-w-5xl px-6 pt-6",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        className: "flex items-center justify-between",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("h1", {
                                className: "text-2xl font-semibold text-gray-900",
                                children: "Quiz"
                            }, void 0, false, {
                                fileName: "[project]/pages/quiz.tsx",
                                lineNumber: 205,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                        className: "text-sm text-gray-600",
                                        children: [
                                            "Score: ",
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                                className: "font-semibold",
                                                children: correctCount
                                            }, void 0, false, {
                                                fileName: "[project]/pages/quiz.tsx",
                                                lineNumber: 208,
                                                columnNumber: 22
                                            }, this),
                                            " / ",
                                            total,
                                            " (",
                                            scorePct,
                                            "%)"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/pages/quiz.tsx",
                                        lineNumber: 207,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                        onClick: resetAll,
                                        className: "rounded-xl border px-3 py-1.5 text-sm font-medium hover:bg-gray-100",
                                        title: "Reset (R)",
                                        children: "Reset"
                                    }, void 0, false, {
                                        fileName: "[project]/pages/quiz.tsx",
                                        lineNumber: 210,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/pages/quiz.tsx",
                                lineNumber: 206,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/pages/quiz.tsx",
                        lineNumber: 204,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                        className: "mt-1 text-sm text-gray-600",
                        children: "Use A/B/C/D, N (next), P (prev), R (reset)"
                    }, void 0, false, {
                        fileName: "[project]/pages/quiz.tsx",
                        lineNumber: 219,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/pages/quiz.tsx",
                lineNumber: 203,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("section", {
                className: "mx-auto max-w-5xl px-6 py-6",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        className: "mb-6",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                className: "h-2 w-full overflow-hidden rounded-full bg-gray-200",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                    className: "h-full bg-blue-600 transition-all",
                                    style: {
                                        width: `${progressPct}%`
                                    }
                                }, void 0, false, {
                                    fileName: "[project]/pages/quiz.tsx",
                                    lineNumber: 229,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/pages/quiz.tsx",
                                lineNumber: 228,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                                className: "mt-2 text-sm text-gray-600",
                                children: [
                                    "Progress: ",
                                    answeredCount,
                                    "/",
                                    total,
                                    " (",
                                    progressPct,
                                    "%)"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/pages/quiz.tsx",
                                lineNumber: 234,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/pages/quiz.tsx",
                        lineNumber: 227,
                        columnNumber: 9
                    }, this),
                    current ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        className: "rounded-2xl bg-white p-6 shadow-md",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                className: "mb-2 flex items-center justify-between",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                        className: "text-xs font-medium uppercase tracking-wide text-gray-500",
                                        children: current.domain || "Domain"
                                    }, void 0, false, {
                                        fileName: "[project]/pages/quiz.tsx",
                                        lineNumber: 244,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                        className: "text-xs text-gray-500",
                                        children: [
                                            "Q ",
                                            idx + 1,
                                            " / ",
                                            total
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/pages/quiz.tsx",
                                        lineNumber: 247,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/pages/quiz.tsx",
                                lineNumber: 243,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("h2", {
                                className: "mb-6 text-xl font-semibold leading-snug text-gray-900",
                                children: current.question
                            }, void 0, false, {
                                fileName: "[project]/pages/quiz.tsx",
                                lineNumber: 253,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                className: "grid gap-3",
                                children: [
                                    "A",
                                    "B",
                                    "C",
                                    "D"
                                ].map((label, i)=>{
                                    const choiceText = current.choices[i] ?? "";
                                    const isSelected = selected === label;
                                    const isAnswer = current.answer === label;
                                    // Base + stateful styles
                                    let base = "w-full rounded-xl border px-4 py-3 text-left transition focus:outline-none";
                                    let cls = "border-gray-300 hover:bg-gray-50";
                                    if (!revealed && isSelected) {
                                        cls = "border-blue-500 ring-2 ring-blue-500/30";
                                    }
                                    if (revealed) {
                                        if (isAnswer) cls = "border-green-600 bg-green-50";
                                        if (!isAnswer && isSelected) cls = "border-red-600 bg-red-50";
                                    }
                                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                        disabled: revealed,
                                        onClick: ()=>onChoose(label),
                                        className: `${base} ${cls}`,
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                            className: "flex items-start gap-3",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                                    className: "mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-sm font-bold",
                                                    children: label
                                                }, void 0, false, {
                                                    fileName: "[project]/pages/quiz.tsx",
                                                    lineNumber: 286,
                                                    columnNumber: 23
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                                    className: "text-gray-900",
                                                    children: choiceText
                                                }, void 0, false, {
                                                    fileName: "[project]/pages/quiz.tsx",
                                                    lineNumber: 289,
                                                    columnNumber: 23
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/pages/quiz.tsx",
                                            lineNumber: 285,
                                            columnNumber: 21
                                        }, this)
                                    }, label, false, {
                                        fileName: "[project]/pages/quiz.tsx",
                                        lineNumber: 279,
                                        columnNumber: 19
                                    }, this);
                                })
                            }, void 0, false, {
                                fileName: "[project]/pages/quiz.tsx",
                                lineNumber: 258,
                                columnNumber: 13
                            }, this),
                            revealed && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                className: "mt-6 rounded-xl border border-blue-200 bg-blue-50 p-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                                        className: "mb-1 text-sm font-semibold text-blue-800",
                                        children: isCorrect ? "Correct ✅" : "Not quite ❌"
                                    }, void 0, false, {
                                        fileName: "[project]/pages/quiz.tsx",
                                        lineNumber: 299,
                                        columnNumber: 17
                                    }, this),
                                    current.rationale ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                                        className: "text-blue-900",
                                        children: current.rationale
                                    }, void 0, false, {
                                        fileName: "[project]/pages/quiz.tsx",
                                        lineNumber: 303,
                                        columnNumber: 19
                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("p", {
                                        className: "text-blue-900",
                                        children: "No rationale provided for this item."
                                    }, void 0, false, {
                                        fileName: "[project]/pages/quiz.tsx",
                                        lineNumber: 305,
                                        columnNumber: 19
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/pages/quiz.tsx",
                                lineNumber: 298,
                                columnNumber: 15
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                className: "mt-6 flex items-center justify-between",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                        onClick: goPrev,
                                        disabled: idx === 0,
                                        className: "rounded-xl border px-4 py-2 font-medium hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50",
                                        title: "Prev (P)",
                                        children: "← Prev"
                                    }, void 0, false, {
                                        fileName: "[project]/pages/quiz.tsx",
                                        lineNumber: 312,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                        className: "text-sm text-gray-500",
                                        children: revealed ? "Press Next to continue" : "Choose an answer"
                                    }, void 0, false, {
                                        fileName: "[project]/pages/quiz.tsx",
                                        lineNumber: 321,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                        onClick: goNext,
                                        disabled: idx >= total - 1,
                                        className: "rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50",
                                        title: "Next (N)",
                                        children: "Next →"
                                    }, void 0, false, {
                                        fileName: "[project]/pages/quiz.tsx",
                                        lineNumber: 325,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/pages/quiz.tsx",
                                lineNumber: 311,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/pages/quiz.tsx",
                        lineNumber: 241,
                        columnNumber: 11
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        className: "rounded-2xl border border-dashed p-8 text-center text-gray-500",
                        children: [
                            "No quiz deck found in ",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("code", {
                                children: "localStorage"
                            }, void 0, false, {
                                fileName: "[project]/pages/quiz.tsx",
                                lineNumber: 337,
                                columnNumber: 35
                            }, this),
                            " at ",
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("code", {
                                children: "quiz:deck"
                            }, void 0, false, {
                                fileName: "[project]/pages/quiz.tsx",
                                lineNumber: 337,
                                columnNumber: 64
                            }, this),
                            ". Load your deck and refresh."
                        ]
                    }, void 0, true, {
                        fileName: "[project]/pages/quiz.tsx",
                        lineNumber: 336,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/pages/quiz.tsx",
                lineNumber: 225,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/pages/quiz.tsx",
        lineNumber: 201,
        columnNumber: 5
    }, this);
}
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__2a31d522._.js.map