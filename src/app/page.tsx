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
  BookOpen,
  Image as ImageIcon,
  ChevronRight,
  ExternalLink,
  Loader2,
  X,
  Cpu,
  RefreshCw,
  FileDown,
  FolderUp,
  FileSpreadsheet,
  File as FileIcon,
  Sun,
  Moon,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
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
  const [selectedModel, setSelectedModel] = useState('ag/gemini-3.8-flash-medium');
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
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('portal_theme') as 'dark' | 'light' | null;
      if (saved === 'light' || saved === 'dark') {
        setTheme(saved);
        document.documentElement.classList.toggle('dark', saved === 'dark');
      } else {
        setTheme('dark');
        document.documentElement.classList.add('dark');
      }
    } catch {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      localStorage.setItem('portal_theme', next);
    } catch {}
    document.documentElement.classList.toggle('dark', next === 'dark');
  };
  
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
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

            const responseText = await res.text();
            let data: any;
            try {
              data = JSON.parse(responseText);
            } catch {
              throw new Error(`Gagal membaca berkas (HTTP ${res.status}). Format berkas mungkin tidak sesuai.`);
            }

            if (!res.ok) {
              throw new Error(data?.error || 'Gagal membaca dokumen.');
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

            // Tambahkan gambar yang diekstrak dari dokumen (diagram, tabel, dll.) ke antrian gambar AI
            if (data.images && data.images.length > 0) {
              const docImages = data.images.map((img: { fileName: string; mimeType: string; base64: string }) => ({
                id: Math.random().toString(36).substring(2, 9),
                name: img.fileName,
                mimeType: img.mimeType,
                base64: img.base64,
                previewUrl: img.base64,
              }));
              setImages((prev) => [...prev, ...docImages]);
            }
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
    if (desktopInputRef.current) desktopInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
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

      const responseText = await res.text();
      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch {
        if (res.status === 504 || responseText.includes('FUNCTION_INVOCATION_TIMEOUT') || responseText.includes('An error occurred')) {
          throw new Error('Batas waktu pengerjaan terlampaui karena berkas memuat banyak soal analitis. Sistem telah dioptimalkan, silakan klik "Kerjakan Tugas" sekali lagi.');
        }
        throw new Error(`Server error (${res.status}): Terjadi kendala saat memproses jawaban.`);
      }

      if (!res.ok) {
        throw new Error(data?.error || 'Gagal memproses soal.');
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
    // Strip raw markdown symbols and dollar signs for clean pasting into forums/Word
    const cleanAnswer = answer
      .replace(/^#{1,6}\s+/gm, '') // Remove ### heading
      .replace(/\*\*(.+?)\*\*/g, '$1') // Remove **bold**
      .replace(/\*(.+?)\*/g, '$1') // Remove *italic*
      .replace(/_{1,2}(.+?)_{1,2}/g, '$1') // Remove _italic_
      .replace(/[\*#]/g, '') // Remove any stray asterisks or hashes
      .replace(/\$\$([^$]+)\$\$/g, '$1')
      .replace(/\$([^$\n]+)\$/g, '$1')
      .replace(/\$/g, '');
    navigator.clipboard.writeText(cleanAnswer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleFileDownload = async (typeToDownload?: FileType) => {
    const targetType = typeToDownload || requestedFileType || 'docx';
    if (!answer) return;
    const fname = customFilename.trim() || 'Naskah_Tugas_Akademik';
    setFileDownloading(true);
    try {
      switch (targetType) {
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
    <div className="min-h-screen bg-slate-50 dark:bg-[#080b11] text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white dark:selection:bg-slate-700 dark:selection:text-white transition-colors duration-150">
      {/* Top Navbar — Restrained, dignified, craftsmanship */}
      <header className="border-b border-slate-200 dark:border-white/[0.08] bg-white/95 dark:bg-[#0c1017]/90 backdrop-blur-md sticky top-0 z-30 px-3 sm:px-6 py-2.5 sm:py-3 transition-colors">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          {/* Brand Mark & Title */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700/80 flex items-center justify-center text-slate-700 dark:text-slate-200 shadow-sm shrink-0">
              <BookOpen className="w-4 h-4 text-slate-700 dark:text-slate-200" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-white truncate">
                  Portal Tugas
                </h1>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 hidden sm:inline-flex items-center">
                  Academic Studio
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 hidden md:block truncate">
                Workbench pengerjaan soal, analisis esai, dan tugas mandiri bebas AI-slop
              </p>
            </div>
          </div>

          {/* Desktop Selectors & Actions */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            {/* Theme Toggle Button Desktop */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-300 dark:border-slate-700 rounded-lg transition text-slate-700 dark:text-slate-200 shrink-0 cursor-pointer shadow-sm"
              title={theme === 'dark' ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-slate-200">Terang</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-slate-800">Gelap</span>
                </>
              )}
            </button>

            <select
              value={engineChoice}
              onChange={(e: any) => setEngineChoice(e.target.value)}
              className="text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 dark:focus:border-slate-500 cursor-pointer font-medium"
              title="Pilih Engine Eksekusi"
            >
              <option value="auto">Auto Router</option>
              <option value="9router">9Router Daemon</option>
              <option value="gemini">Cloud Direct</option>
            </select>

            <select
              value={selectedModel}
              onChange={(e: any) => setSelectedModel(e.target.value)}
              className="text-xs max-w-[210px] lg:max-w-none bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 dark:focus:border-slate-500 cursor-pointer font-medium truncate"
              title="Model Penalaran"
            >
              <option value="ag/gemini-3.8-flash-medium">Gemini 3.8 Flash (Cepat & Pintar - Rekomendasi)</option>
              <option value="ag/gemini-3.8-flash-high">Gemini 3.8 Flash HIGH (Deep Thinking)</option>
              <option value="ag/claude-sonnet-4-6">Claude Sonnet 4.6 (Esai & Skripsi)</option>
              <option value="ag/gemini-3.7-flash-high">Gemini 3.7 Flash HIGH</option>
              <option value="ag/claude-opus-4-6-thinking">Claude Opus 4.6 Thinking</option>
              <option value="ag/gemini-pro-agent">Gemini Pro Agent (Vision)</option>
            </select>

            <button
              onClick={() => {
                setShowHistory(true);
                fetchHistory();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-300 dark:border-slate-700 rounded-lg transition text-slate-700 dark:text-slate-200 shrink-0"
            >
              <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Arsip ({history.length})</span>
            </button>
          </div>

          {/* Mobile Right */}
          <div className="flex sm:hidden items-center gap-1.5 shrink-0">
            {/* Theme Toggle Button Mobile */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200"
              title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-blue-600" />
              )}
            </button>

            <button
              onClick={() => {
                setShowHistory(true);
                fetchHistory();
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200"
            >
              <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Arsip ({history.length})</span>
            </button>
          </div>
        </div>

        {/* Mobile Secondary Bar */}
        <div className="sm:hidden grid grid-cols-2 gap-1.5 pt-2 mt-2 border-t border-slate-200 dark:border-slate-800/80">
          <select
            value={engineChoice}
            onChange={(e: any) => setEngineChoice(e.target.value)}
            className="text-[11px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-300 rounded-lg px-2 py-1.5 focus:outline-none"
          >
            <option value="auto">Auto Router</option>
            <option value="9router">9Router Daemon</option>
            <option value="gemini">Cloud Direct</option>
          </select>

          <select
            value={selectedModel}
            onChange={(e: any) => setSelectedModel(e.target.value)}
            className="text-[11px] bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-300 rounded-lg px-2 py-1.5 focus:outline-none truncate font-medium"
          >
            <option value="ag/gemini-3.8-flash-medium">Gemini 3.8 (Cepat & Pintar)</option>
            <option value="ag/gemini-3.8-flash-high">Gemini 3.8 (Deep Thinking)</option>
            <option value="ag/claude-sonnet-4-6">Claude 4.6 (Esai)</option>
            <option value="ag/gemini-3.7-flash-high">Gemini 3.7</option>
            <option value="ag/claude-opus-4-6-thinking">Claude Opus</option>
          </select>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-3 sm:px-6 py-5 sm:py-7 flex flex-col gap-4 sm:gap-6">
        {/* Subtle Ambient Utility Bar */}
        <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 px-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span className="font-semibold text-slate-800 dark:text-slate-300">Siap Menganalisis</span>
            <span className="text-slate-400 dark:text-slate-500 hidden sm:inline">•</span>
            <span className="text-slate-600 dark:text-slate-400 hidden sm:inline">Bebas AI-Slop & Didasarkan Referensi Valid</span>
          </div>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Tempel gambar via <kbd className="px-1 py-0.5 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300 font-mono text-[10px]">Ctrl+V</kbd>
          </span>
        </div>

        {/* Studio Segmented Control */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-200/80 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-800 w-full sm:w-fit">
          <button
            onClick={() => setActiveTab('kuis')}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === 'kuis'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-300 dark:border-slate-700/80'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Kuis & Pilihan Ganda</span>
          </button>
          <button
            onClick={() => setActiveTab('diskusi')}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
              activeTab === 'diskusi'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-300 dark:border-slate-700/80'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Esai, Diskusi & Skripsi</span>
          </button>
        </div>

        {/* Universal Input Card */}
        <div className="bg-white dark:bg-[#0e131e] border border-slate-200 dark:border-white/[0.07] rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col gap-4">
          {/* Tab 1: Kuis / Tugas Universal */}
          {activeTab === 'kuis' && (
            <div className="flex flex-col gap-3">
              {/* Dropzone — Desktop: full drag-drop area for ANY file format */}
              <div
                onClick={() => desktopInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files) handleFileUpload(e.dataTransfer.files);
                }}
                className="hidden sm:flex border border-dashed border-slate-300 hover:border-blue-500 dark:border-slate-700/80 dark:hover:border-slate-500 bg-slate-50 hover:bg-slate-100/80 dark:bg-slate-950/40 dark:hover:bg-slate-950/70 transition-all duration-200 rounded-xl p-7 flex-col items-center justify-center gap-2 cursor-pointer text-center group"
              >
                <input
                  ref={desktopInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.txt,.csv,.md,image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) handleFileUpload(e.target.files);
                    if (desktopInputRef.current) desktopInputRef.current.value = '';
                  }}
                />
                <div className="w-10 h-10 rounded-xl bg-slate-200/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center justify-center group-hover:scale-105 transition">
                  <FolderUp className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Seret berkas tugas atau <span className="text-blue-600 dark:text-blue-400 hover:underline">pilih dari komputer</span>
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Mendukung PDF, Word (.docx), Excel (.xlsx), Foto/Screenshot, dan Teks
                  </p>
                </div>
              </div>

              {/* Mobile: Three touch buttons — Camera, Gallery, and File/Doc */}
              <div className="sm:hidden flex flex-col gap-2.5">
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
                  ref={galleryInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) handleFileUpload(e.target.files);
                    if (galleryInputRef.current) galleryInputRef.current.value = '';
                  }}
                />
                <input
                  ref={docInputRef}
                  type="file"
                  multiple
                  accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-powerpoint,text/plain,text/csv,application/*,text/*,.pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.txt,.csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) handleFileUpload(e.target.files);
                    if (docInputRef.current) docInputRef.current.value = '';
                  }}
                />

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-1.5 border border-slate-300 dark:border-slate-800 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/90 active:bg-slate-200 dark:active:bg-slate-800 transition rounded-xl py-3.5 px-1 cursor-pointer text-center"
                  >
                    <Camera className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                    <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-300">Foto Soal</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-1.5 border border-slate-300 dark:border-slate-800 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/90 active:bg-slate-200 dark:active:bg-slate-800 transition rounded-xl py-3.5 px-1 cursor-pointer text-center"
                  >
                    <ImageIcon className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                    <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-300">Galeri Foto</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => docInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-1.5 border border-slate-300 dark:border-slate-800 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/90 active:bg-slate-200 dark:active:bg-slate-800 transition rounded-xl py-3.5 px-1 cursor-pointer text-center"
                  >
                    <FolderUp className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                    <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-300">File Dokumen</span>
                  </button>
                </div>
              </div>

              {/* Uploaded Images Thumbnails */}
              {images.length > 0 && (
                <div className="flex flex-wrap gap-2.5 pt-1">
                  {images.map((img, idx) => (
                    <div
                      key={img.id}
                      className="relative group w-24 h-24 rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700/80 bg-slate-100 dark:bg-slate-950 shadow-sm"
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
                        className="absolute top-1 right-1 p-1 rounded-full bg-slate-950/80 hover:bg-red-600 text-white shadow transition"
                        title="Hapus gambar"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <span className="absolute bottom-1 left-1 text-[9px] font-medium bg-black/70 px-1.5 py-0.5 rounded text-slate-200 backdrop-blur">
                        #{idx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Uploaded Documents List */}
              {documents.length > 0 && (
                <div className="flex flex-col gap-1.5 pt-1">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-300 flex items-center gap-1.5">
                    <FolderUp className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                    <span>Berkas Dilampirkan ({documents.length}):</span>
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 gap-2.5 shadow-sm"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0 text-sm">
                            {doc.fileType === 'pdf' ? '📕' : doc.fileType.includes('xls') ? '📊' : doc.fileType.includes('doc') ? '📄' : '📝'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate" title={doc.fileName}>
                              {doc.fileName}
                            </p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {doc.loading ? (
                                <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                  <Loader2 className="w-3 h-3 animate-spin" /> Membaca isi berkas...
                                </span>
                              ) : doc.error ? (
                                <span className="text-red-500 dark:text-red-400 truncate">{doc.error}</span>
                              ) : (
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓ {doc.wordCount.toLocaleString()} kata terbaca</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeDocument(doc.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 transition shrink-0"
                          title="Hapus berkas"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Textarea for Kuis tab */}
              <div className="mt-1">
                <label className="text-xs font-semibold text-slate-800 dark:text-slate-300 block mb-1.5">
                  Ketik / Tempel Soal, Catatan Modul, atau Instruksi Pengerjaan:
                </label>
                <textarea
                  rows={3}
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  placeholder="Ketik soal di sini (tekan Enter untuk baris baru), instruksi dosen, atau catatan modul..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-3.5 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 dark:focus:border-slate-600 transition resize-y font-sans leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* Tab 2: Tugas Diskusi / Esai */}
          {activeTab === 'diskusi' && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-800 dark:text-slate-300">
                Tempelkan Soal Diskusi, Studi Kasus, atau Pertanyaan Akademik:
              </label>
              <textarea
                rows={7}
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                placeholder="Tempel soal diskusi atau kasus kuliah di sini... Tekan Enter bebas untuk baris baru."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl p-4 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 dark:focus:border-slate-600 transition resize-y font-sans leading-relaxed"
              />
            </div>
          )}

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800/80">
            <span className="text-[11px] text-slate-500 hidden sm:inline-block">
              Pintasan keyboard: <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700/80 rounded text-slate-700 dark:text-slate-300 text-[10px]">Ctrl + Enter</kbd>
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
                  className="px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition shrink-0"
                >
                  Reset
                </button>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || (images.length === 0 && documents.length === 0 && !promptText.trim())}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-semibold px-6 py-2.5 rounded-xl shadow transition duration-150 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menganalisis...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Kerjakan Tugas</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Loading Indicator */}
        {loading && (
          <div className="p-7 sm:p-9 rounded-2xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0e131e] flex flex-col items-center justify-center gap-3 text-center shadow-lg">
            <Loader2 className="w-7 h-7 text-blue-600 dark:text-slate-300 animate-spin" />
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{loadingStatus}</p>
              <p className="text-xs text-slate-500 mt-1">Mengkaji literatur rujukan & menyusun narasi akademik bebas AI-slop...</p>
            </div>
          </div>
        )}

        {/* Result Area — Academic Manuscript Dossier */}
        {answer && !loading && (
          <div
            ref={resultRef}
            className="bg-white dark:bg-[#0e131e] border border-slate-200 dark:border-white/[0.08] rounded-2xl p-5 sm:p-8 shadow-2xl flex flex-col gap-5 animate-fadeIn"
          >
            {/* Header of Answer Card */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800/80">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-400/20" />
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  Naskah Hasil Analisis
                </h2>
                {usedEngine && (
                  <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 px-2 py-0.5 rounded font-medium">
                    {usedEngine}
                  </span>
                )}
              </div>

              {/* Copy & Quick Actions */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                    copied
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-600/50 text-emerald-700 dark:text-emerald-300'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/90 dark:hover:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />}
                  <span>{copied ? 'Tersalin' : 'Salin Teks Bersih'}</span>
                </button>
              </div>
            </div>

            {/* Integrated Export Toolbar */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={customFilename}
                  onChange={(e) => setCustomFilename(e.target.value)}
                  placeholder="Nama berkas unduhan (contoh: Tugas_Manajemen_Sesi4)"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 dark:focus:border-slate-600"
                />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                <button
                  type="button"
                  onClick={() => handleFileDownload('docx')}
                  disabled={fileDownloading}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 dark:border-blue-700/40 dark:text-blue-200 text-xs font-semibold transition cursor-pointer"
                  title="Unduh format Microsoft Word"
                >
                  <FileDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Word (.docx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleFileDownload('pdf')}
                  disabled={fileDownloading}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:border-red-700/40 dark:text-red-200 text-xs font-semibold transition cursor-pointer"
                  title="Unduh format PDF Cetak"
                >
                  <FileDown className="w-3.5 h-3.5 text-rose-600 dark:text-red-400" />
                  <span>PDF (.pdf)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleFileDownload('xlsx')}
                  disabled={fileDownloading}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 dark:border-emerald-700/40 dark:text-emerald-200 text-xs font-semibold transition cursor-pointer"
                  title="Unduh format Excel Spreadsheet"
                >
                  <FileDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleFileDownload('pptx')}
                  disabled={fileDownloading}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 dark:border-amber-700/40 dark:text-amber-200 text-xs font-semibold transition cursor-pointer"
                  title="Unduh format Slide PowerPoint"
                >
                  <FileDown className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Slide (.pptx)</span>
                </button>
              </div>
            </div>

            {/* Display Submitted Question/Image/Document as Prompt Card */}
            {submittedPrompt && (submittedPrompt.text || submittedPrompt.images.length > 0 || (submittedPrompt.documents && submittedPrompt.documents.length > 0)) && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 flex flex-col gap-2">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Berkas & Pertanyaan Rujukan:
                </span>

                {/* Submitted Documents Badges */}
                {submittedPrompt.documents && submittedPrompt.documents.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {submittedPrompt.documents.map((doc, i) => (
                      <span
                        key={doc.id || i}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-300 font-medium"
                      >
                        <span>{doc.fileType === 'pdf' ? '📕' : doc.fileType.includes('xls') ? '📊' : doc.fileType.includes('doc') ? '📄' : '📝'}</span>
                        <span className="truncate max-w-[200px]">{doc.fileName}</span>
                        <span className="text-[10px] text-slate-500">({doc.wordCount.toLocaleString()} kata)</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Submitted Images */}
                {submittedPrompt.images.length > 0 && (
                  <div className="flex gap-2.5 flex-wrap pt-0.5">
                    {submittedPrompt.images.map((img, i) => (
                      <a
                        key={img.id || i}
                        href={img.previewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="group relative block rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 transition shadow bg-slate-100 dark:bg-black/40"
                        title="Lihat ukuran asli"
                      >
                        <img
                          src={img.previewUrl}
                          alt={`Soal #${i + 1}`}
                          className="max-h-28 object-contain rounded p-1"
                        />
                      </a>
                    ))}
                  </div>
                )}

                {submittedPrompt.text && (
                  <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed pt-1">
                    {submittedPrompt.text}
                  </p>
                )}
              </div>
            )}

            {/* Answer Content — Clean Academic Typography */}
            <div className="text-slate-900 dark:text-slate-200 text-sm sm:text-base leading-relaxed font-sans selection:bg-blue-600 selection:text-white dark:selection:bg-slate-700 dark:selection:text-white space-y-3 pt-2">
              <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  h1: ({ ...props }) => (
                    <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mt-5 mb-2.5 border-b border-slate-200 dark:border-slate-800 pb-2" {...props} />
                  ),
                  h2: ({ ...props }) => (
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 mt-4 mb-2" {...props} />
                  ),
                  h3: ({ ...props }) => (
                    <h3 className="text-sm sm:text-base font-semibold text-blue-700 dark:text-blue-300 mt-4 mb-2 tracking-wide" {...props} />
                  ),
                  p: ({ ...props }) => (
                    <p className="mb-3 text-slate-800 dark:text-slate-200 leading-relaxed font-normal" {...props} />
                  ),
                  ul: ({ ...props }) => (
                    <ul className="list-disc list-outside pl-5 mb-3.5 space-y-2 text-slate-800 dark:text-slate-200" {...props} />
                  ),
                  ol: ({ ...props }) => (
                    <ol className="list-decimal list-outside pl-5 mb-3.5 space-y-2 text-slate-800 dark:text-slate-200" {...props} />
                  ),
                  li: ({ ...props }) => (
                    <li className="text-slate-800 dark:text-slate-200 leading-relaxed pl-1" {...props} />
                  ),
                  hr: ({ ...props }) => (
                    <hr className="my-5 border-slate-200 dark:border-slate-800/80" {...props} />
                  ),
                  strong: ({ ...props }) => (
                    <strong className="font-bold text-slate-900 dark:text-white" {...props} />
                  ),
                  em: ({ ...props }) => (
                    <em className="italic text-slate-700 dark:text-slate-300" {...props} />
                  ),
                  blockquote: ({ ...props }) => (
                    <blockquote className="border-l-4 border-blue-600 dark:border-slate-600 pl-3.5 py-1.5 my-3 bg-blue-50/60 dark:bg-slate-900/40 text-slate-800 dark:text-slate-300 italic rounded-r" {...props} />
                  ),
                  table: ({ ...props }) => (
                    <div className="overflow-x-auto my-3">
                      <table className="w-full text-left border-collapse border border-slate-200 dark:border-slate-800 rounded-lg text-xs sm:text-sm" {...props} />
                    </div>
                  ),
                  th: ({ ...props }) => (
                    <th className="border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 px-3 py-2 font-bold text-slate-900 dark:text-slate-200" {...props} />
                  ),
                  td: ({ ...props }) => (
                    <td className="border border-slate-200 dark:border-slate-800 px-3 py-2 text-slate-800 dark:text-slate-300" {...props} />
                  ),
                }}
              >
                {answer}
              </ReactMarkdown>
            </div>

            {/* Footer Status */}
            <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
              <span>Arsip: Tersimpan di database lokal</span>
              <button
                onClick={handleCopy}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 font-medium transition cursor-pointer"
              >
                Salin lagi
              </button>
            </div>
          </div>
        )}
      </main>

      {/* History Drawer */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 dark:bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-[#0d1322] h-full border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col p-4 sm:p-6 overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">Riwayat Tugas</h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {history.length}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {history.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllHistory}
                    title="Hapus semua riwayat"
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 text-xs flex items-center gap-1 transition cursor-pointer"
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
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${historyLoading ? 'animate-spin text-blue-500' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowHistory(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
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
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900/60 dark:hover:bg-slate-800/80 dark:hover:border-slate-700 transition cursor-pointer flex flex-col gap-1.5 group relative shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
                        {item.type || 'Tugas'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
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
                          className="p-1 rounded text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-300 transition">
                      {item.title || item.prompt_text || 'Tugas Kuliah'}
                    </p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2">
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
      <footer className="border-t border-slate-200 dark:border-slate-800/80 py-4 px-6 text-center text-xs text-slate-500 dark:text-slate-400">
        Portal Tugas Antigravity &bull; Siap Digunakan Lintas Perangkat Tanpa Login
      </footer>
    </div>
  );
}
