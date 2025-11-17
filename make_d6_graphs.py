import matplotlib.pyplot as plt

# Turn off interactive mode (optional)
plt.ioff()

# Helper to save and close
def save_fig(name):
    plt.tight_layout()
    plt.savefig(name, dpi=150)
    plt.close()

# ---------- D6-Q1: ABAB reversal ----------
sessions = list(range(1, 21))
A1 = [9, 8, 10, 9, 8]
B1 = [4, 3, 2, 3, 2]
A2 = [9, 8, 9, 10, 9]
B2 = [3, 2, 2, 1, 2]
data_q1 = A1 + B1 + A2 + B2

plt.figure()
plt.title("D6_Q1 Single-Case Data (ABAB)")
plt.xlabel("Sessions")
plt.ylabel("Shouting per session")
plt.scatter(sessions, data_q1)
plt.plot(sessions, data_q1)
# Phase change markers
for x in [5.5, 10.5, 15.5]:
    plt.axvline(x, linestyle="--")
plt.text(2.5, max(data_q1) + 0.5, "A1")
plt.text(7.5, max(data_q1) + 0.5, "B1")
plt.text(12.5, max(data_q1) + 0.5, "A2")
plt.text(17.5, max(data_q1) + 0.5, "B2")
save_fig("D6_Q1_labeled.png")

# ---------- D6-Q2: Baseline vs Intervention (no change) ----------
A = [2, 3, 2, 3, 2]
B = [2, 3, 3, 2, 3]
sessions = list(range(1, 11))

plt.figure()
plt.title("D6_Q2 Single-Case Data")
plt.xlabel("Sessions")
plt.ylabel("Behavior")
plt.scatter(sessions[:5], A, label="Baseline (A)")
plt.plot(sessions[:5], A)
plt.scatter(sessions[5:], B, label="Intervention (B)")
plt.plot(sessions[5:], B)
plt.axvline(5.5, linestyle="--")
plt.legend()
save_fig("D6_Q2_labeled.png")

# ---------- D6-Q3: Unstable A, stable B ----------
A = [10, 40, 20, 50, 30]
B = [75, 80, 82, 83, 85]
sessions = list(range(1, 11))

plt.figure()
plt.title("D6_Q3 Single-Case Data")
plt.xlabel("Sessions")
plt.ylabel("Reading accuracy (%)")
plt.scatter(sessions[:5], A, label="Baseline (A)")
plt.plot(sessions[:5], A)
plt.scatter(sessions[5:], B, label="Intervention (B)")
plt.plot(sessions[5:], B)
plt.axvline(5.5, linestyle="--")
plt.legend()
save_fig("D6_Q3_labeled.png")

# ---------- D6-Q4: Multiple baseline across 3 students ----------
sessions = list(range(1, 16))
s1 = [2,2,2,2,2, 1,1,1,1,1, 1,1,1,1,1]
s2 = [3,3,3,3,3, 3,3,3,3,3, 2,2,2,2,2]
s3 = [4,4,4,4,4, 4,5,5,5,5, 5,5,5,5,5]  # weaker effect

plt.figure()
plt.title("D6_Q4 Multiple Baseline")
plt.xlabel("Sessions")
plt.ylabel("Problem behavior")
plt.scatter(sessions, s1, label="Student 1")
plt.plot(sessions, s1)
plt.scatter(sessions, s2, label="Student 2")
plt.plot(sessions, s2)
plt.scatter(sessions, s3, label="Student 3")
plt.plot(sessions, s3)
plt.axvline(5.5, linestyle="--")   # S1 intervention
plt.axvline(10.5, linestyle="--")  # S2 intervention
plt.legend()
save_fig("D6_Q4_labeled.png")

# ---------- D6-Q5: Very high variability in B ----------
A = [6, 8, 7, 9, 8]
B = [1, 12, 3, 15, 2]
sessions = list(range(1, 11))

plt.figure()
plt.title("D6_Q5 Single-Case Data")
plt.xlabel("Sessions")
plt.ylabel("Problem behavior")
plt.scatter(sessions[:5], A, label="Baseline (A)")
plt.plot(sessions[:5], A)
plt.scatter(sessions[5:], B, label="Intervention (B)")
plt.plot(sessions[5:], B)
plt.axvline(5.5, linestyle="--")
plt.legend()
save_fig("D6_Q5_labeled.png")

# ---------- D6-Q6: Changing criterion with one inconsistent dip ----------
sessions = list(range(1, 16))
data = [2,2,3,3,3, 4,4,5,4,5, 6,6,5,6,7]

plt.figure()
plt.title("D6_Q6 Changing Criterion")
plt.xlabel("Sessions")
plt.ylabel("Correct responses")
plt.scatter(sessions, data)
plt.plot(sessions, data)
# Criterion lines (example levels)
plt.axhline(3, linestyle="--")
plt.axhline(5, linestyle="--")
plt.axhline(7, linestyle="--")
save_fig("D6_Q6_labeled.png")

# ---------- D6-Q7: Overlapping A and B ----------
A = [5, 6, 7, 6, 7]
B = [4, 6, 5, 7, 6]
sessions = list(range(1, 11))

plt.figure()
plt.title("D6_Q7 Single-Case Data")
plt.xlabel("Sessions")
plt.ylabel("Behavior")
plt.scatter(sessions[:5], A, label="Baseline (A)")
plt.plot(sessions[:5], A)
plt.scatter(sessions[5:], B, label="Intervention (B)")
plt.plot(sessions[5:], B)
plt.axvline(5.5, linestyle="--")
plt.legend()
save_fig("D6_Q7_labeled.png")

# ---------- D6-Q8: Alternating-treatments design ----------
sessions = list(range(1, 13))
A_vals = [2, None, 3, None, 2, None, 3, None, 2, None, 3, None]
B_vals = [None,5,None,6,None,4,None,7,None,5,None,6]

sess_A = [s for s, v in zip(sessions, A_vals) if v is not None]
vals_A = [v for v in A_vals if v is not None]
sess_B = [s for s, v in zip(sessions, B_vals) if v is not None]
vals_B = [v for v in B_vals if v is not None]

plt.figure()
plt.title("D6_Q8 Alternating Treatments")
plt.xlabel("Sessions")
plt.ylabel("Errors")
plt.scatter(sess_A, vals_A, label="Procedure A")
plt.plot(sess_A, vals_A)
plt.scatter(sess_B, vals_B, label="Procedure B")
plt.plot(sess_B, vals_B)
plt.legend()
save_fig("D6_Q8_labeled.png")

# ---------- D6-Q9: Gradual downward trend ----------
sessions = list(range(1, 16))
A = [10, 10, 11, 9, 10]
B = [9, 8, 8, 7, 7, 6, 6, 5, 5, 4]

plt.figure()
plt.title("D6_Q9 Gradual Trend")
plt.xlabel("Sessions")
plt.ylabel("Problem behavior")
plt.scatter(sessions[:5], A, label="Baseline (A)")
plt.plot(sessions[:5], A)
plt.scatter(sessions[5:], B, label="Intervention (B)")
plt.plot(sessions[5:], B)
plt.axvline(5.5, linestyle="--")
plt.legend()
save_fig("D6_Q9_labeled.png")

# ---------- D6-Q10: Multiple probe across skills ----------
sessions = list(range(1, 13))
skill1 = [0,0,0,1,3,4,5,5,5,5,5,5]
skill2 = [0,0,0,0,0,1,1,3,4,4,4,4]
skill3 = [0,0,0,0,0,0,0,0,1,3,4,4]

plt.figure()
plt.title("D6_Q10 Multiple Probe")
plt.xlabel("Probes")
plt.ylabel("Correct responses")
plt.scatter(sessions, skill1, label="Skill 1")
plt.plot(sessions, skill1)
plt.scatter(sessions, skill2, label="Skill 2")
plt.plot(sessions, skill2)
plt.scatter(sessions, skill3, label="Skill 3")
plt.plot(sessions, skill3)
plt.axvline(4.5, linestyle="--")
plt.axvline(6.5, linestyle="--")
plt.axvline(8.5, linestyle="--")
plt.legend()
save_fig("D6_Q10_labeled.png")

print("All D6 graphs saved as PNGs in this folder.")
