import { useMemo, useState } from 'react';
import { addDays, format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import {
  ArrowLeft, CalendarDays, Check, ChevronRight, CircleAlert, ClipboardCheck,
  Info, Pill, RotateCcw, ShieldCheck, Stethoscope
} from 'lucide-react';
import { RULE_VERSIONS } from './config/clinicalRuleVersion';
import { calculateActualDispense, calculateInitialSchedule } from './features/prescription/domain/prescriptionRules';
import type { DispenseResult } from './features/prescription/domain/prescriptionTypes';
import { evaluateMetabolicProgramEligibility, evaluateMetabolicSyndrome } from './features/eligibility/domain/metabolicRules';
import { evaluateDiabetesEligibility } from './features/eligibility/domain/diabetesRules';
import { evaluateCkdEligibility } from './features/eligibility/domain/ckdRules';
import { evaluateDkdEligibility } from './features/eligibility/domain/dkdRules';
import type { EligibilityInputState, EligibilityResult, EligibilityStatus, TriState } from './features/eligibility/domain/eligibilityTypes';

type Page = 'home' | 'prescription' | 'eligibility';

const today = () => new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
const toDateValue = (date: Date) => format(date, 'yyyy-MM-dd');
const fromDateValue = (value: string) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};
const fullDate = (date: Date) => format(date, 'yyyy/MM/dd（EEEEE）', { locale: zhTW });
const shortDate = (date: Date) => format(date, 'MM/dd');
const weekDay = (date: Date) => format(date, 'EEEE', { locale: zhTW });

const emptyEligibility = (): EligibilityInputState => ({
  age: null, sex: null, waist: null, bmi: null, fastingGlucose: null,
  sbp: null, dbp: null, triglycerides: null, hdl: null,
  glucoseMedication: false, bloodPressureMedication: false,
  triglycerideMedication: false, hdlMedication: false,
  dialysis: 'unknown', vpnConfirmed: false,
  dmDiagnosis: 'unknown', dmVisits: 'unknown', dmPrimaryDiagnosis: 'unknown',
  dmClosedWithinYear: 'unknown', egfr: null, uacr: null, upcr: null,
  ckdRecentVisit: 'unknown', ckdPrimaryDiagnosis: 'unknown'
});

function Header({ page, onHome }: { page: Page; onHome: () => void }) {
  return (
    <header className="border-b border-slate-200/80 bg-white/95">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        {page !== 'home' && (
          <button className="icon-button" onClick={onHome} aria-label="返回首頁">
            <ArrowLeft size={21} aria-hidden="true" />
          </button>
        )}
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-clinic-700 text-white shadow-sm" aria-hidden="true">
          <Stethoscope size={22} />
        </div>
        <div>
          <p className="text-sm font-bold leading-tight text-ink sm:text-base">門診快速助手</p>
          <p className="text-[11px] font-medium tracking-wide text-slate-500">CLINIC QUICKTOOL</p>
        </div>
        <div className="ml-auto hidden items-center gap-2 text-xs font-medium text-slate-500 sm:flex">
          <ShieldCheck size={16} className="text-clinic-700" /> 僅於此裝置即時計算，不保存資料
        </div>
      </div>
    </header>
  );
}

function Home({ onNavigate }: { onNavigate: (page: Page) => void }) {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-5xl flex-col justify-center px-4 py-10 sm:px-6">
      <div className="mb-9 max-w-2xl">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-clinic-50 px-3 py-1.5 text-sm font-semibold text-clinic-800">
          <Check size={16} /> 幾秒內得到清楚答案
        </div>
        <h1 className="text-3xl font-black tracking-tight text-ink sm:text-5xl">今天要快速處理哪件事？</h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">不輸入病人識別資料。重新整理或關閉頁面後，所有輸入即清除。</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <button className="home-card group" onClick={() => onNavigate('prescription')}>
          <span className="home-icon bg-emerald-50 text-emerald-700"><Pill size={31} /></span>
          <span className="min-w-0 text-left">
            <span className="block text-xl font-extrabold text-ink">慢箋日期</span>
            <span className="mt-1 block text-sm leading-6 text-slate-600">三次領藥日、提前與延後規則</span>
          </span>
          <ChevronRight className="ml-auto text-slate-400 transition-transform group-hover:translate-x-1" />
        </button>
        <button className="home-card group" onClick={() => onNavigate('eligibility')}>
          <span className="home-icon bg-blue-50 text-blue-700"><ClipboardCheck size={31} /></span>
          <span className="min-w-0 text-left">
            <span className="block text-xl font-extrabold text-ink">收案快速判斷</span>
            <span className="mt-1 block text-sm leading-6 text-slate-600">代謝症候群、DM、Early CKD、DKD</span>
          </span>
          <ChevronRight className="ml-auto text-slate-400 transition-transform group-hover:translate-x-1" />
        </button>
      </div>
      <div className="mt-7 flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600">
        <Info size={18} className="mt-0.5 shrink-0 text-clinic-700" />
        <p>本工具為快速輔助判斷工具；實際收案仍以最新規定、VPN／收案系統資格及院所作業規範為準。</p>
      </div>
    </main>
  );
}

function QuickDateInput({ date, onChange }: { date: Date; onChange: (date: Date) => void }) {
  const [quick, setQuick] = useState('');
  const [error, setError] = useState('');
  const applyQuick = () => {
    const digits = quick.replace(/\D/g, '');
    if (digits.length !== 3 && digits.length !== 4) {
      setError('請輸入 3–4 碼，例如 525 或 1025');
      return;
    }
    const month = Number(digits.length === 3 ? digits.slice(0, 1) : digits.slice(0, 2));
    const day = Number(digits.length === 3 ? digits.slice(1) : digits.slice(2));
    const parsed = new Date(today().getFullYear(), month - 1, day);
    if (parsed.getMonth() !== month - 1 || parsed.getDate() !== day) {
      setError('日期不存在，請再次確認');
      return;
    }
    setError('');
    onChange(parsed);
    setQuick('');
  };
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="field-label">日期選擇
        <input className="field" type="date" value={toDateValue(date)} onChange={(event) => onChange(fromDateValue(event.target.value))} />
      </label>
      <label className="field-label">快速輸入（月日）
        <input className="field" inputMode="numeric" maxLength={4} placeholder="例如 525、1025" value={quick}
          onChange={(event) => setQuick(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && applyQuick()} onBlur={() => quick && applyQuick()} />
      </label>
      {error && <p className="sm:col-span-2 text-sm font-medium text-red-700" role="alert">{error}</p>}
    </div>
  );
}

function DateHero({ order, date, tone = 'plain' }: { order: string; date: Date; tone?: 'plain' | 'primary' }) {
  return (
    <article className={`date-card ${tone === 'primary' ? 'date-card-primary' : ''}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-slate-600">{order}</p>
        {tone === 'primary' && <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-bold">第一次</span>}
      </div>
      <p className="mt-5 text-4xl font-black tabular-nums tracking-tight sm:text-5xl">{shortDate(date)}</p>
      <p className="mt-1 text-base font-semibold opacity-80">{weekDay(date)}</p>
      <p className="mt-5 border-t border-current/10 pt-3 text-xs font-medium opacity-70">{fullDate(date)}</p>
    </article>
  );
}

function ActualDispensePanel({ label, scheduled }: { label: string; scheduled: Date }) {
  const [open, setOpen] = useState(false);
  const [actual, setActual] = useState(today);
  const result = useMemo(() => calculateActualDispense(scheduled, actual), [scheduled, actual]);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <button className="flex min-h-12 w-full items-center justify-between gap-3 text-left font-bold text-ink" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <span>{label}病人今天來領藥</span><span className="text-sm text-clinic-700">{open ? '收合' : '填寫'}</span>
      </button>
      {open && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs font-bold text-slate-500">原預定領藥日期</p><p className="mt-1 font-extrabold text-ink">{fullDate(scheduled)}</p></div>
            <label className="field-label">實際領藥日期
              <input className="field" type="date" value={toDateValue(actual)} onChange={(event) => setActual(fromDateValue(event.target.value))} />
            </label>
          </div>
          <DispenseOutcome result={result} />
        </div>
      )}
    </div>
  );
}

function DispenseOutcome({ result }: { result: DispenseResult }) {
  const config = {
    early: { icon: '🟠', title: `提前 ${result.differenceDays} 天領藥`, note: '原排程維持不變', detail: `相當於實際領藥日起算 28+${result.differenceDays} 天。`, cls: 'bg-amber-50 border-amber-200' },
    'on-time': { icon: '🟢', title: '準時領藥', note: '維持 28 天原排程', detail: '', cls: 'bg-emerald-50 border-emerald-200' },
    late: { icon: '🔵', title: `延後 ${result.differenceDays} 天領藥`, note: '以實際領藥日期重新起算 28 天', detail: '', cls: 'bg-blue-50 border-blue-200' }
  }[result.status];
  return (
    <div className={`mt-4 rounded-2xl border p-4 ${config.cls}`} aria-live="polite">
      <p className="font-extrabold text-ink">{config.icon} {config.title}</p>
      <div className="mt-4 flex items-end justify-between gap-4">
        <div><p className="text-xs font-bold text-slate-600">下次領藥</p><p className="text-3xl font-black tabular-nums text-ink">{shortDate(result.nextDispenseDate)}</p></div>
        <p className="pb-1 text-sm font-bold text-slate-700">{weekDay(result.nextDispenseDate)}</p>
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-700">{config.note}</p>
      {config.detail && <p className="mt-1 text-xs text-slate-600">{config.detail}</p>}
    </div>
  );
}

function PrescriptionPage() {
  const [firstDate, setFirstDate] = useState(today);
  const schedule = useMemo(() => calculateInitialSchedule(firstDate), [firstDate]);
  return (
    <main className="page-shell">
      <div className="page-heading">
        <div><p className="eyebrow"><Pill size={16} /> 固定 28 天週期</p><h1>慢箋日期</h1><p>選擇第一次領藥日期，後續日期立即更新。</p></div>
        <button className="secondary-button" onClick={() => setFirstDate(today())}><RotateCcw size={18} /> 重設為今天</button>
      </div>
      <section className="panel">
        <h2 className="section-title"><CalendarDays size={20} /> 第一次領藥日期</h2>
        <QuickDateInput date={firstDate} onChange={setFirstDate} />
      </section>
      <section aria-label="三次領藥日期" className="grid gap-4 md:grid-cols-3">
        <DateHero order="今天／起始日" date={schedule.firstDate} tone="primary" />
        <DateHero order="第二次 · +28 天" date={schedule.secondDate} />
        <DateHero order="第三次 · +56 天" date={schedule.thirdDate} />
      </section>
      {schedule.secondDate.getFullYear() !== schedule.firstDate.getFullYear() && <p className="notice"><CircleAlert size={18} /> 排程已跨年度，請確認上方完整年份。</p>}
      <section className="space-y-3">
        <h2 className="section-title">實際領藥調整</h2>
        <ActualDispensePanel label="第二次：" scheduled={schedule.secondDate} />
        <ActualDispensePanel label="第三次：" scheduled={schedule.thirdDate} />
      </section>
    </main>
  );
}

const statusConfig: Record<EligibilityStatus, { label: string; icon: string; className: string }> = {
  eligible: { label: '符合', icon: '🟢', className: 'status-eligible' },
  'not-eligible': { label: '不符合', icon: '🔴', className: 'status-not' },
  'insufficient-data': { label: '資料不足', icon: '🟡', className: 'status-missing' },
  refer: { label: '評估轉介／其他方案', icon: '🔵', className: 'status-refer' }
};

function StatusBadge({ status }: { status: EligibilityStatus }) {
  const config = statusConfig[status];
  return <span className={`status-badge ${config.className}`}><span aria-hidden="true">{config.icon}</span>{config.label}</span>;
}

function TriChoice({ label, value, onChange, unknown = false }: { label: string; value: TriState; onChange: (value: TriState) => void; unknown?: boolean }) {
  const items: { value: TriState; text: string }[] = [{ value: 'yes', text: '是' }, { value: 'no', text: '否' }];
  if (unknown) items.push({ value: 'unknown', text: '不知道' });
  return (
    <fieldset className="question-row">
      <legend>{label}</legend>
      <div className="choice-group">
        {items.map((item) => <button type="button" key={item.value} className={value === item.value ? 'choice-active' : 'choice'} onClick={() => onChange(item.value)}>{item.text}</button>)}
      </div>
    </fieldset>
  );
}

function NumberField({ label, value, unit, onChange, max, placeholder }: { label: string; value: number | null; unit?: string; onChange: (value: number | null) => void; max?: number; placeholder?: string }) {
  const invalid = value !== null && (value < 0 || (max !== undefined && value > max));
  return (
    <label className="field-label">{label}
      <span className="relative block">
        <input className={`field ${unit ? 'pr-20' : ''} ${invalid ? 'field-error' : ''}`} type="number" min="0" step="any" inputMode="decimal" placeholder={placeholder}
          value={value ?? ''} onChange={(event) => onChange(event.target.value === '' ? null : Number(event.target.value))} aria-invalid={invalid} />
        {unit && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-500">{unit}</span>}
      </span>
      {invalid && <span className="mt-1 text-xs font-semibold text-red-700" role="alert">數值疑似異常，請再次確認。</span>}
    </label>
  );
}

function MedicationToggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="med-toggle"><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /> 服藥中</label>;
}

function ResultCard({ title, result, meta, purple = false }: { title: string; result: EligibilityResult; meta?: string; purple?: boolean }) {
  return (
    <article className={`result-card ${purple ? 'result-card-purple' : ''}`}>
      <div className="flex flex-wrap items-center justify-between gap-2"><h3>{title}</h3><StatusBadge status={result.status} /></div>
      {meta && <p className="mt-2 text-sm font-extrabold text-slate-700">{meta}</p>}
      <details className="mt-3">
        <summary>為什麼？</summary>
        <div className="mt-2 space-y-1 text-sm leading-6 text-slate-600">
          {result.reasons.map((reason) => <p key={reason}>• {reason}</p>)}
          {result.missingFields.map((field) => <p key={field}>• 尚缺：{field}</p>)}
          {!result.reasons.length && !result.missingFields.length && <p>請完成左側相關資料。</p>}
        </div>
      </details>
    </article>
  );
}

function MobileResultSummary({ metabolic, dm, ckd, dkd }: { metabolic: EligibilityResult & { positiveCount: number }; dm: EligibilityResult; ckd: EligibilityResult & { stage: string | null }; dkd: EligibilityResult }) {
  const rows = [
    { title: '代謝症候群', result: metabolic, meta: `${metabolic.positiveCount}/5` },
    { title: 'DM', result: dm },
    { title: 'CKD', result: ckd, meta: ckd.stage ?? undefined },
    { title: 'DKD', result: dkd }
  ];
  return (
    <section className="mobile-summary" aria-label="即時判斷摘要" aria-live="polite">
      <div className="mb-2 flex items-center justify-between"><h2 className="font-black text-ink">即時結果</h2><span className="text-xs font-semibold text-slate-500">自動更新</span></div>
      <div className="divide-y divide-slate-100">
        {rows.map(({ title, result, meta }) => <div key={title} className="flex min-h-11 items-center justify-between gap-2 py-2"><span className="text-sm font-extrabold text-slate-700">{title}{meta ? ` · ${meta}` : ''}</span><StatusBadge status={result.status} /></div>)}
      </div>
    </section>
  );
}

function SectionCard({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return <section className="panel"><div className="mb-5"><h2 className="section-title">{title}</h2>{hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}</div>{children}</section>;
}

function EligibilityPage() {
  const [input, setInput] = useState<EligibilityInputState>(emptyEligibility);
  const update = <K extends keyof EligibilityInputState>(key: K, value: EligibilityInputState[K]) => setInput((current) => ({ ...current, [key]: value }));
  const metabolicInput = {
    age: input.age, sex: input.sex, waist: input.waist, bmi: input.bmi,
    fastingGlucose: input.fastingGlucose, sbp: input.sbp, dbp: input.dbp,
    triglycerides: input.triglycerides, hdl: input.hdl,
    glucoseMedication: input.glucoseMedication, bloodPressureMedication: input.bloodPressureMedication,
    triglycerideMedication: input.triglycerideMedication, hdlMedication: input.hdlMedication,
    dialysis: input.dialysis, vpnConfirmed: input.vpnConfirmed
  };
  const metabolic = evaluateMetabolicSyndrome(metabolicInput);
  const metabolicProgram = evaluateMetabolicProgramEligibility(metabolicInput);
  const dm = evaluateDiabetesEligibility({
    diagnosisE08ToE13: input.dmDiagnosis, visitsWithin90DaysAtLeastTwo: input.dmVisits,
    primaryDiagnosis: input.dmPrimaryDiagnosis, closedWithinPastYear: input.dmClosedWithinYear,
    vpnConfirmed: input.vpnConfirmed
  });
  const ckd = evaluateCkdEligibility({ egfr: input.egfr, uacr: input.uacr, upcr: input.upcr, recentVisit: input.ckdRecentVisit, primaryDiagnosis: input.ckdPrimaryDiagnosis, vpnConfirmed: input.vpnConfirmed });
  const dkd = evaluateDkdEligibility(dm.status, ckd.status);
  const needsUrine = ckd.stage === 'G1' || ckd.stage === 'G2';

  return (
    <main className="page-shell pb-32 lg:pb-12">
      <div className="page-heading">
        <div><p className="eyebrow"><ClipboardCheck size={16} /> 即時、共用輸入</p><h1>收案快速判斷</h1><p>代謝症候群、DM、Early CKD 與 DKD；所有判斷隨輸入立即更新。</p></div>
        <button className="secondary-button" onClick={() => setInput(emptyEligibility())}><RotateCcw size={18} /> 全部清除</button>
      </div>
      <MobileResultSummary metabolic={metabolic} dm={dm} ckd={ckd} dkd={dkd} />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5 min-w-0">
          <SectionCard title="1. 共用基本條件" hint="年齡與生理性別同時供代謝症候群規則使用。">
            <div className="grid gap-4 sm:grid-cols-2">
              <NumberField label="年齡" value={input.age} onChange={(v) => update('age', v)} unit="歲" max={120} placeholder="20–64" />
              <fieldset className="field-label"><legend>生理性別</legend><div className="choice-group mt-2"><button type="button" className={input.sex === 'male' ? 'choice-active' : 'choice'} onClick={() => update('sex', 'male')}>男性</button><button type="button" className={input.sex === 'female' ? 'choice-active' : 'choice'} onClick={() => update('sex', 'female')}>女性</button></div></fieldset>
            </div>
          </SectionCard>

          <SectionCard title="2. 代謝症候群" hint="五項判定與防治計畫收案資格分開呈現。">
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2"><NumberField label="腰圍" value={input.waist} onChange={(v) => update('waist', v)} unit="cm" max={250} /><NumberField label="BMI" value={input.bmi} onChange={(v) => update('bmi', v)} unit="kg/m²" max={100} /></div>
              <div className="grid gap-4 sm:grid-cols-2"><NumberField label="收縮壓 SBP" value={input.sbp} onChange={(v) => update('sbp', v)} unit="mmHg" max={300} /><NumberField label="舒張壓 DBP" value={input.dbp} onChange={(v) => update('dbp', v)} unit="mmHg" max={200} /></div>
              <div className="compact-lab"><NumberField label="空腹血糖 AC" value={input.fastingGlucose} onChange={(v) => update('fastingGlucose', v)} unit="mg/dL" max={800} /><MedicationToggle checked={input.glucoseMedication} onChange={(v) => update('glucoseMedication', v)} /></div>
              <div className="compact-lab"><NumberField label="三酸甘油脂 TG" value={input.triglycerides} onChange={(v) => update('triglycerides', v)} unit="mg/dL" max={2000} /><MedicationToggle checked={input.triglycerideMedication} onChange={(v) => update('triglycerideMedication', v)} /></div>
              <div className="compact-lab"><NumberField label="高密度脂蛋白 HDL" value={input.hdl} onChange={(v) => update('hdl', v)} unit="mg/dL" max={250} /><MedicationToggle checked={input.hdlMedication} onChange={(v) => update('hdlMedication', v)} /></div>
              <MedicationToggle checked={input.bloodPressureMedication} onChange={(v) => update('bloodPressureMedication', v)} /> <span className="ml-2 text-sm font-semibold text-slate-600">目前使用降血壓藥物</span>
              <TriChoice label="目前接受透析治療（HD／PD）？" value={input.dialysis} onChange={(v) => update('dialysis', v)} />
              <div className="rounded-xl bg-slate-50 p-4" aria-live="polite"><div className="flex flex-wrap items-center justify-between gap-2"><strong>代謝症候群判定</strong><StatusBadge status={metabolic.status} /></div><p className="mt-2 text-2xl font-black text-ink">{metabolic.positiveCount}/5</p><details className="mt-2"><summary>查看五項判斷</summary><p className="mt-2 text-sm leading-6 text-slate-600">肥胖：{metabolic.factors.obesity} · 血糖：{metabolic.factors.glucose} · 血壓：{metabolic.factors.bloodPressure} · TG：{metabolic.factors.triglycerides} · HDL：{metabolic.factors.hdl}</p></details></div>
              <div className="rounded-xl border border-slate-200 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><strong>防治計畫收案</strong><StatusBadge status={metabolicProgram.status} /></div><p className="mt-2 text-sm text-slate-600">{metabolicProgram.reasons[0] ?? (metabolicProgram.missingFields.length ? `尚缺：${metabolicProgram.missingFields.join('、')}` : '')}</p></div>
            </div>
          </SectionCard>

          <SectionCard title="3. DM 收案條件">
            <div className="space-y-4"><TriChoice label="有 E08–E13 糖尿病診斷" value={input.dmDiagnosis} onChange={(v) => update('dmDiagnosis', v)} /><TriChoice label="近 90 天本院糖尿病就醫 ≥ 2 次" value={input.dmVisits} onChange={(v) => update('dmVisits', v)} /><TriChoice label="本次 DM 為主診斷" value={input.dmPrimaryDiagnosis} onChange={(v) => update('dmPrimaryDiagnosis', v)} /><TriChoice label="過去一年本院是否曾因此方案結案" value={input.dmClosedWithinYear} onChange={(v) => update('dmClosedWithinYear', v)} unknown /></div>
          </SectionCard>

          <SectionCard title="4. Early CKD 收案條件" hint="先輸入 eGFR；僅 G1／G2 需要再輸入 UACR 或 UPCR。">
            <div className="space-y-5">
              <NumberField label="eGFR" value={input.egfr} onChange={(v) => update('egfr', v)} unit="mL/min/1.73m²" max={250} />
              {ckd.stage && <div className="rounded-xl bg-blue-50 p-4 text-blue-900" aria-live="polite"><p className="text-xs font-bold uppercase tracking-wide">CKD Stage</p><p className="mt-1 text-3xl font-black">{ckd.stage}</p>{ckd.stage === 'G3a' && <p className="mt-1 text-sm font-semibold">G3a 不需額外蛋白尿門檻</p>}{ckd.reasons.includes('蛋白尿條件符合') && <p className="mt-1 text-sm font-semibold">蛋白尿條件符合</p>}</div>}
              {needsUrine && <div className="grid gap-4 sm:grid-cols-2"><NumberField label="UACR" value={input.uacr} onChange={(v) => update('uacr', v)} unit="mg/g" max={10000} /><NumberField label="UPCR" value={input.upcr} onChange={(v) => update('upcr', v)} unit="mg/g" max={20000} /></div>}
              <TriChoice label="近 90 天曾於本院就醫" value={input.ckdRecentVisit} onChange={(v) => update('ckdRecentVisit', v)} />
              <TriChoice label="本次以 CKD 為主診斷" value={input.ckdPrimaryDiagnosis} onChange={(v) => update('ckdPrimaryDiagnosis', v)} />
            </div>
          </SectionCard>

          <SectionCard title="5. 系統資格確認" hint="本工具不串接健保 VPN；請由工作人員完成查詢。">
            <label className="confirm-check"><input type="checkbox" checked={input.vpnConfirmed} onChange={(event) => update('vpnConfirmed', event.target.checked)} /><span><strong>已確認相關 VPN／收案系統資格</strong><small>已排除其他院所收案、行政衝突等情形</small></span></label>
          </SectionCard>
        </div>

        <aside className="results-dock hidden lg:block" aria-label="即時判斷結果" aria-live="polite">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-black text-ink">即時結果</h2><span className="text-xs font-semibold text-slate-500">自動更新</span></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <ResultCard title="代謝症候群" result={metabolic} meta={`${metabolic.positiveCount}/5`} />
            <ResultCard title="DM" result={dm} />
            <ResultCard title="CKD" result={ckd} meta={ckd.stage ?? undefined} />
            <ResultCard title="DKD" result={dkd} purple />
          </div>
          {!input.vpnConfirmed && (metabolicProgram.status === 'eligible' || dm.status === 'eligible' || ckd.status === 'eligible') && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">⚠ 尚未確認系統收案資格</p>}
        </aside>
      </div>
    </main>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white px-4 py-5 text-center text-xs leading-5 text-slate-500">
      <p>DM／CKD／DKD：健保署 {RULE_VERSIONS.dmCkdDkd.rocDate} · 代謝症候群：國健署 {RULE_VERSIONS.metabolic.rocYear} 年版</p>
      <p>僅供快速輔助判斷，請以主管機關最新規定與院所作業規範為準。</p>
    </footer>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>('home');
  return (
    <div className="min-h-screen bg-[#f5f8f7] text-ink">
      <Header page={page} onHome={() => setPage('home')} />
      {page === 'home' && <Home onNavigate={setPage} />}
      {page === 'prescription' && <PrescriptionPage />}
      {page === 'eligibility' && <EligibilityPage />}
      <Footer />
    </div>
  );
}
