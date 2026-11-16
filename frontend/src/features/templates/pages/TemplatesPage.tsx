import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import { App, Button, Card, Col, Empty, Flex, Form, Input, Modal, Row, Select, Tag, Typography } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import type { SignMode } from '../../../shared/api/types';
import { useSession } from '../../../shared/auth/session';
import { errorMessage } from '../../../shared/api/http';
import { ErrorNote, Loading } from '../../../shared/ui/PageState';
import PageHeader from '../../../shared/ui/PageHeader';
import { ItemList, ItemRow } from '../../documents/components/ItemList';
import PersonAvatar from '../../../shared/ui/PersonAvatar';
import PersonPicker from '../../documents/components/PersonPicker';
import { useUsers } from '../../documents/hooks';
import { templatesApi } from '../api';
import { templateKeys, useTemplates } from '../hooks';

export default function TemplatesPage() {
  const { me } = useSession();
  const { message } = App.useApp();
  const qc = useQueryClient();
  const nav = useNavigate();
  const templatesQ = useTemplates();
  const usersQ = useUsers();
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const [name, setName] = useState('');
  const [mode, setMode] = useState<SignMode>('SEQ');
  const [signers, setSigners] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);

  const error = templatesQ.error ?? usersQ.error;
  if (error) return <ErrorNote error={error} onRetry={() => void templatesQ.refetch()} />;
  if (!templatesQ.data || !usersQ.data) return <Loading />;
  const templates = templatesQ.data;
  const people = usersQ.data;
  const candidates = people.filter((p) => p.id !== me?.id);
  const nameOf = (id: number) => people.find((p) => p.id === id)?.fullName ?? `#${id}`;
  const reload = () => void qc.invalidateQueries({ queryKey: templateKeys.all });

  const close = () => {
    setOpen(false);
    setName('');
    setSigners([]);
    setMode('SEQ');
  };

  const save = async () => {
    if (!name.trim()) return void message.error('Nhập tên mẫu');
    if (signers.length === 0) return void message.error('Chọn ít nhất một người ký');
    setBusy(true);
    try {
      await templatesApi.create({ name: name.trim(), mode, signerIds: signers });
      message.success('Đã tạo mẫu');
      close();
      reload();
    } catch (e) {
      message.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    try {
      await templatesApi.remove(id);
      message.success('Đã xoá mẫu');
      reload();
    } catch (e) {
      message.error(errorMessage(e));
    }
  };

  return (
    <>
      <PageHeader
        title="Danh sách người nhận mẫu"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
            Tạo mẫu mới
          </Button>
        }
      />
      {templates.length === 0 && (
        <Card>
          <Empty description={'Chưa có mẫu nào. Bấm "Tạo mẫu mới".'} />
        </Card>
      )}
      <Row gutter={[16, 16]}>
        {templates.map((t) => (
          <Col xs={24} md={12} xl={8} key={t.id}>
            <Card
              title={t.name}
              extra={<Tag color="processing">{t.mode === 'SEQ' ? 'Tuần tự' : 'Song song'}</Tag>}
              actions={[
                <Button key="use" type="primary" size="small" onClick={() => nav('/compose', { state: { templateId: t.id } })}>
                  Dùng mẫu
                </Button>,
                <Button key="rm" danger size="small" onClick={() => remove(t.id)}>
                  Xoá
                </Button>,
              ]}
            >
              <ItemList
                items={t.signers}
                rowKey={(p) => p.id}
                render={(p, i) => (
                  <ItemRow
                    avatar={<PersonAvatar id={p.id} name={p.fullName} size={28} />}
                    title={`${t.mode === 'SEQ' ? `${i + 1}. ` : ''}${p.fullName}`}
                    description={p.jobTitle}
                  />
                )}
              />
              <Typography.Text type="secondary">Đã dùng {t.usedCount} lần</Typography.Text>
            </Card>
          </Col>
        ))}
      </Row>
      <Modal
        open={open && !picking}
        title="Tạo danh sách người nhận mẫu"
        onCancel={close}
        onOk={save}
        okText="Lưu mẫu"
        okButtonProps={{ loading: busy }}
        cancelText="Huỷ"
      >
        <Form layout="vertical">
          <Form.Item label="Tên mẫu" htmlFor="tplName">
            <Input id="tplName" placeholder="Ví dụ: Tờ trình ngân sách" value={name} onChange={(e) => setName(e.target.value)} />
          </Form.Item>
          <Form.Item label="Cách ký" htmlFor="tplMode">
            <Select
              id="tplMode"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'SEQ', label: 'Tuần tự' },
                { value: 'PAR', label: 'Song song' },
              ]}
            />
          </Form.Item>
          <Form.Item label="Người ký">
            <Flex gap={6} wrap style={{ marginBottom: 8 }}>
              {signers.map((id, i) => (
                <Tag
                  key={id}
                  closable
                  closeIcon={<CloseOutlined aria-label={`Bỏ ${nameOf(id)}`} />}
                  onClose={() => setSigners(signers.filter((x) => x !== id))}
                >
                  {mode === 'SEQ' ? `${i + 1}. ` : ''}
                  {nameOf(id)}
                </Tag>
              ))}
            </Flex>
            <Button size="small" icon={<PlusOutlined />} onClick={() => setPicking(true)}>
              Thêm người ký
            </Button>
          </Form.Item>
        </Form>
      </Modal>
      {open && picking && (
        <PersonPicker
          title="Chọn người ký cho mẫu"
          people={candidates}
          exclude={signers}
          onClose={() => setPicking(false)}
          onPick={(ids) => {
            setSigners([...signers, ...ids]);
            setPicking(false);
          }}
        />
      )}
    </>
  );
}
