import type { DocStatus, SignerStatus } from '../../../shared/api/types';
import { StatusTag } from '../../../shared/ui/StatusTag';
import { DOC_STATUS, SIGNER_STATUS } from '../lib/constants';

export const DocStatusTag = ({ status }: { status: DocStatus }) => <StatusTag {...(DOC_STATUS[status] ?? { label: '—' })} />;

export const SignerStatusTag = ({ status }: { status: SignerStatus }) => <StatusTag {...SIGNER_STATUS[status]} />;
