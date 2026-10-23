"""Experimental jersey-color candidate detector; NOT reliable player or pass detection."""
import cv2
import numpy as np

def yellow_region_candidates(frame):
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    mask = cv2.inRange(hsv, np.array([24,70,65]), np.array([48,255,255]))
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((3,3),np.uint8))
    contours,_ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    return [cv2.boundingRect(c) for c in contours if cv2.contourArea(c) >= 25]

# Test on 2:00-2:20 of Oct 21 sample: 40 frames, 2,553 raw color regions.
# Result: unusable for identifying whole players; too many false positives.
# Next gate: calibrated object detection (player + ball), tracking across frames,
# then manual verification of pass and shot candidates before publishing stats.
