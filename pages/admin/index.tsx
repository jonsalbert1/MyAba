// pages/admin/index.tsx
import { useEffect, useState } from "react";
import { useUser, useSupabaseClient } from "@supabase/auth-helpers-react";

type AdminProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  is_admin: boolean | null;
  created_at: string | null;
};

type DangerAction = "safmeds" | "quiz" | null;

export default function AdminHome() {
  const supabase = useSupabaseClient();
  const user = useUser();

  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [filtered, setFiltered] = useState<AdminProfile[]>([]);
  const [search, setSearch] = useState("");

  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedProfile, setSelectedProfile] =
    useState<AdminProfile | null>(null);

  const [dangerLoading, setDangerLoading] = useState<DangerAction>(null);
  const [dangerMessage, setDangerMessage] = useState<string | null>(null);

  // 1️⃣ Check auth + admin flag from profiles
  useEffect(() => {
    if (!user) {
      setCheckingAdmin(false);
      setIsAdmin(false);
      return;
    }

    let cancelled = false;

    const check = async () => {
      setCheckingAdmin(true);
      setError(null);

      const { data, error } = await supabase
        .from("profiles")
        .select("id, is_admin")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error("Error loading profile for admin check:", error);
        setError("Unable to verify admin access. Please try again.");
        setIsAdmin(false);
      } else {
        setIsAdmin(!!data?.is_admin);
      }

      setCheckingAdmin(false);
    };

    check();

    return () => {
      cancelled = true;
    };
  }, [user, supabase]);

  // 2️⃣ Load profiles list (only if admin)
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;

    const loadProfiles = async () => {
      setLoadingProfiles(true);
      setError(null);

      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, is_admin, created_at")
        .order("created_at", { ascending: false })
        .limit(200);

      if (cancelled) return;

      if (error) {
        console.error("Error loading profiles:", error);
        setError("Error loading users.");
        setProfiles([]);
        setFiltered([]);
        setSelectedProfile(null);
      } else {
        const rows = (data ?? []) as AdminProfile[];
        setProfiles(rows);
        setFiltered(rows);
        // Default selection: first row, if any (but keep existing selection if still present)
        setSelectedProfile((prev) => {
          if (prev && rows.some((r) => r.id === prev.id)) return prev;
          return rows[0] ?? null;
        });
      }

      setLoadingProfiles(false);
    };

    loadProfiles();

    return () => {
      cancelled = true;
    };
  }, [isAdmin, supabase]);

  // 3️⃣ Filter when search changes
  useEffect(() => {
    if (!search.trim()) {
      setFiltered(profiles);
      // ensure selection is still valid
      if (
        selectedProfile &&
        !profiles.some((p) => p.id === selectedProfile.id)
      ) {
        setSelectedProfile(profiles[0] ?? null);
      }
      return;
    }

    const q = search.toLowerCase();
    const next = profiles.filter((p) => {
      const email = p.email ?? "";
      const name = p.full_name ?? "";
      return (
        email.toLowerCase().includes(q) || name.toLowerCase().includes(q)
      );
    });
    setFiltered(next);

    // If current selection is filtered out, move to first match
    if (selectedProfile && !next.some((p) => p.id === selectedProfile.id)) {
      setSelectedProfile(next[0] ?? null);
    }
  }, [search, profiles, selectedProfile]);

  // 4️⃣ Danger zone actions
  async function handleDangerAction(kind: DangerAction) {
    if (!kind || !selectedProfile) return;

    try {
      setDangerLoading(kind);
      setDangerMessage(null);

      const endpoint =
        kind === "safmeds"
          ? "/api/admin/reset-safmeds"
          : "/api/admin/reset-quiz";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedProfile.id }),
      });

      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null;

      if (!res.ok || !json?.ok) {
        const msg = json?.error || `Failed to reset ${kind} data`;
        setDangerMessage(msg);
        console.error("Danger action error:", msg);
      } else {
        setDangerMessage(
          kind === "safmeds"
            ? "SAFMEDS data reset successfully for this user."
            : "Quiz data reset successfully for this user."
        );
      }
    } catch (err: any) {
      console.error("Danger action unexpected error:", err);
      setDangerMessage(err?.message ?? "Unexpected error.");
    } finally {
      setDangerLoading(null);
    }
  }

  // 🧱 Render branches

  if (checkingAdmin) {
    return (
      <main className="space-y-4">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="text-sm text-gray-600">Checking admin permissions…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="space-y-4">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="text-sm text-gray-700">
          You must be signed in to access the admin area.
        </p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="space-y-4">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="text-sm text-red-700">
          Your account does not have admin access. If you believe this is an
          error, please contact the system owner.
        </p>
      </main>
    );
  }

  // ✅ Admin view
  return (
    <main className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Admin</h1>
          <p className="text-sm text-gray-600">
            User &amp; data overview. Select a user to see details and perform
            data resets.
          </p>
        </div>
      </div>

      {/* Search + table + detail pane */}
      <section className="space-y-3 rounded-lg border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Users</h2>
            <p className="text-xs text-gray-500">
              Total profiles: {profiles.length} • Showing: {filtered.length}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by email or name…"
              className="w-full rounded-md border px-3 py-1.5 text-sm shadow-sm sm:w-64"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-700">{error}</p>}

        {loadingProfiles ? (
          <p className="text-sm text-gray-600">Loading users…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-600">No users found.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-[2fr,minmax(0,1fr)]">
            {/* Users table */}
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Admin</th>
                    <th className="px-3 py-2 whitespace-nowrap">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const isSelected = selectedProfile?.id === p.id;
                    return (
                      <tr
                        key={p.id}
                        className={`border-b last:border-b-0 cursor-pointer hover:bg-gray-50 ${
                          isSelected ? "bg-emerald-50/60" : ""
                        }`}
                        onClick={() => setSelectedProfile(p)}
                      >
                        <td className="px-3 py-2 font-mono text-xs sm:text-sm">
                          {p.email ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-xs sm:text-sm">
                          {p.full_name ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-xs sm:text-sm">
                          {p.is_admin ? (
                            <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                              Admin
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                              User
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500">
                          {p.created_at
                            ? new Date(p.created_at).toLocaleDateString()
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Selected user detail + danger zone */}
            <div className="space-y-3 rounded-md border bg-gray-50 p-3 text-sm">
              <h3 className="text-sm font-semibold text-gray-800">
                Selected user
              </h3>

              {selectedProfile ? (
                <>
                  <div className="space-y-1 text-xs sm:text-sm">
                    <p>
                      <span className="font-medium">Email:</span>{" "}
                      {selectedProfile.email ?? "—"}
                    </p>
                    <p>
                      <span className="font-medium">Name:</span>{" "}
                      {selectedProfile.full_name ?? "—"}
                    </p>
                    <p>
                      <span className="font-medium">Admin:</span>{" "}
                      {selectedProfile.is_admin ? "Yes" : "No"}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      ID: {selectedProfile.id}
                    </p>
                  </div>

                  <div className="mt-3 border-t pt-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-red-700">
                      Danger zone
                    </h4>
                    <p className="mb-2 text-xs text-gray-600">
                      These actions permanently remove this user&apos;s study
                      data. This is mainly for testing accounts.
                    </p>

                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        disabled={dangerLoading !== null}
                        onClick={() => handleDangerAction("safmeds")}
                        className="inline-flex items-center justify-center rounded-md border border-red-500 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                      >
                        {dangerLoading === "safmeds"
                          ? "Resetting SAFMEDS…"
                          : "Reset SAFMEDS data"}
                      </button>

                      <button
                        type="button"
                        disabled={dangerLoading !== null}
                        onClick={() => handleDangerAction("quiz")}
                        className="inline-flex items-center justify-center rounded-md border border-red-500 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                      >
                        {dangerLoading === "quiz"
                          ? "Resetting quiz data…"
                          : "Reset quiz data"}
                      </button>
                    </div>

                    {dangerMessage && (
                      <p className="mt-2 text-xs text-gray-700">
                        {dangerMessage}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-xs text-gray-600">
                  Click a row in the table to select a user.
                </p>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
