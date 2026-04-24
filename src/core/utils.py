import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

def select_requirement(file_path: str = None, req_dir: str = "data/requirements") -> Path:
    if file_path:
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"Specified file {file_path} does not exist.")
        return path
    # Legacy default: first file in directory (markdown preferred, then .txt)
    r = Path(req_dir)
    mds = sorted(r.glob("*.md"))
    if mds:
        return mds[0]
    txt_files = sorted(r.glob("*.txt"))
    if not txt_files:
        raise FileNotFoundError(
            f"No .md or .txt files in {r.resolve()}; pass a file path or add requirements."
        )
    return txt_files[0]


def resolve_requirement_files(
    file_path: Optional[str], req_dir: Union[str, Path]
) -> List[Path]:
    """
    If *file_path* is set, return a single existing path.
    If omitted, return all ``*.md`` in *req_dir*, sorted.
    """
    root = Path(req_dir)
    if not root.is_dir():
        raise NotADirectoryError(f"Requirements directory not found: {root.resolve()}")
    if file_path:
        p = Path(file_path)
        if not p.exists():
            raise FileNotFoundError(f"Specified file does not exist: {file_path}")
        return [p]
    mds = sorted(root.glob("*.md"))
    if not mds:
        raise FileNotFoundError(
            f"No .md files in {root.resolve()}. Add requirements or pass a file path."
        )
    return mds

def parse_json_safely(
    text: Union[str, Dict[str, Any]], raw_file: Path
) -> List[Dict]:
    if isinstance(text, dict):
        r = text.get("response")
        if not isinstance(r, str):
            raise TypeError(
                "If passing a dict from chat(), it must have a 'response' str; "
                f"got {type(r).__name__!r}."
            )
        text = r
    if not isinstance(text, str):
        raise TypeError(f"Expected str or dict with 'response' str, got {type(text).__name__!r}.")

    raw_file.parent.mkdir(parents=True, exist_ok=True)
    raw_file.write_text(text, encoding="utf-8")
    try:
        data = json.loads(text)
        if isinstance(data, list):
            return data
    except (json.JSONDecodeError, TypeError, ValueError):
        pass

    cleaned = text.strip()

    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if "\n" in cleaned:
            first, rest = cleaned.split("\n", 1)
            if first.strip() in ("json", "jsonc", "JSON", ""):
                cleaned = rest

    data = json.loads(cleaned)
    if not isinstance(data, list):
        raise ValueError("Parsed JSON is not a list.")
    return data

def select_log_file(file_path: str=None, log_dir: str="data/logs") -> Path:
    if file_path:
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"Specified log file {file_path} does not exist.")
        return path
    log_files = sorted(Path(log_dir).glob("*.log"))
    if not log_files:
        base = Path(log_dir).resolve()
        raise FileNotFoundError(
            f"No .log files in {base}. Add logs under {base} or pass a file path."
        )
    return log_files[0]

def print_summary(duration: float, metadata: dict, llm_calls: int = 1, status: str = "Success"):
    """Print performance summary."""
    print("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("📊 Performance Summary")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print(f"⏱️ Duration:       {duration:.2f}s")
    print(f"🤖 LLM Calls:      {llm_calls}")
    print(f"📝 Total Tokens:   {metadata.get('total_tokens', 0)}")
    print(f"💰 Cost:           ${metadata.get('cost_usd', 0.0):.6f}")
    print(
        f"🔧 Provider:       {metadata.get('provider', 'N/A')}/"
        f"{metadata.get('model', 'N/A')}"
    )
    print(f"✅ Status:         {status}")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")