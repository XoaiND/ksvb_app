import { AVATAR_COLORS, initials } from '../utils';

export default function Avatar({ id, name, size }: { id: number; name: string; size?: number }) {
  const style = {
    background: AVATAR_COLORS[id % AVATAR_COLORS.length],
    ...(size ? { width: size, height: size } : {}),
  };
  return (
    <span className="av" style={style} title={name}>
      {initials(name)}
    </span>
  );
}
