'use client';

import { useAuth } from '@/features/auth/contexts/auth-context';
import { useCallback, useEffect, useRef, useState } from 'react';

interface PatientFile {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  description?: string;
  createdAt: string;
}

const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadPage() {
  const { token } = useAuth();
  const [files, setFiles] = useState<PatientFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

  const fetchFiles = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${apiUrl}/files/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json()) as { data?: PatientFile[] };
      setFiles(json.data ?? []);
    } catch {
      // ignore
    }
  }, [token, apiUrl]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleUpload = (file: File) => {
    if (!token) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError(
        `File type "${file.type}" is not allowed. Allowed: PDF, JPEG, PNG, WebP.`,
      );
      return;
    }

    if (file.size > MAX_SIZE) {
      setError('File exceeds 10 MB limit.');
      return;
    }

    setUploading(true);
    setProgress(0);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        setProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      setUploading(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        setProgress(100);
        fetchFiles();
      } else {
        setError('Upload failed. Please try again.');
      }
    });

    xhr.addEventListener('error', () => {
      setUploading(false);
      setError('Upload failed. Please check your connection.');
    });

    xhr.open('POST', `${apiUrl}/files`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
  };

  const handleDelete = async (fileId: string) => {
    if (!token) return;
    try {
      await fetch(`${apiUrl}/files/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch {
      setError('Failed to delete file.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  return (
    <main className="upload-page">
      <h1>Upload Files</h1>

      <div
        className={`upload-dropzone ${dragOver ? 'drag-over' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          onChange={handleFileSelect}
          hidden
        />
        <div className="dropzone-content">
          <span className="dropzone-icon">📁</span>
          <p>Drag and drop a file here, or click to browse</p>
          <span className="dropzone-hint">
            PDF, JPEG, PNG, WebP — Max 10 MB
          </span>
        </div>
      </div>

      {uploading && (
        <div className="upload-progress">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <span>{progress}%</span>
        </div>
      )}

      {error && <p className="upload-error">{error}</p>}

      <h2>My Files</h2>

      {files.length === 0 ? (
        <div className="empty-state">
          <p>No files uploaded yet.</p>
        </div>
      ) : (
        <div className="file-list">
          {files.map((file) => (
            <div key={file.id} className="file-item">
              <div className="file-info">
                <span className="file-name">{file.fileName}</span>
                <span className="file-meta">
                  {formatFileSize(file.fileSize)} ·{' '}
                  {new Date(file.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="file-actions">
                <button
                  className="file-delete-btn"
                  onClick={() => handleDelete(file.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
