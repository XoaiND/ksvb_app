import type { SignRequestDetail } from '../api';
import { fmtDate, fmtDateTime } from '../utils';
import Avatar from './Avatar';
import { SignerStatusTag } from './Tag';

export function FlowList({ doc }: { doc: SignRequestDetail }) {
  return (
    <>
      {doc.participants.map((p) => (
        <div className="flowi" key={p.userId}>
          <Avatar id={p.userId} name={p.fullName} />
          <div className="who">
            <b>
              {doc.mode === 'SEQ' ? `${p.orderNo}. ` : ''}
              {p.fullName}
            </b>
            <small>{[p.jobTitle, p.unitName].filter(Boolean).join(' · ')}</small>
            {p.signedAt && <small>{fmtDateTime(p.signedAt)}</small>}
            {p.status === 'REJECTED' && p.note && <small style={{ color: 'var(--bad)' }}>Lý do: {p.note}</small>}
            {p.status === 'SIGNED' && p.note && <small>Ghi chú: {p.note}</small>}
          </div>
          <SignerStatusTag status={p.status} />
        </div>
      ))}
    </>
  );
}

export function Timeline({ doc }: { doc: SignRequestDetail }) {
  const ev: [string, string, string][] = [];
  ev.push([`Tạo tài liệu · ${doc.creator.fullName}`, '', '']);
  if (doc.submittedAt) ev.push([`${doc.creator.fullName} đã trình ký`, '', fmtDateTime(doc.submittedAt)]);
  doc.participants.forEach((p) => {
    if (p.status === 'SIGNED') ev.push([`${p.fullName} đã ký`, 'ok', fmtDateTime(p.signedAt)]);
    if (p.status === 'REJECTED')
      ev.push([`${p.fullName} đã từ chối`, 'bad', fmtDateTime(p.signedAt) + (p.note ? ` — “${p.note}”` : '')]);
  });
  if (doc.status === 'COMPLETED') ev.push(['Tài liệu hoàn thành', 'ok', fmtDateTime(doc.completedAt)]);
  if (doc.status === 'CANCELLED')
    ev.push(['Người tạo đã huỷ tài liệu', 'bad', doc.cancellationReason ? `Lý do: ${doc.cancellationReason}` : '']);
  if (doc.status === 'EXPIRED') ev.push(['Tài liệu quá hạn ký', 'bad', fmtDate(doc.deadline)]);
  return (
    <ul className="tl">
      {ev.map((e, i) => (
        <li key={i} className={e[1]}>
          {e[0]}
          {e[2] && <small>{e[2]}</small>}
        </li>
      ))}
    </ul>
  );
}
