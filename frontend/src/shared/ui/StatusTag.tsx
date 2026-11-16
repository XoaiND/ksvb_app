import { Tag } from 'antd';

/** Nhãn trạng thái chung: `label` + `color` (tên preset của Ant Design Tag); bảng ánh xạ do từng feature giữ. */
export const StatusTag = ({ label, color = 'default' }: { label: string; color?: string }) => <Tag color={color}>{label}</Tag>;
