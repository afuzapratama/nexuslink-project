interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export default function StatsCard({
  title,
  value,
  subtitle,
  icon,
  trend,
}: StatsCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm transition-all duration-300 hover:border-slate-700 hover:bg-slate-900/80 hover:shadow-lg hover:shadow-blue-900/5">
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-blue-500/5 blur-2xl transition-all group-hover:bg-blue-500/10"></div>
      
      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-400">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-50 tracking-tight">{value}</p>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
          )}
          {trend && (
            <div className="mt-3 flex items-center gap-1.5">
              <span
                className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium ${
                  trend.isPositive 
                    ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20' 
                    : 'bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20'
                }`}
              >
                {trend.isPositive ? '↑' : '↓'} {trend.value}
              </span>
              <span className="text-xs text-slate-500">vs last period</span>
            </div>
          )}
        </div>
        {icon && (
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800/50 text-2xl text-slate-200 ring-1 ring-white/5 transition-colors group-hover:bg-blue-500/10 group-hover:text-blue-400 group-hover:ring-blue-500/20">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
