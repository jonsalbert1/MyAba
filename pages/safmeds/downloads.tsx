import { useEffect, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// 👇 This imports your existing weekly SAFMEDS graphs/page
import SafmedsWeek from "./week";

export default function SafmedsDownloadsPage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Give the graphs time to render before capturing
    const timer = setTimeout(() => setReady(true), 800);
    return () => clearTimeout(timer);
  }, []);

  const handleDownload = async () => {
    const element = document.getElementById("safmeds-report");
    if (!element) return;

    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save("safmeds-weekly-report.pdf");
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">SAFMEDS Weekly Report</h1>

      {!ready && (
        <p className="text-gray-500 mb-4">
          Loading your graphs… one moment, Sir…
        </p>
      )}

      {/* 👇 Everything inside this div becomes the PDF image */}
      <div
        id="safmeds-report"
        className="border rounded-lg bg-white p-4 shadow-sm"
      >
        {/* Reuse your existing weekly page (graphs, stats, etc.) */}
        <SafmedsWeek />
      </div>

      <button
        onClick={handleDownload}
        disabled={!ready}
        className="mt-6 px-4 py-2 rounded-md bg-blue-600 text-white font-medium shadow disabled:opacity-50"
      >
        Download as PDF
      </button>
    </div>
  );
}
