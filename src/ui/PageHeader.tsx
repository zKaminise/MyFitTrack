import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

export function BackHeader({ title, right }: { title: string; right?: ReactNode }) {
  const nav = useNavigate();
  return (
    <div className="page-head">
      <div className="row">
        <button className="icon-btn" onClick={() => nav(-1)} aria-label="Voltar">
          ←
        </button>
        <h2 style={{ fontSize: 22 }}>{title}</h2>
      </div>
      {right}
    </div>
  );
}
