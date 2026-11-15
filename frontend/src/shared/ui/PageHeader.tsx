import { Flex, Typography } from 'antd';
import type { ReactNode } from 'react';

export default function PageHeader({ title, extra, before }: { title: ReactNode; extra?: ReactNode; before?: ReactNode }) {
  return (
    <Flex justify="space-between" align="center" wrap gap={12} style={{ marginBottom: 16 }}>
      <Flex align="center" gap={10} wrap>
        {before}
        <Typography.Title level={2} style={{ margin: 0, fontSize: 22 }}>
          {title}
        </Typography.Title>
      </Flex>
      {extra && (
        <Flex gap={8} wrap>
          {extra}
        </Flex>
      )}
    </Flex>
  );
}
