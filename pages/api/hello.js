module.exports = (req, res) => {
  res.status(200).json({ ok: true, time: new Date().toISOString(), message: "myABA API online" });
}

// AUTO-ADDED PLACEHOLDER by fix script — replace with real handler when ready.

