import { useRef, useState } from "react";

export default function UploadDebug() {
  const [filename, setFilename] = useState<string>("");
  const [log, setLog] = useState<string>("—");
  const inputRef = useRef<HTMLInputElement | null>(null);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) {
      setLog("onChange fired, but no file selected (user canceled or filter mismatch).");
      return;
    }
    setFilename(f.name);
    setLog(`Selected file: ${f.name} (type: ${f.type || "unknown"}) size: ${f.size} bytes`);
  }

  return (
    <main
      style={{
        maxWidth: 720,
        margin: "40px auto",
        padding: 24,
        border: "2px solid #ddd",
        borderRadius: 12,
        position: "relative",
        zIndex: 9999,
        background: "white",
      }}
    >
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 16 }}>
        Upload Debug (No Auth • Native Input + DnD)
      </h1>

      {/* Visible native input, no accept filter */}
      <div style={{ marginBottom: 12 }}>
        <input
          ref={inputRef}
          id="plain-file"
          type="file"
          onClick={() => setLog("Input clicked (user gesture)")}
          onChange={onChange}
          style={{
            display: "block",
            width: "100%",
            padding: 8,
            border: "1px solid #aaa",
            borderRadius: 6,
            background: "white",
            color: "#111",
          }}
        />
      </div>

      {/* Separate trigger button (in case styling interferes) */}
      <button
        type="button"
        onClick={() => {
          try {
            setLog("Trigger button clicked → input.click()");
            inputRef.current?.click();
          } catch (e: any) {
            setLog(`Could not open file picker: ${e.message}`);
          }
        }}
        style={{ padding: "8px 14px", borderRadius: 6, border: "1px solid #222" }}
      >
        Choose File…
      </button>

      {/* Drag & drop zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files?.[0];
          if (!file) return setLog("Drop event, but no files.");
          setFilename(file.name);
          setLog(`Dropped file: ${file.name} (type: ${file.type || "unknown"}) size: ${file.size} bytes`);
        }}
        style={{
          marginTop: 16,
          padding: 20,
          border: "2px dashed #bbb",
          borderRadius: 10,
          color: "#555",
        }}
      >
        Drag & drop any file here
        {filename ? <div style={{ marginTop: 8, color: "#111" }}>Selected: {filename}</div> : null}
      </div>

      <pre
        style={{
          marginTop: 16,
          background: "#f7f7f7",
          padding: 12,
          borderRadius: 8,
          whiteSpace: "pre-wrap",
        }}
      >
        {log}
      </pre>
    </main>
  );
}
