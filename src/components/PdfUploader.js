import { useState } from "react";

export default function PdfUploader() {
  const [file, setFile] = useState(null);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return alert("Please upload a PDF file!");

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/summarize", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    setSummary(data.summary);
    setLoading(false);
  };

  return (
    <div className="p-4 bg-white shadow-md rounded-md">
      <h2 className="text-xl font-semibold mb-2">Upload PDF for Summarization</h2>
      <input type="file" accept="application/pdf" onChange={handleFileChange} className="mb-2" />
      <button onClick={handleUpload} className="bg-blue-500 text-white px-4 py-2 rounded-md">
        {loading ? "Summarizing..." : "Upload & Summarize"}
      </button>
      {summary && (
        <div className="mt-4 p-2 border rounded bg-gray-100">
          <h3 className="font-semibold">Summary:</h3>
          <p>{summary}</p>
        </div>
      )}
    </div>
  );
}
