'use client';
import { useEffect, useRef, useState } from 'react';
import {
  BoardingRequestReceiptSchema,
  BoardingRequestStatusViewSchema,
  type BoardingRequestKind,
  type BoardingRequestReceipt,
  type BoardingRequestStatusView,
} from '@unihood/contracts';
import { Button, Icon, Modal, Notice } from '@unihood/ui';

type Props = { endpoint: string | null; boardingId: string; contactAvailable: boolean; locationRequestAvailable: boolean };
const copy: Record<BoardingRequestKind, { title: string; intro: string; submit: string }> = {
  CONTACT_OWNER: {
    title: 'Contact owner',
    intro: 'This is a local simulation. No message is delivered, no owner is notified, and no phone number or email is shared or stored.',
    submit: 'Send mock contact request',
  },
  REQUEST_LOCATION: {
    title: 'Request location',
    intro: 'The owner has not published an exact point. This mock request does not notify the owner, disclose coordinates, change visibility or grant access to private directions.',
    submit: 'Send mock location request',
  },
};

export function BoardingRequestActions({ endpoint, boardingId, contactAvailable, locationRequestAvailable }: Props) {
  const [kind, setKind] = useState<BoardingRequestKind | null>(null);
  const [requestKey, setRequestKey] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<BoardingRequestReceipt | null>(null);
  const [status, setStatus] = useState<BoardingRequestStatusView | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const heading = useRef<HTMLHeadingElement>(null), alert = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (receipt) heading.current?.focus();
    else if (error) alert.current?.focus();
  }, [receipt, error]);

  if (!contactAvailable && !locationRequestAvailable) return null;

  const open = (next: BoardingRequestKind) => {
    setKind(next);
    setRequestKey(crypto.randomUUID());
    setAcknowledged(false);
    setReceipt(null);
    setStatus(null);
    setError('');
    setNotice('');
  };
  const close = () => {
    setKind(null);
    setReceipt(null);
    setStatus(null);
    setError('');
    setNotice('');
    setAcknowledged(false);
  };
  const submit = async () => {
    if (!kind || !endpoint || !acknowledged || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        credentials: 'omit',
        body: JSON.stringify({ requestKey, boardingId, kind, syntheticAcknowledged: true }),
      });
      if (!response.ok) throw new Error();
      const next = BoardingRequestReceiptSchema.parse(await response.json());
      if (next.boardingId !== boardingId || next.kind !== kind) throw new Error();
      setReceipt(next);
      setNotice(next.duplicate ? 'This mock request was already pending. No duplicate was created.' : '');
    } catch {
      setError('The mock request could not be recorded. Nothing was sent, no owner was notified and no location was disclosed. Retry the unchanged request.');
    } finally {
      setBusy(false);
    }
  };
  const checkStatus = async () => {
    if (!endpoint || !receipt || busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`${endpoint}/${receipt.requestId}`, { cache: 'no-store', credentials: 'omit' });
      if (!response.ok) throw new Error();
      const next = BoardingRequestStatusViewSchema.parse(await response.json());
      if (next.requestId !== receipt.requestId || next.boardingId !== boardingId) throw new Error();
      setStatus(next);
    } catch {
      setError('The mock status is unavailable. No owner notification or location access is implied.');
    } finally {
      setBusy(false);
    }
  };

  const current = kind ? copy[kind] : null;
  return (
    <>
      <div className="boarding-request-actions" aria-label="Owner advertisement actions">
        <p className="landing-kicker">REQUEST A NEXT STEP</p>
        {contactAvailable && <Button onClick={() => open('CONTACT_OWNER')}>Contact owner <Icon name="arrow" /></Button>}
        {locationRequestAvailable && <Button variant="secondary" onClick={() => open('REQUEST_LOCATION')}>Request location <Icon name="arrow" /></Button>}
        <p className="uh-muted">Local simulation only. No message delivery, owner notification, exact-location disclosure or permission is created. Private contact details are never shown.</p>
        {!endpoint && <Notice kind="info" title="Request simulator unavailable">This build cannot record a mock request. No request was sent.</Notice>}
      </div>
      <Modal open={kind !== null} onClose={close} title={current?.title ?? 'Owner request'} description={current?.intro}>
        {current && (
          <div className="boarding-request-form">
            <dl className="boarding-request-facts">
              <div><dt>Advertisement</dt><dd>{boardingId}</dd></div>
              <div><dt>Request type</dt><dd>{kind === 'CONTACT_OWNER' ? 'Contact intent' : 'Location interest'}</dd></div>
              <div><dt>Owner notification</dt><dd>Not sent in this simulation</dd></div>
              <div><dt>Private data</dt><dd>No phone, email, coordinates or directions</dd></div>
            </dl>
            {!receipt && (
              <>
                <label className="proposal-confirmation"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} />I acknowledge this is a simulated request and creates no contact, access or authority.</label>
                {error ? <><Notice kind="error" title="Mock request not recorded"><p ref={alert} tabIndex={-1}>{error}</p></Notice><Button onClick={() => void submit()} disabled={busy || !acknowledged || !endpoint} busy={busy}>{busy ? 'Retrying…' : 'Retry mock request'}</Button></> : <Button onClick={() => void submit()} disabled={busy || !acknowledged || !endpoint} busy={busy}>{busy ? 'Recording…' : current.submit}</Button>}
              </>
            )}
            {receipt && (
              <section aria-label="Mock request receipt" className="boarding-request-receipt">
                <h3 ref={heading} tabIndex={-1}>{kind === 'CONTACT_OWNER' ? 'Mock contact request pending.' : 'Mock location request pending.'}</h3>
                <p role="status">Reference <code>{receipt.requestId}</code></p>
                <dl>
                  <div><dt>Status</dt><dd>Mock pending · not delivered</dd></div>
                  <div><dt>Owner notified</dt><dd>{receipt.ownerNotified ? 'Yes' : 'No'}</dd></div>
                  <div><dt>Location disclosed</dt><dd>{receipt.locationDisclosed ? 'Yes' : 'No'}</dd></div>
                  <div><dt>Policy</dt><dd>{receipt.policyVersion}</dd></div>
                </dl>
                {notice && <p role="status">{notice}</p>}
                {status && <p role="status">Latest mock status: <strong>{status.status}</strong> · no owner notification or disclosure.</p>}
                {error ? <Notice kind="error" title="Mock status unavailable"><p ref={alert} tabIndex={-1}>{error}</p></Notice> : <Button variant="secondary" onClick={() => void checkStatus()} disabled={busy}>{busy ? 'Checking…' : 'Check mock status'}</Button>}
                <Button variant="quiet" onClick={close}>Close</Button>
              </section>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
