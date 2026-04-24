import json
import sys
from pathlib import Path
from typing import List, Dict
import pandas as pd
import time


from src.core import (
    chat,
    parse_json_safely,
    resolve_requirement_files,
    get_logger,
    print_summary,
)

logger = get_logger("Test Case Generation Agent")

# Project Paths
ROOT = Path(__file__).resolve().parents[2]
REQ_DIR = ROOT / "data" / "requirements"
OUT_DIR = ROOT / "output" / "testcase_generated"
OUT_DIR.mkdir(parents=True, exist_ok=True)

SYSTEM_PROMPT = """You are a QA engineer. Generate test cases from requirements.

Return ONLY a JSON array with this structure:
[
  {
    "id": "TC-001",
    "title": "Short test title",
    "steps": ["Step 1", "Step 2", "Step 3"],
    "expected": "Expected result",
    "priority": "High"
  }
]

Rules:
- Return 5 test cases
- Cover positive and negative scenarios
- Include edge cases
- Keep steps clear and actionable
- Priority: High, Medium, or Low
- Return ONLY JSON, no markdown fences"""

def save_as_csv(test_cases: List[Dict], csv_file: Path):
    rows = []
    for testcase in test_cases:
        test_id = testcase.get("id", f"TC-{testcase['title']}")
        title = testcase.get("title", "")
        steps = testcase.get("steps", [])
        expected = testcase.get("expected", "")
        priority = testcase.get("priority", "Medium")

        steps_text = " | ".join(steps) if isinstance(steps, list) else str(steps)

        rows.append({
            "TestID": test_id,
            "Title": title,
            "Steps": steps_text,
            "Expected": expected,
            "Priority": priority
        })

        pd.DataFrame(rows).to_csv(csv_file, index=False, encoding="utf-8")



def main():
    start_time = time.time()
    llm_call_count = 0
    metadata = None

    try:
        file_arg = sys.argv[1] if len(sys.argv) > 1 else None
        req_files = resolve_requirement_files(file_arg, REQ_DIR)
        if len(req_files) > 1:
            logger.info("Processing %d requirement .md file(s)", len(req_files))

        total_tokens = 0
        total_cost = 0.0
        last_metadata = None

        for req_file in req_files:
            requirement = req_file.read_text(encoding="utf-8")
            logger.info("Processing: %s", req_file)

            messages = [
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": f"Requirements are as follows:\n\n{requirement}",
                },
            ]

            logger.info("Calling LLM to generate test cases for %s...", req_file.name)
            result = chat(messages)
            llm_call_count += 1
            response = result["response"]
            metadata = result["metadata"]
            last_metadata = metadata

            total_tokens += int(metadata.get("total_tokens", 0) or 0)
            total_cost += float(metadata.get("cost_usd", 0.0) or 0.0)

            logger.debug(
                "LLM call: %s/%s, %s tokens, %sms",
                metadata.get("provider"),
                metadata.get("model"),
                metadata.get("total_tokens"),
                metadata.get("duration_ms"),
            )
            logger.info(
                "Cost: $%.6f (%s tokens)",
                metadata.get("cost_usd", 0.0),
                metadata.get("total_tokens", 0),
            )

            stem = req_file.stem
            raw_file_txt = OUT_DIR / f"{stem}_raw_output.txt"
            raw_file_json = OUT_DIR / f"{stem}_raw_output.json"
            testcases = parse_json_safely(response, raw_file_txt)
            raw_file_json.write_text(json.dumps(testcases, indent=2), encoding="utf-8")

            csv_file = OUT_DIR / f"{stem}_testcases.csv"
            save_as_csv(testcases, csv_file)

            logger.info("Generated %d test case(s) for %s", len(testcases), req_file.name)
            logger.info("Raw text: %s", raw_file_txt)
            logger.info("Raw JSON: %s", raw_file_json)
            logger.info("CSV: %s", csv_file)

        if last_metadata is not None:
            metadata = {**last_metadata, "total_tokens": total_tokens, "cost_usd": total_cost}
        else:
            raise RuntimeError("No LLM result")

        duration = time.time() - start_time
        print_summary(duration, metadata, llm_call_count, "Success")

    except Exception as e:
        # Error summary
        logger.error(f"Agent failed: {e}")
        duration = time.time() - start_time

        # Create dummy metadata if LLM wasn't called
        if metadata is None:
            metadata = {
                "total_tokens": 0,
                "cost_usd": 0.0,
                "provider": "N/A",
                "model": "N/A"
            }

        print_summary(duration, metadata, llm_call_count, "Failed")
        raise

if __name__ == "__main__":
    main()