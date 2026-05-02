"""
hugging_face_model.py — Download & save microsoft/git-large locally

Run this ONCE on Colab (or locally) before training:
    python hugging_face_model.py

What it does:
  1. Downloads the processor (CLIPImageProcessor + BertTokenizer)
  2. Downloads the model weights (GitForCausalLM)
  3. Saves both to ./app/ai/weights/git_base

NOTE: The folder is named 'git_base' for historical reasons but the model
downloaded is microsoft/git-large — this is intentional and matches your
adapter_config.json which also specifies git-large.
"""

from transformers import AutoProcessor, AutoModelForCausalLM
import os

MODEL_ID   = "microsoft/git-large"
SAVE_PATH  = "./app/ai/weights/git_base"

os.makedirs(SAVE_PATH, exist_ok=True)

print(f"Downloading processor from {MODEL_ID} …")
proc = AutoProcessor.from_pretrained(MODEL_ID)
proc.save_pretrained(SAVE_PATH)
print(f"Processor saved to {SAVE_PATH}")

print(f"\nDownloading model weights from {MODEL_ID} …")
print("(This is ~1.6 GB — takes a few minutes on Colab)")
model = AutoModelForCausalLM.from_pretrained(MODEL_ID)
model.save_pretrained(SAVE_PATH)
print(f"Model saved to {SAVE_PATH}")

print("\nDone! You can now run the training notebook.")
