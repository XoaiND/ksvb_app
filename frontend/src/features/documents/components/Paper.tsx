import { ConfigProvider, Flex, Typography, theme } from 'antd';
import type { Participant } from '../../../shared/api/types';
import { fmtDateTime } from '../../../shared/format';

type PaperParticipant = Pick<Participant, 'userId' | 'fullName' | 'status'> & Partial<Pick<Participant, 'jobTitle' | 'signedAt'>>;

interface Props {
  title: string;
  code: string;
  participants: PaperParticipant[];
  /** id người đang xem, và có đang ở màn ký không (để làm nổi ô chữ ký của họ). */
  meId?: number;
  signMode: boolean;
}

/**
 * Trang giấy sơ đồ chữ ký: luôn theo theme sáng (giấy trắng) kể cả khi giao diện tối, màu lấy từ token.
 * Nội dung PDF thật tải ở phần tệp đính kèm.
 */
export default function Paper(props: Props) {
  return (
    <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm }}>
      <PaperBody {...props} />
    </ConfigProvider>
  );
}

function PaperBody({ title, code, participants, meId, signMode }: Props) {
  const { token } = theme.useToken();
  return (
    <div
      data-testid="paper"
      style={{
        background: token.colorBgContainer,
        color: token.colorText,
        border: `1px solid ${token.colorBorderSecondary}`,
        borderRadius: token.borderRadius,
        boxShadow: token.boxShadowTertiary,
        padding: 24,
        maxWidth: 560,
        margin: '0 auto',
      }}
    >
      <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700 }}>
        CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
        <div style={{ fontWeight: 400 }}>Độc lập – Tự do – Hạnh phúc</div>
      </div>
      <Typography.Title level={5} style={{ textAlign: 'center', margin: '14px 0 2px' }}>
        {title.toUpperCase()}
      </Typography.Title>
      <div style={{ textAlign: 'center', fontSize: 11, color: token.colorTextSecondary }}>Số: {code}</div>
      {['92%', '100%', '96%', '88%', '100%', '70%'].map((w, i) => (
        <div key={i} style={{ height: 6, width: w, background: token.colorFillSecondary, borderRadius: 3, margin: '7px 0' }} />
      ))}
      <Flex gap={12} wrap justify="flex-end" style={{ marginTop: 18 }}>
        {participants.map((p) => (
          <SignBox key={p.userId} p={p} mine={signMode && p.userId === meId} />
        ))}
      </Flex>
    </div>
  );
}

function SignBox({ p, mine }: { p: PaperParticipant; mine: boolean }) {
  const { token } = theme.useToken();
  let tone = {
    bd: token.colorBorder,
    bg: 'transparent',
    fg: token.colorTextSecondary,
    mark: p.status === 'PENDING' ? 'Chờ ký' : 'Chưa đến lượt',
  };
  if (p.status === 'SIGNED') {
    tone = { bd: token.colorSuccessBorder, bg: token.colorSuccessBg, fg: token.colorSuccessText, mark: 'ĐÃ KÝ' };
  } else if (p.status === 'REJECTED') {
    tone = { bd: token.colorErrorBorder, bg: token.colorErrorBg, fg: token.colorErrorText, mark: 'TỪ CHỐI' };
  } else if (mine && p.status === 'PENDING') {
    tone = { bd: token.colorPrimaryBorder, bg: token.colorPrimaryBg, fg: token.colorPrimaryText, mark: 'Chữ ký của bạn' };
  }
  return (
    <div
      style={{
        width: 150,
        minHeight: 96,
        textAlign: 'center',
        fontSize: 12,
        border: `1px dashed ${tone.bd}`,
        background: tone.bg,
        borderRadius: token.borderRadiusSM,
        padding: 8,
      }}
    >
      <div style={{ fontWeight: 600 }}>{p.fullName}</div>
      <div style={{ color: token.colorTextSecondary }}>{p.jobTitle}</div>
      <div style={{ margin: '6px 0', fontWeight: 700, color: tone.fg }}>{tone.mark}</div>
      {(p.status === 'SIGNED' || p.status === 'REJECTED') && <small>{fmtDateTime(p.signedAt)}</small>}
    </div>
  );
}
