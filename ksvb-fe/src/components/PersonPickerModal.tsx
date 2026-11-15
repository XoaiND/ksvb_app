import { useMemo, useState } from 'react';
import type { Person } from '../api';
import Avatar from './Avatar';
import Modal from './Modal';

interface Props {
  title: string;
  /** Danh sách người có thể chọn (đã loại người không được phép, vd. chính mình). */
  people: Person[];
  exclude: number[];
  onClose: () => void;
  onPick: (ids: number[]) => void;
}

export default function PersonPickerModal({ title, people, exclude, onClose, onPick }: Props) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<number[]>([]);

  const list = useMemo(() => {
    const k = q.trim().toLowerCase();
    return people.filter(
      (p) => !exclude.includes(p.id) && (!k || `${p.fullName} ${p.unitName} ${p.jobTitle ?? ''}`.toLowerCase().includes(k)),
    );
  }, [q, people, exclude]);

  const toggle = (id: number) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Huỷ
          </button>
          <button className="btn pri" onClick={() => onPick(sel)}>
            Thêm đã chọn
          </button>
        </>
      }
    >
      <input
        type="text"
        placeholder="Tìm theo tên, chức danh, đơn vị"
        style={{ width: '100%' }}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="pick">
        {list.length === 0 && (
          <div className="empty" style={{ padding: 20 }}>
            Không tìm thấy
          </div>
        )}
        {list.map((p) => (
          <label key={p.id}>
            <input type="checkbox" checked={sel.includes(p.id)} onChange={() => toggle(p.id)} />
            <Avatar id={p.id} name={p.fullName} />
            <div style={{ flex: 1 }}>
              <b>{p.fullName}</b>
              <div className="mut" style={{ fontSize: 12 }}>
                {[p.jobTitle, p.unitName].filter(Boolean).join(' · ')}
              </div>
            </div>
          </label>
        ))}
      </div>
    </Modal>
  );
}
