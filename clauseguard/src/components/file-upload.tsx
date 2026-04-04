'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, FileText, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface FileUploadProps {
  onAnalysisComplete: (contractId: string, analysis: any) => void;
}

export function FileUpload({ onAnalysisComplete }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const validateFile = (f: File): string | null => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowedTypes.includes(f.type)) {
      return 'Please upload a PDF or DOCX file.';
    }
    if (f.size > 50 * 1024 * 1024) {
      return 'File too large. Maximum size is 50MB.';
    }
    return null;
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setError('');

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const err = validateFile(droppedFile);
      if (err) {
        setError(err);
        return;
      }
      setFile(droppedFile);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const err = validateFile(selectedFile);
      if (err) {
        setError(err);
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError('');
    setProgress('Uploading contract...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      setProgress('Extracting text from document...');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      setProgress('AI is analyzing your contract...');

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setProgress('Analysis complete!');
      onAnalysisComplete(data.contractId, data.analysis);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setUploading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card
        className={`relative border-2 border-dashed transition-all duration-200 bg-slate-900/50 ${
          isDragging
            ? 'border-emerald-500 bg-emerald-500/5'
            : error
            ? 'border-red-500/50'
            : 'border-slate-700 hover:border-slate-500'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="p-8 text-center">
          {!file ? (
            <>
              <Upload className={`h-12 w-12 mx-auto mb-4 ${isDragging ? 'text-emerald-500' : 'text-slate-500'}`} />
              <h3 className="text-lg font-semibold text-white mb-2">
                Drop your contract here
              </h3>
              <p className="text-slate-400 mb-4">
                Supports PDF and DOCX files up to 50MB
              </p>
              <Button
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
                onClick={() => fileInputRef.current?.click()}
              >
                Browse Files
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={handleFileSelect}
              />
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3">
                <FileText className="h-10 w-10 text-emerald-500" />
                <div className="text-left">
                  <p className="text-white font-medium">{file.name}</p>
                  <p className="text-sm text-slate-400">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                {!uploading && (
                  <button
                    onClick={removeFile}
                    className="ml-2 p-1 text-slate-400 hover:text-red-400 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>

              {uploading ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2 text-emerald-400">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-sm">{progress}</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-1.5">
                    <div className="bg-emerald-500 h-1.5 rounded-full animate-pulse" style={{ width: '60%' }} />
                  </div>
                </div>
              ) : (
                <Button
                  onClick={handleUpload}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-8"
                >
                  Analyze Contract
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>

      {error && (
        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
          {error}
        </div>
      )}
    </div>
  );
}
