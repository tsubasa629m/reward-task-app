'use client';

import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  Lock,
  Plus,
  Trash2,
  CheckCircle2,
  Gift,
  Ticket as TicketIcon,
  Settings,
  PlusCircle,
  MinusCircle,
  ShieldCheck,
  X,
  Coins,
  Delete,
} from 'lucide-react';
import confetti from 'canvas-confetti';

/* ============================================================
 * 型定義
 * ==========================================================*/
type TicketStatus = 'unused' | 'used';

interface Task {
  id: string;
  title: string;
  points: number;
  emoji: string;
  doneToday: boolean;
}

interface Reward {
  id: string;
  title: string;
  cost: number;
  emoji: string;
}

interface Ticket {
  id: string;
  rewardId: string;
  title: string;
  cost: number;
  emoji: string;
  status: TicketStatus;
  acquiredAt: string;
}

interface HistoryEntry {
  id: string;
  text: string;
  pointsDelta: number;
  date: string;
}

interface AppState {
  points: number;
  tasks: Task[];
  rewards: Reward[];
  tickets: Ticket[];
  history: HistoryEntry[];
  lastResetDate: string;
}

/* ============================================================
 * 定数・ユーティリティ
 * ==========================================================*/
const STORAGE_KEY = 'task-reward-app-state-v1';
const PARENT_PIN = '0000';

const TASK_EMOJIS = ['🪥', '👕', '🧹', '📚', '🛏️', '🍽️', '🎒', '🐶', '🚿', '✏️'];
const REWARD_EMOJIS = ['🎁', '🍦', '📺', '🎮', '🎨', '🚲', '🎡', '🍕', '🧸', '🍭'];

/* すべての入力欄で共通の「文字がくっきり見える」スタイル */
const INPUT_STYLE =
  'border-2 border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 focus:border-purple-400 focus:outline-none';

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

function defaultState(): AppState {
  return {
    points: 0,
    tasks: [
      { id: uid('task'), title: '歯みがきをする', points: 10, emoji: '🪥', doneToday: false },
      { id: uid('task'), title: 'お着替えをする', points: 10, emoji: '👕', doneToday: false },
      { id: uid('task'), title: 'おもちゃをかたづける', points: 15, emoji: '🧹', doneToday: false },
      { id: uid('task'), title: '宿題をする', points: 20, emoji: '📚', doneToday: false },
      { id: uid('task'), title: 'お手伝いをする', points: 15, emoji: '🐶', doneToday: false },
    ],
    rewards: [
      { id: uid('reward'), title: 'おかしを1つえらべる', cost: 30, emoji: '🍭' },
      { id: uid('reward'), title: 'テレビを15ふん多く見る', cost: 40, emoji: '📺' },
      { id: uid('reward'), title: '好きな遊びを30分', cost: 50, emoji: '🎮' },
      { id: uid('reward'), title: '特別なおでかけ', cost: 100, emoji: '🎡' },
    ],
    tickets: [],
    history: [],
    lastResetDate: getTodayStr(),
  };
}

/**
 * localStorage から読み込んだ生データを安全に AppState へ変換する。
 * - 各フィールドを個別に検証し、型が壊れている／存在しないフィールドだけを
 *   デフォルト値で補う（保存済みの配列が空 [] の場合はユーザーの意図として尊重し、
 *   デフォルトのタスクやご褒美で上書きしない）。
 * - こうすることで、アプリのアップデートで新しいフィールドが増えたり
 *   一部のデータ形式が変わったりしても、既存の保存データが丸ごと
 *   初期データに巻き戻ってしまうことを防ぐ。
 */
function hydrateState(raw: unknown): AppState {
  const fallback = defaultState();
  if (!raw || typeof raw !== 'object') return fallback;
  const parsed = raw as Partial<AppState>;

  const isValidTask = (t: unknown): t is Task =>
    !!t &&
    typeof t === 'object' &&
    typeof (t as Task).id === 'string' &&
    typeof (t as Task).title === 'string' &&
    typeof (t as Task).points === 'number';

  const isValidReward = (r: unknown): r is Reward =>
    !!r &&
    typeof r === 'object' &&
    typeof (r as Reward).id === 'string' &&
    typeof (r as Reward).title === 'string' &&
    typeof (r as Reward).cost === 'number';

  const isValidTicket = (t: unknown): t is Ticket =>
    !!t &&
    typeof t === 'object' &&
    typeof (t as Ticket).id === 'string' &&
    typeof (t as Ticket).title === 'string';

  const isValidHistory = (h: unknown): h is HistoryEntry =>
    !!h && typeof h === 'object' && typeof (h as HistoryEntry).id === 'string';

  return {
    points:
      typeof parsed.points === 'number' && Number.isFinite(parsed.points)
        ? parsed.points
        : fallback.points,
    tasks: Array.isArray(parsed.tasks) ? parsed.tasks.filter(isValidTask) : fallback.tasks,
    rewards: Array.isArray(parsed.rewards) ? parsed.rewards.filter(isValidReward) : fallback.rewards,
    tickets: Array.isArray(parsed.tickets) ? parsed.tickets.filter(isValidTicket) : fallback.tickets,
    history: Array.isArray(parsed.history) ? parsed.history.filter(isValidHistory) : fallback.history,
    lastResetDate:
      typeof parsed.lastResetDate === 'string' && parsed.lastResetDate.length > 0
        ? parsed.lastResetDate
        : fallback.lastResetDate,
  };
}

/* 紙吹雪演出 */
function fireConfetti() {
  confetti({
    particleCount: 90,
    spread: 70,
    startVelocity: 35,
    origin: { y: 0.7 },
    colors: ['#f472b6', '#fbbf24', '#60a5fa', '#4ade80', '#a78bfa'],
  });
}

function fireBigConfetti() {
  const end = Date.now() + 700;
  const colors = ['#f472b6', '#fbbf24', '#60a5fa', '#4ade80', '#a78bfa'];
  (function frame() {
    confetti({ particleCount: 6, angle: 60, spread: 65, origin: { x: 0 }, colors });
    confetti({ particleCount: 6, angle: 120, spread: 65, origin: { x: 1 }, colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
  confetti({ particleCount: 140, spread: 100, startVelocity: 45, origin: { y: 0.6 }, colors });
}

/* ============================================================
 * 共有UI部品
 * ==========================================================*/
function PointsBadge({ points }: { points: number }) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-white/90 px-5 py-2 shadow-lg ring-4 ring-yellow-200">
      <Coins className="h-6 w-6 text-yellow-500" />
      <span className="text-2xl font-black text-orange-500">{points}</span>
      <span className="text-sm font-bold text-orange-400">ポイント</span>
    </div>
  );
}

function EmojiPicker({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((e) => (
        <button
          key={e}
          type="button"
          onClick={() => onChange(e)}
          className={`grid h-9 w-9 place-items-center rounded-xl text-lg transition ${
            value === e
              ? 'bg-pink-300 ring-2 ring-pink-500 scale-110'
              : 'bg-pink-50 hover:bg-pink-100'
          }`}
        >
          {e}
        </button>
      ))}
    </div>
  );
}

/* ============================================================
 * PINロック解除モーダル
 * ==========================================================*/
function PinModal({
  title = '保護者用PIN',
  subtitle,
  onClose,
  onSuccess,
}: {
  title?: string;
  subtitle?: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (pin.length === 4) {
      if (pin === PARENT_PIN) {
        onSuccess();
      } else {
        setError(true);
        const t = setTimeout(() => {
          setPin('');
          setError(false);
        }, 500);
        return () => clearTimeout(t);
      }
    }
  }, [pin, onSuccess]);

  const press = (d: string) => {
    if (pin.length < 4) setPin((p) => p + d);
  };

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/40 p-4">
      <div
        className={`w-full max-w-xs rounded-[2rem] bg-white p-6 shadow-2xl transition ${
          error ? 'animate-bounce' : ''
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-purple-600">
            <Lock className="h-6 w-6" />
            <h2 className="text-lg font-black">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full bg-gray-100 hover:bg-gray-200"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {subtitle && (
          <p className="mb-4 rounded-2xl bg-purple-50 px-3 py-2 text-center text-sm font-bold text-purple-500">
            {subtitle}
          </p>
        )}

        <div className="mb-5 flex justify-center gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-4 w-4 rounded-full border-2 ${
                error
                  ? 'border-red-400 bg-red-300'
                  : i < pin.length
                  ? 'border-purple-400 bg-purple-400'
                  : 'border-gray-300 bg-white'
              }`}
            />
          ))}
        </div>
        {error && (
          <p className="mb-3 text-center text-sm font-bold text-red-500">PINがちがうよ！</p>
        )}

        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button
              key={d}
              onClick={() => press(d)}
              className="rounded-2xl bg-purple-50 py-3 text-xl font-bold text-purple-600 shadow active:scale-95 hover:bg-purple-100"
            >
              {d}
            </button>
          ))}
          <button
            onClick={() => setPin('')}
            className="grid place-items-center rounded-2xl bg-gray-100 py-3 text-sm font-bold text-gray-500 active:scale-95 hover:bg-gray-200"
          >
            クリア
          </button>
          <button
            onClick={() => press('0')}
            className="rounded-2xl bg-purple-50 py-3 text-xl font-bold text-purple-600 shadow active:scale-95 hover:bg-purple-100"
          >
            0
          </button>
          <button
            onClick={() => setPin((p) => p.slice(0, -1))}
            className="grid place-items-center rounded-2xl bg-gray-100 py-3 active:scale-95 hover:bg-gray-200"
          >
            <Delete className="mx-auto h-5 w-5 text-gray-500" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 * 子ども向けメイン画面（通常画面・編集ボタンなし）
 * ==========================================================*/
function ChildView({
  state,
  onCompleteTask,
  onExchangeReward,
  onRequestUseTicket,
  onOpenPin,
}: {
  state: AppState;
  onCompleteTask: (id: string) => void;
  onExchangeReward: (id: string) => void;
  onRequestUseTicket: (t: Ticket) => void;
  onOpenPin: () => void;
}) {
  const activeTickets = state.tickets.filter((t) => t.status !== 'used');

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-6">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-pink-400" />
          <h1 className="text-2xl font-black text-gray-700">きょうのタスク</h1>
        </div>
        <div className="flex items-center gap-2">
          <PointsBadge points={state.points} />
          <button
            onClick={onOpenPin}
            className="grid h-11 w-11 place-items-center rounded-full bg-white/90 text-gray-400 shadow-lg hover:text-purple-500"
            title="保護者設定"
          >
            <Lock className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* タスク一覧 */}
      <section className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {state.tasks.length === 0 && (
          <p className="col-span-full rounded-2xl bg-white/70 p-6 text-center font-bold text-gray-400">
            タスクがまだないよ。保護者設定で追加してね！
          </p>
        )}
        {state.tasks.map((task) => (
          <div
            key={task.id}
            className={`flex items-center gap-3 rounded-[1.75rem] p-4 shadow-lg transition ${
              task.doneToday ? 'bg-green-100' : 'bg-white'
            }`}
          >
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-yellow-100 text-3xl">
              {task.emoji}
            </div>
            <div className="min-w-0 flex-1">
              <p className="whitespace-normal break-words text-base font-bold text-gray-700">
                {task.title}
              </p>
              <p className="text-sm font-semibold text-orange-400">+{task.points}pt</p>
            </div>
            <button
              disabled={task.doneToday}
              onClick={() => onCompleteTask(task.id)}
              className={`shrink-0 rounded-2xl px-4 py-2.5 text-sm font-black shadow active:scale-95 ${
                task.doneToday
                  ? 'bg-green-300 text-white'
                  : 'bg-gradient-to-r from-pink-400 to-orange-400 text-white hover:brightness-105'
              }`}
            >
              {task.doneToday ? (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> やった！
                </span>
              ) : (
                'やった！'
              )}
            </button>
          </div>
        ))}
      </section>

      {/* ご褒美交換 */}
      <section className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-xl font-black text-gray-700">
          <Gift className="h-6 w-6 text-purple-400" /> ごほうびとこうかん
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {state.rewards.map((r) => {
            const canAfford = state.points >= r.cost;
            return (
              <div
                key={r.id}
                className="flex items-center gap-3 rounded-[1.75rem] bg-white p-4 shadow-lg"
              >
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-blue-100 text-3xl">
                  {r.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="whitespace-normal break-words text-base font-bold text-gray-700">
                    {r.title}
                  </p>
                  <p className="text-sm font-semibold text-blue-400">{r.cost}pt</p>
                </div>
                <button
                  disabled={!canAfford}
                  onClick={() => onExchangeReward(r.id)}
                  className={`shrink-0 rounded-2xl px-4 py-2.5 text-sm font-black shadow active:scale-95 ${
                    canAfford
                      ? 'bg-gradient-to-r from-purple-400 to-blue-400 text-white hover:brightness-105'
                      : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  こうかん
                </button>
              </div>
            );
          })}
          {state.rewards.length === 0 && (
            <p className="col-span-full rounded-2xl bg-white/70 p-6 text-center font-bold text-gray-400">
              ごほうびがまだないよ。保護者設定で追加してね！
            </p>
          )}
        </div>
      </section>

      {/* 所持チケット */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-xl font-black text-gray-700">
          <TicketIcon className="h-6 w-6 text-pink-400" /> もっているチケット
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {activeTickets.length === 0 && (
            <p className="col-span-full rounded-2xl bg-white/70 p-6 text-center font-bold text-gray-400">
              チケットはまだないよ！
            </p>
          )}
          {activeTickets.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-3 rounded-[1.75rem] border-4 border-dashed border-yellow-300 bg-yellow-50 p-4 shadow"
            >
              <div className="shrink-0 text-3xl">{t.emoji}</div>
              <div className="min-w-0 flex-1">
                <p className="whitespace-normal break-words text-base font-bold text-gray-700">
                  {t.title}
                </p>
                <p className="text-xs font-semibold text-yellow-600">つかえるよ！</p>
              </div>
              {t.status !== 'used' && (
                <button
                  onClick={() => onRequestUseTicket(t)}
                  className="shrink-0 rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-400 px-4 py-2.5 text-sm font-black text-white shadow active:scale-95"
                >
                  つかう
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ============================================================
 * 保護者設定モーダル（PIN認証後のみ表示）
 * ==========================================================*/
function ParentSettingsModal({
  state,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onAddReward,
  onUpdateReward,
  onDeleteReward,
  onAdjustPoints,
  onClose,
}: {
  state: AppState;
  onAddTask: (title: string, points: number, emoji: string) => void;
  onUpdateTask: (id: string, patch: { title?: string; points?: number }) => void;
  onDeleteTask: (id: string) => void;
  onAddReward: (title: string, cost: number, emoji: string) => void;
  onUpdateReward: (id: string, patch: { title?: string; cost?: number }) => void;
  onDeleteReward: (id: string) => void;
  onAdjustPoints: (amount: number) => void;
  onClose: () => void;
}) {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPoints, setNewTaskPoints] = useState(10);
  const [newTaskEmoji, setNewTaskEmoji] = useState(TASK_EMOJIS[0]);

  const [newRewardTitle, setNewRewardTitle] = useState('');
  const [newRewardCost, setNewRewardCost] = useState(30);
  const [newRewardEmoji, setNewRewardEmoji] = useState(REWARD_EMOJIS[0]);

  const [customAmount, setCustomAmount] = useState(10);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-3 sm:p-6">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-[2rem] bg-orange-50 shadow-2xl">
        {/* ヘッダー */}
        <div className="flex items-center justify-between rounded-t-[2rem] bg-white px-5 py-4 shadow">
          <div className="flex items-center gap-2 text-purple-600">
            <ShieldCheck className="h-7 w-7" />
            <h1 className="text-xl font-black">保護者設定</h1>
          </div>
          <div className="flex items-center gap-2">
            <PointsBadge points={state.points} />
            <button
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-full bg-gray-100 hover:bg-gray-200"
              title="とじる"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* 本文（スクロール） */}
        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          {/* ポイント手動調整 */}
          <section className="rounded-[1.75rem] bg-white p-4 shadow-lg">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-gray-700">
              <Coins className="h-5 w-5 text-yellow-500" /> ポイントの調整
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => onAdjustPoints(-10)}
                className="rounded-xl bg-red-100 px-3 py-2 text-sm font-bold text-red-500 active:scale-95 hover:bg-red-200"
              >
                -10
              </button>
              <button
                onClick={() => onAdjustPoints(10)}
                className="rounded-xl bg-green-100 px-3 py-2 text-sm font-bold text-green-600 active:scale-95 hover:bg-green-200"
              >
                +10
              </button>
              <input
                type="number"
                value={customAmount}
                onChange={(e) => setCustomAmount(Number(e.target.value))}
                className={`w-20 rounded-xl px-2 py-2 text-center font-bold ${INPUT_STYLE}`}
              />
              <button
                onClick={() => onAdjustPoints(customAmount)}
                className="flex items-center gap-1 rounded-xl bg-green-500 px-3 py-2 text-sm font-bold text-white active:scale-95"
              >
                <PlusCircle className="h-4 w-4" /> 追加
              </button>
              <button
                onClick={() => onAdjustPoints(-customAmount)}
                className="flex items-center gap-1 rounded-xl bg-red-500 px-3 py-2 text-sm font-bold text-white active:scale-95"
              >
                <MinusCircle className="h-4 w-4" /> 減らす
              </button>
            </div>
          </section>

          {/* タスク管理 */}
          <section className="rounded-[1.75rem] bg-white p-4 shadow-lg">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-gray-700">
              <Settings className="h-5 w-5 text-blue-400" /> タスクの管理
            </h2>
            <div className="mb-4 space-y-2">
              {state.tasks.map((task) => (
                <div key={task.id} className="flex items-center gap-2 rounded-2xl bg-gray-50 p-2.5">
                  <span className="text-xl">{task.emoji}</span>
                  <input
                    value={task.title}
                    onChange={(e) => onUpdateTask(task.id, { title: e.target.value })}
                    className={`w-0 min-w-0 flex-1 rounded-lg px-2 py-1 text-sm font-bold ${INPUT_STYLE}`}
                  />
                  <input
                    type="number"
                    value={task.points}
                    onChange={(e) => onUpdateTask(task.id, { points: Number(e.target.value) })}
                    className={`w-16 shrink-0 rounded-lg px-1 py-1 text-center text-sm font-bold ${INPUT_STYLE}`}
                  />
                  <span className="shrink-0 text-xs text-gray-400">pt</span>
                  <button
                    onClick={() => onDeleteTask(task.id)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-red-50 text-red-400 hover:bg-red-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {state.tasks.length === 0 && (
                <p className="rounded-xl bg-gray-50 p-3 text-center text-sm font-semibold text-gray-400">
                  タスクはまだありません
                </p>
              )}
            </div>
            <div className="rounded-2xl bg-blue-50 p-3">
              <p className="mb-2 text-sm font-bold text-blue-500">あたらしいタスクを追加</p>
              <div className="mb-2 flex flex-col gap-2 sm:flex-row">
                <input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="タスク名"
                  className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold ${INPUT_STYLE}`}
                />
                <input
                  type="number"
                  value={newTaskPoints}
                  onChange={(e) => setNewTaskPoints(Number(e.target.value))}
                  className={`w-24 rounded-xl px-3 py-2 text-center text-sm font-semibold ${INPUT_STYLE}`}
                />
              </div>
              <div className="mb-2">
                <EmojiPicker options={TASK_EMOJIS} value={newTaskEmoji} onChange={setNewTaskEmoji} />
              </div>
              <button
                disabled={!newTaskTitle.trim()}
                onClick={() => {
                  onAddTask(newTaskTitle.trim(), newTaskPoints, newTaskEmoji);
                  setNewTaskTitle('');
                  setNewTaskPoints(10);
                }}
                className="flex w-full items-center justify-center gap-1 rounded-xl bg-blue-500 py-2.5 text-sm font-black text-white shadow active:scale-95 disabled:bg-gray-300"
              >
                <Plus className="h-4 w-4" /> 追加する
              </button>
            </div>
          </section>

          {/* ご褒美管理 */}
          <section className="rounded-[1.75rem] bg-white p-4 shadow-lg">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-gray-700">
              <Gift className="h-5 w-5 text-purple-400" /> ごほうびの管理
            </h2>
            <div className="mb-4 space-y-2">
              {state.rewards.map((r) => (
                <div key={r.id} className="flex items-center gap-2 rounded-2xl bg-gray-50 p-2.5">
                  <span className="text-xl">{r.emoji}</span>
                  <input
                    value={r.title}
                    onChange={(e) => onUpdateReward(r.id, { title: e.target.value })}
                    className={`w-0 min-w-0 flex-1 rounded-lg px-2 py-1 text-sm font-bold ${INPUT_STYLE}`}
                  />
                  <input
                    type="number"
                    value={r.cost}
                    onChange={(e) => onUpdateReward(r.id, { cost: Number(e.target.value) })}
                    className={`w-16 shrink-0 rounded-lg px-1 py-1 text-center text-sm font-bold ${INPUT_STYLE}`}
                  />
                  <span className="shrink-0 text-xs text-gray-400">pt</span>
                  <button
                    onClick={() => onDeleteReward(r.id)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-red-50 text-red-400 hover:bg-red-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {state.rewards.length === 0 && (
                <p className="rounded-xl bg-gray-50 p-3 text-center text-sm font-semibold text-gray-400">
                  ごほうびはまだありません
                </p>
              )}
            </div>
            <div className="rounded-2xl bg-purple-50 p-3">
              <p className="mb-2 text-sm font-bold text-purple-500">あたらしいごほうびを追加</p>
              <div className="mb-2 flex flex-col gap-2 sm:flex-row">
                <input
                  value={newRewardTitle}
                  onChange={(e) => setNewRewardTitle(e.target.value)}
                  placeholder="ごほうび名"
                  className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold ${INPUT_STYLE}`}
                />
                <input
                  type="number"
                  value={newRewardCost}
                  onChange={(e) => setNewRewardCost(Number(e.target.value))}
                  className={`w-24 rounded-xl px-3 py-2 text-center text-sm font-semibold ${INPUT_STYLE}`}
                />
              </div>
              <div className="mb-2">
                <EmojiPicker options={REWARD_EMOJIS} value={newRewardEmoji} onChange={setNewRewardEmoji} />
              </div>
              <button
                disabled={!newRewardTitle.trim()}
                onClick={() => {
                  onAddReward(newRewardTitle.trim(), newRewardCost, newRewardEmoji);
                  setNewRewardTitle('');
                  setNewRewardCost(30);
                }}
                className="flex w-full items-center justify-center gap-1 rounded-xl bg-purple-500 py-2.5 text-sm font-black text-white shadow active:scale-95 disabled:bg-gray-300"
              >
                <Plus className="h-4 w-4" /> 追加する
              </button>
            </div>
          </section>

          {/* 履歴 */}
          {state.history.length > 0 && (
            <section className="rounded-[1.75rem] bg-white p-4 shadow-lg">
              <h2 className="mb-3 text-lg font-black text-gray-700">最近のできごと</h2>
              <div className="max-h-40 space-y-1 overflow-y-auto">
                {state.history
                  .slice()
                  .reverse()
                  .slice(0, 30)
                  .map((h) => (
                    <div key={h.id} className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">{h.text}</span>
                      <span
                        className={`font-bold ${h.pointsDelta >= 0 ? 'text-green-500' : 'text-red-400'}`}
                      >
                        {h.pointsDelta >= 0 ? '+' : ''}
                        {h.pointsDelta}pt
                      </span>
                    </div>
                  ))}
              </div>
            </section>
          )}
        </div>

        {/* フッター */}
        <div className="rounded-b-[2rem] bg-white px-5 py-3 shadow-inner">
          <button
            onClick={onClose}
            className="w-full rounded-2xl bg-gradient-to-r from-pink-400 to-orange-400 py-3 font-black text-white shadow active:scale-95"
          >
            子どもモードにもどる
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 * メインコンポーネント
 * ==========================================================*/
export default function Page() {
  const [state, setState] = useState<AppState>(defaultState);
  const [loaded, setLoaded] = useState(false);
  const [showParentSettings, setShowParentSettings] = useState(false);
  /* PINモーダルの要求内容：保護者設定を開くためのPINか、チケット使用を認証するためのPINか */
  const [pinRequest, setPinRequest] = useState<
    { purpose: 'settings' } | { purpose: 'useTicket'; ticket: Ticket } | null
  >(null);

  /*
   * 初回読み込み：マウント時に一度だけ実行される。
   * - localStorage に保存済みデータがあれば、必ずそれを最優先で復元する
   *   （hydrateState が形式チェックとフィールド補完を行うので、
   *   アプリのアップデートで多少データ形式が変わっても初期データに
   *   巻き戻らない）。
   * - 保存データが存在しない「本当の初回アクセス時」だけ、
   *   useState の初期値であるデフォルトデータをそのまま使う。
   * - 日付が変わっていたら「今日やったこと」フラグだけをリセットする
   *   （ポイントやタスク・ご褒美の中身には一切手を触れない）。
   */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw !== null) {
        const parsedJson = JSON.parse(raw);
        const restored = hydrateState(parsedJson);
        const today = getTodayStr();
        if (restored.lastResetDate !== today) {
          restored.tasks = restored.tasks.map((t) => ({ ...t, doneToday: false }));
          restored.lastResetDate = today;
        }
        setState(restored);
      }
      // raw === null の場合（保存データがまだ存在しない初回アクセス）は
      // useState(defaultState) で設定済みの初期値をそのまま使う。
    } catch (e) {
      console.error('保存データの読み込みに失敗しました。初期データを使用します。', e);
    } finally {
      setLoaded(true);
    }
  }, []);

  /*
   * 保存：state が変化するたびに localStorage へ即時保存する。
   * loaded フラグが立つ前（初回読み込みが完了する前）は保存しないことで、
   * 読み込み前のデフォルト値で保存済みデータを誤って上書きしてしまう
   * 事故を防いでいる。
   */
  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('保存データの書き込みに失敗しました', e);
    }
  }, [state, loaded]);

  const addHistory = (text: string, pointsDelta: number, s: AppState): AppState => ({
    ...s,
    history: [...s.history, { id: uid('hist'), text, pointsDelta, date: new Date().toISOString() }],
  });

  /* ---------- タスク関連 ---------- */
  const completeTask = (taskId: string) => {
    setState((prev) => {
      const task = prev.tasks.find((t) => t.id === taskId);
      if (!task || task.doneToday) return prev;
      const next: AppState = {
        ...prev,
        points: prev.points + task.points,
        tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, doneToday: true } : t)),
      };
      return addHistory(`「${task.title}」をやった！`, task.points, next);
    });
    fireConfetti();
  };

  const addTask = (title: string, points: number, emoji: string) => {
    setState((prev) => ({
      ...prev,
      tasks: [
        ...prev.tasks,
        { id: uid('task'), title, points: Math.max(0, points || 0), emoji, doneToday: false },
      ],
    }));
  };

  const deleteTask = (id: string) => {
    setState((prev) => ({ ...prev, tasks: prev.tasks.filter((t) => t.id !== id) }));
  };

  const updateTask = (id: string, patch: { title?: string; points?: number }) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => {
        if (t.id !== id) return t;
        const next = { ...t };
        if (patch.title !== undefined) next.title = patch.title;
        if (patch.points !== undefined) next.points = Math.max(0, patch.points || 0);
        return next;
      }),
    }));
  };

  /* ---------- ご褒美関連 ---------- */
  const exchangeReward = (rewardId: string) => {
    setState((prev) => {
      const reward = prev.rewards.find((r) => r.id === rewardId);
      if (!reward || prev.points < reward.cost) return prev;
      const ticket: Ticket = {
        id: uid('ticket'),
        rewardId: reward.id,
        title: reward.title,
        cost: reward.cost,
        emoji: reward.emoji,
        status: 'unused',
        acquiredAt: new Date().toISOString(),
      };
      const next: AppState = {
        ...prev,
        points: prev.points - reward.cost,
        tickets: [...prev.tickets, ticket],
      };
      return addHistory(`「${reward.title}」とこうかんした`, -reward.cost, next);
    });
    fireConfetti();
  };

  const addReward = (title: string, cost: number, emoji: string) => {
    setState((prev) => ({
      ...prev,
      rewards: [...prev.rewards, { id: uid('reward'), title, cost: Math.max(0, cost || 0), emoji }],
    }));
  };

  const deleteReward = (id: string) => {
    setState((prev) => ({ ...prev, rewards: prev.rewards.filter((r) => r.id !== id) }));
  };

  const updateReward = (id: string, patch: { title?: string; cost?: number }) => {
    setState((prev) => ({
      ...prev,
      rewards: prev.rewards.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r };
        if (patch.title !== undefined) next.title = patch.title;
        if (patch.cost !== undefined) next.cost = Math.max(0, patch.cost || 0);
        return next;
      }),
    }));
  };

  /* ---------- チケット関連 ---------- */
  /* 「つかう」ボタン → 中間確認なしで直接PIN入力モーダルを要求する */
  const requestUseTicket = (ticket: Ticket) => setPinRequest({ purpose: 'useTicket', ticket });

  /* PIN認証が通った瞬間に、そのチケットを即使用済みにする */
  const useTicketNow = (ticketId: string) => {
    setState((prev) => {
      const ticket = prev.tickets.find((t) => t.id === ticketId);
      if (!ticket || ticket.status === 'used') return prev;
      const next: AppState = {
        ...prev,
        tickets: prev.tickets.map((t) => (t.id === ticketId ? { ...t, status: 'used' } : t)),
      };
      return addHistory(`「${ticket.title}」をつかったよ！`, 0, next);
    });
    fireBigConfetti();
  };

  /* PINモーダルの認証成功時：要求の種類ごとに処理を振り分ける */
  const handlePinSuccess = () => {
    if (!pinRequest) return;
    if (pinRequest.purpose === 'settings') {
      setShowParentSettings(true);
    } else if (pinRequest.purpose === 'useTicket') {
      useTicketNow(pinRequest.ticket.id);
    }
    setPinRequest(null);
  };

  /* ---------- ポイント調整 ---------- */
  const adjustPoints = (amount: number) => {
    if (!amount) return;
    setState((prev) => {
      const next: AppState = { ...prev, points: Math.max(0, prev.points + amount) };
      return addHistory(
        amount >= 0 ? '保護者がポイントを追加した' : '保護者がポイントを減らした',
        amount,
        next,
      );
    });
  };

  if (!loaded) {
    return (
      <div className="grid min-h-screen place-items-center bg-gradient-to-br from-pink-100 via-yellow-50 to-blue-100">
        <p className="animate-pulse text-lg font-black text-gray-400">よみこみちゅう…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-yellow-50 to-blue-100">
      {/* 通常画面（子ども向け）：編集ボタンは一切出さない */}
      <ChildView
        state={state}
        onCompleteTask={completeTask}
        onExchangeReward={exchangeReward}
        onRequestUseTicket={requestUseTicket}
        onOpenPin={() => setPinRequest({ purpose: 'settings' })}
      />

      {/* PIN認証モーダル：保護者設定を開く時／チケットを使用する時の両方で使う */}
      {pinRequest && (
        <PinModal
          title={pinRequest.purpose === 'useTicket' ? 'チケット使用のPIN' : '保護者用PIN'}
          subtitle={
            pinRequest.purpose === 'useTicket'
              ? `「${pinRequest.ticket.title}」を使用します。保護者の方がPINを入力してください。`
              : undefined
          }
          onClose={() => setPinRequest(null)}
          onSuccess={handlePinSuccess}
        />
      )}

      {/* 認証成功後に開く保護者設定モーダル */}
      {showParentSettings && (
        <ParentSettingsModal
          state={state}
          onAddTask={addTask}
          onUpdateTask={updateTask}
          onDeleteTask={deleteTask}
          onAddReward={addReward}
          onUpdateReward={updateReward}
          onDeleteReward={deleteReward}
          onAdjustPoints={adjustPoints}
          onClose={() => setShowParentSettings(false)}
        />
      )}
    </div>
  );
}
