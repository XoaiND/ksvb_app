import type { Participant } from '../api';
import { fmtDateTime } from '../utils';

interface Props {
  title: string;
  code: string;
  participants: Participant[];
  /** id người đang xem, và có đang ở màn ký không (để làm nổi ô chữ ký của họ). */
  meId?: number;
  signMode: boolean;
}

/** Trang giấy sơ đồ chữ ký (luôn nền trắng, kể cả giao diện tối). Nội dung PDF thật tải ở phần tệp đính kèm. */
export default function Paper({ title, code, participants, meId, signMode }: Props) {
  return (
    <div className="paper">
      <div className="ph">
        CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM<small>Độc lập – Tự do – Hạnh phúc</small>
      </div>
      <h4>{title.toUpperCase()}</h4>
      <div className="mut" style={{ textAlign: 'center', fontSize: 11 }}>Số: {code}</div>
      <div className="ln" style={{ width: '92%' }} />
      <div className="ln" />
      <div className="ln" style={{ width: '96%' }} />
      <div className="ln" style={{ width: '88%' }} />
      <div className="ln" />
      <div className="ln" style={{ width: '70%' }} />
      <div style={{ height: 6 }} />
      <div className="ln" />
      <div className="ln" style={{ width: '94%' }} />
      <div className="ln" style={{ width: '82%' }} />
      <div className="sigrow">
        {participants.map((p) => (
          <SignBox key={p.userId} p={p} mine={signMode && p.userId === meId} />
        ))}
      </div>
    </div>
  );
}

function SignBox({ p, mine }: { p: Participant; mine: boolean }) {
  const who = (
    <>
      <b>{p.fullName}</b>
      {p.jobTitle}
    </>
  );
  if (p.status === 'SIGNED')
    return (
      <div className="sig ok">
        {who}
        <div style={{ margin: '4px 0', fontWeight: 700 }}>ĐÃ KÝ</div>
        <small>{fmtDateTime(p.signedAt)}</small>
      </div>
    );
  if (p.status === 'REJECTED')
    return (
      <div className="sig rej">
        {who}
        <div style={{ margin: '4px 0', fontWeight: 700 }}>TỪ CHỐI</div>
        <small>{fmtDateTime(p.signedAt)}</small>
      </div>
    );
  if (mine && p.status === 'PENDING')
    return (
      <div className="sig me">
        {who}
        <div style={{ margin: '8px 0', fontWeight: 700 }}>Chữ ký của bạn</div>
      </div>
    );
  return (
    <div className="sig">
      <b>{p.fullName}</b>
      <span className="mut">{p.jobTitle}</span>
      <div className="mut" style={{ marginTop: 10 }}>{p.status === 'PENDING' ? 'Chờ ký' : 'Chưa đến lượt'}</div>
    </div>
  );
}
