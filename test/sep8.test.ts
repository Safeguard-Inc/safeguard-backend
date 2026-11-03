import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseSep8Response, isSep8Approved } from '../src/sdk/sep8';

describe('SEP-0008 Regulated Asset Approval Flow Tests', () => {
  it('parses success response and marks approved', () => {
    const res = parseSep8Response({
      status: 'success',
      tx: 'AAAA_SIGNED_APPROVAL_XDR',
      message: 'KYC verified and compliance check passed',
    });

    assert.equal(res.status, 'success');
    assert.equal(res.tx, 'AAAA_SIGNED_APPROVAL_XDR');
    assert.equal(res.message, 'KYC verified and compliance check passed');
    assert.equal(isSep8Approved(res), true);
  });

  it('parses revised response with updated transaction XDR', () => {
    const res = parseSep8Response({
      status: 'revised',
      tx: 'AAAA_REVISED_WITH_TRANSFER_FEE_XDR',
      message: 'Transaction revised to include mandatory 0.1% compliance fee',
    });

    assert.equal(res.status, 'revised');
    assert.equal(res.tx, 'AAAA_REVISED_WITH_TRANSFER_FEE_XDR');
    assert.equal(isSep8Approved(res), true);
  });

  it('parses pending response with timeout duration', () => {
    const res = parseSep8Response({
      status: 'pending',
      timeout: 120,
      message: 'Awaiting accredited investor verification',
    });

    assert.equal(res.status, 'pending');
    assert.equal(res.timeout, 120);
    assert.equal(isSep8Approved(res), false);
  });

  it('parses rejected response with explanation error string', () => {
    const res = parseSep8Response({
      status: 'rejected',
      error: 'Recipient account is not authorized to hold this regulated security token',
    });

    assert.equal(res.status, 'rejected');
    assert.equal(res.error, 'Recipient account is not authorized to hold this regulated security token');
    assert.equal(isSep8Approved(res), false);
  });

  it('handles null or invalid payload safely', () => {
    const res = parseSep8Response(null);
    assert.equal(res.status, 'rejected');
    assert.ok(res.error?.includes('Invalid SEP-0008 response format'));
  });
});
