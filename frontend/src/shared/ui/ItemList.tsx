import { Flex, Typography, theme } from 'antd';
import type { Key, ReactNode } from 'react';

interface RowProps {
  avatar?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Nút thao tác bên phải. */
  actions?: ReactNode[];
  /** Nội dung phụ bên phải (vd. thẻ trạng thái). */
  extra?: ReactNode;
}

/** Một dòng danh sách (thay `List.Item` của Ant Design, đã deprecated từ 6.6). */
export function ItemRow({ avatar, title, description, actions, extra }: RowProps) {
  return (
    <Flex align="center" gap={12} style={{ padding: '10px 0' }}>
      {avatar}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500 }}>{title}</div>
        {description && (
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            {description}
          </Typography.Text>
        )}
      </div>
      {extra}
      {actions && actions.length > 0 && (
        <Flex gap={4} wrap>
          {actions}
        </Flex>
      )}
    </Flex>
  );
}

interface ListProps<T> {
  items: T[];
  rowKey: (item: T, index: number) => Key;
  render: (item: T, index: number) => ReactNode;
  /** Hiện khi danh sách rỗng. */
  empty?: ReactNode;
}

/** Danh sách ngắn có đường kẻ giữa các dòng, màu theo theme. */
export function ItemList<T>({ items, rowKey, render, empty }: ListProps<T>) {
  const { token } = theme.useToken();
  if (items.length === 0) return <>{empty ?? null}</>;
  return (
    <div role="list">
      {items.map((it, i) => (
        <div
          role="listitem"
          key={rowKey(it, i)}
          style={{ borderBottom: i < items.length - 1 ? `1px solid ${token.colorSplit}` : undefined }}
        >
          {render(it, i)}
        </div>
      ))}
    </div>
  );
}
