"""
Face detection + active speaker tracking + Kalman-smoothed crop window.

Stack:
  - YOLO11n-face: face detection (robust multi-face)
  - MediaPipe FaceMesh (Tasks API): lip aperture for active speaker selection
  - filterpy KalmanFilter: smooth crop center across frames
"""
import asyncio
import logging
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np

logger = logging.getLogger(__name__)

# Frames to skip between full detections (interpolate between)
DETECTION_STRIDE = 3
# No face detected for this many frames → center crop fallback
FALLBACK_FRAMES = 30
# Max velocity cap: fraction of frame width/height per frame
MAX_VELOCITY_FRAC = 0.05
# Mouth aperture threshold (fraction of face height) to classify as speaking
LIP_OPEN_THRESHOLD = 0.025
# Moving average window for lip activity (frames)
LIP_WINDOW = 10


@dataclass
class FrameCrop:
    frame_idx: int
    cx: float  # center x in source coords
    cy: float  # center y in source coords
    # crop will be a square on the short dimension to produce 9:16 output


def _build_kalman(initial_cx: float, initial_cy: float) -> "KalmanFilter":
    from filterpy.kalman import KalmanFilter

    kf = KalmanFilter(dim_x=4, dim_z=2)
    kf.F = np.array([[1, 0, 1, 0],
                     [0, 1, 0, 1],
                     [0, 0, 1, 0],
                     [0, 0, 0, 1]], dtype=float)
    kf.H = np.array([[1, 0, 0, 0],
                     [0, 1, 0, 0]], dtype=float)
    kf.R *= 10.0    # measurement noise
    kf.Q *= 0.01    # process noise
    kf.x = np.array([[initial_cx], [initial_cy], [0.0], [0.0]])
    kf.P *= 100.0
    return kf


def _lip_aperture(face_landmarks_px: np.ndarray, face_h: float) -> float:
    """Vertical distance between upper and lower lip center, normalized by face height."""
    # MediaPipe FaceMesh indices for lip landmarks:
    # 13 = upper lip top center, 14 = lower lip bottom center
    if len(face_landmarks_px) > 14:
        upper = face_landmarks_px[13]
        lower = face_landmarks_px[14]
        dist = abs(lower[1] - upper[1])
        return dist / (face_h + 1e-6)
    return 0.0


def _run_detect(video_path: Path, start_sec: float, end_sec: float) -> list[FrameCrop]:
    from ultralytics import YOLO
    import mediapipe as mp
    from mediapipe.tasks import python as mp_python
    from mediapipe.tasks.python import vision as mp_vision

    cap = cv2.VideoCapture(str(video_path))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    frame_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    start_frame = int(start_sec * fps)
    end_frame = int(end_sec * fps)

    cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)

    # Load YOLO11n-face
    try:
        yolo = YOLO("yolo11n-face.pt")
    except Exception:
        # Fallback: try downloading from ultralytics hub name
        yolo = YOLO("yolov8n-face.pt")

    # MediaPipe FaceMesh (Tasks API)
    face_mesh_options = mp_vision.FaceLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=_get_facemesh_model()),
        output_face_blendshapes=False,
        output_facial_transformation_matrixes=False,
        num_faces=4,
    )
    face_landmarker = mp_vision.FaceLandmarker.create_from_options(face_mesh_options)

    kf: "KalmanFilter | None" = None
    crops: list[FrameCrop] = []
    no_face_count = 0
    lip_history: dict[int, list[float]] = {}  # face_id → recent apertures

    frame_idx = start_frame
    while cap.isOpened() and frame_idx <= end_frame:
        ret, frame = cap.read()
        if not ret:
            break

        active_cx, active_cy = None, None

        if (frame_idx - start_frame) % DETECTION_STRIDE == 0:
            # YOLO detection
            results = yolo(frame, verbose=False)
            boxes = []
            if results and results[0].boxes is not None:
                for box in results[0].boxes.xyxy.cpu().numpy():
                    x1, y1, x2, y2 = box[:4]
                    boxes.append((float(x1), float(y1), float(x2), float(y2)))

            if boxes:
                no_face_count = 0
                # Find active speaker via lip movement
                best_score = -1.0
                best_cx, best_cy = frame_w / 2, frame_h / 2

                mp_image = mp.Image(
                    image_format=mp.ImageFormat.SRGB,
                    data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB),
                )
                mesh_result = face_landmarker.detect(mp_image)

                for face_i, (x1, y1, x2, y2) in enumerate(boxes):
                    bw = x2 - x1
                    bh = y2 - y1
                    cx = (x1 + x2) / 2
                    cy = (y1 + y2) / 2

                    aperture = 0.0
                    if mesh_result.face_landmarks and face_i < len(mesh_result.face_landmarks):
                        lms = mesh_result.face_landmarks[face_i]
                        pts = np.array([[lm.x * frame_w, lm.y * frame_h] for lm in lms])
                        aperture = _lip_aperture(pts, bh)

                    history = lip_history.setdefault(face_i, [])
                    history.append(aperture)
                    if len(history) > LIP_WINDOW:
                        history.pop(0)

                    # Score = mean lip aperture. Tie-break by face area (larger = closer)
                    mean_aperture = sum(history) / len(history)
                    area = bw * bh
                    score = mean_aperture * 1000 + area / (frame_w * frame_h) * 0.1

                    if score > best_score:
                        best_score = score
                        best_cx, best_cy = cx, cy

                active_cx, active_cy = best_cx, best_cy

            else:
                no_face_count += 1

        # Use or initialize Kalman filter
        if active_cx is not None:
            if kf is None:
                kf = _build_kalman(active_cx, active_cy)
            kf.predict()
            # Cap velocity
            max_v = MAX_VELOCITY_FRAC * frame_w
            kf.x[2] = np.clip(kf.x[2], -max_v, max_v)
            kf.x[3] = np.clip(kf.x[3], -max_v, max_v)
            kf.update(np.array([[active_cx], [active_cy]]))
            smooth_cx = float(kf.x[0])
            smooth_cy = float(kf.x[1])
        elif kf is not None and no_face_count < FALLBACK_FRAMES:
            kf.predict()
            smooth_cx = float(kf.x[0])
            smooth_cy = float(kf.x[1])
        else:
            # Center crop fallback
            smooth_cx = frame_w / 2
            smooth_cy = frame_h / 2

        crops.append(FrameCrop(frame_idx=frame_idx, cx=smooth_cx, cy=smooth_cy))
        frame_idx += 1

    cap.release()
    face_landmarker.close()
    return crops


def _get_facemesh_model() -> str:
    """Download MediaPipe FaceLandmarker model if not cached."""
    import os
    import urllib.request

    model_dir = Path.home() / ".shortsmith" / "models"
    model_dir.mkdir(parents=True, exist_ok=True)
    model_path = model_dir / "face_landmarker.task"

    if not model_path.exists():
        url = (
            "https://storage.googleapis.com/mediapipe-models/"
            "face_landmarker/face_landmarker/float16/latest/face_landmarker.task"
        )
        logger.info(f"Downloading MediaPipe FaceLandmarker model to {model_path}...")
        urllib.request.urlretrieve(url, str(model_path))

    return str(model_path)


async def detect_crops(
    video_path: Path,
    start_sec: float,
    end_sec: float,
) -> list[FrameCrop]:
    """Async wrapper — runs detection in thread pool."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _run_detect, video_path, start_sec, end_sec)


def compute_crop_params(
    crop: FrameCrop,
    source_w: int,
    source_h: int,
    target_w: int = 1080,
    target_h: int = 1920,
) -> tuple[int, int, int, int]:
    """
    Compute (crop_x, crop_y, crop_w, crop_h) in source pixel coords
    such that the crop region has target_w/target_h aspect ratio centered on (cx, cy).
    """
    target_ratio = target_w / target_h

    # The crop window must fit within source frame
    # Start with full height, compute width from ratio
    crop_h = source_h
    crop_w = int(crop_h * target_ratio)

    if crop_w > source_w:
        crop_w = source_w
        crop_h = int(crop_w / target_ratio)

    # Center on the tracked face
    cx = int(np.clip(crop.cx, crop_w / 2, source_w - crop_w / 2))
    cy = int(np.clip(crop.cy, crop_h / 2, source_h - crop_h / 2))

    x = cx - crop_w // 2
    y = cy - crop_h // 2

    # Clamp
    x = max(0, min(x, source_w - crop_w))
    y = max(0, min(y, source_h - crop_h))

    return x, y, crop_w, crop_h
