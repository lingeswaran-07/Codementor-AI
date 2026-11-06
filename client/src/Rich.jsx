import { useState } from 'react';

// Tiny renderer: ```code blocks```, `inline code` and **bold** (no extra dependencies)
function Inline({ text }) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((p, i) =>
    p.startsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong>
    : p.startsWith('`') ? <code key={i} className="ic">{p.slice(1, -1)}</code>
    : p);
}

function CodeBlock({ lang, code }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard?.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1200); };
  return (
    <div className="codeblock">
      <div className="codebar"><span>{lang || 'code'}</span><button onClick={copy}>{copied ? 'Copied' : 'Copy'}</button></div>
      <pre><code>{code}</code></pre>
    </div>
  );
}

export default function Rich({ text }) {
  const parts = text.split(/```(\w*)\n?([\s\S]*?)(?:```|$)/g);
  const out = [];
  for (let i = 0; i < parts.length; i += 3) {
    if (parts[i]) out.push(<p key={`t${i}`}><Inline text={parts[i]} /></p>);
    if (i + 2 < parts.length) out.push(<CodeBlock key={`c${i}`} lang={parts[i + 1]} code={parts[i + 2].replace(/\n$/, '')} />);
  }
  return <div className="rich">{out}</div>;
}
