import React from 'react';
import { WeatherData, WEATHER_CODES } from '../services/weather';
import { Wind, Droplets, Thermometer, Sun, Cloud, CloudRain, Snowflake, CloudLightning } from 'lucide-react';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface WeatherDisplayProps {
  data: WeatherData;
}

export const WeatherDisplay: React.FC<WeatherDisplayProps> = ({ data }) => {
  const current = data.current;
  const weatherInfo = WEATHER_CODES[current.weather_code] || { label: 'Unknown', icon: '❓' };

  const getIcon = (code: number) => {
    if (code === 0) return <Sun className="w-8 h-8 text-yellow-400" />;
    if (code <= 3) return <Cloud className="w-8 h-8 text-gray-400" />;
    if (code >= 51 && code <= 65) return <CloudRain className="w-8 h-8 text-blue-400" />;
    if (code >= 71 && code <= 75) return <Snowflake className="w-8 h-8 text-blue-200" />;
    if (code >= 95) return <CloudLightning className="w-8 h-8 text-purple-400" />;
    return <Cloud className="w-8 h-8 text-gray-400" />;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 backdrop-blur-sm shadow-xl"
    >
      <div className="flex justify-between items-start mb-6" dir="rtl">
        <div className="text-right">
          <h3 className="text-2xl font-bold text-white mb-1">{data.location_name}</h3>
          <p className="text-zinc-400 flex items-center gap-2 justify-end">
            {weatherInfo.label} {weatherInfo.icon}
          </p>
        </div>
        <div className="text-left">
          <div className="text-4xl font-light text-white">{Math.round(current.temperature_2m)}°C</div>
          <div className="text-sm text-zinc-500">מרגיש כמו {Math.round(current.apparent_temperature)}°C</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8" dir="rtl">
        <div className="bg-zinc-800/50 rounded-xl p-3 flex flex-col items-center justify-center">
          <Wind className="w-5 h-5 text-zinc-400 mb-1" />
          <span className="text-xs text-zinc-500 uppercase font-bold tracking-wider">רוח</span>
          <span className="text-sm text-white font-mono">{current.wind_speed_10m} קמ"ש</span>
        </div>
        <div className="bg-zinc-800/50 rounded-xl p-3 flex flex-col items-center justify-center">
          <Droplets className="w-5 h-5 text-zinc-400 mb-1" />
          <span className="text-xs text-zinc-500 uppercase font-bold tracking-wider">לחות</span>
          <span className="text-sm text-white font-mono">{current.relative_humidity_2m}%</span>
        </div>
        <div className="bg-zinc-800/50 rounded-xl p-3 flex flex-col items-center justify-center">
          <Thermometer className="w-5 h-5 text-zinc-400 mb-1" />
          <span className="text-xs text-zinc-500 uppercase font-bold tracking-wider">גשם</span>
          <span className="text-sm text-white font-mono">{current.precipitation} מ"מ</span>
        </div>
      </div>

      <div className="space-y-3" dir="rtl">
        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 text-right">תחזית ל-5 ימים</h4>
        {data.daily.time.slice(1, 6).map((time, i) => (
          <div key={time} className="flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-0">
            <span className="text-sm text-zinc-300 w-24 text-right">
              {new Date(time).toLocaleDateString('he-IL', { weekday: 'long' })}
            </span>
            <div className="flex items-center gap-2 flex-1 justify-center">
              {getIcon(data.daily.weather_code[i + 1])}
            </div>
            <div className="flex gap-3 w-24 justify-end">
              <span className="text-sm text-white font-mono">{Math.round(data.daily.temperature_2m_max[i + 1])}°</span>
              <span className="text-sm text-zinc-500 font-mono">{Math.round(data.daily.temperature_2m_min[i + 1])}°</span>
            </div>
          </div>
        ))}
      </div>

      {data.models_info && (
        <div className="mt-6 pt-4 border-t border-zinc-800/50" dir="rtl">
          <h4 className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.2em] mb-3 text-right">סטטוס מודלים בזמן אמת</h4>
          <div className="flex flex-wrap gap-2">
            {data.models_info.map((model) => (
              <div key={model.name} className="bg-zinc-900/80 border border-zinc-800 rounded-lg px-2 py-1 flex items-center gap-2">
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  model.status === 'מחובר' ? "bg-emerald-500" : "bg-blue-500 animate-pulse"
                )} />
                <span className="text-[10px] font-bold text-zinc-300">{model.name}</span>
                <span className="text-[9px] text-zinc-600 font-mono">{model.last_update}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};
