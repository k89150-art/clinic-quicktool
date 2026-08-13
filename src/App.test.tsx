import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import App from './App';

afterEach(cleanup);

async function openPrescription() {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button', { name: /慢箋日期/ }));
  return user;
}

async function openEligibility() {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole('button', { name: /收案快速判斷/ }));
  return user;
}

describe('prescription date input resilience', () => {
  it('does not crash when the first date is cleared', async () => {
    await openPrescription();
    fireEvent.change(screen.getByLabelText('日期選擇'), { target: { value: '' } });
    expect(screen.getAllByText('請輸入有效日期').length).toBeGreaterThan(0);
    expect(screen.getByText('日期有效後將立即顯示三次領藥排程。')).toBeInTheDocument();
    expect(screen.getByText('門診快速助手')).toBeInTheDocument();
  });

  it('does not calculate or crash when the actual dispense date is cleared', async () => {
    const user = await openPrescription();
    await user.click(screen.getByRole('button', { name: /第二次：病人今天來領藥/ }));
    fireEvent.change(screen.getByLabelText('實際領藥日期'), { target: { value: '' } });
    expect(screen.getAllByText('請輸入有效日期').length).toBeGreaterThan(0);
    expect(screen.queryByText(/提前|準時領藥|延後/)).not.toBeInTheDocument();
    expect(screen.getByText('門診快速助手')).toBeInTheDocument();
  });

  it('does not crash when a manual date is invalid', async () => {
    await openPrescription();
    fireEvent.change(screen.getByLabelText('日期選擇'), { target: { value: 'not-a-date' } });
    expect(screen.getAllByText('請輸入有效日期').length).toBeGreaterThan(0);
    expect(screen.queryByLabelText('三次領藥日期')).not.toBeInTheDocument();
    expect(screen.getByText('門診快速助手')).toBeInTheDocument();
  });

  it('allows 1–3 digit quick input as transient state without crashing', async () => {
    await openPrescription();
    const input = screen.getByPlaceholderText('例如 525、1025');
    for (const value of ['2', '23', '230']) {
      fireEvent.change(input, { target: { value } });
      expect(screen.getByText('門診快速助手')).toBeInTheDocument();
    }
    expect(screen.queryByText('請輸入有效日期，例如 525 或 1025')).not.toBeInTheDocument();
  });

  it('rejects 02/30 quick input without crashing', async () => {
    await openPrescription();
    const input = screen.getByPlaceholderText('例如 525、1025');
    fireEvent.change(input, { target: { value: '230' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByText('請輸入有效日期，例如 525 或 1025')).toBeInTheDocument();
    expect(screen.getByText('門診快速助手')).toBeInTheDocument();
  });
});

describe('mobile result summary semantics', () => {
  it('shows the Pre-ESRD reason directly when CKD refers', async () => {
    await openEligibility();
    fireEvent.change(screen.getByLabelText(/eGFR/), { target: { value: '44.9' } });
    expect(screen.getAllByText(/CKD：建議評估 Pre-ESRD/).length).toBeGreaterThan(0);
  });

  it('preserves the Pre-ESRD advisory when DKD is not eligible because DM failed', async () => {
    const user = await openEligibility();
    const dmDiagnosis = screen.getByRole('group', { name: '有 E08–E13 糖尿病診斷' });
    await user.click(within(dmDiagnosis).getByRole('button', { name: '否' }));
    fireEvent.change(screen.getByLabelText(/eGFR/), { target: { value: '44.9' } });

    expect(
      screen.getByRole('button', { name: /DKD：不符合，前往對應欄位/ }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/CKD：建議評估 Pre-ESRD/).length).toBeGreaterThan(0);
  });

  it('shows conditional eligibility and pending VPN warning', async () => {
    const user = await openEligibility();
    const choose = async (question: string, answer: string) => {
      const group = screen.getByRole('group', { name: question });
      await user.click(within(group).getByRole('button', { name: answer }));
    };
    await choose('有 E08–E13 糖尿病診斷', '是');
    await choose('近 90 天本院糖尿病就醫 ≥ 2 次', '是');
    await choose('本次 DM 為主診斷', '是');
    await choose('過去一年本院是否曾因此方案結案', '否');
    expect(screen.getAllByText('🟢 依目前輸入條件符合').length).toBeGreaterThan(0);
    expect(screen.getAllByText('⚠ 尚未確認 VPN／收案系統資格').length).toBeGreaterThan(0);
  });

  it('labels confirmed VPN qualification as manually confirmed', async () => {
    const user = await openEligibility();
    const choose = async (question: string, answer: string) => {
      const group = screen.getByRole('group', { name: question });
      await user.click(within(group).getByRole('button', { name: answer }));
    };
    await choose('有 E08–E13 糖尿病診斷', '是');
    await choose('近 90 天本院糖尿病就醫 ≥ 2 次', '是');
    await choose('本次 DM 為主診斷', '是');
    await choose('過去一年本院是否曾因此方案結案', '否');
    await user.click(screen.getByRole('checkbox', { name: /已人工確認 VPN/ }));
    expect(screen.getAllByText('✓ VPN／收案系統資格已人工確認').length).toBeGreaterThan(0);
  });
});
