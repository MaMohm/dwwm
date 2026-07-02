import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Route, Router as WouterRouter, Switch, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  EyeOff,
  FileText,
  Filter,
  GraduationCap,
  Globe,
  Loader,
  Printer,
  RefreshCcw,
  Settings,
  Star,
  Timer,
  Trophy,
  XCircle,
} from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import {
  categories,
  categoryColors,
  categoryLabels,
  questions,
  type Category,
  type Question,
} from "@/data/questions";

const queryClient = new QueryClient();

/* ─────────────── Types ─────────────── */
interface AppSettings {
  timerSeconds: number;
  autoReveal: boolean;
  selectedCategories: Category[];
}

interface ExamResult {
  date: string;
  score: number;
  total: number;
  pct: number;
  niveau: string;
  breakdown: Record<string, { correct: number; total: number }>;
}

/* ─────────────── Storage keys ─────────────── */
const SETTINGS_KEY = "quiz-dwwm-settings-v2";
const HISTORY_KEY = "quiz-dwwm-history-v1";
const MASTERY_KEY = "quiz-dwwm-mastery-v1";

/* ─────────────── Defaults ─────────────── */
const defaultSettings: AppSettings = {
  timerSeconds: 10,
  autoReveal: true,
  selectedCategories: [...categories],
};

/* ─────────────── Storage helpers ─────────────── */
function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {}
  return defaultSettings;
}

function saveSettings(s: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

function loadHistory(): ExamResult[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) return JSON.parse(raw) as ExamResult[];
  } catch {}
  return [];
}

function saveResult(result: ExamResult) {
  const history = loadHistory();
  history.unshift(result);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 20)));
}

type MasteryState = "mastered" | "review" | "difficult" | null;

function loadMastery(): Record<number, MasteryState> {
  try {
    const raw = localStorage.getItem(MASTERY_KEY);
    if (raw) return JSON.parse(raw) as Record<number, MasteryState>;
  } catch {}
  return {};
}

function saveMastery(m: Record<number, MasteryState>) {
  localStorage.setItem(MASTERY_KEY, JSON.stringify(m));
}

function setQuestionMastery(questionId: number, state: MasteryState) {
  const mastery = loadMastery();
  if (state === null) {
    delete mastery[questionId];
  } else {
    mastery[questionId] = state;
  }
  saveMastery(mastery);
}

function getMasteryStats(): Record<Category, { mastered: number; total: number }> {
  const mastery = loadMastery();
  const stats = {} as Record<Category, { mastered: number; total: number }>;
  categories.forEach((cat) => {
    const catQuestions = questions.filter((q) => q.category === cat);
    const mastered = catQuestions.filter((q) => mastery[q.id] === "mastered").length;
    stats[cat] = { mastered, total: catQuestions.length };
  });
  return stats;
}

async function translateToArabic(text: string): Promise<string> {
  try {
    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=fr|ar`
    );
    const data = await response.json();
    if (data.responseStatus === 200 && data.responseData.translatedText) {
      return data.responseData.translatedText;
    }
  } catch (error) {
    console.error("Translation error:", error);
  }
  return text;
}

/* ─────────────── Pure helpers ─────────────── */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function niveauFor(pct: number): string {
  if (pct >= 80) return "Prêt pour la soutenance 🎓";
  if (pct >= 60) return "Avancé 💪";
  if (pct >= 40) return "Intermédiaire 📖";
  return "Débutant 🌱";
}

function niveauColorClass(pct: number): string {
  if (pct >= 80) return "bg-green-100 text-green-800 border-green-300";
  if (pct >= 60) return "bg-blue-100 text-blue-800 border-blue-300";
  if (pct >= 40) return "bg-yellow-100 text-yellow-800 border-yellow-300";
  return "bg-red-100 text-red-800 border-red-300";
}

function diffBadge(d: Question["difficulty"]) {
  const map: Record<string, string> = {
    débutant: "bg-green-100 text-green-700 border-green-200",
    intermédiaire: "bg-yellow-100 text-yellow-700 border-yellow-200",
    avancé: "bg-red-100 text-red-700 border-red-200",
  };
  return map[d] ?? "bg-gray-100 text-gray-700";
}

/* ─────────────── Category filter bar (inline) ─────────────── */
function CategoryFilterBar({
  selected,
  onChange,
}: {
  selected: Category[];
  onChange: (cats: Category[]) => void;
}) {
  const [open, setOpen] = useState(false);

  const toggle = (cat: Category) => {
    const next = selected.includes(cat)
      ? selected.filter((c) => c !== cat)
      : [...selected, cat];
    onChange(next.length === 0 ? [...categories] : next);
  };

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
      >
        <span className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span>Catégories sélectionnées : {selected.length} / {categories.length}</span>
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <div className="border-t px-4 pb-4 pt-3">
          <div className="flex flex-wrap gap-2 mb-2">
            <button
              onClick={() => onChange([...categories])}
              className="rounded-full border px-3 py-1 text-xs font-medium hover:bg-muted transition-colors"
            >
              Tout
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => toggle(cat)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  selected.includes(cat)
                    ? categoryColors[cat] + " border-2"
                    : "border-border opacity-50 hover:opacity-100"
                }`}
              >
                {categoryLabels[cat]}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────── Simulation helpers ─────────────── */
function buildSimulation(cats: Category[], perCat: number): ExamQuestion[] {
  const selected: Question[] = [];
  for (const cat of cats) {
    const pool = shuffle(questions.filter((q) => q.category === cat));
    selected.push(...pool.slice(0, perCat));
  }
  return shuffle(selected).map((q) => {
    const opts = q.options.map((text, i) => ({ text, isCorrect: i === 0 }));
    return { q, shuffledOptions: shuffle(opts) };
  });
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/* ─────────────── Shell ─────────────── */
function AppShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const navLinks: [string, string, React.ReactNode][] = [
    ["/", "Accueil", <BookOpen className="h-4 w-4" key="home" />],
    ["/study", "Étude", <Eye className="h-4 w-4" key="study" />],
    ["/exam", "Examen", <Trophy className="h-4 w-4" key="exam" />],
    ["/simulation", "Simulation", <GraduationCap className="h-4 w-4" key="simulation" />],
    ["/settings", "Paramètres", <Settings className="h-4 w-4" key="settings" />],
  ];
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-50 border-b bg-card/90 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="hidden sm:block">
              <div className="leading-tight">Quiz DWWM</div>
              <div className="text-xs text-muted-foreground font-normal">Soutenance Interactive</div>
            </div>
          </Link>
          <nav className="flex items-center gap-1">
            {navLinks.map(([href, label, icon]) => {
              const active = location === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {icon}
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}

/* ─────────────── Home ─────────────── */
function Home() {
  const [masteryStats, setMasteryStats] = useState(() => getMasteryStats());
  const history = useMemo(() => loadHistory(), []);
  const stats = useMemo(
    () => categories.map((c) => ({ cat: c, count: questions.filter((q) => q.category === c).length })),
    []
  );

  useEffect(() => {
    const timer = setInterval(() => setMasteryStats(getMasteryStats()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Hero */}
        <div className="rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <BookOpen className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Plateforme Quiz DWWM</h1>
          <p className="text-muted-foreground max-w-lg mx-auto text-lg">
            {questions.length} questions en français pour préparer ta soutenance.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/study"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-primary-foreground font-semibold shadow hover:bg-primary/90 transition-colors"
            >
              <Eye className="h-5 w-5" />
              Mode Étude
            </Link>
            <Link
              href="/exam"
              className="inline-flex items-center gap-2 rounded-xl bg-secondary px-6 py-3 text-secondary-foreground font-semibold shadow hover:bg-secondary/90 transition-colors"
            >
              <Trophy className="h-5 w-5" />
              Mode Examen
            </Link>
            <Link
              href="/simulation"
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-3 text-white font-semibold shadow hover:bg-violet-700 transition-colors"
            >
              <GraduationCap className="h-5 w-5" />
              Simulation
            </Link>
          </div>
        </div>

        {/* Feature cards */}
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          {[
            ["🃏 Mode Étude", "Parcours les questions une par une avec minuteur, révélation de réponse et filtre par catégorie."],
            ["📝 Mode Examen", "Toutes les questions mélangées en QCM. Score final avec badge de niveau et analyse par catégorie."],
            ["🎓 Simulation", "3-5 questions par catégorie, minuteur global 30 min, alerte à 5 min et rapport imprimable."],
            ["⚙️ Paramètres", "Configure le minuteur, l'auto-révélation et les catégories par défaut."],
          ].map(([title, text]) => (
            <div key={title} className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="font-semibold mb-1">{title}</div>
              <div className="text-sm text-muted-foreground">{text}</div>
            </div>
          ))}
        </div>

        {/* Mastery dashboard */}
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Star className="h-5 w-5" /> Tableau de maîtrise
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {stats.map(({ cat, count }) => {
              const { mastered } = masteryStats[cat];
              const pct = count > 0 ? Math.round((mastered / count) * 100) : 0;
              return (
                <div key={cat} className={`rounded-lg border px-4 py-3 shadow-sm ${categoryColors[cat]}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{categoryLabels[cat]}</span>
                    <span className="text-xs font-bold">{pct}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-black/10 overflow-hidden">
                    <div className="h-full bg-black/30 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{mastered}/{count} maîtrisées</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Exam history */}
        {history.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-5 w-5" /> Historique des examens
            </h2>
            <div className="space-y-2">
              {history.slice(0, 5).map((r, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl border bg-card px-5 py-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full border px-3 py-0.5 text-xs font-bold ${niveauColorClass(r.pct)}`}>
                      {r.pct}%
                    </span>
                    <span className="text-sm font-medium">{r.niveau}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{r.score}/{r.total} questions</span>
                    <span className="hidden sm:inline">{new Date(r.date).toLocaleDateString("fr-FR")}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Categories grid */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Catégories ({categories.length})</h2>
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {stats.map(({ cat, count }) => (
              <div
                key={cat}
                className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm font-medium ${categoryColors[cat]}`}
              >
                <span>{categoryLabels[cat]}</span>
                <span className="font-bold">{count} q.</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

/* ─────────────── Study Mode ─────────────── */
function Study() {
  const globalSettings = useMemo(() => loadSettings(), []);
  const [activeCategories, setActiveCategories] = useState<Category[]>(globalSettings.selectedCategories);
  const [reviewOnly, setReviewOnly] = useState(false);
  const [mastery, setMastery] = useState<Record<number, MasteryState>>(() => loadMastery());

  const handleSetMastery = (questionId: number, state: MasteryState) => {
    setMastery((prev) => {
      const next = { ...prev };
      if (state === null) {
        delete next[questionId];
      } else {
        next[questionId] = state;
      }
      saveMastery(next);
      return next;
    });
  };

  const filtered = useMemo(
    () => {
      let pool = questions.filter((q) => activeCategories.includes(q.category));
      if (reviewOnly) {
        pool = pool.filter((q) => mastery[q.id] !== "mastered");
      }
      return shuffle(pool);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeCategories.join(","), reviewOnly, JSON.stringify(mastery)]
  );

  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [timerKey, setTimerKey] = useState(0);
  const [timerRunning, setTimerRunning] = useState(globalSettings.timerSeconds > 0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [timeLeft, setTimeLeft] = useState(globalSettings.timerSeconds);
  const [translatedQuestion, setTranslatedQuestion] = useState<string | null>(null);
  const [translatedAnswer, setTranslatedAnswer] = useState<string | null>(null);
  const [translatingQuestion, setTranslatingQuestion] = useState(false);
  const [translatingAnswer, setTranslatingAnswer] = useState(false);

  const q = filtered[index] ?? questions[0];
  const total = filtered.length;
  const qMastery = mastery[q.id] ?? null;

  const handleTranslateQuestion = async () => {
    if (translatedQuestion) {
      setTranslatedQuestion(null);
      return;
    }
    setTranslatingQuestion(true);
    const translated = await translateToArabic(q.question);
    setTranslatedQuestion(translated);
    setTranslatingQuestion(false);
  };

  const handleTranslateAnswer = async () => {
    if (translatedAnswer) {
      setTranslatedAnswer(null);
      return;
    }
    setTranslatingAnswer(true);
    const translated = await translateToArabic(q.answer);
    setTranslatedAnswer(translated);
    setTranslatingAnswer(false);
  };

  const goTo = useCallback(
    (newIndex: number) => {
      setIndex(Math.max(0, Math.min(newIndex, total - 1)));
      setRevealed(false);
      setTranslatedQuestion(null);
      setTranslatedAnswer(null);
      setTimerKey((k) => k + 1);
      setTimeLeft(globalSettings.timerSeconds);
      setTimerRunning(globalSettings.timerSeconds > 0);
    },
    [total, globalSettings.timerSeconds]
  );

  // Reset index when categories change
  const handleCategoryChange = (cats: Category[]) => {
    setActiveCategories(cats);
    setIndex(0);
    setRevealed(false);
    setTranslatedQuestion(null);
    setTranslatedAnswer(null);
    setTimerKey((k) => k + 1);
    setTimeLeft(globalSettings.timerSeconds);
    setTimerRunning(globalSettings.timerSeconds > 0);
  };

  useEffect(() => {
    if (!timerRunning || globalSettings.timerSeconds <= 0 || revealed) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (globalSettings.autoReveal) setRevealed(true);
          setTimerRunning(false);
          clearInterval(timerRef.current!);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerKey, timerRunning, revealed, globalSettings.timerSeconds, globalSettings.autoReveal]);

  const timerPct = globalSettings.timerSeconds > 0 ? (timeLeft / globalSettings.timerSeconds) * 100 : 100;

  if (total === 0) {
    return (
      <AppShell>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Aucune catégorie sélectionnée.</p>
          <Link href="/settings" className="mt-4 inline-block text-primary underline">Aller aux paramètres</Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-4">
        {/* Category filter */}
        <CategoryFilterBar selected={activeCategories} onChange={handleCategoryChange} />

        {/* Review filter */}
        <div className="rounded-xl border bg-card shadow-sm">
          <button
            onClick={() => setReviewOnly(!reviewOnly)}
            className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors ${
              reviewOnly ? "bg-primary/10 text-primary" : "hover:bg-muted"
            }`}
          >
            <span className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              {reviewOnly ? "Affichage: Questions à revoir" : "Affichage: Toutes les questions"}
            </span>
            <span className="text-xs font-bold">{reviewOnly ? filtered.length : total}</span>
          </button>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Question {index + 1} / {total}</span>
          <div className="flex items-center gap-2">
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${categoryColors[q.category]}`}>
              {categoryLabels[q.category]}
            </span>
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${diffBadge(q.difficulty)}`}>
              {q.difficulty}
            </span>
          </div>
        </div>

        {/* Timer bar */}
        {globalSettings.timerSeconds > 0 && (
          <div className="relative h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`absolute left-0 top-0 h-full rounded-full ${timerPct > 50 ? "bg-primary" : timerPct > 20 ? "bg-yellow-500" : "bg-red-500"}`}
              style={{ width: `${timerPct}%`, transition: "width 1s linear" }}
            />
          </div>
        )}

        {/* Question card */}
        <div className="rounded-2xl border bg-card shadow-sm p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              {translatedQuestion ? (
                <p className="text-xl font-semibold leading-snug text-right" dir="rtl">{translatedQuestion}</p>
              ) : (
                <p className="text-xl font-semibold leading-snug">{q.question}</p>
              )}
            </div>
            <button
              onClick={handleTranslateQuestion}
              disabled={translatingQuestion}
              className="flex-shrink-0 p-2 rounded-lg hover:bg-muted transition-colors"
              title="Traduire en arabe"
            >
              {translatingQuestion ? (
                <Loader className="h-5 w-5 text-muted-foreground animate-spin" />
              ) : (
                <Globe className={`h-5 w-5 ${translatedQuestion ? "text-primary" : "text-muted-foreground"}`} />
              )}
            </button>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setRevealed((v) => !v)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
            >
              {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {revealed ? "Masquer" : "Révéler la réponse"}
            </button>
            {globalSettings.timerSeconds > 0 && (
              <button
                onClick={() => {
                  setTimeLeft(globalSettings.timerSeconds);
                  setTimerKey((k) => k + 1);
                  setTimerRunning(true);
                  setRevealed(false);
                }}
                className="inline-flex items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
              >
                <Timer className="h-4 w-4" />
                {timeLeft}s
              </button>
            )}
          </div>

          {/* Answer */}
          {revealed && (
            <div className="fade-in rounded-xl border border-secondary/30 bg-secondary/10 px-5 py-4 relative">
              <div className="text-xs font-semibold uppercase tracking-wide text-secondary mb-2">Réponse</div>
              {translatedAnswer ? (
                <p className="text-base leading-relaxed text-right" dir="rtl">{translatedAnswer}</p>
              ) : (
                <p className="text-base leading-relaxed">{q.answer}</p>
              )}
              <button
                onClick={handleTranslateAnswer}
                disabled={translatingAnswer}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-secondary/20 transition-colors"
                title="Traduire en arabe"
              >
                {translatingAnswer ? (
                  <Loader className="h-4 w-4 text-secondary animate-spin" />
                ) : (
                  <Globe className={`h-4 w-4 ${translatedAnswer ? "text-secondary" : "text-muted-foreground"}`} />
                )}
              </button>
            </div>
          )}

          {/* Mastery buttons */}
          <div className="border-t pt-4">
            <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Marquer comme:</div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleSetMastery(q.id, "mastered")}
                className={`flex-1 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all ${
                  qMastery === "mastered"
                    ? "border-green-500 bg-green-50 text-green-700"
                    : "border-border hover:border-green-300 hover:bg-green-50/50"
                }`}
              >
                ✓ Maîtrisée
              </button>
              <button
                onClick={() => handleSetMastery(q.id, "review")}
                className={`flex-1 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all ${
                  qMastery === "review"
                    ? "border-yellow-500 bg-yellow-50 text-yellow-700"
                    : "border-border hover:border-yellow-300 hover:bg-yellow-50/50"
                }`}
              >
                ⟳ À revoir
              </button>
              <button
                onClick={() => handleSetMastery(q.id, "difficult")}
                className={`flex-1 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all ${
                  qMastery === "difficult"
                    ? "border-red-500 bg-red-50 text-red-700"
                    : "border-border hover:border-red-300 hover:bg-red-50/50"
                }`}
              >
                ⚠ Difficile
              </button>
              {qMastery && (
                <button
                  onClick={() => handleSetMastery(q.id, null)}
                  className="flex-1 rounded-lg border-2 border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:border-muted-foreground hover:bg-muted transition-all"
                >
                  ✕ Annuler
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => goTo(index - 1)}
            disabled={index === 0}
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-40 hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Précédente
          </button>
          <div className="flex gap-1">
            {Array.from({ length: Math.min(total, 7) }).map((_, i) => {
              const pos = Math.floor((index / Math.max(total - 1, 1)) * (Math.min(total, 7) - 1));
              const dotIndex = Math.floor((i / (Math.min(total, 7) - 1)) * (total - 1));
              return (
                <button
                  key={i}
                  onClick={() => goTo(dotIndex)}
                  className={`h-2 rounded-full transition-all ${i === pos ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30"}`}
                />
              );
            })}
          </div>
          <button
            onClick={() => goTo(index + 1)}
            disabled={index === total - 1}
            className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium disabled:opacity-40 hover:bg-muted transition-colors"
          >
            Suivante <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </AppShell>
  );
}

/* ─────────────── Exam Mode ─────────────── */
interface ExamQuestion {
  q: Question;
  shuffledOptions: { text: string; isCorrect: boolean }[];
}

/**
 * Builds an exam using ALL questions from the filtered pool, fully randomized.
 * Both question order and answer options are shuffled each session.
 */
function buildExam(cats: Category[]): ExamQuestion[] {
  const pool = questions.filter((q) => cats.includes(q.category));
  return shuffle(pool).map((q) => {
    const opts = q.options.map((text, i) => ({ text, isCorrect: i === 0 }));
    return { q, shuffledOptions: shuffle(opts) };
  });
}

function Exam() {
  const globalSettings = useMemo(() => loadSettings(), []);
  const [activeCategories, setActiveCategories] = useState<Category[]>(globalSettings.selectedCategories);
  const [exam, setExam] = useState<ExamQuestion[]>(() => buildExam(globalSettings.selectedCategories));
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => Array(exam.length).fill(null));
  const [finished, setFinished] = useState(false);
  const [savedResult, setSavedResult] = useState<ExamResult | null>(null);
  const [started, setStarted] = useState(false);
  const [translatedQuestion, setTranslatedQuestion] = useState<string | null>(null);
  const [translatingQuestion, setTranslatingQuestion] = useState(false);

  const eq = exam[current];
  const selected = answers[current];

  const handleTranslateQuestion = async () => {
    if (translatedQuestion) {
      setTranslatedQuestion(null);
      return;
    }
    setTranslatingQuestion(true);
    const translated = await translateToArabic(eq.q.question);
    setTranslatedQuestion(translated);
    setTranslatingQuestion(false);
  };

  const handleCategoryChange = (cats: Category[]) => {
    setActiveCategories(cats);
  };

  const startExam = () => {
    const newExam = buildExam(activeCategories);
    setExam(newExam);
    setAnswers(Array(newExam.length).fill(null));
    setCurrent(0);
    setFinished(false);
    setSavedResult(null);
    setStarted(true);
  };

  const pickAnswer = (idx: number) => {
    if (answers[current] !== null) return;
    const updated = [...answers];
    updated[current] = idx;
    setAnswers(updated);
  };

  const next = () => {
    if (current < exam.length - 1) {
      setCurrent((c) => c + 1);
      setTranslatedQuestion(null);
    } else {
      finishExam();
    }
  };

  const finishExam = () => {
    const score = answers.filter((ans, i) => ans !== null && exam[i].shuffledOptions[ans!]?.isCorrect).length;
    const pct = Math.round((score / exam.length) * 100);
    const breakdown: Record<string, { correct: number; total: number }> = {};
    exam.forEach((eq, i) => {
      const cat = eq.q.category;
      if (!breakdown[cat]) breakdown[cat] = { correct: 0, total: 0 };
      breakdown[cat].total++;
      if (answers[i] !== null && exam[i].shuffledOptions[answers[i]!]?.isCorrect) breakdown[cat].correct++;
    });
    const result: ExamResult = {
      date: new Date().toISOString(),
      score,
      total: exam.length,
      pct,
      niveau: niveauFor(pct),
      breakdown,
    };
    saveResult(result);
    setSavedResult(result);
    setFinished(true);
  };

  const restart = () => {
    setStarted(false);
    setFinished(false);
    setSavedResult(null);
  };

  // Pre-start screen with category selection
  if (!started) {
    const count = questions.filter((q) => activeCategories.includes(q.category)).length;
    return (
      <AppShell>
        <div className="space-y-4 max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold">Mode Examen</h1>
          <p className="text-muted-foreground">
            Sélectionne les catégories à inclure, puis lance l'examen. Toutes les questions seront mélangées aléatoirement avec 4 choix par question.
          </p>
          <CategoryFilterBar selected={activeCategories} onChange={handleCategoryChange} />
          <div className="rounded-xl border bg-card p-5 shadow-sm text-sm text-muted-foreground">
            <strong className="text-foreground">{count} questions</strong> disponibles dans {activeCategories.length} catégorie(s)
          </div>
          <button
            onClick={startExam}
            disabled={count === 0}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Trophy className="h-5 w-5" /> Lancer l'examen ({count} questions)
          </button>
        </div>
      </AppShell>
    );
  }

  if (finished && savedResult) {
    const { score, total, pct, niveau, breakdown } = savedResult;
    return (
      <AppShell>
        <div className="space-y-6 max-w-2xl mx-auto">
          <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
            <Trophy className="h-16 w-16 mx-auto mb-4 text-yellow-500" />
            <h2 className="text-3xl font-bold mb-2">{score} / {total}</h2>
            <p className="text-muted-foreground mb-4">Score : {pct}%</p>
            <span className={`inline-block rounded-full border-2 px-5 py-2 text-lg font-bold ${niveauColorClass(pct)}`}>
              {niveau}
            </span>
          </div>

          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h3 className="font-semibold mb-3">Résultats par catégorie</h3>
            <div className="space-y-2">
              {Object.entries(breakdown).map(([cat, { correct, total: t }]) => {
                const p = Math.round((correct / t) * 100);
                return (
                  <div key={cat} className="flex items-center gap-3">
                    <span className={`flex-shrink-0 rounded-md border px-2 py-0.5 text-xs font-medium ${categoryColors[cat as Category]}`}>
                      {categoryLabels[cat as Category]}
                    </span>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${p}%` }} />
                    </div>
                    <span className="text-sm text-muted-foreground w-14 text-right">{correct}/{t}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={restart}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <RefreshCcw className="h-4 w-4" /> Nouvel examen
            </button>
            <Link
              href="/study"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 font-semibold hover:bg-muted transition-colors"
            >
              <BookOpen className="h-4 w-4" /> Mode Étude
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const progress = (current / exam.length) * 100;

  return (
    <AppShell>
      <div className="space-y-4 max-w-2xl mx-auto">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Question {current + 1} / {exam.length}</span>
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${categoryColors[eq.q.category]}`}>
            {categoryLabels[eq.q.category]}
          </span>
        </div>

        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${diffBadge(eq.q.difficulty)}`}>
              {eq.q.difficulty}
            </div>
            <button
              onClick={handleTranslateQuestion}
              disabled={translatingQuestion}
              className="flex-shrink-0 p-2 rounded-lg hover:bg-muted transition-colors"
              title="Traduire en arabe"
            >
              {translatingQuestion ? (
                <Loader className="h-4 w-4 text-muted-foreground animate-spin" />
              ) : (
                <Globe className={`h-4 w-4 ${translatedQuestion ? "text-primary" : "text-muted-foreground"}`} />
              )}
            </button>
          </div>
          {translatedQuestion ? (
            <p className="text-xl font-semibold leading-snug mb-5 text-right" dir="rtl">{translatedQuestion}</p>
          ) : (
            <p className="text-xl font-semibold leading-snug mb-5">{eq.q.question}</p>
          )}

          <div className="space-y-3">
            {eq.shuffledOptions.map((opt, idx) => {
              let cls = "w-full text-left rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all ";
              if (selected === null) {
                cls += "hover:border-primary hover:bg-primary/5 border-border cursor-pointer";
              } else if (opt.isCorrect) {
                cls += "border-green-500 bg-green-50 text-green-800";
              } else if (selected === idx) {
                cls += "border-red-400 bg-red-50 text-red-800";
              } else {
                cls += "border-border opacity-50";
              }
              return (
                <button key={idx} className={cls} onClick={() => pickAnswer(idx)} disabled={selected !== null}>
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 mt-0.5">
                      {selected !== null && opt.isCorrect && <CheckCircle className="h-4 w-4 text-green-600" />}
                      {selected !== null && !opt.isCorrect && selected === idx && <XCircle className="h-4 w-4 text-red-500" />}
                      {(selected === null || (selected !== idx && !opt.isCorrect)) && (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-current text-xs">
                          {String.fromCharCode(65 + idx)}
                        </span>
                      )}
                    </span>
                    <span>{opt.text}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {selected !== null && (
            <div className="fade-in mt-4 rounded-xl border border-secondary/30 bg-secondary/10 px-4 py-3">
              <p className="text-sm font-semibold text-secondary mb-1">Explication :</p>
              <p className="text-sm leading-relaxed">{eq.q.answer}</p>
            </div>
          )}
        </div>

        <button
          onClick={next}
          disabled={selected === null}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors shadow-sm"
        >
          {current === exam.length - 1 ? (
            <><Trophy className="h-5 w-5" /> Voir mes résultats</>
          ) : (
            <>Question suivante <ArrowRight className="h-5 w-5" /></>
          )}
        </button>
      </div>
    </AppShell>
  );
}

/* ─────────────── Simulation Mode ─────────────── */
function Simulation() {
  const globalSettings = useMemo(() => loadSettings(), []);

  // Config state (pre-start)
  const [activeCategories, setActiveCategories] = useState<Category[]>(globalSettings.selectedCategories);
  const [perCat, setPerCat] = useState(3);
  const [durationMinutes, setDurationMinutes] = useState(30);

  // Session state
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [exam, setExam] = useState<ExamQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [savedResult, setSavedResult] = useState<ExamResult | null>(null);
  const [translatedQuestion, setTranslatedQuestion] = useState<string | null>(null);
  const [translatingQuestion, setTranslatingQuestion] = useState(false);

  // Timer
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [alertFired, setAlertFired] = useState(false);
  const ALERT_THRESHOLD = 5 * 60;

  const eq = exam[current];
  const selected = answers[current] ?? null;

  const handleTranslateQuestion = async () => {
    if (translatedQuestion) {
      setTranslatedQuestion(null);
      return;
    }
    setTranslatingQuestion(true);
    const translated = await translateToArabic(eq.q.question);
    setTranslatedQuestion(translated);
    setTranslatingQuestion(false);
  };

  const startSimulation = () => {
    const newExam = buildSimulation(activeCategories, perCat);
    setExam(newExam);
    setAnswers(Array(newExam.length).fill(null));
    setCurrent(0);
    setFinished(false);
    setSavedResult(null);
    setTimeLeft(durationMinutes * 60);
    setAlertFired(false);
    setStarted(true);
  };

  useEffect(() => {
    if (!started || finished) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          finishSimulation();
          return 0;
        }
        if (t - 1 === ALERT_THRESHOLD && !alertFired) {
          setAlertFired(true);
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, finished]);

  const pickAnswer = (idx: number) => {
    if (answers[current] !== null) return;
    const updated = [...answers];
    updated[current] = idx;
    setAnswers(updated);
  };

  const finishSimulation = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setAnswers((currentAnswers) => {
      const score = currentAnswers.filter((ans, i) => ans !== null && exam[i]?.shuffledOptions[ans!]?.isCorrect).length;
      const pct = exam.length > 0 ? Math.round((score / exam.length) * 100) : 0;
      const breakdown: Record<string, { correct: number; total: number }> = {};
      exam.forEach((eq, i) => {
        const cat = eq.q.category;
        if (!breakdown[cat]) breakdown[cat] = { correct: 0, total: 0 };
        breakdown[cat].total++;
        if (currentAnswers[i] !== null && exam[i].shuffledOptions[currentAnswers[i]!]?.isCorrect) breakdown[cat].correct++;
      });
      const result: ExamResult = {
        date: new Date().toISOString(),
        score,
        total: exam.length,
        pct,
        niveau: niveauFor(pct),
        breakdown,
      };
      saveResult(result);
      setSavedResult(result);
      setFinished(true);
      return currentAnswers;
    });
  };

  const restart = () => {
    setStarted(false);
    setFinished(false);
    setSavedResult(null);
    setAlertFired(false);
  };

  const timerPct = durationMinutes > 0 ? (timeLeft / (durationMinutes * 60)) * 100 : 100;
  const timerUrgent = timeLeft <= ALERT_THRESHOLD && started && !finished;
  const timerCritical = timeLeft <= 60 && started && !finished;

  /* ── Pre-start screen ── */
  if (!started) {
    const totalQuestions = activeCategories.reduce((acc, cat) => {
      const available = questions.filter((q) => q.category === cat).length;
      return acc + Math.min(available, perCat);
    }, 0);

    return (
      <AppShell>
        <div className="space-y-5 max-w-2xl mx-auto">
          <div className="rounded-2xl border bg-gradient-to-br from-violet-50 via-background to-indigo-50 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600 text-white shadow">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Mode Simulation</h1>
                <p className="text-sm text-muted-foreground">Conditions réelles de soutenance DWWM</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              Questions équilibrées par catégorie, minuteur global et rapport imprimable à la fin.
            </p>
          </div>

          {/* Category filter */}
          <CategoryFilterBar selected={activeCategories} onChange={setActiveCategories} />

          {/* Questions per category */}
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4" /> Questions par catégorie
            </h2>
            <div className="flex gap-2">
              {[3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setPerCat(n)}
                  className={`flex-1 rounded-lg border-2 py-2.5 text-sm font-semibold transition-all ${
                    perCat === n ? "border-violet-600 bg-violet-50 text-violet-700" : "border-border hover:border-muted-foreground"
                  }`}
                >
                  {n} questions
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <Timer className="h-4 w-4" /> Durée totale
            </h2>
            <div className="grid grid-cols-4 gap-2">
              {[15, 30, 45, 60].map((min) => (
                <button
                  key={min}
                  onClick={() => setDurationMinutes(min)}
                  className={`rounded-lg border-2 py-2.5 text-sm font-semibold transition-all ${
                    durationMinutes === min ? "border-violet-600 bg-violet-50 text-violet-700" : "border-border hover:border-muted-foreground"
                  }`}
                >
                  {min} min
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border bg-muted/40 px-5 py-4 text-sm text-muted-foreground">
            <strong className="text-foreground">{totalQuestions} questions</strong> au total ·{" "}
            <strong className="text-foreground">{durationMinutes} min</strong> · Alerte à 5 min restantes
          </div>

          <button
            onClick={startSimulation}
            disabled={activeCategories.length === 0}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3.5 font-semibold text-white disabled:opacity-40 hover:bg-violet-700 transition-colors shadow-sm text-base"
          >
            <GraduationCap className="h-5 w-5" /> Lancer la simulation
          </button>
        </div>
      </AppShell>
    );
  }

  /* ── Results screen ── */
  if (finished && savedResult) {
    const { score, total, pct, niveau, breakdown } = savedResult;
    const examDate = new Date(savedResult.date).toLocaleDateString("fr-FR", {
      day: "numeric", month: "long", year: "numeric",
    });
    const examTime = new Date(savedResult.date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

    return (
      <AppShell>
        <div className="space-y-5 max-w-2xl mx-auto">
          {/* Print button */}
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Résultats de simulation</h1>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg border bg-card px-4 py-2 text-sm font-medium hover:bg-muted transition-colors shadow-sm print:hidden"
            >
              <Printer className="h-4 w-4" /> Imprimer / PDF
            </button>
          </div>

          {/* Printable report area */}
          <div id="sim-report" className="space-y-5">
            {/* Print header (only visible when printing) */}
            <div className="hidden print:block mb-6">
              <h1 className="text-2xl font-bold">Rapport de Simulation — Soutenance DWWM</h1>
              <p className="text-sm text-gray-600 mt-1">Date : {examDate} à {examTime}</p>
              <hr className="my-3" />
            </div>

            {/* Score card */}
            <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
              <GraduationCap className="h-14 w-14 mx-auto mb-3 text-violet-500" />
              <h2 className="text-4xl font-bold mb-1">{score} / {total}</h2>
              <p className="text-muted-foreground mb-4">Score global : {pct}%</p>
              <span className={`inline-block rounded-full border-2 px-5 py-2 text-lg font-bold ${niveauColorClass(pct)}`}>
                {niveau}
              </span>
              <div className="mt-4 text-xs text-muted-foreground print:block hidden">
                Durée accordée : {durationMinutes} min · {perCat} questions/catégorie
              </div>
            </div>

            {/* Breakdown by category */}
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4" /> Analyse détaillée par catégorie
              </h3>
              <div className="space-y-3">
                {Object.entries(breakdown).map(([cat, { correct, total: t }]) => {
                  const p = Math.round((correct / t) * 100);
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${categoryColors[cat as Category]}`}>
                          {categoryLabels[cat as Category]}
                        </span>
                        <span className={`text-sm font-semibold ${p >= 80 ? "text-green-600" : p >= 60 ? "text-blue-600" : p >= 40 ? "text-yellow-600" : "text-red-600"}`}>
                          {correct}/{t} · {p}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${p >= 80 ? "bg-green-500" : p >= 60 ? "bg-blue-500" : p >= 40 ? "bg-yellow-500" : "bg-red-500"}`}
                          style={{ width: `${p}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Question review */}
            <div className="rounded-xl border bg-card p-5 shadow-sm">
              <h3 className="font-semibold mb-4">Révision des questions</h3>
              <div className="space-y-4">
                {exam.map((eq, i) => {
                  const userAns = answers[i];
                  const correct = userAns !== null && eq.shuffledOptions[userAns]?.isCorrect;
                  const correctOpt = eq.shuffledOptions.find((o) => o.isCorrect);
                  return (
                    <div key={i} className={`rounded-lg border p-4 text-sm ${correct ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                      <div className="flex items-start gap-2 mb-2">
                        <span className="flex-shrink-0 mt-0.5">
                          {correct
                            ? <CheckCircle className="h-4 w-4 text-green-600" />
                            : <XCircle className="h-4 w-4 text-red-500" />}
                        </span>
                        <div>
                          <span className={`inline-block rounded border px-1.5 py-0.5 text-xs font-medium mb-1 ${categoryColors[eq.q.category]}`}>
                            {categoryLabels[eq.q.category]}
                          </span>
                          <p className="font-medium text-foreground">{eq.q.question}</p>
                        </div>
                      </div>
                      {!correct && (
                        <div className="ml-6 mt-2 text-xs">
                          {userAns !== null && (
                            <p className="text-red-700">
                              Votre réponse : <span className="font-medium">{eq.shuffledOptions[userAns]?.text}</span>
                            </p>
                          )}
                          {userAns === null && <p className="text-red-700">Non répondu</p>}
                          <p className="text-green-700 mt-0.5">
                            Bonne réponse : <span className="font-medium">{correctOpt?.text}</span>
                          </p>
                          <p className="text-muted-foreground mt-1 italic">{eq.q.answer}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 print:hidden">
            <button
              onClick={restart}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 font-semibold text-white hover:bg-violet-700 transition-colors"
            >
              <RefreshCcw className="h-4 w-4" /> Nouvelle simulation
            </button>
            <button
              onClick={() => window.print()}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border bg-card px-4 py-3 font-semibold hover:bg-muted transition-colors"
            >
              <Printer className="h-4 w-4" /> Imprimer le rapport
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  /* ── In-progress screen ── */
  if (!eq) return null;
  const progress = (current / exam.length) * 100;

  return (
    <AppShell>
      <div className="space-y-4 max-w-2xl mx-auto">
        {/* Global timer */}
        <div className={`flex items-center justify-between rounded-xl border px-5 py-3 shadow-sm transition-colors ${
          timerCritical ? "border-red-400 bg-red-50" : timerUrgent ? "border-yellow-400 bg-yellow-50" : "bg-card"
        }`}>
          <div className="flex items-center gap-2">
            {timerCritical
              ? <AlertTriangle className="h-5 w-5 text-red-500 animate-pulse" />
              : timerUrgent
              ? <AlertTriangle className="h-5 w-5 text-yellow-500" />
              : <Timer className="h-5 w-5 text-muted-foreground" />}
            <span className={`text-sm font-medium ${timerCritical ? "text-red-700" : timerUrgent ? "text-yellow-700" : "text-muted-foreground"}`}>
              {timerUrgent && !timerCritical ? "Moins de 5 min !" : timerCritical ? "Dernière minute !" : "Temps restant"}
            </span>
          </div>
          <span className={`font-mono text-2xl font-bold tabular-nums ${timerCritical ? "text-red-600" : timerUrgent ? "text-yellow-600" : "text-foreground"}`}>
            {formatTime(timeLeft)}
          </span>
        </div>

        {/* Timer progress bar */}
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${timerCritical ? "bg-red-500" : timerUrgent ? "bg-yellow-500" : "bg-violet-600"}`}
            style={{ width: `${timerPct}%` }}
          />
        </div>

        {/* Question progress */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Question {current + 1} / {exam.length}</span>
          <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${categoryColors[eq.q.category]}`}>
            {categoryLabels[eq.q.category]}
          </span>
        </div>

        {/* Question progress bar */}
        <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-violet-600 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>

        {/* Question card */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${diffBadge(eq.q.difficulty)}`}>
              {eq.q.difficulty}
            </div>
            <button
              onClick={handleTranslateQuestion}
              disabled={translatingQuestion}
              className="flex-shrink-0 p-2 rounded-lg hover:bg-muted transition-colors"
              title="Traduire en arabe"
            >
              {translatingQuestion ? (
                <Loader className="h-4 w-4 text-muted-foreground animate-spin" />
              ) : (
                <Globe className={`h-4 w-4 ${translatedQuestion ? "text-violet-600" : "text-muted-foreground"}`} />
              )}
            </button>
          </div>
          {translatedQuestion ? (
            <p className="text-xl font-semibold leading-snug mb-5 text-right" dir="rtl">{translatedQuestion}</p>
          ) : (
            <p className="text-xl font-semibold leading-snug mb-5">{eq.q.question}</p>
          )}

          <div className="space-y-3">
            {eq.shuffledOptions.map((opt, idx) => {
              let cls = "w-full text-left rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all ";
              if (selected === null) {
                cls += "hover:border-violet-600 hover:bg-violet-50 border-border cursor-pointer";
              } else if (opt.isCorrect) {
                cls += "border-green-500 bg-green-50 text-green-800";
              } else if (selected === idx) {
                cls += "border-red-400 bg-red-50 text-red-800";
              } else {
                cls += "border-border opacity-50";
              }
              return (
                <button key={idx} className={cls} onClick={() => pickAnswer(idx)} disabled={selected !== null}>
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 mt-0.5">
                      {selected !== null && opt.isCorrect && <CheckCircle className="h-4 w-4 text-green-600" />}
                      {selected !== null && !opt.isCorrect && selected === idx && <XCircle className="h-4 w-4 text-red-500" />}
                      {(selected === null || (selected !== idx && !opt.isCorrect)) && (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-current text-xs">
                          {String.fromCharCode(65 + idx)}
                        </span>
                      )}
                    </span>
                    <span>{opt.text}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {selected !== null && (
            <div className="fade-in mt-4 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3">
              <p className="text-sm font-semibold text-violet-700 mb-1">Explication :</p>
              <p className="text-sm leading-relaxed">{eq.q.answer}</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          {current > 0 && (
            <button
              onClick={() => setCurrent((c) => c - 1)}
              className="inline-flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => {
              if (current < exam.length - 1) {
                setCurrent((c) => c + 1);
              } else {
                finishSimulation();
              }
            }}
            disabled={selected === null}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 font-semibold text-white disabled:opacity-40 hover:bg-violet-700 transition-colors shadow-sm"
          >
            {current === exam.length - 1 ? (
              <><GraduationCap className="h-5 w-5" /> Terminer et voir le rapport</>
            ) : (
              <>Question suivante <ArrowRight className="h-5 w-5" /></>
            )}
          </button>
        </div>

        {/* Abandon button */}
        <button
          onClick={finishSimulation}
          className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
        >
          Terminer maintenant et voir les résultats
        </button>
      </div>
    </AppShell>
  );
}

/* ─────────────── Settings ─────────────── */
function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [historyCount, setHistoryCount] = useState(() => loadHistory().length);

  const update = (patch: Partial<AppSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
  };

  const toggleCategory = (cat: Category) => {
    const current = settings.selectedCategories;
    const next = current.includes(cat) ? current.filter((c) => c !== cat) : [...current, cat];
    update({ selectedCategories: next.length === 0 ? [...categories] : next });
  };

  const clearHistory = () => {
    localStorage.removeItem(HISTORY_KEY);
    setHistoryCount(0);
  };

  const clearMastery = () => {
    localStorage.removeItem(MASTERY_KEY);
    window.location.reload();
  };

  const timerOptions = [
    { label: "Désactivé", value: 0 },
    { label: "5 s", value: 5 },
    { label: "10 s", value: 10 },
    { label: "15 s", value: 15 },
    { label: "30 s", value: 30 },
    { label: "60 s", value: 60 },
  ];

  return (
    <AppShell>
      <div className="space-y-5 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold">Paramètres</h1>

        {/* Timer */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="font-semibold mb-3 flex items-center gap-2"><Timer className="h-4 w-4" /> Minuteur (Mode Étude)</h2>
          <div className="grid grid-cols-3 gap-2">
            {timerOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => update({ timerSeconds: opt.value })}
                className={`rounded-lg border-2 py-2 text-sm font-medium transition-all ${
                  settings.timerSeconds === opt.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:border-muted-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Auto-reveal */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold flex items-center gap-2"><Eye className="h-4 w-4" /> Auto-révélation</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Révèle automatiquement la réponse quand le timer expire</p>
            </div>
            <button
              onClick={() => update({ autoReveal: !settings.autoReveal })}
              className={`relative h-7 w-12 rounded-full transition-colors ${settings.autoReveal ? "bg-primary" : "bg-muted"}`}
            >
              <div className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${settings.autoReveal ? "left-6" : "left-1"}`} />
            </button>
          </div>
        </div>

        {/* Default categories */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Catégories par défaut</h2>
            <div className="flex gap-2 text-sm">
              <button onClick={() => update({ selectedCategories: [...categories] })} className="text-primary hover:underline">Tout</button>
              <span className="text-muted-foreground">·</span>
              <button onClick={() => update({ selectedCategories: [] })} className="text-muted-foreground hover:underline">Aucun</button>
            </div>
          </div>
          <div className="space-y-2">
            {categories.map((cat) => {
              const checked = settings.selectedCategories.includes(cat);
              const count = questions.filter((q) => q.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`w-full flex items-center justify-between rounded-lg border-2 px-4 py-2.5 text-sm text-left transition-all ${
                    checked ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className={`h-4 w-4 flex-shrink-0 rounded border-2 flex items-center justify-center ${checked ? "border-primary bg-primary" : "border-muted-foreground"}`}>
                      {checked && <span className="text-white text-xs font-bold">✓</span>}
                    </span>
                    <span className={`rounded-md border px-1.5 py-0.5 text-xs font-medium ${categoryColors[cat]}`}>{categoryLabels[cat]}</span>
                  </span>
                  <span className="text-muted-foreground">{count} questions</span>
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {settings.selectedCategories.length} / {categories.length} catégories sélectionnées
          </p>
        </div>

        {/* History */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold flex items-center gap-2"><Clock className="h-4 w-4" /> Historique des examens</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {historyCount > 0 ? `${historyCount} examen(s) enregistré(s)` : "Aucun examen enregistré"}
              </p>
            </div>
            {historyCount > 0 && (
              <button
                onClick={clearHistory}
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors"
              >
                Effacer
              </button>
            )}
          </div>
        </div>

        {/* Mastery tracking */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold flex items-center gap-2"><Star className="h-4 w-4" /> Données de maîtrise</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Réinitialiser tous les marquages (maîtrisée / à revoir / difficile)</p>
            </div>
            <button
              onClick={clearMastery}
              className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-sm font-medium text-orange-700 hover:bg-orange-100 transition-colors"
            >
              Réinitialiser
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

/* ─────────────── Router ─────────────── */
function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/study" component={Study} />
      <Route path="/exam" component={Exam} />
      <Route path="/simulation" component={Simulation} />
      <Route path="/settings" component={SettingsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

/* ─────────────── App ─────────────── */
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
