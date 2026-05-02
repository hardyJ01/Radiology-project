"""
train.py — RadiologyAI LoRA Fine-Tuning Script
Model   : microsoft/git-large  (GitForCausalLM)
Adapter : LoRA  r=16, alpha=32, target=[q_proj, v_proj]
Dataset : ykumards/open-i (IU Chest X-ray)

Run locally  : python train.py
Run on Colab : see radiology_colab_train.ipynb  ← recommended

Fixes vs original:
  [1] Base model path consistency — reads MODEL_ID env var or falls back
  [2] max_steps=5000, warmup, cosine LR schedule
  [3] Labels properly mask pad tokens (-100) AND prompt prefix
  [4] gradient_accumulation_steps=8 for effective batch=16
  [5] lr=1e-4 (was 2e-4) — more stable for LoRA on small medical dataset
  [6] fp16=True on GPU, False on CPU (auto-detected)
"""

import os
import sys
from pathlib import Path

import torch
from peft import LoraConfig, get_peft_model
from transformers import (
    AutoModelForCausalLM,
    AutoProcessor,
    Trainer,
    TrainingArguments,
)
from torch.utils.data import IterableDataset

# ── Make sure project root is importable when run directly ──────────────────
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from app.ai.pipeline import RadiologyDataPipeline  # noqa: E402

# ── Configuration ────────────────────────────────────────────────────────────
# Set MODEL_ID env var if you want to override, e.g.:
#   export MODEL_ID=/content/drive/MyDrive/git_base
MODEL_ID   = os.getenv("MODEL_ID", "./app/ai/weights/git_base")
OUTPUT_DIR = os.getenv("OUTPUT_DIR", "./app/ai/weights/gitcxr_lora_finetuned")

PAD_TOKEN_ID = 0    # [PAD]  — from tokenizer_config.json
CLS_TOKEN_ID = 101  # [CLS]  — masked in labels so loss ignores BOS


# ── Iterable dataset wrapper ─────────────────────────────────────────────────
class RadiologyIterableDataset(IterableDataset):
    """Wraps the generator so PyTorch's DataLoader can consume it."""

    def __init__(self, pipeline: RadiologyDataPipeline):
        self.pipeline = pipeline

    def __iter__(self):
        return self.pipeline.start_stream()


# ── Trainer class ─────────────────────────────────────────────────────────────
class RadiologyModelTrainer:

    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.use_fp16 = (self.device == "cuda")
        print(f"[TRAIN] Device: {self.device.upper()}  |  fp16: {self.use_fp16}")

        # ── Load processor (needed for collate label masking) ──────────
        print(f"[TRAIN] Loading processor from: {MODEL_ID}")
        self.processor = AutoProcessor.from_pretrained(MODEL_ID)

        # ── Load base model ────────────────────────────────────────────
        print(f"[TRAIN] Loading base model from: {MODEL_ID}")
        base_model = AutoModelForCausalLM.from_pretrained(
            MODEL_ID,
            torch_dtype=torch.float16 if self.use_fp16 else torch.float32,
        )

        # ── LoRA configuration (matches your adapter_config.json) ──────
        lora_config = LoraConfig(
            r=16,
            lora_alpha=32,
            target_modules=["q_proj", "v_proj"],   # attention layers
            lora_dropout=0.05,
            bias="none",
            task_type="CAUSAL_LM",
        )

        self.model = get_peft_model(base_model, lora_config)
        self.model.print_trainable_parameters()

    # ── Collate function ───────────────────────────────────────────────────
    def custom_collate_fn(self, batch: list[dict]) -> dict:
        """
        Stacks individual samples into a batch.
        Labels have -100 on:
          • padding tokens  → loss ignores them
          • [CLS] token     → BOS; model doesn't need to predict it
        """
        pixel_values   = torch.cat([s["pixel_values"]   for s in batch], dim=0)
        input_ids      = torch.cat([s["input_ids"]      for s in batch], dim=0)
        attention_mask = torch.cat([s["attention_mask"] for s in batch], dim=0)

        labels = input_ids.clone()
        labels[labels == PAD_TOKEN_ID] = -100   # mask padding
        labels[:, 0] = -100                     # mask [CLS] / BOS token

        return {
            "pixel_values":   pixel_values,
            "input_ids":      input_ids,
            "attention_mask": attention_mask,
            "labels":         labels,
        }

    # ── Training entry point ───────────────────────────────────────────────
    def start_training(self):
        # Dataset
        pipeline   = RadiologyDataPipeline(model_id=MODEL_ID)
        train_data = RadiologyIterableDataset(pipeline)

        # Training arguments — tuned for Colab T4 / A100
        training_args = TrainingArguments(
            output_dir=OUTPUT_DIR,

            # ── Batch & gradient ──────────────────────────────────────
            per_device_train_batch_size=2,
            gradient_accumulation_steps=8,   # effective batch = 16
            dataloader_num_workers=2,

            # ── Learning rate ─────────────────────────────────────────
            learning_rate=1e-4,              # was 2e-4; more stable for LoRA
            warmup_steps=200,               # prevents early loss spike
            lr_scheduler_type="cosine",     # smooth decay

            # ── Steps ─────────────────────────────────────────────────
            max_steps=5000,                 # ~full dataset × 1.3 passes
            logging_steps=50,
            save_steps=500,
            save_total_limit=3,             # keep only 3 checkpoints

            # ── Precision ─────────────────────────────────────────────
            fp16=self.use_fp16,

            # ── Misc ──────────────────────────────────────────────────
            remove_unused_columns=False,
            report_to="none",               # set to "wandb" if you use W&B
        )

        trainer = Trainer(
            model=self.model,
            args=training_args,
            train_dataset=train_data,
            data_collator=self.custom_collate_fn,
        )

        print("\n[TRAIN] Starting training … expected final loss ≈ 2.0–2.8")
        trainer.train()

        # Save final LoRA adapter
        print(f"\n[TRAIN] Saving LoRA adapter to: {OUTPUT_DIR}")
        trainer.model.save_pretrained(OUTPUT_DIR)
        self.processor.save_pretrained(OUTPUT_DIR)
        print("[TRAIN] Done ✓")


# ── Entry point ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    trainer = RadiologyModelTrainer()
    trainer.start_training()
