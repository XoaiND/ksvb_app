import { useEffect, type ReactNode } from 'react';
import Icon from './Icon';

interface Props {
  title: ReactNode;
  children: ReactNode;
  footer: ReactNode;
  onClose: () => void;
  wide?: boolean;
}

export default function Modal({ title, children, footer, onClose, wide }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modalbg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={'modal' + (wide ? ' wide' : '')} role="dialog" aria-modal="true">
        <div className="mh">
          <span>{title}</span>
          <button className="btn ico" style={{ border: 0 }} onClick={onClose} aria-label="Đóng">
            <Icon name="x" />
          </button>
        </div>
        <div className="mb">{children}</div>
        <div className="mf">{footer}</div>
      </div>
    </div>
  );
}
