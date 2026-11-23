import { Flex, Timeline, Typography } from 'antd';
import { ItemList, ItemRow } from './ItemList';
import type { SignRequestDetail } from '../../../shared/api/types';
import { fmtDate, fmtDateTime } from '../../../shared/lib/format';
import PersonAvatar from '../../../shared/ui/PersonAvatar';
import { SignerStatusTag } from './StatusTags';

/** Danh sách người ký theo thứ tự (tuần tự có bước nhiều người thì ghi "Bước k"), kèm trạng thái và ghi chú/lý do. */
export function FlowList({ doc }: { doc: SignRequestDetail }) {
  const grouped = new Set(doc.participants.map((p) => p.stepNo)).size < doc.participants.length;
  const prefix = (p: SignRequestDetail['participants'][number]) =>
    doc.mode !== 'SEQ' ? '' : grouped ? `Bước ${p.stepNo} · ` : `${p.orderNo}. `;
  return (
    <ItemList
      items={doc.participants}
      rowKey={(p) => p.userId}
      render={(p) => (
        <ItemRow
          extra={<SignerStatusTag status={p.status} />}
          avatar={<PersonAvatar id={p.userId} name={p.fullName} />}
          title={`${prefix(p)}${p.fullName}`}
          description={
            <Flex vertical>
              <span>{[p.jobTitle, p.unitName].filter(Boolean).join(' · ')}</span>
              {p.signedAt && <span>{fmtDateTime(p.signedAt)}</span>}
              {p.status === 'REJECTED' && p.note && <Typography.Text type="danger">Lý do: {p.note}</Typography.Text>}
              {p.status === 'SIGNED' && p.note && <span>Ghi chú: {p.note}</span>}
            </Flex>
          }
        />
      )}
    />
  );
}

/** Lịch sử: tạo, trình ký, từng chữ ký/từ chối, kết thúc. */
export function History({ doc }: { doc: SignRequestDetail }) {
  const ev: { text: string; color?: string; sub?: string }[] = [];
  ev.push({ text: `Tạo tài liệu · ${doc.creator.fullName}` });
  if (doc.submittedAt) ev.push({ text: `${doc.creator.fullName} đã trình ký`, sub: fmtDateTime(doc.submittedAt) });
  doc.participants.forEach((p) => {
    if (p.status === 'SIGNED') ev.push({ text: `${p.fullName} đã ký`, color: 'green', sub: fmtDateTime(p.signedAt) });
    if (p.status === 'REJECTED')
      ev.push({
        text: `${p.fullName} đã từ chối`,
        color: 'red',
        sub: fmtDateTime(p.signedAt) + (p.note ? ` — "${p.note}"` : ''),
      });
  });
  if (doc.status === 'COMPLETED') ev.push({ text: 'Tài liệu hoàn thành', color: 'green', sub: fmtDateTime(doc.completedAt) });
  if (doc.status === 'CANCELLED')
    ev.push({
      text: 'Người tạo đã huỷ tài liệu',
      color: 'red',
      sub: doc.cancellationReason ? `Lý do: ${doc.cancellationReason}` : '',
    });
  if (doc.status === 'EXPIRED') ev.push({ text: 'Tài liệu quá hạn ký', color: 'red', sub: fmtDate(doc.deadline) });
  return (
    <Timeline
      style={{ marginTop: 8 }}
      items={ev.map((e) => ({
        color: e.color,
        content: (
          <>
            {e.text}
            {e.sub && (
              <div>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {e.sub}
                </Typography.Text>
              </div>
            )}
          </>
        ),
      }))}
    />
  );
}
