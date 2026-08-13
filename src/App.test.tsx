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

describe('prescription workflow UI', () => {
  it('shows lab and follow-up first for a new prescription', async () => {
    await openPrescription();
    fireEvent.change(screen.getByLabelText('日期選擇'), { target: { value: '2026-05-25' } });

    expect(screen.getByRole('button', { name: '新開慢箋' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('抽血日期')).toBeInTheDocument();
    expect(screen.getByText('回診日期')).toBeInTheDocument();
    expect(screen.queryByLabelText('慢箋主要日期摘要')).not.toBeInTheDocument();
    expect(screen.getAllByText('08/10').length).toBeGreaterThan(0);
    expect(screen.getAllByText('08/17').length).toBeGreaterThan(0);
    expect(screen.getByText(/第2次預定：/)).toHaveTextContent('2026/06/22');
    expect(screen.getByText(/第3次預定：/)).toHaveTextContent('2026/07/20');
  });

  it('calculates a delayed second dispense without asking for its original date', async () => {
    const user = await openPrescription();
    await user.click(screen.getByRole('button', { name: /第 2 次領藥/ }));
    fireEvent.change(screen.getByLabelText('日期選擇'), { target: { value: '2026-05-25' } });
    fireEvent.change(screen.getByLabelText('實際領藥日期'), { target: { value: '2026-06-25' } });

    expect(screen.getByText('第2次領藥 · 延後 3 天')).toBeInTheDocument();
    expect(screen.getByLabelText('慢箋主要日期摘要')).toBeInTheDocument();
    expect(screen.getAllByText('08/13').length).toBeGreaterThan(0);
    expect(screen.getAllByText('08/20').length).toBeGreaterThan(0);
    expect(screen.queryByLabelText(/原預定第2次領藥日期/)).not.toBeInTheDocument();
  });

  it('shows a lightweight reminder for the default third-dispense assumption', async () => {
    const user = await openPrescription();
    await user.click(screen.getByRole('button', { name: '第 3 次領藥' }));
    expect(screen.getByText('若第2次曾延後領藥，請改選「有」以重新計算正確排程。')).toBeInTheDocument();
    expect(screen.queryByLabelText('第2次實際領藥日期')).not.toBeInTheDocument();
  });

  it('requires the actual second date only when it was delayed', async () => {
    const user = await openPrescription();
    await user.click(screen.getByRole('button', { name: '第 3 次領藥' }));
    const question = screen.getByText('第2次領藥是否曾延後？').closest('fieldset')!;
    await user.click(within(question).getByRole('button', { name: '有' }));

    expect(screen.getByLabelText('第2次實際領藥日期')).toBeInTheDocument();
    expect(screen.getAllByText('請輸入有效日期').length).toBeGreaterThan(0);
    expect(screen.queryByLabelText('慢箋計算結果')).not.toBeInTheDocument();
  });

  it('calculates third dispense after a delayed second dispense', async () => {
    const user = await openPrescription();
    await user.click(screen.getByRole('button', { name: '第 3 次領藥' }));
    fireEvent.change(screen.getByLabelText('日期選擇'), { target: { value: '2026-05-25' } });
    const question = screen.getByText('第2次領藥是否曾延後？').closest('fieldset')!;
    await user.click(within(question).getByRole('button', { name: '有' }));
    fireEvent.change(screen.getByLabelText('第2次實際領藥日期'), { target: { value: '2026-06-25' } });
    fireEvent.change(screen.getByLabelText('實際第3次領藥日期'), { target: { value: '2026-07-25' } });

    expect(screen.getByText('第3次領藥 · 延後 2 天')).toBeInTheDocument();
    expect(screen.getAllByText('08/15').length).toBeGreaterThan(0);
    expect(screen.getAllByText('08/22').length).toBeGreaterThan(0);
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
