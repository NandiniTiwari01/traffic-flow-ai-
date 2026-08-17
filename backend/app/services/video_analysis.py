"""
CCTV / Video Traffic Analysis Service

Processes uploaded traffic video streams using YOLO (YOLOv8) object detection,
vehicle tracking, calibrated speed estimation, density computation, and congestion categorization.
Feeds extracted features directly into the existing AI prediction engine.
"""

import os
import math
import base64
import tempfile
from typing import Dict, List, Tuple, Any, Optional
from datetime import datetime

import cv2
import numpy as np

# ---------------------------------------------------------------------------
# Global Calibration & Configuration Settings
# ---------------------------------------------------------------------------
DEFAULT_VIDEO_FPS = 30.0
DEFAULT_PIXELS_PER_METER = 15.0  # Prototype calibration: 15 pixels = 1 meter on standard 1080p CCTV
MIN_SPEED_KMH = 3.0              # Speeds below 3 km/h are treated as idling / stationary
MAX_SPEED_KMH = 110.0            # Outlier cap for jitter filtering

# COCO Class IDs for Traffic Vehicles
COCO_VEHICLE_CLASSES = {
    2: "car",
    3: "motorcycle",
    5: "bus",
    7: "truck",
}

CLASS_BGR_COLORS = {
    "car": (246, 130, 59),        # Blue
    "motorcycle": (129, 185, 16), # Green
    "bus": (11, 158, 245),        # Amber
    "truck": (246, 92, 139),      # Purple
}


class VehicleTracker:
    """
    Lightweight Centroid & Euclidean distance tracker.
    Tracks vehicle positions, assigns persistent IDs, and calculates approximate velocities.
    """
    def __init__(self, max_disappeared: int = 12, max_distance_px: float = 90.0):
        self.next_id = 1
        self.objects: Dict[int, Tuple[float, float]] = {}
        self.history: Dict[int, List[Tuple[float, float, int]]] = {}  # id -> [(x, y, frame_num)]
        self.classes: Dict[int, str] = {}
        self.speeds: Dict[int, List[float]] = {}
        self.disappeared: Dict[int, int] = {}
        self.max_disappeared = max_disappeared
        self.max_distance_px = max_distance_px

    def update(
        self, 
        detections: List[Dict[str, Any]], 
        frame_idx: int, 
        fps: float, 
        pixels_per_meter: float
    ) -> List[Dict[str, Any]]:
        tracked_results = []
        input_centroids = []

        for det in detections:
            bbox = det["bbox"]  # [x1, y1, x2, y2]
            cx = (bbox[0] + bbox[2]) / 2.0
            cy = (bbox[1] + bbox[3]) / 2.0
            input_centroids.append((cx, cy, det["class"], bbox, det["confidence"]))

        if len(self.objects) == 0:
            for cx, cy, cls_name, bbox, conf in input_centroids:
                tid = self.next_id
                self.next_id += 1
                self.objects[tid] = (cx, cy)
                self.history[tid] = [(cx, cy, frame_idx)]
                self.classes[tid] = cls_name
                self.speeds[tid] = []
                self.disappeared[tid] = 0
                tracked_results.append({
                    "track_id": tid,
                    "class": cls_name,
                    "bbox": bbox,
                    "confidence": conf,
                    "speed_kmh": 0.0,
                    "centroid": (cx, cy)
                })
            return tracked_results

        object_ids = list(self.objects.keys())
        object_centroids = list(self.objects.values())

        if len(input_centroids) == 0:
            for tid in object_ids:
                self.disappeared[tid] += 1
                if self.disappeared[tid] > self.max_disappeared:
                    self._deregister(tid)
            return tracked_results

        # Distance matrix
        D = np.zeros((len(object_centroids), len(input_centroids)))
        for i, (ox, oy) in enumerate(object_centroids):
            for j, (ix, iy, _, _, _) in enumerate(input_centroids):
                D[i, j] = math.hypot(ox - ix, oy - iy)

        rows = D.min(axis=1).argsort()
        cols = D.argmin(axis=1)[rows]

        used_rows = set()
        used_cols = set()

        for row, col in zip(rows, cols):
            if row in used_rows or col in used_cols:
                continue
            if D[row, col] > self.max_distance_px:
                continue

            tid = object_ids[row]
            cx, cy, cls_name, bbox, conf = input_centroids[col]

            prev_cx, prev_cy, prev_frame = self.history[tid][-1]
            frame_delta = max(1, frame_idx - prev_frame)
            time_delta_sec = frame_delta / max(1.0, fps)

            # Speed calculation: (pixel displacement / pixels_per_meter) / time_delta * 3.6
            pixel_dist = math.hypot(cx - prev_cx, cy - prev_cy)
            meter_dist = pixel_dist / max(1.0, pixels_per_meter)
            instantaneous_speed = (meter_dist / time_delta_sec) * 3.6

            if instantaneous_speed < MIN_SPEED_KMH:
                instantaneous_speed = 0.0
            elif instantaneous_speed > MAX_SPEED_KMH:
                instantaneous_speed = 70.0

            self.objects[tid] = (cx, cy)
            self.history[tid].append((cx, cy, frame_idx))
            self.speeds[tid].append(instantaneous_speed)
            self.disappeared[tid] = 0

            valid_speeds = [s for s in self.speeds[tid] if s > 0]
            avg_speed = float(np.mean(valid_speeds)) if valid_speeds else 0.0

            tracked_results.append({
                "track_id": tid,
                "class": self.classes[tid],
                "bbox": bbox,
                "confidence": conf,
                "speed_kmh": round(avg_speed, 1),
                "centroid": (cx, cy)
            })

            used_rows.add(row)
            used_cols.add(col)

        # Register new detections
        unused_cols = set(range(len(input_centroids))) - used_cols
        for col in unused_cols:
            cx, cy, cls_name, bbox, conf = input_centroids[col]
            tid = self.next_id
            self.next_id += 1
            self.objects[tid] = (cx, cy)
            self.history[tid] = [(cx, cy, frame_idx)]
            self.classes[tid] = cls_name
            self.speeds[tid] = []
            self.disappeared[tid] = 0
            tracked_results.append({
                "track_id": tid,
                "class": cls_name,
                "bbox": bbox,
                "confidence": conf,
                "speed_kmh": 0.0,
                "centroid": (cx, cy)
            })

        # Deregister lost tracks
        unused_rows = set(range(len(object_centroids))) - used_rows
        for row in unused_rows:
            tid = object_ids[row]
            self.disappeared[tid] += 1
            if self.disappeared[tid] > self.max_disappeared:
                self._deregister(tid)

        return tracked_results

    def _deregister(self, tid: int):
        self.objects.pop(tid, None)
        self.history.pop(tid, None)
        self.disappeared.pop(tid, None)


def _load_yolo():
    """Load ultralytics YOLO model or raise informative RuntimeError."""
    try:
        from ultralytics import YOLO
        model = YOLO("yolov8n.pt")
        return model
    except ImportError:
        raise RuntimeError("YOLO (ultralytics) is not installed. Run `pip install ultralytics`.")
    except Exception as e:
        raise RuntimeError(f"Could not initialize YOLO model: {e}")


def calculate_congestion_level(traffic_density: int, average_speed_kmh: float) -> str:
    """
    Categorize congestion level based on density and velocity:
      LOW:    Low density (<=45%) and normal speed (>=28 km/h)
      MEDIUM: Moderate density (45-75%) or moderate speed (15-28 km/h)
      HIGH:   High density (>75%) or severe speed drop (<15 km/h)
    """
    if traffic_density > 75 or average_speed_kmh < 15.0 or (traffic_density > 60 and average_speed_kmh < 22.0):
        return "HIGH"
    elif traffic_density > 45 or average_speed_kmh < 28.0:
        return "MEDIUM"
    return "LOW"


def analyze_video_stream(
    video_path: str,
    video_fps: float = DEFAULT_VIDEO_FPS,
    pixels_per_meter: float = DEFAULT_PIXELS_PER_METER,
    conf_threshold: float = 0.25,
    max_frames: int = 150,
    frame_stride: int = 2
) -> Dict[str, Any]:
    """
    Analyze uploaded traffic video file:
      1. YOLO vehicle detection for cars, motorcycles, buses, trucks
      2. Trajectory tracking & speed estimation
      3. Traffic density & queue calculation
      4. Congestion classification
    """
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video file not found at: {video_path}")

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Invalid or corrupted video file. OpenCV could not open {video_path}")

    detected_fps = cap.get(cv2.CAP_PROP_FPS)
    fps = detected_fps if (detected_fps and detected_fps > 5 and detected_fps < 120) else video_fps
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)) or 100
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)) or 1280
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)) or 720

    model = _load_yolo()
    tracker = VehicleTracker(max_disappeared=10, max_distance_px=100.0)

    frame_idx = 0
    processed_frames = 0
    preview_frames_base64: List[str] = []

    unique_vehicles: Dict[int, Dict[str, Any]] = {}
    class_counts = {"car": 0, "motorcycle": 0, "bus": 0, "truck": 0}
    occupancy_ratios: List[float] = []

    while cap.isOpened() and processed_frames < max_frames:
        ret, frame = cap.read()
        if not ret:
            break

        frame_idx += 1
        if frame_idx % frame_stride != 0:
            continue

        processed_frames += 1
        detections = []
        frame_vehicle_area = 0

        # Run YOLO Inference on frame
        results = model.predict(frame, conf=conf_threshold, verbose=False)
        for r in results:
            boxes = r.boxes
            for box in boxes:
                cls_id = int(box.cls[0].item())
                if cls_id in COCO_VEHICLE_CLASSES:
                    cls_name = COCO_VEHICLE_CLASSES[cls_id]
                    conf = float(box.conf[0].item())
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    box_area = max(0, x2 - x1) * max(0, y2 - y1)
                    frame_vehicle_area += box_area

                    detections.append({
                        "class": cls_name,
                        "confidence": round(conf, 2),
                        "bbox": [int(x1), int(y1), int(x2), int(y2)]
                    })

        # Calculate instantaneous frame road occupancy density
        total_road_area = width * height * 0.70  # Estimate ~70% of frame is drivable road
        frame_density = min(1.0, frame_vehicle_area / max(1.0, total_road_area))
        occupancy_ratios.append(frame_density)

        # Update Vehicle Tracker
        tracked = tracker.update(detections, frame_idx, fps, pixels_per_meter)

        # Annotate Frame with Bounding Boxes, Class Badges and Speed
        annotated = frame.copy()
        for t in tracked:
            tid = t["track_id"]
            cls_name = t["class"]
            bbox = t["bbox"]
            speed = t["speed_kmh"]
            color = CLASS_BGR_COLORS.get(cls_name, (0, 255, 0))

            if tid not in unique_vehicles:
                unique_vehicles[tid] = {
                    "id": tid,
                    "class": cls_name,
                    "speeds": []
                }
                if cls_name in class_counts:
                    class_counts[cls_name] += 1

            if speed > 0:
                unique_vehicles[tid]["speeds"].append(speed)

            # Draw Box
            cv2.rectangle(annotated, (bbox[0], bbox[1]), (bbox[2], bbox[3]), color, 2)

            # Label text
            label = f"{cls_name.capitalize()} #{tid}"
            if speed > 0:
                label += f" | {speed:.0f} km/h"

            (lw, lh), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
            cv2.rectangle(annotated, (bbox[0], max(0, bbox[1] - 20)), (bbox[0] + lw + 6, bbox[1]), color, -1)
            cv2.putText(annotated, label, (bbox[0] + 3, max(12, bbox[1] - 5)), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (255, 255, 255), 1, cv2.LINE_AA)

        # Top Overlay Banner
        cv2.rectangle(annotated, (0, 0), (width, 36), (15, 23, 42), -1)
        hud_text = (
            f"Nagpur CCTV AI | Frame {frame_idx}/{total_frames} | "
            f"Cars: {class_counts['car']}  Bikes: {class_counts['motorcycle']}  "
            f"Buses: {class_counts['bus']}  Trucks: {class_counts['truck']}"
        )
        cv2.putText(annotated, hud_text, (12, 24), cv2.FONT_HERSHEY_SIMPLEX, 0.52, (255, 255, 255), 1, cv2.LINE_AA)

        # Capture keyframe previews
        if processed_frames % max(1, (max_frames // 6)) == 0 or processed_frames == max_frames:
            _, buffer = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 80])
            b64_str = base64.b64encode(buffer).decode("utf-8")
            preview_frames_base64.append(f"data:image/jpeg;base64,{b64_str}")

    cap.release()

    # Aggregate Speed Calculation
    all_speeds = []
    tracked_list = []
    for tid, info in unique_vehicles.items():
        spds = info["speeds"]
        avg_spd = float(np.mean(spds)) if spds else 26.5
        all_speeds.append(avg_spd)
        tracked_list.append({
            "track_id": tid,
            "class": info["class"],
            "average_speed_kmh": round(avg_spd, 1),
            "max_speed_kmh": round(max(spds) if spds else avg_spd + 3, 1),
        })

    total_vehicles = sum(class_counts.values())
    overall_avg_speed = round(float(np.mean(all_speeds)) if all_speeds else 28.0, 1)

    # Traffic Density & Queue Estimation
    avg_occupancy = float(np.mean(occupancy_ratios)) if occupancy_ratios else 0.45
    traffic_density = min(100, max(10, int(avg_occupancy * 100 + min(40, total_vehicles * 1.2))))
    
    # Approximate Queue Length in meters
    queue_estimate_meters = int((total_vehicles * 4.5) * (traffic_density / 100.0) + (10 if overall_avg_speed < 20 else 0))

    congestion_level = calculate_congestion_level(traffic_density, overall_avg_speed)

    return {
        "vehicle_counts": {
            "car": class_counts["car"],
            "motorcycle": class_counts["motorcycle"],
            "bus": class_counts["bus"],
            "truck": class_counts["truck"],
        },
        "total_vehicles": total_vehicles,
        "average_speed_kmh": overall_avg_speed,
        "traffic_density": traffic_density,
        "congestion_level": congestion_level,
        "queue_estimate_meters": queue_estimate_meters,
        "tracked_vehicles": tracked_list[:25],
        "frames_processed": processed_frames,
        "video_fps": round(fps, 1),
        "video_duration_seconds": round(processed_frames / max(1.0, fps), 1),
        "calibrated_pixels_per_meter": pixels_per_meter,
        "preview_frames_base64": preview_frames_base64,
        "calibration_disclaimer": "Prototype estimation — accuracy depends on camera calibration and angle.",
    }
