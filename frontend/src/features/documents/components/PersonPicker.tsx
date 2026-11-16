import { Checkbox, Empty, Flex, Input, Modal, Typography } from 'antd';
import { useMemo, useState } from 'react';
import type { Person } from '../../../shared/api/types';
import PersonAvatar from '../../../shared/ui/PersonAvatar';

interface Props {
  title: string;
  /** Danh sách người có thể chọn (đã loại người không được phép, vd. chính mình). */
  people: Person[];
  exclude: number[];
  onClose: () => void;
  onPick: (ids: number[]) => void;
}

/** Hộp chọn nhiều người (người ký, người theo dõi). */
export default function PersonPicker({ title, people, exclude, onClose, onPick }: Props) {
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<number[]>([]);

  const list = useMemo(() => {
    const k = q.trim().toLowerCase();
    return people.filter(
      (p) => !exclude.includes(p.id) && (!k || `${p.fullName} ${p.unitName ?? ''} ${p.jobTitle ?? ''}`.toLowerCase().includes(k)),
    );
  }, [q, people, exclude]);

  const toggle = (id: number) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <Modal open title={title} onCancel={onClose} onOk={() => onPick(sel)} okText="Thêm đã chọn" cancelText="Huỷ" destroyOnHidden>
      <Input.Search
        placeholder="Tìm theo tên, chức danh, đơn vị"
        aria-label="Tìm người"
        allowClear
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div style={{ maxHeight: 360, overflowY: 'auto', marginTop: 12 }}>
        {list.length === 0 && <Empty description="Không tìm thấy" image={Empty.PRESENTED_IMAGE_SIMPLE} />}
        {list.map((p) => (
          <Checkbox
            key={p.id}
            checked={sel.includes(p.id)}
            onChange={() => toggle(p.id)}
            style={{ display: 'flex', alignItems: 'center', padding: '8px 4px', width: '100%' }}
          >
            <Flex align="center" gap={10}>
              <PersonAvatar id={p.id} name={p.fullName} />
              <div>
                <Typography.Text strong>{p.fullName}</Typography.Text>
                <div>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {[p.jobTitle, p.unitName].filter(Boolean).join(' · ')}
                  </Typography.Text>
                </div>
              </div>
            </Flex>
          </Checkbox>
        ))}
      </div>
    </Modal>
  );
}
