import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import {
  ArrowLeft, CalendarDays, Check, ChevronRight, ClipboardCheck, FlaskConical,
  Info, Pill, RotateCcw, ShieldCheck, Stethoscope
} from 'lucide-react';
import { RULE_VERSIONS } from './config/clinicalRuleVersion';
import {
  calculateInitialPrescriptionPlan, calculateSecondDispensePlan, calculateThirdDispensePlan
} from './features/prescription/domain/prescriptionWorkflowRules';
import type {
  DispenseComparison, PrescriptionTimeline, PrescriptionVisitMode, ThirdDispenseResult
} from './features/prescription/domain/prescriptionWorkflowRules';
import { isValidLocalDate, parseLocalDateInput, parseQuickMonthDay, toDateInputValue } from './features/prescription/dateInput';
import { evaluateMetabolicProgramEligibility, evaluateMetabolicSyndrome } from './features/eligibility/domain/metabolicRules';
import { evaluateDiabetesEligibility } from './features/eligibility/domain/diabetesRules';
import { evaluateCkdEligibility } from './features/eligibility/domain/ckdRules';
import { evaluateDkdEligibility } from './features/eligibility/domain/dkdRules';
import type { EligibilityInputState, EligibilityResult, EligibilityStatus, TriState } from './features/eligibility/domain/eligibilityTypes';

type Page = 'home' | 'prescription' | 'eligibility';

const today = () => new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
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
            <span className="mt-1 block text-sm leading-6 text-slate-600">抽血、回診與後續領藥日期</span>
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

function QuickDateInput({ date, onChange, optional = false, dateLabel = '日期選擇' }: { date: Date | null; onChange: (date: Date | null) => void; optional?: boolean; dateLabel?: string }) {
  const [quick, setQuick] = useState('');
  const [error, setError] = useState('');
  const applyQuick = () => {
    const parsed = parseQuickMonthDay(quick, today().getFullYear());
    if (!parsed) {
      setError('請輸入有效日期，例如 525 或 1025');
      return;
    }
    setError('');
    onChange(parsed);
    setQuick('');
  };
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="field-label">{dateLabel}
        <input className="field" type="date" value={toDateInputValue(date)} aria-invalid={!optional && !date}
          onChange={(event) => { const parsed = parseLocalDateInput(event.target.value); onChange(parsed); setError(parsed || (optional && !event.target.value) ? '' : '請輸入有效日期'); }} />
      </label>
      <label className="field-label">快速輸入（月日）
        <input className="field" inputMode="numeric" maxLength={4} placeholder="例如 525、1025" value={quick}
          onChange={(event) => setQuick(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && applyQuick()} onBlur={() => quick && applyQuick()} />
      </label>
      {(error || (!optional && !date)) && <p className="sm:col-span-2 text-sm font-medium text-red-700" role="alert">{error || '請輸入有效日期'}</p>}
    </div>
  );
}

function WorkflowDateResult({ label, date, icon }: { label: string; date: Date; icon: 'lab' | 'visit' }) {
  return (
    <article className={`workflow-date-result ${icon === 'lab' ? 'workflow-date-lab' : 'workflow-date-visit'}`}>
      <p className="flex items-center gap-2 text-sm font-extrabold">{icon === 'lab' ? <FlaskConical size={20} /> : <Stethoscope size={20} />} {label}</p>
      <p className="mt-3 text-4xl font-black tabular-nums tracking-tight sm:text-5xl">{shortDate(date)}</p>
      <p className="mt-1 text-base font-bold opacity-80">{weekDay(date)}</p>
      <p className="mt-3 text-xs font-semibold opacity-65">{format(date, 'yyyy/MM/dd')}</p>
    </article>
  );
}

function ModeButton({ mode, active, children, onSelect, ariaLabel }: { mode: PrescriptionVisitMode; active: boolean; children: string; onSelect: (mode: PrescriptionVisitMode) => void; ariaLabel?: string }) {
  return (
    <button type="button" aria-label={ariaLabel} aria-pressed={active} className={active ? 'workflow-mode-active' : 'workflow-mode'} onClick={() => onSelect(mode)}>{children}</button>
  );
}

function ActualDateField({ label, value, onChange, ariaLabel }: { label: string; value: Date | null; onChange: (date: Date | null) => void; ariaLabel?: string }) {
  return <label className="field-label">{label}
    <input className="field" type="date" value={toDateInputValue(value)} aria-label={ariaLabel ?? label} aria-invalid={!value} onChange={(event) => onChange(parseLocalDateInput(event.target.value))} />
    {!value && <span className="mt-1 block text-xs font-semibold text-red-700" role="alert">請輸入有效日期</span>}
  </label>;
}

function DispenseContext({ result }: { result: DispenseComparison }) {
  const config = {
    early: `提前 ${result.differenceDays} 天`,
    'on-time': '準時領藥',
    late: `延後 ${result.differenceDays} 天`
  }[result.status];
  return (
    <div className="workflow-context">
      <p className="font-extrabold text-ink">第2次領藥 · {config}</p>
      <div className="mt-2 grid gap-1 text-sm text-slate-600 sm:grid-cols-2">
        <p>原定：<strong>{fullDate(result.scheduledDate)}</strong></p>
        <p>實際：<strong>{fullDate(result.actualDate)}</strong></p>
      </div>
    </div>
  );
}

function PrescriptionResult({ mode, timeline, dispense }: { mode: PrescriptionVisitMode; timeline: PrescriptionTimeline; dispense?: DispenseComparison }) {
  return <section aria-label="慢箋計算結果" className="space-y-4" aria-live="polite">
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      <WorkflowDateResult label="抽血日期" date={timeline.labDate} icon="lab" />
      <WorkflowDateResult label="回診日期" date={timeline.followUpDate} icon="visit" />
    </div>
    <div className="panel workflow-details">
      {dispense && <DispenseContext result={dispense} />}
      <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
        {mode === 'new' && <p>第1次領藥：<strong>{fullDate(timeline.lastVisitDate)}</strong></p>}
        <p>第2次預定：<strong>{fullDate(timeline.scheduledSecondDate)}</strong></p>
        <p>第3次預定：<strong>{fullDate(timeline.scheduledThirdDate)}</strong></p>
      </div>
    </div>
  </section>;
}

function ThirdDispenseResultView({ result }: { result: ThirdDispenseResult }) {
  const comparison = result.differenceFromOriginalDays === null
    ? null
    : result.differenceFromOriginalDays === 0
      ? '同日'
      : result.differenceFromOriginalDays > 0
        ? `晚 ${result.differenceFromOriginalDays} 天`
        : `早 ${Math.abs(result.differenceFromOriginalDays)} 天`;

  return <section aria-label="慢箋計算結果" className="space-y-4" aria-live="polite">
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      <WorkflowDateResult label="抽血日期" date={result.labDate} icon="lab" />
      <WorkflowDateResult label="回診日期" date={result.followUpDate} icon="visit" />
    </div>
    <div className="panel workflow-details">
      <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
        <p>本次第3次實際領藥：<strong>{fullDate(result.actualThirdDate)}</strong></p>
        <p>藥物療程：<strong>28 天</strong></p>
      </div>
      {result.originalThirdDate && comparison && <div className="workflow-context mt-4">
        <p className="font-extrabold text-ink">原始排程參考</p>
        <p className="mt-2 text-sm text-slate-600">原始第3次排程：<strong>{fullDate(result.originalThirdDate)}</strong></p>
        <p className="mt-1 text-sm font-bold text-slate-700">相較最後一次看診日起算之原始第3次排程：{comparison}</p>
      </div>}
    </div>
  </section>;
}

function PrescriptionMobileSummary({ labDate, followUpDate }: { labDate: Date; followUpDate: Date }) {
  return <aside className="prescription-mobile-summary" aria-label="慢箋主要日期摘要" aria-live="polite">
    <div><span>🧪 抽血</span><strong>{shortDate(labDate)}</strong><small>{weekDay(labDate)}</small></div>
    <div><span>🩺 回診</span><strong>{shortDate(followUpDate)}</strong><small>{weekDay(followUpDate)}</small></div>
  </aside>;
}

function PrescriptionPage() {
  const [mode, setMode] = useState<PrescriptionVisitMode>('new');
  const [lastVisitDate, setLastVisitDate] = useState<Date | null>(today);
  const [actualSecondDate, setActualSecondDate] = useState<Date | null>(today);
  const [actualThirdDate, setActualThirdDate] = useState<Date | null>(today);

  const selectMode = (nextMode: PrescriptionVisitMode) => {
    setMode(nextMode);
    setLastVisitDate(nextMode === 'new' ? today() : null);
    setActualSecondDate(today());
    setActualThirdDate(today());
  };

  const result = useMemo(() => {
    if (mode === 'new') {
      const timeline = calculateInitialPrescriptionPlan(lastVisitDate);
      return timeline ? { timeline } : null;
    }
    if (mode === 'second-dispense') return calculateSecondDispensePlan({ lastVisitDate, actualSecondDate });
    return calculateThirdDispensePlan({ actualThirdDate, lastVisitDate });
  }, [mode, lastVisitDate, actualSecondDate, actualThirdDate]);

  return (
    <main className="page-shell prescription-shell">
      <div className="page-heading">
        <div><p className="eyebrow"><Pill size={16} /> 固定 28 天週期</p><h1>慢箋療程</h1><p>依目前療程階段，快速推算抽血與回診日期。</p></div>
        <button className="secondary-button" onClick={() => selectMode(mode)}><RotateCcw size={18} /> 重設此模式</button>
      </div>
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
      <section className="panel">
        <fieldset>
          <legend className="text-sm font-extrabold text-slate-700">目前狀況</legend>
          <div className="mt-2 grid grid-cols-3 gap-2" role="group" aria-label="目前狀況">
            <ModeButton mode="new" active={mode === 'new'} onSelect={selectMode}>新開慢箋</ModeButton>
            <ModeButton mode="second-dispense" active={mode === 'second-dispense'} onSelect={selectMode} ariaLabel="第 2 次領藥；第二次：病人今天來領藥">第 2 次領藥</ModeButton>
            <ModeButton mode="third-dispense" active={mode === 'third-dispense'} onSelect={selectMode}>第 3 次領藥</ModeButton>
          </div>
        </fieldset>

        {mode !== 'third-dispense' && <div className="mt-5 border-t border-slate-100 pt-5">
          <h2 className="section-title"><CalendarDays size={20} /> 最後一次看診／開慢箋日期</h2>
          <div className="mt-4"><QuickDateInput key={mode} date={lastVisitDate} onChange={setLastVisitDate} /></div>
        </div>}
        {mode === 'second-dispense' && <div className="mt-5 border-t border-slate-100 pt-5"><ActualDateField label="實際第2次領藥日期" ariaLabel="實際領藥日期" value={actualSecondDate} onChange={setActualSecondDate} /></div>}
        {mode === 'third-dispense' && <div className="mt-5 space-y-4 border-t border-slate-100 pt-5">
          <ActualDateField label="實際第3次領藥日期" value={actualThirdDate} onChange={setActualThirdDate} />
          <div className="border-t border-slate-100 pt-4">
            <h2 className="section-title"><CalendarDays size={20} /> 最後一次看診／開慢箋日期（選填）</h2>
            <p className="workflow-hint mt-2">僅用於顯示原始第3次排程參考，不影響本次抽血與回診日期。</p>
            <div className="mt-3"><QuickDateInput key={mode} date={lastVisitDate} onChange={setLastVisitDate} optional dateLabel="最後一次看診日期（選填）" /></div>
          </div>
        </div>}
      </section>
      {result ? 'actualThirdDate' in result
        ? <><ThirdDispenseResultView result={result} /><PrescriptionMobileSummary labDate={result.labDate} followUpDate={result.followUpDate} /></>
        : <><PrescriptionResult mode={mode} timeline={result.timeline} dispense={'dispense' in result ? result.dispense : undefined} />{mode !== 'new' && <PrescriptionMobileSummary labDate={result.timeline.labDate} followUpDate={result.timeline.followUpDate} />}</>
        : <section className="panel text-center" aria-live="polite"><CalendarDays className="mx-auto text-slate-400" /><p className="mt-3 font-extrabold text-ink">請輸入有效日期</p><p className="mt-1 text-sm text-slate-500">日期有效後將立即顯示抽血與回診日期。</p></section>}
      </div>
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
          value={value ?? ''} onChange={(event) => { const parsed = Number(event.target.value); onChange(event.target.value === '' || !Number.isFinite(parsed) ? null : parsed); }} aria-invalid={invalid} />
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
      {result.advisories.map((advisory) => <p key={advisory.code} className="mt-3 rounded-xl bg-blue-50 p-3 text-sm font-extrabold text-blue-950">🔵 {advisory.message}</p>)}
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

function MobileResultSummary({ metabolic, metabolicProgram, dm, ckd, dkd, vpnConfirmed }: { metabolic: EligibilityResult & { positiveCount: number }; metabolicProgram: EligibilityResult; dm: EligibilityResult; ckd: EligibilityResult & { stage: string | null }; dkd: EligibilityResult; vpnConfirmed: boolean }) {
  const rows = [
    { title: '代謝', result: metabolic, meta: `${metabolic.positiveCount}/5`, target: 'eligibility-metabolic' },
    { title: 'DM', result: dm, target: 'eligibility-dm' },
    { title: 'CKD', result: ckd, meta: ckd.stage ?? undefined, target: 'eligibility-ckd' },
    { title: 'DKD', result: dkd, target: 'eligibility-dm' }
  ];
  const preEsrd = ckd.advisories.some((advisory) => advisory.code === 'PRE_ESRD');
  const vpnApplicable = metabolicProgram.status === 'eligible' || dm.status === 'eligible' || ckd.status === 'eligible';
  return (
    <section className="mobile-summary" aria-label="即時判斷摘要" aria-live="polite">
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {rows.map(({ title, result, meta, target }) => {
          const config = statusConfig[result.status];
          return <button type="button" key={title} className="mobile-summary-row" aria-label={`${title}：${config.label}，前往對應欄位`} onClick={() => document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}><span>{title}{meta ? ` · ${meta}` : ''}</span><span aria-hidden="true">{config.icon}</span></button>;
        })}
      </div>
      {preEsrd && <p className="mobile-alert mobile-alert-refer">🔵 CKD：建議評估 Pre-ESRD</p>}
      {vpnApplicable && <div className={`mobile-alert ${vpnConfirmed ? 'mobile-alert-confirmed' : 'mobile-alert-vpn'}`}><p>🟢 依目前輸入條件符合</p><p>{vpnConfirmed ? '✓ VPN／收案系統資格已人工確認' : '⚠ 尚未確認 VPN／收案系統資格'}</p></div>}
    </section>
  );
}

function SectionCard({ id, title, hint, children }: { id?: string; title: string; hint?: string; children: React.ReactNode }) {
  return <section id={id} className="panel scroll-mt-4"><div className="mb-5"><h2 className="section-title">{title}</h2>{hint && <p className="mt-1 text-sm text-slate-500">{hint}</p>}</div>{children}</section>;
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
  const dkd = evaluateDkdEligibility(dm, ckd);
  const needsUrine = ckd.stage === 'G1' || ckd.stage === 'G2';

  return (
    <main className="page-shell eligibility-shell lg:pb-12">
      <div className="page-heading">
        <div><p className="eyebrow"><ClipboardCheck size={16} /> 即時、共用輸入</p><h1>收案快速判斷</h1><p>代謝症候群、DM、Early CKD 與 DKD；所有判斷隨輸入立即更新。</p></div>
        <button className="secondary-button" onClick={() => setInput(emptyEligibility())}><RotateCcw size={18} /> 全部清除</button>
      </div>
      <MobileResultSummary metabolic={metabolic} metabolicProgram={metabolicProgram} dm={dm} ckd={ckd} dkd={dkd} vpnConfirmed={input.vpnConfirmed} />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5 min-w-0">
          <SectionCard title="1. 共用基本條件" hint="年齡與生理性別同時供代謝症候群規則使用。">
            <div className="grid gap-4 sm:grid-cols-2">
              <NumberField label="年齡" value={input.age} onChange={(v) => update('age', v)} unit="歲" max={120} placeholder="20–64" />
              <fieldset className="field-label"><legend>生理性別</legend><div className="choice-group mt-2"><button type="button" className={input.sex === 'male' ? 'choice-active' : 'choice'} onClick={() => update('sex', 'male')}>男性</button><button type="button" className={input.sex === 'female' ? 'choice-active' : 'choice'} onClick={() => update('sex', 'female')}>女性</button></div></fieldset>
            </div>
          </SectionCard>

          <SectionCard id="eligibility-metabolic" title="2. 代謝症候群" hint="五項判定與防治計畫收案資格分開呈現。">
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

          <SectionCard id="eligibility-dm" title="3. DM 收案條件">
            <div className="space-y-4"><TriChoice label="有 E08–E13 糖尿病診斷" value={input.dmDiagnosis} onChange={(v) => update('dmDiagnosis', v)} /><TriChoice label="近 90 天本院糖尿病就醫 ≥ 2 次" value={input.dmVisits} onChange={(v) => update('dmVisits', v)} /><TriChoice label="本次 DM 為主診斷" value={input.dmPrimaryDiagnosis} onChange={(v) => update('dmPrimaryDiagnosis', v)} /><TriChoice label="過去一年本院是否曾因此方案結案" value={input.dmClosedWithinYear} onChange={(v) => update('dmClosedWithinYear', v)} unknown /></div>
          </SectionCard>

          <SectionCard id="eligibility-ckd" title="4. Early CKD 收案條件" hint="先輸入 eGFR；僅 G1／G2 需要再輸入 UACR 或 UPCR。">
            <div className="space-y-5">
              <NumberField label="eGFR" value={input.egfr} onChange={(v) => update('egfr', v)} unit="mL/min/1.73m²" max={250} />
              {ckd.stage && <div className="rounded-xl bg-blue-50 p-4 text-blue-900" aria-live="polite"><p className="text-xs font-bold uppercase tracking-wide">CKD Stage</p><p className="mt-1 text-3xl font-black">{ckd.stage}</p>{ckd.stage === 'G3a' && <p className="mt-1 text-sm font-semibold">G3a 不需額外蛋白尿門檻</p>}{ckd.reasons.includes('蛋白尿條件符合') && <p className="mt-1 text-sm font-semibold">蛋白尿條件符合</p>}</div>}
              {needsUrine && <div className="grid gap-4 sm:grid-cols-2"><NumberField label="UACR" value={input.uacr} onChange={(v) => update('uacr', v)} unit="mg/g" max={10000} /><NumberField label="UPCR" value={input.upcr} onChange={(v) => update('upcr', v)} unit="mg/g" max={20000} /></div>}
              <TriChoice label="近 90 天曾於本院就醫" value={input.ckdRecentVisit} onChange={(v) => update('ckdRecentVisit', v)} />
              <TriChoice label="本次以 CKD 為主診斷" value={input.ckdPrimaryDiagnosis} onChange={(v) => update('ckdPrimaryDiagnosis', v)} />
            </div>
          </SectionCard>

          <SectionCard title="5. 系統資格確認" hint="本工具不串接健保 VPN；請由工作人員完成查詢。">
            <label className="confirm-check"><input type="checkbox" checked={input.vpnConfirmed} onChange={(event) => update('vpnConfirmed', event.target.checked)} /><span><strong>已人工確認 VPN／收案系統資格</strong><small>本工具未直接連線 VPN；請依院所查詢結果人工確認。</small></span></label>
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
          {(metabolicProgram.status === 'eligible' || dm.status === 'eligible' || ckd.status === 'eligible') && <div className={`mt-3 rounded-xl p-3 text-sm font-bold ${input.vpnConfirmed ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900'}`}><p>🟢 依目前輸入條件符合</p><p className="mt-1">{input.vpnConfirmed ? '✓ VPN／收案系統資格已人工確認' : '⚠ 尚未確認 VPN／收案系統資格'}</p></div>}
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
