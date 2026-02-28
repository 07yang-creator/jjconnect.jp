/**
 * TipTap / ProseMirror JSON → HTML (server-side safe, no deps)
 * Handles common node types from StarterKit + Image, Link.
 */

import { escapeHtml } from './escape-html';

type ContentNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: ContentNode[];
  text?: string;
  marks?: Array< { type: string; attrs?: Record<string, unknown> }>;
};

function applyMarks(text: string, marks?: ContentNode['marks']): string {
  if (!marks || marks.length === 0) return escapeHtml(text);
  let out = escapeHtml(text);
  for (const mark of marks) {
    switch (mark.type) {
      case 'bold':
        out = `<strong>${out}</strong>`;
        break;
      case 'italic':
        out = `<em>${out}</em>`;
        break;
      case 'code':
        out = `<code>${out}</code>`;
        break;
      case 'link': {
        const href = (mark.attrs?.href as string) || '#';
        const target = mark.attrs?.target as string | undefined;
        const rel = target === '_blank' ? ' rel="noopener noreferrer"' : '';
        out = `<a href="${escapeHtml(href)}"${target ? ` target="${escapeHtml(target)}"` : ''}${rel}>${out}</a>`;
        break;
      }
      default:
        break;
    }
  }
  return out;
}

function renderInline(node: ContentNode): string {
  if (node.type === 'text') {
    return node.text ? applyMarks(node.text, node.marks) : '';
  }
  if (node.type === 'hardBreak') {
    return '<br>';
  }
  return '';
}

function renderBlock(node: ContentNode): string {
  switch (node.type) {
    case 'paragraph': {
      const inner = (node.content || []).map((n) => renderNode(n)).join('');
      return inner ? `<p>${inner}</p>` : '<p></p>';
    }
    case 'heading': {
      const level = Math.min(3, Math.max(1, (node.attrs?.level as number) || 1));
      const tag = `h${level}`;
      const inner = (node.content || []).map((n) => renderNode(n)).join('');
      return `<${tag}>${inner}</${tag}>`;
    }
    case 'bulletList': {
      const items = (node.content || []).map((n) => renderBlock(n)).join('');
      return `<ul>${items}</ul>`;
    }
    case 'orderedList': {
      const items = (node.content || []).map((n) => renderBlock(n)).join('');
      return `<ol>${items}</ol>`;
    }
    case 'listItem': {
      const inner = (node.content || []).map((n) => renderNode(n)).join('');
      return `<li>${inner}</li>`;
    }
    case 'blockquote': {
      const inner = (node.content || []).map((n) => renderNode(n)).join('');
      return `<blockquote>${inner}</blockquote>`;
    }
    case 'codeBlock': {
      const inner = (node.content || [])
        .map((n) => (n.type === 'text' ? escapeHtml(n.text || '') : ''))
        .join('');
      return `<pre><code>${inner}</code></pre>`;
    }
    case 'image': {
      const src = (node.attrs?.src as string) || '';
      const alt = (node.attrs?.alt as string) || '';
      const title = (node.attrs?.title as string) ?? '';
      const cls = (node.attrs?.class as string) ?? '';
      if (!src) return '';
      const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
      const classAttr = cls ? ` class="${escapeHtml(cls)}"` : ''; // e.g. float-left, float-right
      return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"${titleAttr}${classAttr} loading="lazy" />`;
    }
    default: {
      const inner = (node.content || []).map((n) => renderNode(n)).join('');
      return inner ? `<div class="tiptap-${node.type}">${inner}</div>` : '';
    }
  }
}

function renderNode(node: ContentNode): string {
  if (node.type === 'text' || node.type === 'hardBreak') {
    return renderInline(node);
  }
  return renderBlock(node);
}

/**
 * Convert TipTap JSON (doc with content array) to HTML.
 * Safe for server-side: escapes text and attribute values.
 */
export function tiptapJsonToHtml(content: unknown): string {
  if (!content || typeof content !== 'object') return '';
  const obj = content as { type?: string; content?: ContentNode[] };
  if (obj.type !== 'doc' || !Array.isArray(obj.content)) return '';
  return obj.content.map((n) => renderNode(n)).join('');
}
