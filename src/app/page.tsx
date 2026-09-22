'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  FileText, 
  Send, 
  Copy, 
  Check, 
  Trash2, 
  Clock, 
  Sparkles, 
  Image as ImageIcon,
  ChevronRight,
  ExternalLink,
  Loader2,
  X,
  Cpu,
  ShieldCheck,
  RefreshCw,
  FileDown,
  FolderUp,
  FileSpreadsheet,
  File as FileIcon,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import ReactMarkdown from 'react-markdown';
import {
  type FileType,
  detectRequestedFileType,
  fileTypeLabel,
  fileTypeEmoji,
  downloadAsWord,
  downloadAsExcel,
  downloadAsPptx,
  downloadAsPdf,
} from '@/lib/fileGenerator';

interface ImageItem {
  id: string;
  name: string;
  mimeType: string;
  base64: string;
  previewUrl: string;
}

interface AttachedDocument {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  text: string;
  wordCount: number;
  charCount: number;
  loading?: boolean;
  error?: string;
}

interface HistoryItem {
  id: string;
  created_at: string;
  type: string;
  title: string;
  prompt_text: string;
  answer_text: string;
  image_urls?: string[];
  course_category?: string;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'kuis' | 'diskusi'>('kuis');
  const [promptText, setPromptText] = useState('');
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('Sedang menganalisis...');
  const [answer, setAnswer] = useState<string | null>(null);
  const [usedEngine, setUsedEngine] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [engineChoice, setEngineChoice] = useState<'auto' | '9router' | 'gemini'>('auto');
  const [selectedModel, setSelectedModel] = useState('ag/gemini-3.8-flash-high');
  const [documents, setDocuments] = useState<AttachedDocument[]>([]);
  const [submittedPrompt, setSubmittedPrompt] = useState<{
    text: string;
    images: ImageItem[];
    documents?: AttachedDocument[];
  } | null>(null);

  // File download states
  const [requestedFileType, setRequestedFileType] = useState<FileType | null>(null);
  const [customFilename, setCustomFilename] = useState('');
  const [fileDownloading, setFileDownloading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await fetch(`/api/history?t=${Date.now()}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.history)) {
        setHistory(data.history);
      }
    } catch (e) {
      console.warn('Failed to load history:', e);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleDeleteHistory = async (id: string) => {
    if (!confirm('Apakah kamu yakin ingin menghapus riwayat tugas ini?')) {
      return;
    }

    setHistory((prev) => prev.filter((item) => item.id !== id));

    try {
      const res = await fetch('/api/history', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menghapus riwayat.');
      }
    } catch (err: any) {
      alert(`Gagal menghapus: ${err.message}`);
      fetchHistory();
    }
  };

  const handleClearAllHistory = async () => {
    if (!confirm('Apakah kamu yakin ingin menghapus SELURUH riwayat tugas secara permanen?')) {
      return;
    }

    setHistory([]);

    try {
      const res = await fetch('/api/history', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal membersihkan riwayat.');
      }
    } catch (err: any) {
      alert(`Gagal menghapus: ${err.message}`);
      fetchHistory();
    }
  };

  // Smart Clipboard Paste (Ctrl+V) listener
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const activeElement = document.activeElement;
      const isInput = activeElement?.tagName === 'TEXTAREA' || activeElement?.tagName === 'INPUT';

      if (e.clipboardData?.files && e.clipboardData.files.length > 0) {
        const file = e.clipboardData.files[0];
        if (file.type.startsWith('image/')) {
          e.preventDefault();
          handleFileUpload([file]);
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Keyboard shortcut Ctrl + Enter to submit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (!loading && (promptText.trim().length > 0 || images.length > 0 || documents.length > 0)) {
          handleSubmit();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loading, promptText, images, documents]);

  const handleFileUpload = (files: FileList | File[]) => {
    const fileList = Array.from(files);

    fileList.forEach((file) => {
      // 1. If it's an image
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          setImages((prev) => [
            ...prev,
            {
              id: Math.random().toString(36).substring(2, 9),
              name: file.name || 'Screenshot',
              mimeType: file.type,
              base64,
              previewUrl: base64,
            },
          ]);
        };
        reader.readAsDataURL(file);
      } 
      // 2. If it's a document (PDF, Word, Excel, Text, etc.)
      else {
        const tempId = Math.random().toString(36).substring(2, 9);
        const ext = file.name.split('.').pop()?.toLowerCase() || 'doc';

        // Add placeholder with loading state immediately
        setDocuments((prev) => [
          ...prev,
          {
            id: tempId,
            fileName: file.name,
            fileSize: file.size,
            fileType: ext,
            text: '',
            wordCount: 0,
            charCount: 0,
            loading: true,
          },
        ]);

        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = reader.result as string;
          try {
            const res = await fetch('/api/parse-file', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fileName: file.name,
                mimeType: file.type,
                base64,
              }),
            });

            const data = await res.json();
            if (!res.ok) {
              throw new Error(data.error || 'Gagal membaca dokumen.');
            }

            setDocuments((prev) =>
              prev.map((d) =>
                d.id === tempId
                  ? {
                      ...d,
                      text: data.text,
                      wordCount: data.wordCount,
                      charCount: data.charCount,
                      loading: false,
                    }
                  : d
              )
            );
          } catch (err: any) {
            setDocuments((prev) =>
              prev.map((d) =>
                d.id === tempId
                  ? {
                      ...d,
                      loading: false,
                      error: err.message || 'Gagal membaca file',
                    }
                  : d
              )
            );
          }
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const removeDocument = (id: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== id));
  };

  const handleSubmit = async () => {
    if (!promptText.trim() && images.length === 0 && documents.length === 0) return;

    if (documents.some((d) => d.loading)) {
      alert('Mohon tunggu sejenak, dokumen masih dibaca oleh sistem...');
      return;
    }

    const currentPromptText = promptText;
    const currentImages = [...images];
    const currentDocuments = [...documents];

    // Detect if user wants output as a file
    const detectedFileType = detectRequestedFileType(currentPromptText);
    setRequestedFileType(detectedFileType);
    if (detectedFileType) {
      // Pre-fill filename from first few words of prompt
      const words = currentPromptText.replace(/[^a-zA-Z0-9\s]/g, '').trim().split(/\s+/).slice(0, 5);
      setCustomFilename(words.join('_'));
    }

    setLoading(true);
    setAnswer(null);
    setUsedEngine(null);
    setLoadingStatus(
      currentDocuments.length > 0
        ? `Sedang memproses ${currentDocuments.length} dokumen tugas via ${engineChoice === '9router' ? '9Router Antigravity' : 'AI Dual-Engine'}...`
        : currentImages.length > 0 
          ? `Sedang membaca & menganalisis ${currentImages.length} gambar kuis via ${engineChoice === '9router' ? '9Router Antigravity' : 'AI Dual-Engine'}...` 
          : 'Sedang menyusun analisis tugas...'
    );

    // Set submitted prompt so it is displayed as the active question
    setSubmittedPrompt({
      text: currentPromptText,
      images: currentImages,
      documents: currentDocuments,
    });

    // Clear inputs immediately so user can paste the NEXT question right away!
    setPromptText('');
    setImages([]);
    setDocuments([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (docInputRef.current) docInputRef.current.value = '';

    try {
      const res = await fetch('/api/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt_text: currentPromptText,
          images: currentImages.map((img) => ({
            mimeType: img.mimeType,
            base64: img.base64,
          })),
          documents: currentDocuments.map((doc) => ({
            fileName: doc.fileName,
            text: doc.text,
            wordCount: doc.wordCount,
          })),
          type: activeTab,
          engine: engineChoice,
          model: selectedModel,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal memproses soal.');
      }

      setAnswer(data.answer);
      setUsedEngine(data.usedEngine || 'Antigravity AI');
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
      fetchHistory();

      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      // Restore inputs on error so user doesn't lose their data
      setPromptText(currentPromptText);
      setImages(currentImages);
      setDocuments(currentDocuments);
      alert(`Error: ${err.message || 'Gagal mendapatkan jawaban'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!answer) return;
    // Strip raw markdown symbols (# and **) for clean pasting into forums/Word
    const cleanAnswer = answer
      .replace(/^#{1,6}\s+/gm, '') // Remove ### heading
      .replace(/\*\*(.+?)\*\*/g, '$1') // Remove **bold**
      .replace(/\*(.+?)\*/g, '$1'); // Remove *italic*
    navigator.clipboard.writeText(cleanAnswer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleFileDownload = async () => {
    if (!answer || !requestedFileType) return;
    const fname = customFilename.trim() || 'Jawaban_Tugas';
    setFileDownloading(true);
    try {
      switch (requestedFileType) {
        case 'docx': await downloadAsWord(answer, fname); break;
        case 'xlsx': await downloadAsExcel(answer, fname); break;
        case 'pptx': await downloadAsPptx(answer, fname); break;
        case 'pdf':  await downloadAsPdf(answer, fname); break;
      }
    } catch (e: any) {
      alert(`Gagal membuat file: ${e.message}`);
    } finally {
      setFileDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col">
      {/* Top Navbar */}
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-[#0d1322]/90 backdrop-blur sticky top-0 z-30 px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base lg:text-lg font-bold tracking-tight text-white flex items-center gap-1.5 truncate">
                <span>Portal Tugas</span>
                <span className="text-[10px] sm:text-[11px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hidden sm:inline-flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> 9Router + Cloud
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 hidden md:block truncate">
                Auto-Solver Kuis Gambar & Diskusi Forum Kuliah (10 Akun Antigravity OAuth)
              </p>
            </div>
          </div>

          {/* Desktop / Tablet Selectors */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <select
              value={engineChoice}
              onChange={(e: any) => setEngineChoice(e.target.value)}
              className="text-xs bg-slate-900/90 border border-slate-700 text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer"
              title="Pilih Engine AI"
            >
              <option value="auto">⚡ Auto Engine</option>
              <option value="9router">🚀 9Router Lokal</option>
              <option value="gemini">☁️ Google Cloud Direct</option>
            </select>

            <select
              value={selectedModel}
              onChange={(e: any) => setSelectedModel(e.target.value)}
              className="text-xs max-w-[200px] lg:max-w-none bg-slate-900/90 border border-slate-700 text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer font-medium truncate"
              title="Pilih Model AI Tertinggi"
            >
              <option value="ag/gemini-3.8-flash-high">⚡ Gemini 3.8 Flash HIGH (Vision)</option>
              <option value="ag/claude-sonnet-4-6">👑 Claude Sonnet 4.6 (Esai & Diskusi)</option>
              <option value="ag/gemini-3.7-flash-high">🔥 Gemini 3.7 Flash HIGH</option>
              <option value="ag/claude-opus-4-6-thinking">🧠 Claude Opus 4.6 Thinking</option>
              <option value="ag/gemini-pro-agent">💎 Gemini Pro Agent (Vision)</option>
              <option value="ag/gemini-3.6-flash-high">🚀 Gemini 3.6 Flash HIGH</option>
              <option value="ag/gpt-oss-120b-medium">🤖 GPT-OSS 120B</option>
            </select>

            <button
              onClick={() => {
                setShowHistory(true);
                fetchHistory();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition text-slate-200 shrink-0"
            >
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>Riwayat ({history.length})</span>
            </button>
          </div>

          {/* Mobile Right: Riwayat Button */}
          <div className="flex sm:hidden items-center gap-1.5 shrink-0">
            <button
              onClick={() => {
                setShowHistory(true);
                fetchHistory();
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-200"
            >
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>Riwayat ({history.length})</span>
            </button>
          </div>
        </div>

        {/* Mobile Secondary Bar for Engine & Model */}
        <div className="sm:hidden grid grid-cols-2 gap-1.5 pt-2 mt-2 border-t border-slate-800/80">
          <select
            value={engineChoice}
            onChange={(e: any) => setEngineChoice(e.target.value)}
            className="text-[11px] bg-slate-900 border border-slate-700 text-slate-300 rounded-lg px-2 py-1.5 focus:outline-none"
          >
            <option value="auto">⚡ Auto Engine</option>
            <option value="9router">🚀 9Router Lokal</option>
            <option value="gemini">☁️ Cloud Direct</option>
          </select>

          <select
            value={selectedModel}
            onChange={(e: any) => setSelectedModel(e.target.value)}
            className="text-[11px] bg-slate-900 border border-slate-700 text-slate-300 rounded-lg px-2 py-1.5 focus:outline-none truncate font-medium"
          >
            <option value="ag/gemini-3.8-flash-high">⚡ Gemini 3.8 (Vision)</option>
            <option value="ag/claude-sonnet-4-6">👑 Claude 4.6 (Esai)</option>
            <option value="ag/gemini-3.7-flash-high">🔥 Gemini 3.7</option>
            <option value="ag/claude-opus-4-6-thinking">🧠 Claude Opus</option>
            <option value="ag/gemini-pro-agent">💎 Gemini Pro</option>
            <option value="ag/gemini-3.6-flash-high">🚀 Gemini 3.6</option>
          </select>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 flex flex-col gap-4 sm:gap-6">
        {/* Banner / Info Card */}
        <div className="bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-slate-900/40 border border-blue-900/30 rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 text-sm">
              💡
            </div>
            <div className="leading-snug">
              <span className="hidden sm:inline">
                <strong>Tips Cepat Laptop:</strong> Screenshot soal kuis (<kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200">Win+Shift+S</kbd>), lalu langsung tekan <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200">Ctrl + V</kbd> di halaman ini!
              </span>
              <span className="sm:hidden text-[11px]">
                <strong>Tips HP / Tablet:</strong> Ketuk kotak upload di bawah untuk mengambil foto langsung atau pilih screenshot soal dari galeri HP kamu!
              </span>
            </div>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 sm:flex sm:w-fit w-full gap-1.5 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('kuis')}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition text-center ${
              activeTab === 'kuis'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Camera className="w-4 h-4 shrink-0" />
            <span className="truncate">Kuis Gambar</span>
            <span className="hidden md:inline">(Screenshot)</span>
          </button>
          <button
            onClick={() => setActiveTab('diskusi')}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition text-center ${
              activeTab === 'diskusi'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span className="truncate">Tugas Esai</span>
            <span className="hidden md:inline">/ Diskusi</span>
          </button>
        </div>

        {/* Input Card */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col gap-4">
          {/* Tab 1: Kuis / Tugas Universal */}
          {activeTab === 'kuis' && (
            <div className="flex flex-col gap-3">
              {/* Dropzone — Desktop: full drag-drop area for ANY file format */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files) handleFileUpload(e.dataTransfer.files);
                }}
                className="hidden sm:flex border-2 border-dashed border-slate-700 hover:border-blue-500/60 bg-slate-900/50 hover:bg-slate-900/90 transition rounded-xl p-8 flex-col items-center justify-center gap-2.5 cursor-pointer text-center group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.txt,.csv,.md,image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) handleFileUpload(e.target.files);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                />
                <div className="w-12 h-12 rounded-full bg-blue-500/10 group-hover:bg-blue-500/20 text-blue-400 flex items-center justify-center transition">
                  <FolderUp className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">
                    Tarik & Lepas File Tugas ke Sini atau Klik untuk Memilih
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Mendukung SEMUA format: PDF, Word (.docx), Excel (.xlsx), Foto/Screenshot, Text, dll.
                  </p>
                </div>
              </div>

              {/* Mobile: Three touch buttons — Camera, Gallery, and File/Doc */}
              <div className="sm:hidden flex flex-col gap-3">
                {/* Hidden inputs for mobile */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) handleFileUpload(e.target.files);
                    if (cameraInputRef.current) cameraInputRef.current.value = '';
                  }}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) handleFileUpload(e.target.files);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                />
                <input
                  ref={docInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.txt,.csv,.md,*/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) handleFileUpload(e.target.files);
                    if (docInputRef.current) docInputRef.current.value = '';
                  }}
                />

                <div className="grid grid-cols-3 gap-2">
                  {/* Camera button */}
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-blue-700/60 bg-blue-950/30 active:bg-blue-900/50 transition rounded-xl py-4 px-1.5 cursor-pointer text-center"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-blue-300">📷 Kamera</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Foto soal</p>
                    </div>
                  </button>

                  {/* Gallery button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-slate-700 bg-slate-900/50 active:bg-slate-800/80 transition rounded-xl py-4 px-1.5 cursor-pointer text-center"
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-700/50 text-slate-300 flex items-center justify-center">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-200">🖼️ Galeri</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Screenshot</p>
                    </div>
                  </button>

                  {/* Document / File button */}
                  <button
                    type="button"
                    onClick={() => docInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-emerald-700/60 bg-emerald-950/30 active:bg-emerald-900/50 transition rounded-xl py-4 px-1.5 cursor-pointer text-center"
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <FolderUp className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-emerald-300">📁 File</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">PDF/Word</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Uploaded Images Thumbnails */}
              {images.length > 0 && (
                <div className="flex flex-wrap gap-3 pt-2">
                  {images.map((img, idx) => (
                    <div
                      key={img.id}
                      className="relative group w-28 h-28 rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-md"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.previewUrl}
                        alt={`Soal ${idx + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(img.id)}
                        className="absolute top-1 right-1 p-1 rounded-full bg-red-600/80 hover:bg-red-600 text-white shadow transition"
                        title="Hapus gambar"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <span className="absolute bottom-1 left-1 text-[10px] font-semibold bg-black/60 px-1.5 py-0.5 rounded text-white backdrop-blur">
                        Gambar #{idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Uploaded Documents List */}
              {documents.length > 0 && (
                <div className="flex flex-col gap-2 pt-1">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <FolderUp className="w-3.5 h-3.5 text-blue-400" />
                    <span>Dokumen Tugas Terlampir ({documents.length}):</span>
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-900/90 border border-slate-700/80 gap-3 shadow-sm"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 text-base">
                            {doc.fileType === 'pdf' ? '📕' : doc.fileType.includes('xls') ? '📊' : doc.fileType.includes('doc') ? '📄' : '📝'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-200 truncate" title={doc.fileName}>
                              {doc.fileName}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {doc.loading ? (
                                <span className="text-blue-400 flex items-center gap-1">
                                  <Loader2 className="w-3 h-3 animate-spin" /> Membaca isi file...
                                </span>
                              ) : doc.error ? (
                                <span className="text-red-400 truncate">{doc.error}</span>
                              ) : (
                                <span className="text-emerald-400 font-medium">✓ {doc.wordCount.toLocaleString()} kata terbaca</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeDocument(doc.id)}
                          className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition shrink-0"
                          title="Hapus dokumen"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Textarea for Kuis tab — allows multiline with Enter! */}
              <div className="mt-1">
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Ketik / Tempel Soal, Catatan Modul, atau Instruksi Pengerjaan:
                </label>
                <textarea
                  rows={3}
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  placeholder="Ketik soal di sini (tekan Enter untuk baris baru), sebutkan modul (misal: EKMA4216), atau instruksi tugas..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition resize-y font-sans leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* Tab 2: Tugas Diskusi / Esai */}
          {activeTab === 'diskusi' && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-300">
                Tempelkan Soal Diskusi atau Kasus Kuliah di sini:
              </label>
              <textarea
                rows={7}
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="Contoh: Jelaskan pendapat Saudara mengenai lima bidang utama pengambilan keputusan dalam rantai pasokan menurut modul SCM... (Tekan Enter untuk baris baru)"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition resize-y font-sans leading-relaxed"
              />
            </div>
          )}

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-800">
            <span className="text-[11px] text-slate-400 hidden sm:inline-block">
              Tekan <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-200">Ctrl + Enter</kbd> untuk langsung jawab
            </span>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {(images.length > 0 || documents.length > 0 || promptText.trim().length > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    setImages([]);
                    setDocuments([]);
                    setPromptText('');
                  }}
                  className="px-3.5 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-medium text-slate-400 hover:text-slate-200 transition shrink-0"
                >
                  Reset
                </button>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || (images.length === 0 && documents.length === 0 && !promptText.trim())}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-bold px-6 py-3 sm:py-2.5 rounded-xl shadow-lg shadow-blue-600/25 transition duration-200"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menganalisis...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Dapatkan Jawaban</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Loading Indicator */}
        {loading && (
          <div className="p-6 sm:p-8 rounded-2xl border border-blue-500/20 bg-blue-950/20 flex flex-col items-center justify-center gap-4 text-center animate-pulse">
            <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
            <div>
              <p className="text-sm font-semibold text-blue-300">{loadingStatus}</p>
              <p className="text-xs text-slate-400 mt-1">Memeriksa literatur modul & menyusun format mahasiswa UT...</p>
            </div>

            {submittedPrompt && (submittedPrompt.images.length > 0 || submittedPrompt.text) && (
              <div className="max-w-md w-full bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex flex-col items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-slate-400">Soal yang Sedang Dianalisis:</span>
                {submittedPrompt.images.length > 0 && (
                  <div className="flex gap-2 justify-center flex-wrap">
                    {submittedPrompt.images.map((img, i) => (
                      <img
                        key={img.id || i}
                        src={img.previewUrl}
                        alt={`Soal ${i + 1}`}
                        className="max-h-24 object-contain rounded-lg border border-blue-500/40"
                      />
                    ))}
                  </div>
                )}
                {submittedPrompt.text && (
                  <p className="text-xs text-slate-300 line-clamp-2 italic text-left w-full">
                    &quot;{submittedPrompt.text}&quot;
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Result Area */}
        {answer && !loading && (
          <div
            ref={resultRef}
            className="bg-[#0f172a] border border-blue-500/30 rounded-2xl p-5 sm:p-7 shadow-2xl flex flex-col gap-5 animate-fadeIn"
          >
            {/* Header of Answer Card */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Hasil Jawaban Tugas
                </h2>
                {usedEngine && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 flex items-center gap-1">
                    <Cpu className="w-3 h-3" /> {usedEngine}
                  </span>
                )}
              </div>

              {/* Copy Button */}
              <button
                type="button"
                onClick={handleCopy}
                className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 rounded-xl text-xs sm:text-sm font-bold shadow-lg transition duration-200 ${
                  copied
                    ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20 hover:scale-[1.02]'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 shrink-0" />
                    <span className="sm:hidden">Tersalin! Siap Tempel</span>
                    <span className="hidden sm:inline">Tersalin! Tinggal Ctrl+V di WordPad</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 shrink-0" />
                    <span className="sm:hidden">Salin Jawaban</span>
                    <span className="hidden sm:inline">Salin Jawaban (Siap Tempel WordPad)</span>
                  </>
                )}
              </button>
            </div>

            {/* Display Submitted Question/Image/Document as Prompt Card */}
            {submittedPrompt && (submittedPrompt.text || submittedPrompt.images.length > 0 || (submittedPrompt.documents && submittedPrompt.documents.length > 0)) && (
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-400" />
                    Soal / File yang Diajukan:
                  </span>
                </div>

                {/* Submitted Documents Badges */}
                {submittedPrompt.documents && submittedPrompt.documents.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {submittedPrompt.documents.map((doc, i) => (
                      <span
                        key={doc.id || i}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200 font-medium"
                      >
                        <span>{doc.fileType === 'pdf' ? '📕' : doc.fileType.includes('xls') ? '📊' : doc.fileType.includes('doc') ? '📄' : '📝'}</span>
                        <span className="truncate max-w-[200px]">{doc.fileName}</span>
                        <span className="text-[10px] text-emerald-400">({doc.wordCount.toLocaleString()} kata)</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Submitted Images */}
                {submittedPrompt.images.length > 0 && (
                  <div className="flex gap-3 flex-wrap pt-1">
                    {submittedPrompt.images.map((img, i) => (
                      <a
                        key={img.id || i}
                        href={img.previewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="group relative block rounded-xl overflow-hidden border border-slate-700 hover:border-blue-500 transition shadow-md bg-black/40"
                        title="Klik untuk melihat ukuran penuh"
                      >
                        <img
                          src={img.previewUrl}
                          alt={`Soal #${i + 1}`}
                          className="max-h-36 object-contain rounded p-1"
                        />
                        <span className="absolute bottom-1 right-1 bg-black/80 text-[10px] text-white px-2 py-0.5 rounded backdrop-blur opacity-0 group-hover:opacity-100 transition">
                          🔍 Lihat Asli
                        </span>
                      </a>
                    ))}
                  </div>
                )}

                {submittedPrompt.text && (
                  <p className="text-xs sm:text-sm font-medium text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {submittedPrompt.text}
                  </p>
                )}
              </div>
            )}

            {/* Answer Content — Rendered cleanly via ReactMarkdown without raw # and * symbols */}
            <div className="text-slate-200 text-sm sm:text-base leading-relaxed font-sans selection:bg-blue-600 selection:text-white space-y-3">
              <ReactMarkdown
                components={{
                  h1: ({ ...props }) => (
                    <h1 className="text-lg sm:text-xl font-bold text-white mt-4 mb-2 border-b border-slate-700/60 pb-1.5 flex items-center gap-2" {...props} />
                  ),
                  h2: ({ ...props }) => (
                    <h2 className="text-base sm:text-lg font-bold text-blue-300 mt-3 mb-1.5 flex items-center gap-2" {...props} />
                  ),
                  h3: ({ ...props }) => (
                    <h3 className="text-sm sm:text-base font-bold text-indigo-300 mt-2.5 mb-1" {...props} />
                  ),
                  p: ({ ...props }) => (
                    <p className="mb-2.5 text-slate-200 leading-relaxed" {...props} />
                  ),
                  ul: ({ ...props }) => (
                    <ul className="list-disc list-inside mb-3 space-y-1 text-slate-200 pl-1" {...props} />
                  ),
                  ol: ({ ...props }) => (
                    <ol className="list-decimal list-inside mb-3 space-y-1 text-slate-200 pl-1" {...props} />
                  ),
                  li: ({ ...props }) => (
                    <li className="text-slate-200 leading-relaxed" {...props} />
                  ),
                  strong: ({ ...props }) => (
                    <strong className="font-bold text-white" {...props} />
                  ),
                  em: ({ ...props }) => (
                    <em className="italic text-slate-300" {...props} />
                  ),
                  blockquote: ({ ...props }) => (
                    <blockquote className="border-l-4 border-blue-500 pl-3 py-1.5 my-2.5 bg-blue-950/20 rounded-r text-slate-300 italic" {...props} />
                  ),
                  table: ({ ...props }) => (
                    <div className="overflow-x-auto my-3">
                      <table className="w-full text-left border-collapse border border-slate-700 rounded-lg text-xs sm:text-sm" {...props} />
                    </div>
                  ),
                  th: ({ ...props }) => (
                    <th className="border border-slate-700 bg-slate-800 px-3 py-2 font-semibold text-slate-200" {...props} />
                  ),
                  td: ({ ...props }) => (
                    <td className="border border-slate-700 px-3 py-2 text-slate-300" {...props} />
                  ),
                }}
              >
                {answer}
              </ReactMarkdown>
            </div>

            {/* Footer Reminder */}
            <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Status: Tersimpan otomatis ke Supabase</span>
              <button
                onClick={handleCopy}
                className="text-blue-400 hover:text-blue-300 font-medium"
              >
                Salin lagi
              </button>
            </div>
          </div>
        )}

        {/* ── File Download Section ── Only shown when user requested a file */}
        {answer && !loading && requestedFileType && (
          <div className="bg-gradient-to-r from-emerald-950/40 to-teal-950/30 border border-emerald-700/40 rounded-2xl p-4 sm:p-5 flex flex-col gap-3 animate-fadeIn">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <FileDown className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-300">
                  {fileTypeEmoji(requestedFileType)} Unduh sebagai {fileTypeLabel(requestedFileType)}
                </p>
                <p className="text-[11px] text-slate-400">Masukkan nama file, lalu klik tombol unduh</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={customFilename}
                onChange={(e) => setCustomFilename(e.target.value)}
                placeholder="Nama file (contoh: Makalah_Globalisasi)"
                className="flex-1 bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition"
              />
              <button
                type="button"
                onClick={handleFileDownload}
                disabled={fileDownloading}
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-600/20 transition duration-200 shrink-0"
              >
                {fileDownloading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Membuat file...</span>
                  </>
                ) : (
                  <>
                    <FileDown className="w-4 h-4" />
                    <span className="sm:hidden">Unduh</span>
                    <span className="hidden sm:inline">Unduh {fileTypeLabel(requestedFileType)}</span>
                  </>
                )}
              </button>
            </div>

            {/* Allow changing file type */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-slate-500">Format lain:</span>
              {(['docx', 'xlsx', 'pptx', 'pdf'] as FileType[]).filter(t => t !== requestedFileType).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setRequestedFileType(t)}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                >
                  {fileTypeEmoji(t)} {fileTypeLabel(t)}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* History Drawer */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-[#0d1322] h-full border-l border-slate-800 shadow-2xl flex flex-col p-4 sm:p-6 overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-base text-white">Riwayat Tugas</h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                  {history.length}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {history.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllHistory}
                    title="Hapus semua riwayat"
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 text-xs flex items-center gap-1 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline text-[11px] font-medium">Hapus Semua</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={fetchHistory}
                  disabled={historyLoading}
                  title="Segarkan riwayat"
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-blue-400 transition"
                >
                  <RefreshCw className={`w-4 h-4 ${historyLoading ? 'animate-spin text-blue-400' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowHistory(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {history.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500 text-xs">
                <Clock className="w-8 h-8 mb-2 opacity-50" />
                <p>Belum ada riwayat tugas tersimpan.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {history.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setAnswer(item.answer_text);
                      setUsedEngine(item.course_category || 'Tersimpan');
                      setSubmittedPrompt({
                        text: item.prompt_text,
                        images: (item.image_urls || []).map((url, i) => ({
                          id: `hist_${i}`,
                          name: `Gambar #${i + 1}`,
                          mimeType: 'image/png',
                          base64: '',
                          previewUrl: url,
                        })),
                        documents: [],
                      });
                      setShowHistory(false);
                      setTimeout(() => {
                        resultRef.current?.scrollIntoView({ behavior: 'smooth' });
                      }, 100);
                    }}
                    className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800/80 hover:border-slate-700 transition cursor-pointer flex flex-col gap-1.5 group relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {item.type || 'Tugas'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-400">
                          {new Date(item.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteHistory(item.id);
                          }}
                          title="Hapus riwayat ini"
                          className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs font-semibold text-slate-200 line-clamp-2 group-hover:text-blue-300 transition">
                      {item.title || item.prompt_text || 'Tugas Kuliah'}
                    </p>
                    <p className="text-[11px] text-slate-400 line-clamp-2">
                      {item.answer_text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 px-6 text-center text-xs text-slate-400">
        Portal Tugas Antigravity &bull; Siap Digunakan Lintas Perangkat Tanpa Login
      </footer>
    </div>
  );
}
