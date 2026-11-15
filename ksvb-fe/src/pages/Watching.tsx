import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { ErrorNote, Loading } from '../components/Async';
import Icon from '../components/Icon';
import Progress from '../components/Progress';
import { DocStatusTag } from '../components/Tag';
import { useAsync } from '../hooks/useAsync';
import { fmtDate } from '../utils';

export default function Watching() {
  const nav = useNavigate();
  const { data, error, reload } = useAsync(() => api.listSignRequests({ scope: 'watching', size: 50 }), []);

  return (
    <>
      <div className="pg-t">
        <h2>Tôi theo dõi</h2>
      </div>
      <div className="card">
        <p className="mut" style={{ marginTop: 0 }}>
          Các tài liệu bạn được thêm vào danh sách theo dõi (chỉ xem, không ký).
        </p>
        {error && <ErrorNote error={error} onRetry={reload} />}
        {!error && !data && <Loading />}
        {data && data.content.length === 0 && <div className="empty">Bạn chưa theo dõi tài liệu nào</div>}
        {data && data.content.length > 0 && (
          <div className="scroll">
            <table className="tbl resp">
              <thead>
                <tr>
                  <th>Tiêu đề</th>
                  <th>Người tạo</th>
                  <th>Hạn ký</th>
                  <th>Tiến độ</th>
                  <th>Trạng thái</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.content.map((d) => (
                  <tr key={d.id}>
                    <td className="nolbl t">
                      <a onClick={() => nav(`/documents/${d.id}`)}>{d.title}</a>
                      <div className="mut" style={{ fontWeight: 400, fontSize: 12 }}>
                        {d.code ?? 'Chưa có số hiệu'}
                      </div>
                    </td>
                    <td data-l="Người tạo">{d.creator.fullName}</td>
                    <td data-l="Hạn ký">{fmtDate(d.deadline)}</td>
                    <td data-l="Tiến độ">
                      <Progress signed={d.signedCount} total={d.signerCount} status={d.status} />
                    </td>
                    <td data-l="Trạng thái">
                      <DocStatusTag status={d.status} />
                    </td>
                    <td className="nolbl">
                      <div className="acts">
                        <button className="btn ico" aria-label="Xem" onClick={() => nav(`/documents/${d.id}`)}>
                          <Icon name="eye" size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
