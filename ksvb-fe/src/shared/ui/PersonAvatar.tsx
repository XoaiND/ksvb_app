import { Avatar, theme } from 'antd';
import { initials } from '../format';

/** Ảnh đại diện chữ cái đầu; màu chọn theo id từ bảng màu của theme (không ghi cứng). */
export default function PersonAvatar({ id, name, size }: { id: number; name: string; size?: number }) {
  const { token } = theme.useToken();
  const palette = [token.blue, token.purple, token.green, token.orange, token.cyan, token.magenta, token.geekblue, token.volcano];
  return (
    <Avatar size={size} style={{ background: palette[id % palette.length], flex: 'none' }} aria-hidden>
      {initials(name)}
    </Avatar>
  );
}
