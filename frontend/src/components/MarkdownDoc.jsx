export default function MarkdownDoc({ content }) {
  const lines = content.split("\n");
  const elements = [];
  let i = 0;

  const renderInline = (text) => {
    const parts = [];
    const re = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)|\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`|(https?:\/\/[^\s,)>]+)/g;
    let last = 0, m, key = 0;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last) parts.push(text.slice(last, m.index));
      if (m[1])      parts.push(<a key={key++} href={m[2]} target="_blank" rel="noreferrer">{m[1]}</a>);
      else if (m[3]) parts.push(<strong key={key++}>{m[3]}</strong>);
      else if (m[4]) parts.push(<em key={key++}>{m[4]}</em>);
      else if (m[5]) parts.push(<code key={key++} className="md-code">{m[5]}</code>);
      else if (m[6]) parts.push(<a key={key++} href={m[6]} target="_blank" rel="noreferrer">{m[6]}</a>);
      last = m.index + m[0].length;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts;
  };

  while (i < lines.length) {
    const line = lines[i];

    // front-matter
    if (i === 0 && line.trim() === "---") {
      const fmLines = [];
      i++;
      while (i < lines.length && lines[i].trim() !== "---") { fmLines.push(lines[i]); i++; }
      i++;
      elements.push(
        <div key="fm" className="md-frontmatter">
          {fmLines.map((l, j) => {
            const col = l.indexOf(":");
            if (col === -1) return null;
            return (
              <div key={j} className="md-fm-row">
                <span className="md-fm-key">{l.slice(0, col).trim()}</span>
                <span className="md-fm-val">{l.slice(col + 1).trim()}</span>
              </div>
            );
          })}
        </div>
      );
      continue;
    }

    // headings
    if (/^#{1,6}\s/.test(line)) {
      const level = line.match(/^(#+)/)[1].length;
      const text  = line.replace(/^#+\s/, "");
      const Tag   = `h${Math.min(level, 6)}`;
      elements.push(<Tag key={i} className={`md-h md-h${level}`}>{renderInline(text)}</Tag>);
      i++; continue;
    }

    // hr
    if (/^---+$/.test(line.trim())) {
      elements.push(<hr key={i} className="md-hr" />);
      i++; continue;
    }

    // unordered list
    if (/^[-*+]\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^[-*+]\s/.test(lines[i])) {
        items.push(<li key={i}>{renderInline(lines[i].replace(/^[-*+]\s/, ""))}</li>);
        i++;
      }
      elements.push(<ul key={`ul${i}`} className="md-ul">{items}</ul>);
      continue;
    }

    // ordered list
    if (/^\d+\.\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(<li key={i}>{renderInline(lines[i].replace(/^\d+\.\s/, ""))}</li>);
        i++;
      }
      elements.push(<ol key={`ol${i}`} className="md-ol">{items}</ol>);
      continue;
    }

    // blank line
    if (line.trim() === "") { elements.push(<div key={i} className="md-gap" />); i++; continue; }

    // paragraph
    elements.push(<p key={i} className="md-p">{renderInline(line)}</p>);
    i++;
  }

  return <div className="md-body">{elements}</div>;
}
