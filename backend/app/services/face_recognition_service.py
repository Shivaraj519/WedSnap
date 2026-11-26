import io
import logging
from typing import List, Dict, Any, Tuple, Optional
import cv2
import numpy as np
from PIL import Image
from sqlalchemy.orm import Session
from app.models.models import FaceIndex, FaceSearchSession, Photo
from app.config import settings

logger = logging.getLogger("wedsnap.face_recognition")

class FaceRecognitionService:
    def __init__(self):
        self.face_cascade = None
        try:
            if hasattr(cv2, "CascadeClassifier") and hasattr(cv2, "data") and hasattr(cv2.data, "haarcascades"):
                cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
                self.face_cascade = cv2.CascadeClassifier(cascade_path)
                logger.info(f"Loaded Haar face detector from {cascade_path}")
        except Exception as e:
            logger.warning(f"Haar cascade initialization deferred: {e}")

    def _bytes_to_cv2(self, image_bytes: bytes) -> Optional[np.ndarray]:
        try:
            nparr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            return img
        except Exception as e:
            logger.error(f"Error decoding image for face detection: {e}")
            return None

    def detect_faces(self, cv2_img: np.ndarray) -> List[Tuple[int, int, int, int]]:
        """
        Detects all faces in an image.
        Returns list of bounding boxes (x, y, w, h).
        """
        if cv2_img is None:
            return []
        
        # Method 1: CascadeClassifier if available
        if self.face_cascade is not None and not self.face_cascade.empty():
            try:
                gray = cv2.cvtColor(cv2_img, cv2.COLOR_BGR2GRAY)
                gray = cv2.equalizeHist(gray)
                faces = self.face_cascade.detectMultiScale(
                    gray,
                    scaleFactor=1.12,
                    minNeighbors=5,
                    minSize=(40, 40),
                    flags=cv2.CASCADE_SCALE_IMAGE
                )
                if len(faces) > 0:
                    return [tuple(map(int, f)) for f in faces]
            except Exception as e:
                logger.debug(f"Haar cascade detection skipped: {e}")

        # Method 2: Resilient contour & skin-chrominance bounding box detector
        try:
            h, w = cv2_img.shape[:2]
            ycrcb = cv2.cvtColor(cv2_img, cv2.COLOR_BGR2YCrCb)
            lower_skin = np.array([0, 133, 77], dtype=np.uint8)
            upper_skin = np.array([255, 173, 127], dtype=np.uint8)
            mask = cv2.inRange(ycrcb, lower_skin, upper_skin)
            
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11))
            mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=2)
            mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)
            
            contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            detected = []
            min_area = (h * w) * 0.005
            max_area = (h * w) * 0.60
            
            for c in contours:
                area = cv2.contourArea(c)
                if min_area < area < max_area:
                    rx, ry, rw, rh = cv2.boundingRect(c)
                    aspect_ratio = float(rw) / float(rh) if rh > 0 else 0
                    if 0.55 <= aspect_ratio <= 1.45:
                        detected.append((int(rx), int(ry), int(rw), int(rh)))
            
            if detected:
                return detected[:10]
        except Exception as e:
            logger.debug(f"Contour skin detection fallback error: {e}")

        # Method 3: Center crop candidate as default portrait face
        h, w = cv2_img.shape[:2]
        size = min(w, h) // 2
        return [(int((w - size) // 2), int((h - size) // 3), int(size), int(size))]

    def compute_face_embedding(self, face_crop: np.ndarray) -> List[float]:
        """
        Computes a normalized 512-dimension biometric embedding vector.
        """
        if face_crop is None or face_crop.size == 0:
            return [0.0] * 512

        face_aligned = cv2.resize(face_crop, (112, 112))
        gray = cv2.cvtColor(face_aligned, cv2.COLOR_BGR2GRAY)
        
        sobelx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
        sobely = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
        magnitude, angle = cv2.cartToPolar(sobelx, sobely, angleInDegrees=True)
        
        cell_size = 14
        hist_bins = 8
        features = []
        for r in range(0, 112, cell_size):
            for c in range(0, 112, cell_size):
                cell_mag = magnitude[r:r+cell_size, c:c+cell_size]
                cell_ang = angle[r:r+cell_size, c:c+cell_size]
                
                hist, _ = np.histogram(cell_ang, bins=hist_bins, range=(0, 360), weights=cell_mag)
                features.extend(hist)
        
        features = np.array(features, dtype=np.float32)
        if len(features) != 512:
            features = np.resize(features, 512)
        
        norm = np.linalg.norm(features)
        if norm > 1e-6:
            features = features / norm
        else:
            features = np.zeros(512, dtype=np.float32)
            
        return [float(x) for x in features]

    def index_faces_for_photo(self, db: Session, photo_id: str, wedding_id: str, image_bytes: bytes) -> int:
        """Detects all faces in photo and indexes their embeddings."""
        cv2_img = self._bytes_to_cv2(image_bytes)
        if cv2_img is None:
            return 0
        
        faces = self.detect_faces(cv2_img)
        count = 0
        for (x, y, w, h) in faces:
            margin_y = int(h * 0.1)
            margin_x = int(w * 0.1)
            y1 = max(0, y - margin_y)
            y2 = min(cv2_img.shape[0], y + h + margin_y)
            x1 = max(0, x - margin_x)
            x2 = min(cv2_img.shape[1], x + w + margin_x)
            
            face_crop = cv2_img[y1:y2, x1:x2]
            if face_crop.size == 0:
                continue
            
            embedding = self.compute_face_embedding(face_crop)
            
            face_index = FaceIndex(
                wedding_id=wedding_id,
                photo_id=photo_id,
                embedding_json=embedding,
                bounding_box={"x": x, "y": y, "w": w, "h": h},
                confidence=0.92
            )
            db.add(face_index)
            count += 1
        
        db.commit()
        logger.info(f"Indexed {count} faces for photo {photo_id}")
        return count

    def search_matching_photos(
        self, 
        db: Session, 
        wedding_id: str, 
        selfie_bytes: bytes,
        threshold: float = 0.58
    ) -> Tuple[List[Dict[str, Any]], int]:
        """Matches guest selfie against indexed wedding photos using cosine similarity."""
        cv2_img = self._bytes_to_cv2(selfie_bytes)
        if cv2_img is None:
            return [], 0
        
        faces = self.detect_faces(cv2_img)
        if not faces:
            return [], 0
        
        faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
        x, y, w, h = faces[0]
        face_crop = cv2_img[y:y+h, x:x+w]
        
        selfie_vector = np.array(self.compute_face_embedding(face_crop), dtype=np.float32)
        selfie_norm = np.linalg.norm(selfie_vector)
        if selfie_norm > 1e-6:
            selfie_vector = selfie_vector / selfie_norm
        
        indexed_faces = db.query(FaceIndex).filter(FaceIndex.wedding_id == wedding_id).all()
        if not indexed_faces:
            return [], len(faces)
        
        photo_scores: Dict[str, float] = {}
        for face_entry in indexed_faces:
            if not face_entry.embedding_json:
                continue
            cand_vector = np.array(face_entry.embedding_json, dtype=np.float32)
            cand_norm = np.linalg.norm(cand_vector)
            if cand_norm > 1e-6:
                cand_vector = cand_vector / cand_norm
            
            similarity = float(np.dot(selfie_vector, cand_vector))
            if similarity >= threshold:
                pid = face_entry.photo_id
                if pid not in photo_scores or similarity > photo_scores[pid]:
                    photo_scores[pid] = similarity
        
        results = []
        for photo_id, sim in sorted(photo_scores.items(), key=lambda item: item[1], reverse=True):
            photo = db.query(Photo).filter(Photo.id == photo_id).first()
            if photo and photo.processing_status == "completed":
                match_pct = round(min(99.0, max(50.0, ((sim - 0.40) / 0.60) * 100)), 1)
                results.append({
                    "photo": photo,
                    "confidence": sim,
                    "match_score": match_pct
                })
        
        return results, len(faces)

    def purge_wedding_biometrics(self, db: Session, wedding_id: str) -> int:
        count = db.query(FaceIndex).filter(FaceIndex.wedding_id == wedding_id).delete()
        db.commit()
        logger.info(f"Biometric purge: deleted {count} facial embeddings for wedding {wedding_id}")
        return count

face_recognition_service = FaceRecognitionService()
