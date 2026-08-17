export interface HourlyTrafficData {
  time: string;
  actualVehicles: number;
  aiOptimizedVehicles: number;
  averageSpeed: number;
  congestionIndex: number; // 0-100
}

export const HOURLY_TRAFFIC_FLOW: HourlyTrafficData[] = [
  { time: '00:00', actualVehicles: 420, aiOptimizedVehicles: 420, averageSpeed: 48, congestionIndex: 12 },
  { time: '02:00', actualVehicles: 210, aiOptimizedVehicles: 210, averageSpeed: 52, congestionIndex: 8 },
  { time: '04:00', actualVehicles: 280, aiOptimizedVehicles: 280, averageSpeed: 50, congestionIndex: 10 },
  { time: '06:00', actualVehicles: 780, aiOptimizedVehicles: 740, averageSpeed: 44, congestionIndex: 22 },
  { time: '07:00', actualVehicles: 1650, aiOptimizedVehicles: 1510, averageSpeed: 38, congestionIndex: 38 },
  { time: '08:00', actualVehicles: 3400, aiOptimizedVehicles: 2900, averageSpeed: 27, congestionIndex: 68 },
  { time: '09:00', actualVehicles: 4850, aiOptimizedVehicles: 3850, averageSpeed: 19, congestionIndex: 88 },
  { time: '10:00', actualVehicles: 5200, aiOptimizedVehicles: 4100, averageSpeed: 16, congestionIndex: 94 },
  { time: '11:00', actualVehicles: 4100, aiOptimizedVehicles: 3350, averageSpeed: 23, congestionIndex: 72 },
  { time: '12:00', actualVehicles: 3600, aiOptimizedVehicles: 3100, averageSpeed: 28, congestionIndex: 60 },
  { time: '13:00', actualVehicles: 3400, aiOptimizedVehicles: 2950, averageSpeed: 29, congestionIndex: 56 },
  { time: '14:00', actualVehicles: 3200, aiOptimizedVehicles: 2800, averageSpeed: 31, congestionIndex: 52 },
  { time: '15:00', actualVehicles: 3700, aiOptimizedVehicles: 3150, averageSpeed: 27, congestionIndex: 64 },
  { time: '16:00', actualVehicles: 4300, aiOptimizedVehicles: 3500, averageSpeed: 22, congestionIndex: 78 },
  { time: '17:00', actualVehicles: 5100, aiOptimizedVehicles: 3950, averageSpeed: 17, congestionIndex: 91 },
  { time: '18:00', actualVehicles: 5650, aiOptimizedVehicles: 4300, averageSpeed: 14, congestionIndex: 97 },
  { time: '19:00', actualVehicles: 5400, aiOptimizedVehicles: 4150, averageSpeed: 15, congestionIndex: 93 },
  { time: '20:00', actualVehicles: 4600, aiOptimizedVehicles: 3700, averageSpeed: 21, congestionIndex: 79 },
  { time: '21:00', actualVehicles: 3500, aiOptimizedVehicles: 3000, averageSpeed: 28, congestionIndex: 59 },
  { time: '22:00', actualVehicles: 2200, aiOptimizedVehicles: 2050, averageSpeed: 36, congestionIndex: 39 },
  { time: '23:00', actualVehicles: 1150, aiOptimizedVehicles: 1100, averageSpeed: 43, congestionIndex: 24 },
];

export const SPEED_DENSITY_SCATTER = [
  { density: 10, speed: 52, junction: 'RBI Square' },
  { density: 18, speed: 48, junction: 'RBI Square' },
  { density: 25, speed: 44, junction: 'Shankar Nagar' },
  { density: 35, speed: 39, junction: 'Shankar Nagar' },
  { density: 45, speed: 34, junction: 'Dharampeth' },
  { density: 55, speed: 29, junction: 'Dharampeth' },
  { density: 62, speed: 26, junction: 'Medical Square' },
  { density: 70, speed: 22, junction: 'Lokmat Square' },
  { density: 78, speed: 19, junction: 'Chhatrapati Square' },
  { density: 84, speed: 16, junction: 'Sitabuldi Interchange' },
  { density: 92, speed: 11, junction: 'Sitabuldi Interchange' },
  { density: 98, speed: 7, junction: 'Sitabuldi Interchange' },
];

export const AI_OPTIMIZATION_STATS = {
  averageDelayReducedMin: 7.4,
  fuelSavedPerDayLiters: 14200,
  co2ReducedTonnesYear: 1850,
  emergencyTransitTimeImprovement: 38.5, // percent
  totalSignalsOptimizedToday: 142,
  modelAccuracyScore: 94.8, // percent
  inferenceLatencyMs: 18,
};
