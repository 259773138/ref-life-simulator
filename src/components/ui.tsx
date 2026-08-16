/**
 * 共享 UI 组件（报刊杂志排版元素）
 */
import React from 'react';

/** ①~㉖ 圈号渲染 */
const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫', '⑬', '⑭', '⑮', '⑯', '⑰', '⑱', '⑲', '⑳', '㉑', '㉒', '㉓', '㉔', '㉕', '㉖', '㉗', '㉘', '㉙', '㉚'];
export function circled(n: number): string {
  return CIRCLED[n - 1] ?? String(n);
}

/** ⚡ ━━━━━━━━━━━━━━━━━━━ ⚡ 风格分隔线 */
export function Divider({ variant = 'bolt', label }: { variant?: 'bolt' | 'line' | 'dash'; label?: string }) {
  if (variant === 'bolt') {
    return (
      <div className="divider-bolt" aria-hidden>
        <span>⚡</span>
        <span className="tracking-[0.25em] text-[13px]">━━━━━━━━━━━━━━━━━━━</span>
        <span>⚡</span>
      </div>
    );
  }
  if (variant === 'dash') {
    return (
      <div className="divider-dash" aria-hidden>
        ────── ✦ ──────
      </div>
    );
  }
  return (
    <div className="divider-line" aria-hidden>
      {label ? `──────── ${label} ────────` : '────────────────────────'}
    </div>
  );
}

/** 模块标题：Emoji 锚点 + 标题 + 右侧内容 */
export function SectionTitle({ icon, title, right, sub }: { icon: string; title: string; right?: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-2">
      <div className="flex items-center gap-2.5">
        <span className="text-xl leading-none">{icon}</span>
        <div>
          <h2 className="magazine-section-title">{title}</h2>
          {sub && <p className="text-[11px] text-ink/50 mt-0.5 tracking-wider">{sub}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

/** 纸质卡片 */
export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`magazine-card p-5 ${className}`}>{children}</div>;
}

/** 状态徽章 */
export function Chip({ children, tone = 'default' }: { children: React.ReactNode; tone?: 'default' | 'accent' | 'gold' | 'moss' | 'steel' }) {
  const tones: Record<string, string> = {
    default: 'bg-ink/5 text-ink/70 border-ink/15',
    accent: 'bg-accent/10 text-accent border-accent/30',
    gold: 'bg-gold/10 text-gold border-gold/30',
    moss: 'bg-moss/10 text-moss border-moss/30',
    steel: 'bg-steel/10 text-steel border-steel/30',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[11px] border ${tones[tone]}`}>
      {children}
    </span>
  );
}

/** 数值展示（属性值+评级） */
export function attrRating(v: number): { text: string; color: string } {
  if (v >= 90) return { text: '顶尖', color: 'text-accent' };
  if (v >= 80) return { text: '优秀', color: 'text-accent/80' };
  if (v >= 70) return { text: '良好', color: 'text-gold' };
  if (v >= 50) return { text: '中等', color: 'text-ink/60' };
  if (v >= 30) return { text: '偏弱', color: 'text-steel/70' };
  if (v >= 10) return { text: '很差', color: 'text-steel/50' };
  return { text: '极差', color: 'text-steel/40' };
}

/** 空状态提示 */
export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="text-[13px] text-ink/45 italic py-2">{children}</div>;
}
