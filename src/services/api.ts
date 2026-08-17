import { Junction, SignalRecommendation, Alert, NetworkSummary } from '../types/traffic';
import { INITIAL_NAGPUR_JUNCTIONS } from '../data/nagpurJunctions';

// -----------------------------------------------------------------------
//  FastAPI Backend Configuration
// -----------------------------------------------------------------------
const API_BASE_URL = 'http://localhost:8000';

const WEATHER_CODE_MAP: Record<string, number> = {
  Clear: 0,
  Rain: 1,
  Festival: 2,
  Construction: 3,
};

// -----------------------------------------------------------------------
//  Backend API Response Types
// -----------------------------------------------------------------------
export interface HorizonPrediction {
  predicted_vehicle_count: number;
  predicted_speed: number;
  predicted_density: number;
  congestion_probability: number;
  congestion_level: 'Low' | 'Medium' | 'High';
}

export interface PredictionResponse {
  junction_id: string;
  timestamp: string;
  inference_latency_ms: number;
  model_type: string;
  predictions: {
    '5m': HorizonPrediction;
    '10m': HorizonPrediction;
    '15m': HorizonPrediction;
    '30m': HorizonPrediction;
  };
}

export interface CCTVVideoAnalysisResponse {
  vehicle_counts: {
    car: number;
    motorcycle: number;
    bus: number;
    truck: number;
  };
  total_vehicles: number;
  average_speed_kmh: number;
  traffic_density: number;
  congestion_level: 'LOW' | 'MEDIUM' | 'HIGH';
  queue_estimate_meters: number;
  calibrated_pixels_per_meter: number;
  video_fps: number;
  frames_processed: number;
  video_duration_seconds: number;
  preview_frames_base64: string[];
  tracked_vehicles: Array<{
    track_id: number;
    class: string;
    average_speed_kmh: number;
    max_speed_kmh: number;
  }>;
  predictions?: {
    '5m': HorizonPrediction;
    '10m': HorizonPrediction;
    '15m': HorizonPrediction;
    '30m': HorizonPrediction;
  };
  signal_recommendation?: {
    current_green: number;
    recommended_green: number;
    change_seconds: number;
    reason: string;
  };
  filename?: string;
  processing_time_ms?: number;
  timestamp?: string;
  speed_disclaimer?: string;
}

export interface VideoDetectionResponse {
  total_vehicles_detected: number;
  vehicle_counts: {
    cars: number;
    bikes: number;
    buses: number;
    trucks: number;
  };
  average_speed_kmh: number;
  speed_distribution: {
    under_20: number;
    '20_to_40': number;
    '40_to_60': number;
    over_60: number;
  };
  tracked_vehicles: Array<{
    track_id: number;
    class: 'car' | 'bike' | 'bus' | 'truck' | string;
    average_speed_kmh: number;
    max_speed_kmh: number;
  }>;
  frames_processed: number;
  video_fps: number;
  video_duration_seconds: number;
  calibrated_pixels_per_meter: number;
  processing_time_ms?: number;
  filename?: string;
  preview_frames_base64: string[];
  is_sample?: boolean;
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  model_loaded: boolean;
  yolo_available?: boolean;
  known_junctions: string[];
}

// -----------------------------------------------------------------------
//  API Client — connects to FastAPI backend with graceful fallback
// -----------------------------------------------------------------------
export const TrafficAPI = {
  /** Check if the FastAPI backend is reachable. */
  async healthCheck(): Promise<HealthResponse | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/health`, { signal: AbortSignal.timeout(2000) });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  /** Get all monitored junctions. */
  async getJunctions(): Promise<Junction[]> {
    return new Promise((resolve) => {
      setTimeout(() => resolve([...INITIAL_NAGPUR_JUNCTIONS]), 100);
    });
  },

  /** Call the ML backend for a single junction prediction. */
  async predictJunction(
    junction: Junction,
    weather: string = 'Clear',
    baseVolumePct: number = 100,
  ): Promise<PredictionResponse | null> {
    const now = new Date();
    const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1;
    const isWeekend = dayOfWeek >= 5 ? 1 : 0;

    const payload = {
      junction_id: junction.id,
      lanes: junction.lanes,
      capacity: junction.capacity,
      hour: now.getHours(),
      minute: now.getMinutes(),
      day_of_week: dayOfWeek,
      is_weekend: isWeekend,
      weather_code: WEATHER_CODE_MAP[weather] ?? 0,
      base_volume_pct: baseVolumePct,
      current_vehicles: junction.vehicleCount,
      current_speed: junction.averageSpeed,
      current_density: junction.density,
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  /** Call the ML backend for all junctions in one batch. */
  async predictBatch(
    junctions: Junction[],
    weather: string = 'Clear',
    baseVolumePct: number = 100,
  ): Promise<PredictionResponse[] | null> {
    const now = new Date();
    const dayOfWeek = now.getDay() === 0 ? 6 : now.getDay() - 1;
    const isWeekend = dayOfWeek >= 5 ? 1 : 0;

    const payload = {
      junctions: junctions.map(j => ({
        junction_id: j.id,
        lanes: j.lanes,
        capacity: j.capacity,
        hour: now.getHours(),
        minute: now.getMinutes(),
        day_of_week: dayOfWeek,
        is_weekend: isWeekend,
        weather_code: WEATHER_CODE_MAP[weather] ?? 0,
        base_volume_pct: baseVolumePct,
        current_vehicles: j.vehicleCount,
        current_speed: j.averageSpeed,
        current_density: j.density,
      })),
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/predict/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.results;
    } catch {
      return null;
    }
  },

  /** Upload traffic video for full YOLO detection, tracking, speed estimation, density and 5-30m prediction */
  async analyzeVideo(
    file: File,
    pixelsPerMeter: number = 15.0,
    videoFps: number = 30.0,
    confThreshold: number = 0.25,
    junctionId: string = 'nag-01'
  ): Promise<CCTVVideoAnalysisResponse> {
    const formData = new FormData();
    formData.append('video', file);
    formData.append('pixels_per_meter', pixelsPerMeter.toString());
    formData.append('video_fps', videoFps.toString());
    formData.append('conf_threshold', confThreshold.toString());
    formData.append('junction_id', junctionId);

    const res = await fetch(`${API_BASE_URL}/analyze-video`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      let errorDetail = res.statusText;
      try {
        const errJson = await res.json();
        if (errJson.detail) errorDetail = errJson.detail;
      } catch {}
      throw new Error(errorDetail || 'Video analysis failed on server');
    }

    return await res.json();
  },

  /** Upload video to FastAPI for YOLOv8 detection & speed tracking (Legacy endpoint). */
  async detectVideo(
    file: File,
    pixelsPerMeter: number = 15.0,
    confThreshold: number = 0.30,
  ): Promise<VideoDetectionResponse> {
    const formData = new FormData();
    formData.append('video', file);
    formData.append('pixels_per_meter', pixelsPerMeter.toString());
    formData.append('conf_threshold', confThreshold.toString());

    const res = await fetch(`${API_BASE_URL}/api/v1/video/detect`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`Video detection failed: ${res.statusText}`);
    }

    return await res.json();
  },

  /** Fetch pre-computed sample CCTV analysis. */
  async getSampleVideoAnalysis(
    junctionName: string = 'Sitabuldi Interchange Flyover CCTV',
    pixelsPerMeter: number = 15.0,
  ): Promise<VideoDetectionResponse> {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/video/sample?junction_name=${encodeURIComponent(junctionName)}&pixels_per_meter=${pixelsPerMeter}`
    );
    if (!res.ok) {
      throw new Error('Failed to load sample CCTV analysis');
    }
    return await res.json();
  },

  /** Apply or Reject AI Signal Recommendation. */
  async updateSignalRecommendation(
    recommendationId: string,
    status: 'ACCEPTED' | 'REJECTED',
    newGreenTime?: number
  ): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          message: `Signal recommendation ${recommendationId} was ${status.toLowerCase()}${newGreenTime ? ` (new green: ${newGreenTime}s)` : ''}.`
        });
      }, 150);
    });
  },

  /** Trigger manual simulation incident. */
  async injectIncident(junctionId: string, incidentType: string): Promise<{ success: boolean; alert: Alert }> {
    return new Promise((resolve) => {
      const alert: Alert = {
        id: 'inc-' + Date.now(),
        junctionId,
        junctionName: INITIAL_NAGPUR_JUNCTIONS.find(j => j.id === junctionId)?.name || 'Nagpur Junction',
        type: 'INCIDENT',
        title: `Incident Reported: ${incidentType}`,
        message: `Emergency re-routing and signal override initiated at ${incidentType}.`,
        severity: 'high',
        timestamp: 'Just now',
        dismissed: false,
        actionRequired: 'Recalibrating signal timings across corridor'
      };
      resolve({ success: true, alert });
    });
  }
};
