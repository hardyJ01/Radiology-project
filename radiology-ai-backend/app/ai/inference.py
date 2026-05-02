"""
inference.py — RadiologyAI Inference Engine
Model   : microsoft/git-large + LoRA adapter
Input   : chest X-ray image path + optional clinical context
Output  : { disease_prediction, generated_report }

Key fixes vs original:
  - Prompt prefix "Findings: " matches training format EXACTLY
  - eos_token_id set so generation stops cleanly at [SEP]
  - repetition_penalty=1.3, no_repeat_ngram_size=3 — eliminates loops
  - CLAHE parameters identical to pipeline.py
  - Keyword list expanded; fallback says "No acute findings detected"
"""

import os
import torch
import cv2
import numpy as np
from PIL import Image
from transformers import AutoProcessor, AutoModelForCausalLM
from peft import PeftModel

# ── Default paths (override with env vars if needed) ──────────────────────────
BASE_MODEL_PATH = os.getenv("BASE_MODEL_PATH", "./app/ai/weights/git_base")
LORA_PATH       = os.getenv("LORA_PATH",       "./app/ai/weights/gitcxr_lora_finetuned")

# ── Token ids (from config.json) ───────────────────────────────────────────────
EOS_TOKEN_ID = 102   # [SEP]
PAD_TOKEN_ID = 0     # [PAD]


class RadiologyInferenceEngine:
    """
    Loads the base GIT model + trained LoRA adapter and generates
    radiology reports from chest X-ray images.
    """

    def __init__(
        self,
        base_model_path: str = BASE_MODEL_PATH,
        lora_path: str = LORA_PATH,
    ):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"[INFERENCE] Device: {self.device.upper()}")

        # ── 1. Processor ───────────────────────────────────────────────
        print("[INFERENCE] Loading processor …")
        self.processor = AutoProcessor.from_pretrained(base_model_path)

        # ── 2. Base model ──────────────────────────────────────────────
        print("[INFERENCE] Loading base model …")
        base_model = AutoModelForCausalLM.from_pretrained(
            base_model_path,
            torch_dtype=torch.float16 if self.device == "cuda" else torch.float32,
        )

        # ── 3. LoRA adapter ────────────────────────────────────────────
        print("[INFERENCE] Attaching LoRA adapter …")
        self.model = PeftModel.from_pretrained(base_model, lora_path)
        self.model.eval()
        self.model.to(self.device)
        print("[INFERENCE] Engine ready ✓")

    # ── Image preprocessing (must match pipeline.py exactly) ──────────────
    def apply_medical_clahe(self, image: Image.Image) -> Image.Image:
        img_array = np.array(image.convert("L"))
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(img_array)
        return Image.fromarray(enhanced).convert("RGB")

    # ── Report generation ──────────────────────────────────────────────────
    def generate_report(
        self,
        image_path: str,
        clinical_context: str = "",
    ) -> dict:
        """
        Parameters
        ----------
        image_path       : path to the chest X-ray image file
        clinical_context : optional free-text clinical note (not used in prompt
                           directly, but logged for auditability)

        Returns
        -------
        dict with keys:
            disease_prediction : comma-separated detected conditions (or "No acute findings")
            generated_report   : full model output text
        """
        print(f"\n[INFERENCE] Analysing: {image_path}")
        if clinical_context:
            print(f"[INFERENCE] Clinical context: {clinical_context}")

        # ── Load + preprocess image ────────────────────────────────────
        raw_image    = Image.open(image_path).convert("RGB")
        enhanced_img = self.apply_medical_clahe(raw_image)

        # ── Prompt — MUST match the prefix used in pipeline.py ────────
        # pipeline.py builds: f"Findings: {findings} Impression: {impression}"
        # So we prime the model with "Findings: " and let it complete.
        prompt = "Findings: "

        inputs = self.processor(
            images=enhanced_img,
            text=prompt,
            return_tensors="pt",
        ).to(self.device)

        # ── Generation ─────────────────────────────────────────────────
        with torch.no_grad():
            generated_ids = self.model.generate(
                pixel_values=inputs.pixel_values,
                input_ids=inputs.input_ids,
                attention_mask=inputs.attention_mask,

                max_new_tokens=80,          # enough for findings + impression
                do_sample=False,             # greedy / beam — deterministic
                num_beams=2,                 # beam search for coherence
                repetition_penalty=1.3,      # was 1.1 — eliminates "cardpuona" loops
                no_repeat_ngram_size=3,      # prevents "impression no impression no"
                length_penalty=1.0,
                early_stopping=True,
                eos_token_id=EOS_TOKEN_ID,   # stop at [SEP]
                pad_token_id=PAD_TOKEN_ID,
            )

        # ── Decode ─────────────────────────────────────────────────────
        raw_text = self.processor.batch_decode(
            generated_ids, skip_special_tokens=True
        )[0].strip()

        # ── Keyword-based disease detection ────────────────────────────
        # Expanded list covering common IU X-ray labels
        medical_keywords = [
            "Cardiomegaly",
            "Pleural Effusion",
            "Pneumonia",
            "Pulmonary Edema",
            "Edema",
            "Atelectasis",
            "Pneumothorax",
            "Consolidation",
            "Opacity",
            "Infiltrate",
            "Fracture",
            "Enlarged",
            "Calcification",
            "Mass",
            "Nodule",
            "Effusion",
        ]

        detected = [
            kw for kw in medical_keywords
            if kw.lower() in raw_text.lower()
        ]
        disease_prediction = (
            ", ".join(detected) if detected else "No acute findings detected."
        )

        return {
            "disease_prediction": disease_prediction,
            "generated_report":   raw_text,
        }


# ── CLI entry point ────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys

    image_path = sys.argv[1] if len(sys.argv) > 1 else "sample_test_xray.jpg"

    if not __import__("os").path.exists(image_path):
        print(f"\n[ERROR] Image not found: '{image_path}'")
        print("Usage: python inference.py <path_to_xray.jpg>")
        sys.exit(1)

    engine = RadiologyInferenceEngine()
    report = engine.generate_report(image_path)

    print("\n" + "=" * 60)
    print("  AI GENERATED RADIOLOGY REPORT")
    print("=" * 60)
    print(f"  Diagnosis : {report['disease_prediction']}")
    print(f"  Report    : {report['generated_report']}")
    print("=" * 60)
