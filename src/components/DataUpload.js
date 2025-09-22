import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";

const DataUpload = ({ onDataUpload }) => {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    console.log("🔍 Upload Debug - File selected:", {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified).toISOString(),
    });

    setIsProcessing(true);
    setUploadedFile(file);
    setDebugInfo({
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      status: "uploading",
    });

    try {
      const formData = new FormData();
      formData.append("file", file);

      console.log("🚀 Upload Debug - Sending request to /api/upload");
      const startTime = Date.now();

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const endTime = Date.now();
      console.log(`⏱️ Upload Debug - Request took ${endTime - startTime}ms`);
      console.log("📥 Upload Debug - Response status:", response.status);

      const result = await response.json();
      console.log("📦 Upload Debug - Response data:", result);

      setDebugInfo((prev) => ({
        ...prev,
        responseStatus: response.status,
        responseTime: endTime - startTime,
        responseData: result,
        status: response.ok ? "success" : "error",
      }));

      if (response.ok) {
        setPreviewData(result.preview);
        toast.success("File uploaded successfully!");
        console.log("✅ Upload Debug - Success! Preview data:", result.preview);
      } else {
        console.error("❌ Upload Debug - Server error:", result.error);
        throw new Error(result.error || "Upload failed");
      }
    } catch (error) {
      console.error("💥 Upload Debug - Exception:", error);
      setDebugInfo((prev) => ({
        ...prev,
        error: error.message,
        status: "error",
      }));
      toast.error(`Upload error: ${error.message}`);
      setUploadedFile(null);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "image/*": [".png", ".jpg", ".jpeg"],
      "application/zip": [".zip"],
    },
    multiple: false,
    maxSize: 1024 * 1024 * 1024, // 100MB
  });

  const handleProceed = () => {
    if (uploadedFile && previewData) {
      onDataUpload({
        file: uploadedFile,
        preview: previewData,
        type: previewData.type,
      });
    }
  };

  const removeFile = () => {
    setUploadedFile(null);
    setPreviewData(null);
    setDebugInfo(null);
  };

  const refreshPreview = async () => {
    if (!previewData || !previewData.session_id) return;

    setIsRefreshing(true);
    try {
      const response = await fetch(
        `/api/refresh-preview/${previewData.session_id}`
      );
      const result = await response.json();

      if (response.ok) {
        setPreviewData(result.preview);
        toast.success("Preview refreshed with new random samples!");
      } else {
        throw new Error(result.error || "Refresh failed");
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Upload Your Dataset
        </h2>
        <p className="text-gray-600 text-lg">
          Upload CSV files for tabular data or images for computer vision tasks
        </p>
      </div>

      {!uploadedFile ? (
        <div
          {...getRootProps()}
          className={`upload-zone rounded-xl p-12 text-center cursor-pointer ${
            isDragActive ? "drag-active" : ""
          }`}
        >
          <input {...getInputProps()} />
          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <div>
              <p className="text-xl font-medium text-gray-900">
                {isDragActive
                  ? "Drop your file here"
                  : "Drag & drop your dataset"}
              </p>
              <p className="text-gray-500 mt-2">
                or{" "}
                <span className="text-blue-600 font-medium">browse files</span>
              </p>
            </div>
            <div className="text-sm text-gray-400">
              Supports CSV, Images (PNG, JPG), ZIP archives • Max 1024MB
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* File Info */}
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">
                    {uploadedFile.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                onClick={removeFile}
                className="text-red-600 hover:text-red-800 p-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Debug Info - Only show if there's debug data and no preview yet */}
          {debugInfo && !previewData && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 mb-2">
                Debug Information
              </h4>
              <div className="text-sm space-y-1">
                <div>
                  <strong>File:</strong> {debugInfo.fileName} (
                  {(debugInfo.fileSize / (1024 * 1024)).toFixed(2)} MB)
                </div>
                <div>
                  <strong>Type:</strong> {debugInfo.fileType}
                </div>
                <div>
                  <strong>Status:</strong>{" "}
                  <span
                    className={`font-medium ${
                      debugInfo.status === "success"
                        ? "text-green-600"
                        : debugInfo.status === "error"
                        ? "text-red-600"
                        : "text-blue-600"
                    }`}
                  >
                    {debugInfo.status}
                  </span>
                </div>
                {debugInfo.responseStatus && (
                  <div>
                    <strong>Response:</strong> HTTP {debugInfo.responseStatus} (
                    {debugInfo.responseTime}ms)
                  </div>
                )}
                {debugInfo.error && (
                  <div className="text-red-600">
                    <strong>Error:</strong> {debugInfo.error}
                  </div>
                )}
                {debugInfo.responseData && (
                  <details className="mt-2">
                    <summary className="cursor-pointer font-medium text-yellow-800">
                      Raw Response Data
                    </summary>
                    <pre className="mt-2 p-2 bg-yellow-100 rounded text-xs overflow-auto max-h-32">
                      {JSON.stringify(debugInfo.responseData, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          )}

          {/* Preview */}
          {isProcessing ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto"></div>
              <p className="mt-4 text-gray-600">Processing your data...</p>
            </div>
          ) : previewData ? (
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-medium text-gray-900 mb-4">Data Preview</h3>

              {previewData.type === "csv" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="bg-white p-3 rounded">
                      <span className="text-gray-500">Rows:</span>
                      <span className="font-medium ml-2">
                        {previewData.rows}
                      </span>
                    </div>
                    <div className="bg-white p-3 rounded">
                      <span className="text-gray-500">Columns:</span>
                      <span className="font-medium ml-2">
                        {previewData.columns}
                      </span>
                    </div>
                    <div className="bg-white p-3 rounded">
                      <span className="text-gray-500">Type:</span>
                      <span className="font-medium ml-2">Tabular Data</span>
                    </div>
                  </div>

                  {previewData.sample && (
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-white rounded border">
                        <thead>
                          <tr className="bg-gray-50">
                            {Object.keys(previewData.sample[0] || {}).map(
                              (key) => (
                                <th
                                  key={key}
                                  className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase"
                                >
                                  {key}
                                </th>
                              )
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.sample.slice(0, 5).map((row, idx) => (
                            <tr key={idx} className="border-t">
                              {Object.values(row).map((value, colIdx) => (
                                <td
                                  key={colIdx}
                                  className="px-4 py-2 text-sm text-gray-900"
                                >
                                  {String(value).length > 30
                                    ? `${String(value).substring(0, 30)}...`
                                    : String(value)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {previewData.type === "images" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="grid grid-cols-3 gap-4 text-sm flex-1">
                      <div className="bg-white p-3 rounded">
                        <span className="text-gray-500">Images:</span>
                        <span className="font-medium ml-2">
                          {previewData.count}
                        </span>
                      </div>
                      <div className="bg-white p-3 rounded">
                        <span className="text-gray-500">Classes:</span>
                        <span className="font-medium ml-2">
                          {previewData.classes || "Auto-detect"}
                        </span>
                      </div>
                      <div className="bg-white p-3 rounded">
                        <span className="text-gray-500">Type:</span>
                        <span className="font-medium ml-2">Image Data</span>
                      </div>
                    </div>
                    <button
                      onClick={refreshPreview}
                      disabled={isRefreshing}
                      className="ml-4 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                    >
                      <svg
                        className={`w-4 h-4 ${
                          isRefreshing ? "animate-spin" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      <span>
                        {isRefreshing ? "Refreshing..." : "New Samples"}
                      </span>
                    </button>
                  </div>

                  {previewData.samples && (
                    <div className="grid grid-cols-4 gap-4">
                      {previewData.samples.slice(0, 8).map((sample, idx) => (
                        <div key={idx} className="bg-white p-2 rounded">
                          <img
                            src={sample.url}
                            alt={`Sample ${idx + 1}`}
                            className="w-full h-20 object-cover rounded"
                          />
                          <p className="text-xs text-gray-500 mt-1 text-center">
                            {sample.label || `Sample ${idx + 1}`}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}

          {/* Action Buttons */}
          <div className="flex justify-between">
            <button
              onClick={removeFile}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Upload Different File
            </button>
            <button
              onClick={handleProceed}
              disabled={!previewData || isProcessing}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Continue to Training Setup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataUpload;
