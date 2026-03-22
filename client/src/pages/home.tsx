import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  ArrowRight,
  Square,
  Copy,
  Check,
  Volume2,
  Github,
  Linkedin,
  Mail,
  ChevronDown,
  FileText,
  X,
  Sparkles,
  Link2,
  Globe2,
  Languages,
  BarChart3,
  Upload,
  ArrowLeft,
  Bot,
} from "lucide-react";
import type { SummarizeRequest, SummarizeResponse } from "@shared/schema";

const DOCUMENT_ACCEPT =
  ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const SUPPORTED_DOCUMENT_EXTENSIONS = new Set(["pdf", "doc", "docx"]);

const INPUT_MODES = [
  {
    key: "url",
    label: "Article URL",
    description: "Paste a public article, blog post or news story",
    icon: Link2,
  },
  {
    key: "file",
    label: "Document",
    description: "Upload PDF, DOC or DOCX files",
    icon: Upload,
  },
] as const;

const LANDING_FEATURES = [
  {
    icon: Globe2,
    title: "Source-ready",
    description: "Summarize public URLs, PDFs and Word documents from one clean flow.",
  },
  {
    icon: Sparkles,
    title: "Readable output",
    description: "Get a clean summary, key points and compression metrics in seconds.",
  },
  {
    icon: Languages,
    title: "Global access",
    description: "Translate the result and listen to it directly inside the app.",
  },
];

const SUMMARY_HIGHLIGHTS = [
  { label: "URL articles", value: "Public pages" },
  { label: "Document upload", value: "PDF, DOC, DOCX" },
  { label: "Output style", value: "Summary + key points" },
];

const SOCIAL_LINKS = [
  {
    href: "https://github.com/YOUSSEF-BT",
    label: "GitHub",
    icon: Github,
    external: true,
  },
  {
    href: "https://www.linkedin.com/in/youssef-bouzit-74863239b/",
    label: "LinkedIn",
    icon: Linkedin,
    external: true,
  },
  {
    href: "mailto:bt.youssef.369@gmail.com",
    label: "Email",
    icon: Mail,
    external: false,
  },
];

type InputMode = (typeof INPUT_MODES)[number]["key"];

function getFileExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() || "";
}

function isSupportedDocument(file: File) {
  return SUPPORTED_DOCUMENT_EXTENSIONS.has(getFileExtension(file.name));
}

function getFileMimeType(file: File) {
  if (file.type) {
    return file.type;
  }

  const extension = getFileExtension(file.name);

  if (extension === "pdf") {
    return "application/pdf";
  }

  if (extension === "doc") {
    return "application/msword";
  }

  return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
}

function readFileAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const base64 = result.split(",").pop();

      if (!base64) {
        reject(new Error("Failed to read the selected file."));
        return;
      }

      resolve(base64);
    };

    reader.onerror = () => {
      reject(new Error("Failed to read the selected file."));
    };

    reader.readAsDataURL(file);
  });
}

function ThemeToggleButton({
  maskId,
  onClick,
}: {
  maskId: string;
  onClick: () => void;
}) {
  return (
    <button className="theme-toggle" aria-label="Toggle theme" onClick={onClick}>
      <svg aria-hidden className="theme-toggle-svg" width="38" height="38" viewBox="0 0 38 38">
        <defs>
          <mask id={maskId}>
            <circle className="theme-toggle-circle" data-mask="true" cx="19" cy="19" r="13" />
            <circle className="theme-toggle-mask" cx="25" cy="14" r="9" />
          </mask>
        </defs>
        <path
          className="theme-toggle-path"
          d="M19 3v7M19 35v-7M32.856 11l-6.062 3.5M5.144 27l6.062-3.5M5.144 11l6.062 3.5M32.856 27l-6.062-3.5"
        />
        <circle className="theme-toggle-circle" mask={`url(#${maskId})`} cx="19" cy="19" r="12" />
      </svg>
    </button>
  );
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`${compact ? "h-11 w-11" : "h-14 w-14 sm:h-16 sm:w-16"} logo-frame`}>
        <div className="logo-container h-full w-full">
          <div className="logo-wrapper">
            <img src="/logo.svg" alt="Ai Summarizer Logo" className="logo-base" />
            <div className="logo-fill-overlay"></div>
          </div>
        </div>
      </div>
      <div className="space-y-0.5">
        <p className="section-kicker">Youssef Bouzit</p>
        <div className={`${compact ? "text-base" : "text-lg sm:text-xl"} font-semibold tracking-tight`}>
          Ai Summarizer
        </div>
      </div>
    </div>
  );
}

function AppFooter() {
  return (
    <footer className="text-center">
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-3">
          {SOCIAL_LINKS.map((link) => {
            const Icon = link.icon;

            return (
              <a
                key={link.label}
                href={link.href}
                target={link.external ? "_blank" : undefined}
                rel={link.external ? "noopener noreferrer" : undefined}
                className="social-icon-link"
                aria-label={link.label}
              >
                <Icon className="h-5 w-5" />
              </a>
            );
          })}
        </div>

        <p className="text-sm text-muted-foreground">
          Developed by{" "}
          <a
            href="https://www.linkedin.com/in/youssef-bouzit-74863239b/"
            target="_blank"
            rel="noopener noreferrer"
            className="author-link text-primary transition-colors duration-200"
          >
            Youssef Bouzit
          </a>
        </p>
      </div>
    </footer>
  );
}

export default function Home() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [inputMode, setInputMode] = useState<InputMode>("url");
  const [url, setUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [articleData, setArticleData] = useState<SummarizeResponse["article"] | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [translatedSummary, setTranslatedSummary] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    if (isDarkMode) {
      root.classList.add("dark");
      body.setAttribute("data-theme", "dark");
    } else {
      root.classList.remove("dark");
      body.setAttribute("data-theme", "light");
    }
  }, [isDarkMode]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;

      if (!target.closest(".language-dropdown")) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  const summarizeMutation = useMutation({
    mutationFn: async (data: SummarizeRequest) => {
      const response = await apiRequest("POST", "/api/summarize", data);
      return response.json() as Promise<SummarizeResponse>;
    },
    onSuccess: (data) => {
      setArticleData(data.article);
      setTranslatedSummary(data.article.summary);
      setSelectedLanguage("en");
      setIsCopied(false);
      setIsDropdownOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process the content",
        variant: "destructive",
      });
    },
  });

  const translateMutation = useMutation({
    mutationFn: async (data: { text: string; targetLanguage: string }) => {
      const response = await apiRequest("POST", "/api/translate", data);
      return response.json() as Promise<{ translatedText: string }>;
    },
    onSuccess: (data) => {
      setTranslatedSummary(data.translatedText);
    },
    onError: () => {
      toast({
        title: "Translation Error",
        description: "Failed to translate the summary",
        variant: "destructive",
      });
    },
  });

  const toggleTheme = () => {
    setIsDarkMode((value) => !value);
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const activateMode = (mode: InputMode) => {
    setInputMode(mode);

    if (mode === "url") {
      if (selectedFile) {
        clearSelectedFile();
      }

      return;
    }

    setUrl("");
  };

  const handleSummarize = async () => {
    if (inputMode === "file") {
      if (!selectedFile) {
        toast({
          title: "Missing Document",
          description: "Upload a PDF, DOC, or DOCX file to summarize it.",
          variant: "destructive",
        });
        return;
      }

      if (!isSupportedDocument(selectedFile)) {
        toast({
          title: "Unsupported File",
          description: "Please upload a PDF, DOC, or DOCX file.",
          variant: "destructive",
        });
        return;
      }

      try {
        const fileData = await readFileAsBase64(selectedFile);
        summarizeMutation.mutate({
          fileName: selectedFile.name,
          fileType: getFileMimeType(selectedFile),
          fileData,
        });
      } catch (error: any) {
        toast({
          title: "Upload Error",
          description: error.message || "Failed to read the selected document.",
          variant: "destructive",
        });
      }

      return;
    }

    if (!url.trim()) {
      toast({
        title: "Missing URL",
        description: "Enter a valid article URL or switch to document mode.",
        variant: "destructive",
      });
      return;
    }

    try {
      new URL(url);
    } catch {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL starting with http:// or https://",
        variant: "destructive",
      });
      return;
    }

    summarizeMutation.mutate({ url });
  };

  const handleLanguageChange = (language: string) => {
    setSelectedLanguage(language);
    setIsDropdownOpen(false);

    if (articleData && language !== "en") {
      translateMutation.mutate({
        text: articleData.summary,
        targetLanguage: language,
      });
    } else if (articleData) {
      setTranslatedSummary(articleData.summary);
    }
  };

  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!isSupportedDocument(file)) {
      toast({
        title: "Unsupported File",
        description: "Please choose a PDF, DOC, or DOCX document.",
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }

    setInputMode("file");
    setSelectedFile(file);
    setUrl("");
  };

  const handleTextToSpeech = () => {
    if ("speechSynthesis" in window) {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        return;
      }

      try {
        const loadVoices = () => {
          const voices = window.speechSynthesis.getVoices();
          const utterance = new SpeechSynthesisUtterance(translatedSummary);
          const langCode = selectedLanguage === "en" ? "en-US" : selectedLanguage;
          const voice =
            voices.find((voiceItem) => voiceItem.lang.startsWith(langCode)) ||
            voices.find((voiceItem) => voiceItem.lang.startsWith("en")) ||
            voices[0];

          utterance.lang = langCode;

          if (voice) {
            utterance.voice = voice;
          }

          utterance.rate = 0.8;
          utterance.pitch = 1;
          utterance.volume = 1;

          utterance.onstart = () => {
            setIsSpeaking(true);
          };

          utterance.onend = () => {
            setIsSpeaking(false);
          };

          utterance.onerror = (event) => {
            setIsSpeaking(false);

            if (event.error && !["canceled", "interrupted"].includes(event.error)) {
              toast({
                title: "Speech Error",
                description: "Failed to play text-to-speech. Try again.",
                variant: "destructive",
              });
            }
          };

          window.speechSynthesis.cancel();
          setTimeout(() => {
            window.speechSynthesis.speak(utterance);
          }, 100);
        };

        const voices = window.speechSynthesis.getVoices();

        if (voices.length > 0) {
          loadVoices();
        } else {
          window.speechSynthesis.addEventListener("voiceschanged", loadVoices, { once: true });
          setTimeout(loadVoices, 1000);
        }
      } catch (error) {
        console.error("Speech synthesis error:", error);
        setIsSpeaking(false);
        toast({
          title: "Speech Error",
          description: "Text-to-speech failed to initialize",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Not Supported",
        description: "Text-to-speech is not supported in your browser",
        variant: "destructive",
      });
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(translatedSummary);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      toast({
        title: "Copied",
        description: "Summary copied to clipboard",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const languages = [
    { code: "en", name: "English" },
    { code: "es", name: "Spanish" },
    { code: "fr", name: "French" },
    { code: "de", name: "German" },
    { code: "it", name: "Italian" },
    { code: "pt", name: "Portuguese" },
    { code: "ru", name: "Russian" },
    { code: "zh", name: "Chinese" },
    { code: "ja", name: "Japanese" },
    { code: "ko", name: "Korean" },
    { code: "ar", name: "Arabic" },
    { code: "hi", name: "Hindi" },
    { code: "nl", name: "Dutch" },
    { code: "sv", name: "Swedish" },
    { code: "tr", name: "Turkish" },
  ];

  const sourceLabel = articleData?.sourceName || selectedFile?.name || url;
  const currentLanguage = languages.find((language) => language.code === selectedLanguage)?.name || "English";

  if (!articleData) {
    return (
      <div className="app-shell min-h-screen text-foreground">
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 pb-10 pt-6 sm:px-6 lg:px-8">
          <header className="flex items-center justify-between gap-4">
            <BrandMark />
            <ThemeToggleButton maskId="theme-toggle-mask-home" onClick={toggleTheme} />
          </header>

          <main className="flex-1 py-10 sm:py-12 lg:py-16">
            <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:gap-10">
              <div className="space-y-8">
                <div className="space-y-5">
                  <div className="info-pill inline-flex">
                    <Sparkles className="h-4 w-4" />
                    AI-powered summaries for articles and documents
                  </div>

                  <div className="space-y-4">
                    <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
                      Summarize long content into sharp, readable insights.
                    </h1>
                    <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                      Paste a URL or upload a document to generate a clean summary, key points,
                      quick metrics, translation, and audio playback in one focused workflow.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {SUMMARY_HIGHLIGHTS.map((item) => (
                      <div key={item.label} className="feature-chip">
                        <span className="feature-chip-label">{item.label}</span>
                        <span className="feature-chip-value">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  {LANDING_FEATURES.map((feature) => {
                    const Icon = feature.icon;

                    return (
                      <div key={feature.title} className="surface-card feature-card">
                        <div className="feature-icon">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="space-y-2">
                          <h2 className="text-base font-semibold">{feature.title}</h2>
                          <p className="text-sm leading-6 text-muted-foreground">{feature.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <section className="surface-card hero-panel">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <p className="section-kicker">Start a new summary</p>
                    <h2 className="text-2xl font-semibold tracking-tight sm:text-[2rem]">
                      Choose a source and generate the result.
                    </h2>
                    <p className="text-sm leading-6 text-muted-foreground sm:text-base">
                      Switch between article mode and document mode depending on what you want to
                      summarize.
                    </p>
                  </div>

                  <div className="mode-switch">
                    {INPUT_MODES.map((mode) => {
                      const Icon = mode.icon;
                      const isActive = inputMode === mode.key;

                      return (
                        <button
                          key={mode.key}
                          type="button"
                          className={`mode-toggle ${isActive ? "active" : ""}`}
                          onClick={() => activateMode(mode.key)}
                          disabled={summarizeMutation.isPending}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{mode.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="rounded-[24px] border border-border/70 bg-background/60 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]">
                    <div className="mb-4 space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {inputMode === "url" ? "Paste an article URL" : "Upload a PDF or Word file"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {
                          INPUT_MODES.find((mode) => mode.key === inputMode)?.description
                        }
                      </p>
                    </div>

                    {inputMode === "url" ? (
                      <div className="space-y-4">
                        <div className="input-shell">
                          <Link2 className="h-4 w-4 shrink-0 text-primary" />
                          <Input
                            type="url"
                            placeholder="https://example.com/article"
                            value={url}
                            onChange={(event) => {
                              if (selectedFile) {
                                clearSelectedFile();
                              }

                              setInputMode("url");
                              setUrl(event.target.value);
                            }}
                            onKeyDown={(event) => event.key === "Enter" && void handleSummarize()}
                            className="hero-input flex-1"
                            disabled={summarizeMutation.isPending}
                          />
                        </div>
                        <p className="text-xs leading-5 text-muted-foreground">
                          Best with public article pages that are accessible without login.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <label
                          className={`upload-zone ${
                            summarizeMutation.isPending ? "pointer-events-none opacity-60" : "cursor-pointer"
                          }`}
                        >
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept={DOCUMENT_ACCEPT}
                            className="hidden"
                            onChange={handleFileSelection}
                            disabled={summarizeMutation.isPending}
                          />
                          <div className="upload-zone-icon">
                            <FileText className="h-5 w-5" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-foreground">
                              Click to upload a file
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Supported formats: PDF, DOC, DOCX
                            </p>
                          </div>
                        </label>

                        {selectedFile ? (
                          <div className="selected-file-pill">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="upload-zone-icon h-9 w-9 rounded-2xl">
                                <FileText className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-foreground">
                                  {selectedFile.name}
                                </p>
                                <p className="text-xs text-muted-foreground uppercase tracking-[0.24em]">
                                  {getFileExtension(selectedFile.name) || "file"}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={clearSelectedFile}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
                              aria-label="Remove selected file"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="empty-upload-state">
                            <Upload className="h-4 w-4" />
                            No file selected yet
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={() => void handleSummarize()}
                    disabled={summarizeMutation.isPending}
                    className="h-[3.25rem] w-full rounded-2xl bg-primary px-5 text-base font-semibold shadow-[0_18px_45px_rgba(14,165,233,0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary/90"
                  >
                    {summarizeMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing your content...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        {inputMode === "url" ? "Summarize article" : "Summarize document"}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="metric-card">
                      <Bot className="h-4 w-4 text-primary" />
                      <div>
                        <p className="metric-card-value">AI first</p>
                        <p className="metric-card-label">Gemini when available</p>
                      </div>
                    </div>
                    <div className="metric-card">
                      <Languages className="h-4 w-4 text-primary" />
                      <div>
                        <p className="metric-card-value">Translation</p>
                        <p className="metric-card-label">Multiple languages</p>
                      </div>
                    </div>
                    <div className="metric-card">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      <div>
                        <p className="metric-card-value">Metrics</p>
                        <p className="metric-card-label">Words and compression</p>
                      </div>
                    </div>
                  </div>

                  {summarizeMutation.isPending && (
                    <div className="loading-strip">
                      <div className="loading-strip-bar"></div>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </main>

          <div className="pb-2 pt-6 sm:pt-8">
            <AppFooter />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell min-h-screen text-foreground">
      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => {
                setArticleData(null);
                setIsDropdownOpen(false);
              }}
              className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Search</span>
            </button>
            <BrandMark compact />
          </div>

          <ThemeToggleButton maskId="theme-toggle-mask-results" onClick={toggleTheme} />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <section className="surface-card overflow-hidden">
          {articleData.imageUrl ? (
            <div className="relative h-72 w-full overflow-hidden sm:h-[26rem]">
              <img
                src={articleData.imageUrl}
                alt="Article featured image"
                className="h-full w-full object-cover"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/15 to-transparent"></div>
            </div>
          ) : (
            <div className="result-hero-fallback"></div>
          )}

          <div className="space-y-5 p-6 sm:p-8">
            <div className="flex flex-wrap gap-3">
              <div className="info-pill">
                <Sparkles className="h-4 w-4" />
                AI summary
              </div>
              <div className="info-pill">
                <FileText className="h-4 w-4" />
                {articleData.sourceType === "file" ? "Document upload" : "Article URL"}
              </div>
              {articleData.author && (
                <div className="info-pill">
                  <Globe2 className="h-4 w-4" />
                  By {articleData.author}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <p className="section-kicker">Result overview</p>
              <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl lg:text-[2.85rem]">
                {articleData.title}
              </h1>
              <p className="break-all text-sm leading-6 text-muted-foreground sm:text-base">
                {sourceLabel}
              </p>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.9fr)]">
          <div className="space-y-6">
            <section className="surface-card p-6 sm:p-8">
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-2">
                  <p className="section-kicker">Summary</p>
                  <h2 className="text-2xl font-semibold tracking-tight">Compressed for fast reading</h2>
                </div>
                <div className="feature-chip">
                  <span className="feature-chip-label">Language</span>
                  <span className="feature-chip-value">{currentLanguage}</span>
                </div>
              </div>

              {translateMutation.isPending ? (
                <div className="inline-flex items-center gap-3 rounded-full bg-primary/10 px-4 py-2 text-primary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Translating summary...</span>
                </div>
              ) : (
                <p className="summary-copy">{translatedSummary}</p>
              )}
            </section>

            {articleData.keyPoints && articleData.keyPoints.length > 0 && (
              <section className="surface-card p-6 sm:p-8">
                <div className="mb-6 space-y-2">
                  <p className="section-kicker">Key points</p>
                  <h2 className="text-2xl font-semibold tracking-tight">The essential takeaways</h2>
                </div>

                <div className="space-y-4">
                  {articleData.keyPoints.map((point, index) => (
                    <div key={index} className="key-point-row">
                      <div className="key-point-index">{index + 1}</div>
                      <p className="text-sm leading-7 text-foreground/90 sm:text-base">{point}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-6">
            <section className="surface-card p-5 sm:p-6">
              <div className="mb-5 space-y-2">
                <p className="section-kicker">Controls</p>
                <h2 className="text-xl font-semibold tracking-tight">Translate, listen or copy</h2>
              </div>

              <div className="space-y-4">
                <div className="relative language-dropdown">
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="dropdown-trigger w-full rounded-2xl border border-border bg-background/80 px-4 py-3 text-left text-sm font-medium text-foreground transition-colors duration-200 hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <Languages className="h-4 w-4 shrink-0 text-primary" />
                        <span className="truncate">{currentLanguage}</span>
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
                          isDropdownOpen ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </button>

                  {isDropdownOpen && (
                    <div className="dropdown-panel absolute top-full left-0 right-0 z-50 mt-2 max-h-60 overflow-y-auto rounded-2xl border border-border bg-background shadow-xl scrollbar-thin">
                      {languages.map((language) => (
                        <button
                          key={language.code}
                          onClick={() => handleLanguageChange(language.code)}
                          className={`dropdown-item w-full px-4 py-3 text-left text-sm transition-colors duration-150 ${
                            selectedLanguage === language.code
                              ? "selected-item bg-primary/10 text-primary"
                              : "text-foreground"
                          }`}
                        >
                          {language.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={handleTextToSpeech}
                    className="rounded-2xl bg-accent px-4 py-3 text-sm font-medium transition-all duration-200 hover:bg-accent/90"
                  >
                    {isSpeaking ? (
                      <>
                        <Square className="mr-2 h-4 w-4" />
                        Stop
                      </>
                    ) : (
                      <>
                        <Volume2 className="mr-2 h-4 w-4" />
                        Listen
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={handleCopy}
                    className={`rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                      isCopied ? "bg-accent hover:bg-accent/90" : "bg-muted hover:bg-muted/80"
                    }`}
                  >
                    {isCopied ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </section>

            <section className="surface-card p-5 sm:p-6">
              <div className="mb-5 space-y-2">
                <p className="section-kicker">Metrics</p>
                <h2 className="text-xl font-semibold tracking-tight">Output snapshot</h2>
              </div>

              <div className="space-y-3">
                <div className="metric-stack-card">
                  <span className="metric-stack-label">Original words</span>
                  <span className="metric-stack-value">{articleData.originalWords.toLocaleString()}</span>
                </div>
                <div className="metric-stack-card">
                  <span className="metric-stack-label">Summary words</span>
                  <span className="metric-stack-value">{articleData.summaryWords.toLocaleString()}</span>
                </div>
                <div className="metric-stack-card">
                  <span className="metric-stack-label">Compression</span>
                  <span className="metric-stack-value">{articleData.compressionRatio}%</span>
                </div>
              </div>
            </section>
          </aside>
        </div>

        <div className="mt-10 border-t border-border/60 pt-8">
          <AppFooter />
        </div>
      </main>
    </div>
  );
}
