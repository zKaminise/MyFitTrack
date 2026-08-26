import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

const AXIS = { fontSize: 11, fill: 'var(--text-faint)' };

export function VolumeChart({ data }: { data: { date: string; volume: number }[] }) {
  if (data.length === 0) return <p className="faint center">Sem dados.</p>;
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="date" tick={AXIS} interval="preserveStartEnd" />
        <YAxis tick={AXIS} width={44} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--accent-soft)' }} />
        <Bar dataKey="volume" fill="var(--accent)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ExerciseLineChart({
  data,
  dataKey,
  color = 'var(--accent)',
}: {
  data: { date: string; [k: string]: number | string }[];
  dataKey: string;
  color?: string;
}) {
  if (data.length === 0) return <p className="faint center">Sem dados.</p>;
  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="date" tick={AXIS} interval="preserveStartEnd" />
        <YAxis tick={AXIS} width={44} domain={['auto', 'auto']} />
        <Tooltip contentStyle={tooltipStyle} />
        <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

const tooltipStyle = {
  background: 'var(--card-2)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  color: 'var(--text)',
  fontSize: 13,
};
