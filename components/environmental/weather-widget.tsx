"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, CloudRain, Sun, Snowflake, Cloud, Thermometer } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const ANOMALY_THRESHOLDS = {
  extremeHeat: 35,
  extremeCold: 0,
  heatWave: { temp: 30, days: 3 },
  coldSnap: { temp: 5, days: 3 }
};

function getWeatherIcon(code: number | undefined) {
  if (code === undefined) return <Thermometer className="w-8 h-8 text-muted-foreground" />;
  if (code === 0) return <Sun className="w-8 h-8 text-yellow-500" />;
  if (code > 0 && code < 4) return <Cloud className="w-8 h-8 text-gray-500" />;
  if (code >= 51 && code <= 67) return <CloudRain className="w-8 h-8 text-blue-500" />;
  if (code >= 71 && code <= 77) return <Snowflake className="w-8 h-8 text-cyan-500" />;
  return <Thermometer className="w-8 h-8 text-muted-foreground" />;
}

export function WeatherWidget({ carbonData = [] }: { carbonData?: any[] }) {
  const [weather, setWeather] = useState<any>(null);
  const [anomaly, setAnomaly] = useState<any>(null);
  
  useEffect(() => {
    // Fetch from Open-Meteo (Free API, no key required)
    // Using New York coordinates as default (can be updated with geolocation)
    fetch('https://api.open-meteo.com/v1/forecast?latitude=40.7128&longitude=-74.0060&current=temperature_2m,weather_code&past_days=7&daily=temperature_2m_max,temperature_2m_min')
      .then(r => r.json())
      .then(data => {
        setWeather(data);
        checkAnomaly(data).then(setAnomaly);
      }).catch(err => {
        console.error('Failed to fetch weather data', err);
      });
  }, []);

  const checkAnomaly = async (data: any) => {
    const currentTemp = data.current?.temperature_2m;
    const pastTempsMax = data.daily?.temperature_2m_max || [];
    const pastTempsMin = data.daily?.temperature_2m_min || [];

    // Basic heuristic: Is it an extreme day today?
    if (currentTemp > ANOMALY_THRESHOLDS.extremeHeat) {
      return {
        detected: true,
        message: `Extreme heat (${currentTemp}°C) detected! Expected energy emissions spike by ~15% due to cooling.`,
      };
    } else if (currentTemp < ANOMALY_THRESHOLDS.extremeCold) {
      return {
        detected: true,
        message: `Extreme cold (${currentTemp}°C) detected! Expected energy emissions spike by ~20% due to heating.`,
      };
    }

    // Check for heatwaves
    let consecutiveHeat = 0;
    for (let temp of pastTempsMax) {
      if (temp >= ANOMALY_THRESHOLDS.heatWave.temp) consecutiveHeat++;
      else consecutiveHeat = 0;
      if (consecutiveHeat >= ANOMALY_THRESHOLDS.heatWave.days) {
         return {
            detected: true,
            message: `A ${consecutiveHeat}-day heatwave detected. Energy emissions expected to spike above baseline.`
         };
      }
    }

    // Check for cold snaps
    let consecutiveCold = 0;
    for (let temp of pastTempsMin) {
      if (temp <= ANOMALY_THRESHOLDS.coldSnap.temp) consecutiveCold++;
      else consecutiveCold = 0;
      if (consecutiveCold >= ANOMALY_THRESHOLDS.coldSnap.days) {
         return {
            detected: true,
            message: `A ${consecutiveCold}-day cold snap detected. Energy emissions expected to spike above baseline.`
         };
      }
    }

    return { detected: false };
  };
  
  if (!weather) {
    return (
      <Card className="relative overflow-hidden">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground animate-pulse">Loading weather data...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden border border-border">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {getWeatherIcon(weather.current?.weather_code)}
            <div>
              <div className="text-3xl font-bold">{weather.current?.temperature_2m}°C</div>
              <div className="text-sm text-muted-foreground">Current Local Weather</div>
            </div>
          </div>
          {!anomaly?.detected && (
             <div className="hidden sm:block text-sm font-medium px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">
               Optimal Conditions
             </div>
          )}
        </div>
        
        {anomaly?.detected && (
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-lg">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-semibold">Weather Anomaly Detected</span>
            </div>
            <p className="text-sm text-red-600 dark:text-red-300 mt-2">
              {anomaly.message}
            </p>
            <Button variant="link" size="sm" className="mt-2 h-auto p-0 text-red-700 dark:text-red-400 font-semibold">
              View correlated carbon transactions &rarr;
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
