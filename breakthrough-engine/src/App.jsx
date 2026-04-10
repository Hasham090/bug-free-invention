import { useState, useEffect, useRef } from "react";

const PHASES = ["ANALYZING", "DISRUPTING", "INVENTING", "FINALIZING"];

function TypingText({ text, speed = 18 }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplayed("");
    setDone(false);
    if (!text) return;
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) { clearInterval(iv); setDone(true); }
    }, speed);
    return () => clearInterval(iv);
  }, [text, speed]);
  return <span>{displayed}{!done && text ? <span className="cursor">|</span> : null}</span>;
}

function FloatingParticles() {
  const particles = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    size: Math.random() * 4 + 1,
    x: Math.random() * 100,
    y: Math.random() * 100,
    dur: Math.random() * 12 + 8,
    delay: Math.random() * -12,
    color: ["#ff6b35","#00d4aa","#7c3aed","#f59e0b","#06b6d4"][i % 5],
    opacity: Math.random() * 0.5 + 0.1,
  }));
  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      {particles.map(p => (
        <div key={p.id} style={{
          position: "absolute",
          left: `${p.x}%`, top: `${p.y}%`,
          width: p.size, height: p.size,
          borderRadius: "50%",
          background: p.color,
          opacity: p.opacity,
          animation: `floatUp ${p.dur}s ${p.delay}s linear infinite`,
        }} />
      ))}
    </div>
  );
}

function PhaseBar({ phase, active }) {
  const colors = ["#ff6b35","#00d4aa","#7c3aed","#f59e0b"];
  const idx = PHASES.indexOf(phase);
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "6px 14px", borderRadius: 999,
      background: active ? `${colors[idx]}22` : "#1a1a2e",
      border: `1px solid ${active ? colors[idx] : "#2a2a4a"}`,
      color: active ? colors[idx] : "#555",
      fontSize: 11, fontFamily: "monospace", fontWeight: 700, letterSpacing: 2,
      transition: "all 0.4s",
    }}>
      {active && <span style={{ width: 6, height: 6, borderRadius: "50%", background: colors[idx], boxShadow: `0 0 8px ${colors[idx]}`, animation: "pulse 1s infinite" }} />}
      {phase}
    </div>
  );
}

function IdeaCard({ idea }) {
  if (!idea) return null;
  const sections = [
    { key: "name", label: "THE INVENTION", color: "#ff6b35" },
    { key: "what", label: "WHAT IT IS", color: "#00d4aa" },
    { key: "how", label: "HOW IT WORKS", color: "#7c3aed" },
    { key: "why_novel", label: "WHY NEVER DONE BEFORE", color: "#f59e0b" },
    { key: "impact", label: "WORLD IMPACT", color: "#06b6d4" },
    { key: "build", label: "HOW TO BUILD IT", color: "#ec4899" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {sections.map(s => idea[s.key] ? (
        <div key={s.key} style={{
          background: "#0d0d1f",
          border: `1px solid ${s.color}33`,
          borderLeft: `3px solid ${s.color}`,
          borderRadius: 12, padding: "16px 20px",
          animation: "slideIn 0.5s ease both",
        }}>
          <div style={{ color: s.color, fontSize: 11, fontWeight: 800, letterSpacing: 3, fontFamily: "monospace", marginBottom: 8 }}>{s.label}</div>
          <div style={{ color: "#e2e8f0", fontSize: 15, lineHeight: 1.75, fontFamily: "'Georgia', serif" }}>
            {s.key === "name"
              ? <strong style={{ fontSize: 22, color: "#fff", fontFamily: "'Georgia', serif" }}><TypingText text={idea[s.key]} speed={30} /></strong>
              : <TypingText text={idea[s.key]} speed={12} />
            }
          </div>
        </div>
      ) : null)}
    </div>
  );
}

function HistoryPanel({ history, onSelect }) {
  if (history.length === 0) return null;
  return (
    <div style={{
      marginTop: 32,
      background: "#0d0d1f",
      border: "1px solid #1e1e3a",
      borderRadius: 16,
      padding: 20,
    }}>
      <div style={{ fontSize: 11, color: "#64748b", letterSpacing: 3, fontFamily: "monospace", marginBottom: 16 }}>
        PREVIOUS INVENTIONS ({history.length})
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {history.map((item, i) => (
          <button
            key={i}
            onClick={() => onSelect(item)}
            style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              background: "#12121f", border: "1px solid #2a2a4a", borderRadius: 10,
              padding: "10px 16px", cursor: "pointer", textAlign: "left",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#ff6b35"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#2a2a4a"; }}
          >
            <div>
              <div style={{ color: "#fff", fontSize: 14, fontWeight: 600, fontFamily: "'Georgia', serif" }}>
                {item.idea.name}
              </div>
              <div style={{ color: "#64748b", fontSize: 11, fontFamily: "monospace", marginTop: 4 }}>
                {item.problem}
              </div>
            </div>
            <div style={{ color: "#ff6b35", fontSize: 18 }}>&#8250;</div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [problem, setProblem] = useState("");
  const [loading, setLoading] = useState(false);
  const [idea, setIdea] = useState(null);
  const [phase, setPhase] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("breakthroughHistory") || "[]");
    } catch { return []; }
  });
  const phaseRef = useRef(null);

  const examples = [
    "Traffic jams in megacities",
    "Antibiotic resistance",
    "Loneliness epidemic",
    "Ocean plastic pollution",
    "Fake news spreading",
  ];

  async function generate() {
    if (!problem.trim()) return;
    setLoading(true); setIdea(null); setError(null);
    const phases = [...PHASES];
    let pi = 0;
    setPhase(phases[pi]);
    phaseRef.current = setInterval(() => {
      pi = (pi + 1) % phases.length;
      setPhase(phases[pi]);
    }, 1800);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problem: problem.trim() }),
      });

      const data = await res.json();
      clearInterval(phaseRef.current); setPhase(null);

      if (!res.ok) {
        throw new Error(data.error || "Generation failed");
      }

      setIdea(data.idea);

      // Save to history
      const entry = { problem: problem.trim(), idea: data.idea, timestamp: Date.now() };
      const updated = [entry, ...history].slice(0, 20);
      setHistory(updated);
      localStorage.setItem("breakthroughHistory", JSON.stringify(updated));
    } catch (e) {
      clearInterval(phaseRef.current); setPhase(null);
      setError(e.message || "Invention failed. The future resists easy answers.");
    }
    setLoading(false);
  }

  function handleHistorySelect(item) {
    setProblem(item.problem);
    setIdea(item.idea);
    setError(null);
  }

  function handleClearHistory() {
    setHistory([]);
    localStorage.removeItem("breakthroughHistory");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#06060f", color: "#e2e8f0", fontFamily: "system-ui", position: "relative", overflow: "hidden" }}>
      <style>{`
        @keyframes floatUp { 0%{transform:translateY(0) scale(1);opacity:0} 10%{opacity:1} 90%{opacity:0.5} 100%{transform:translateY(-100vh) scale(0.5);opacity:0} }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(1.4)} }
        @keyframes slideIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes glow { 0%,100%{box-shadow:0 0 20px #ff6b3544} 50%{box-shadow:0 0 60px #ff6b3566,0 0 100px #7c3aed33} }
        .cursor { animation: pulse 0.8s infinite; color: #ff6b35; }
        textarea:focus { outline: none; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #0d0d1f; } ::-webkit-scrollbar-thumb { background: #ff6b3566; border-radius: 2px; }
      `}</style>

      <FloatingParticles />

      <div style={{ position: "relative", zIndex: 1, maxWidth: 720, margin: "0 auto", padding: "48px 24px 80px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{ fontSize: 11, letterSpacing: 6, color: "#ff6b35", fontFamily: "monospace", fontWeight: 700, marginBottom: 16 }}>
            BREAKTHROUGH ENGINE
          </div>
          <h1 style={{ fontSize: "clamp(32px, 6vw, 56px)", fontWeight: 900, margin: 0, letterSpacing: -2, lineHeight: 1.05, fontFamily: "'Georgia', serif" }}>
            <span style={{ color: "#fff" }}>Invent the</span>
            <br />
            <span style={{ background: "linear-gradient(90deg, #ff6b35, #f59e0b, #ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Impossible
            </span>
          </h1>
          <p style={{ color: "#64748b", marginTop: 16, fontSize: 16, fontFamily: "'Georgia', serif", fontStyle: "italic" }}>
            Give it a problem. It invents the solution that doesn't exist yet.
          </p>
        </div>

        {/* Input */}
        <div style={{ background: "#0d0d1f", border: "1px solid #1e1e3a", borderRadius: 16, padding: 24, marginBottom: 24, animation: loading ? "glow 2s infinite" : "none" }}>
          <div style={{ fontSize: 11, color: "#64748b", letterSpacing: 3, fontFamily: "monospace", marginBottom: 12 }}>INPUT PROBLEM</div>
          <textarea
            value={problem}
            onChange={e => setProblem(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), generate())}
            placeholder="Describe the problem you want solved..."
            disabled={loading}
            style={{
              width: "100%", minHeight: 80, background: "transparent", border: "none",
              color: "#e2e8f0", fontSize: 18, resize: "none", boxSizing: "border-box",
              fontFamily: "'Georgia', serif", lineHeight: 1.6,
              caretColor: "#ff6b35",
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {examples.map(ex => (
                <button key={ex} onClick={() => setProblem(ex)} disabled={loading} style={{
                  background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 999,
                  color: "#94a3b8", fontSize: 11, padding: "4px 12px", cursor: loading ? "not-allowed" : "pointer",
                  fontFamily: "monospace", letterSpacing: 1,
                  transition: "all 0.2s",
                  opacity: loading ? 0.5 : 1,
                }}
                  onMouseEnter={e => { if (!loading) { e.target.style.borderColor = "#ff6b35"; e.target.style.color = "#ff6b35"; } }}
                  onMouseLeave={e => { e.target.style.borderColor = "#2a2a4a"; e.target.style.color = "#94a3b8"; }}
                >{ex}</button>
              ))}
            </div>
            <button onClick={generate} disabled={loading || !problem.trim()} style={{
              background: loading ? "#1a1a2e" : "linear-gradient(135deg, #ff6b35, #f59e0b)",
              border: "none", borderRadius: 12, padding: "12px 28px",
              color: "#fff", fontSize: 14, fontWeight: 800, cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "monospace", letterSpacing: 2,
              opacity: !problem.trim() ? 0.4 : 1,
              transition: "all 0.2s", transform: "none",
            }}
              onMouseEnter={e => { if (!loading && problem.trim()) e.target.style.transform = "scale(1.04)"; }}
              onMouseLeave={e => { e.target.style.transform = "none"; }}
            >
              {loading ? "INVENTING..." : "INVENT"}
            </button>
          </div>
        </div>

        {/* Phase indicators */}
        {loading && (
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 32, flexWrap: "wrap" }}>
            {PHASES.map(p => <PhaseBar key={p} phase={p} active={phase === p} />)}
          </div>
        )}

        {/* Result */}
        {idea && <IdeaCard idea={idea} />}

        {error && (
          <div style={{ textAlign: "center", color: "#ef4444", fontFamily: "monospace", fontSize: 14, padding: 24 }}>
            {error}
          </div>
        )}

        {!idea && !loading && (
          <div style={{ textAlign: "center", marginTop: 64, color: "#1e1e3a", fontSize: 64 }}>
            <div style={{ filter: "grayscale(0.5)" }}>&#9879;</div>
          </div>
        )}

        {/* History */}
        <HistoryPanel history={history} onSelect={handleHistorySelect} />

        {history.length > 0 && (
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <button
              onClick={handleClearHistory}
              style={{
                background: "none", border: "none", color: "#4a4a6a",
                fontSize: 11, fontFamily: "monospace", cursor: "pointer",
                transition: "color 0.2s",
              }}
              onMouseEnter={e => { e.target.style.color = "#ef4444"; }}
              onMouseLeave={e => { e.target.style.color = "#4a4a6a"; }}
            >
              Clear History
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
