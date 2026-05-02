"""
pipeline.py — RadiologyAI Data Pipeline
Dataset : ykumards/open-i (IU Chest X-ray, ~3,955 samples)
Model   : microsoft/git-large (BertTokenizer, CLIPImageProcessor 224x224)

Key fixes vs original:
  - Correct eos / pad token ids from config.json (eos=102, pad=0)
  - Prompt format locked to "Findings: {text}" — must match inference exactly
  - Padding token in labels replaced with -100 so loss ignores them
  - CLAHE applied consistently (clipLimit=2.0, tileGridSize=8x8)
"""

import io
from pathlib import Path

import cv2
import numpy as np
import torch
from datasets import load_dataset
from PIL import Image
from transformers import AutoProcessor

# ── Tokenizer special-token ids (from your config.json + tokenizer_config.json)
PAD_TOKEN_ID = 0    # [PAD]
EOS_TOKEN_ID = 102  # [SEP]  — GIT uses [SEP] as end-of-sequence
CLS_TOKEN_ID = 101  # [CLS]

# ── Maximum sequence length (keep short to save VRAM on Colab)
MAX_TEXT_LENGTH = 128


class RadiologyDataPipeline:
    """
    Streams the IU Chest X-ray dataset, preprocesses each sample, and
    yields model-ready tensors for training.
    """

    def __init__(self, model_id: str | None = None):
        """
        Parameters
        ----------
        model_id : str or None
            HuggingFace model id OR a local path to the saved processor.
            Defaults to the local weights folder if None.
        """
        if model_id is None:
            # Resolve relative to this file so the path works from any cwd
            local = (
                Path(__file__).resolve().parent
                / "weights"
                / "git_base"
            )
            model_id = str(local) if local.exists() else "microsoft/git-large"

        print(f"[PIPELINE] Loading processor from: {model_id}")
        self.processor = AutoProcessor.from_pretrained(model_id)
        self.tokenizer = self.processor.tokenizer

        # Verify special tokens match config.json
        assert self.tokenizer.pad_token_id == PAD_TOKEN_ID, (
            f"pad_token_id mismatch: expected {PAD_TOKEN_ID}, "
            f"got {self.tokenizer.pad_token_id}"
        )

    # ------------------------------------------------------------------
    # Image preprocessing
    # ------------------------------------------------------------------

    def apply_medical_clahe(self, image: Image.Image) -> Image.Image:
        """
        CLAHE contrast enhancement — must be IDENTICAL in train and inference.
        clipLimit=2.0, tileGridSize=(8,8) as per original design.
        """
        img_array = np.array(image.convert("L"))           # grayscale
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(img_array)
        return Image.fromarray(enhanced).convert("RGB")    # back to 3-ch

    # ------------------------------------------------------------------
    # Sample processing
    # ------------------------------------------------------------------

    def process_sample(self, sample: dict) -> dict | None:
        """
        Converts one raw dataset record into model inputs.

        Returns None if the sample has no usable image or report text.
        """
        # ── 1. Load frontal X-ray ──────────────────────────────────────
        frontal_bytes = sample.get("img_frontal")
        if not frontal_bytes:
            return None

        try:
            raw_image = Image.open(io.BytesIO(frontal_bytes)).convert("RGB")
        except Exception as exc:
            print(f"[PIPELINE] Skipping corrupted image: {exc}")
            return None

        enhanced_img = self.apply_medical_clahe(raw_image)

        # ── 2. Build report text ──────────────────────────────────────
        findings   = (sample.get("findings")   or "").strip()
        impression = (sample.get("impression") or "").strip()

        # Combine findings + impression; skip if truly empty
        if not findings and not impression:
            return None

        # IMPORTANT: This prefix format must match inference.py EXACTLY
        if findings:
            report_text = f"Findings: {findings}"
            if impression:
                report_text += f" Impression: {impression}"
        else:
            report_text = f"Impression: {impression}"

        # ── 3. Encode image + text ────────────────────────────────────
        inputs = self.processor(
            images=enhanced_img,
            text=report_text,
            padding="max_length",
            max_length=MAX_TEXT_LENGTH,
            truncation=True,
            return_tensors="pt",
        )

        # ── 4. Build labels: -100 on pad tokens so loss ignores them ─
        labels = inputs["input_ids"].clone()
        labels[labels == PAD_TOKEN_ID] = -100

        # Also mask the [CLS] token at position 0 (it is the BOS for GIT)
        labels[:, 0] = -100

        inputs["labels"] = labels
        return inputs

    # ------------------------------------------------------------------
    # Streaming entry point
    # ------------------------------------------------------------------

    def start_stream(self):
        """Yields processed samples from the IU Chest X-ray training split."""
        dataset = load_dataset("ykumards/open-i", streaming=True, split="train")
        print("[PIPELINE] Stream active — processing samples …")

        skipped = 0
        for raw_sample in dataset:
            processed = self.process_sample(raw_sample)
            if processed is None:
                skipped += 1
                continue
            yield processed

        if skipped:
            print(f"[PIPELINE] Skipped {skipped} samples (no image or empty report).")
