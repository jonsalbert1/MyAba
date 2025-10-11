module.exports = [
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/pages-api-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/pages-api-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/pages-api-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/pages-api-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[project]/pages/api/debug/env-check.ts [api] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>handler
]);
function handler(_req, res) {
    const url = (process.env.SUPABASE_URL || ("TURBOPACK compile-time value", "https://glomuduzcuaxqswcqqmt.supabase.co") || "").trim();
    const hasUrl = url.length > 0;
    const hasService = !!(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
    res.status(200).json({
        has_SUPABASE_URL: hasUrl,
        has_SERVICE_ROLE_KEY: hasService,
        url_prefix: url.slice(0, 12)
    });
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__49a4a5b6._.js.map