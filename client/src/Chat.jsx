import { useEffect, useRef, useState } from "react";
import { streamChat, getHistory, clearHistory } from "./api.js";
import Rich from "./Rich.jsx";

const SUGGESTIONS = [
  "Give me an overview of this project",
  "How is the project structured?",
  "How does authentication work?",
  "How do I run this locally?",
];

export default function Chat({ repo }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const bottom = useRef();

  useEffect(() => {
    getHistory(repo._id)
      .then(setMessages)
      .finally(() => setLoading(false));
  }, [repo._id]);
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const patchLast = (fn) =>
    setMessages((m) => m.map((x, i) => (i === m.length - 1 ? fn(x) : x)));

  async function ask(question) {
    question = question.trim();
    if (!question || busy) return;
    setQ("");
    setBusy(true);
    setMessages((m) => [
      ...m,
      { role: "user", text: question },
      { role: "ai", text: "", sources: [], live: true },
    ]);
    await streamChat(repo._id, question, {
      onSources: (sources) => patchLast((x) => ({ ...x, sources })),
      onToken: (t) => patchLast((x) => ({ ...x, text: x.text + t })),
      onError: (msg) =>
        patchLast((x) => ({ ...x, text: x.text + `\n\n**Error:** ${msg}` })),
    });
    patchLast((x) => ({ ...x, live: false }));
    setBusy(false);
  }

  async function clear() {
    if (!confirm("Delete the saved chat history for this repository?")) return;
    await clearHistory(repo._id);
    setMessages([]);
  }

  return (
    <div className="chat">
      <header>
        <div>
          <h2>{repo.fullName}</h2>
          <small>{repo.filesIndexed} files indexed</small>
        </div>
        {messages.length > 0 && (
          <button className="link" onClick={clear}>
            Clear history
          </button>
        )}
      </header>
      <div className="messages">
        {!loading && messages.length === 0 && (
          <div className="starter">
            <h3>What would you like to know?</h3>
            <div className="chips">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => ask(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            {m.role === "ai" ? (
              m.text ? (
                <Rich text={m.text} />
              ) : (
                <div className="dots">
                  <i />
                  <i />
                  <i />
                </div>
              )
            ) : (
              <p>{m.text}</p>
            )}
            {m.role === "ai" && m.sources?.length > 0 && (
              <div className="sources">
                <span>Sources</span>
                {[
                  ...new Map(
                    m.sources.map((s) => [`${s.path}:${s.startLine}`, s]),
                  ).values(),
                ].map((s, j) => (
                  <code key={j}>
                    {s.path}:{s.startLine}-{s.endLine}
                  </code>
                ))}
              </div>
            )}
          </div>
        ))}
        <div ref={bottom} />
      </div>
      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask about this codebase…"
          aria-label="Question"
        />
        <button className="btn primary" disabled={busy || !q.trim()}>
          {busy ? "Thinking…" : "Ask"}
        </button>
      </form>
    </div>
  );
}
