import json

import pytest

from src.core.utils import (
    parse_json_safely,
    resolve_requirement_files,
    select_log_file,
)


# ---- parse_json_safely -----------------------------------------------------

def test_parse_plain_json_array(tmp_path):
    raw = tmp_path / "raw.txt"
    data = parse_json_safely('[{"id": "TC-001", "title": "x"}]', raw)
    assert data == [{"id": "TC-001", "title": "x"}]
    assert raw.read_text(encoding="utf-8") == '[{"id": "TC-001", "title": "x"}]'


def test_parse_json_wrapped_in_markdown_fence(tmp_path):
    raw = tmp_path / "raw.txt"
    text = '```json\n[{"id": "TC-001"}]\n```'
    data = parse_json_safely(text, raw)
    assert data == [{"id": "TC-001"}]


def test_parse_json_from_chat_dict(tmp_path):
    raw = tmp_path / "raw.txt"
    data = parse_json_safely({"response": '[{"id": "TC-001"}]'}, raw)
    assert data == [{"id": "TC-001"}]


def test_parse_json_rejects_non_list(tmp_path):
    raw = tmp_path / "raw.txt"
    with pytest.raises(ValueError):
        parse_json_safely('{"not": "a list"}', raw)


def test_parse_json_rejects_dict_without_response_str(tmp_path):
    raw = tmp_path / "raw.txt"
    with pytest.raises(TypeError):
        parse_json_safely({"response": 123}, raw)


def test_parse_json_creates_parent_dirs(tmp_path):
    raw = tmp_path / "nested" / "raw.txt"
    parse_json_safely("[]", raw)
    assert raw.exists()


# ---- resolve_requirement_files ---------------------------------------------

def test_resolve_requirement_files_explicit_path(tmp_path):
    req = tmp_path / "one.md"
    req.write_text("hello", encoding="utf-8")
    result = resolve_requirement_files(str(req), tmp_path)
    assert result == [req]


def test_resolve_requirement_files_missing_explicit_path_raises(tmp_path):
    with pytest.raises(FileNotFoundError):
        resolve_requirement_files(str(tmp_path / "missing.md"), tmp_path)


def test_resolve_requirement_files_defaults_to_all_md_sorted(tmp_path):
    (tmp_path / "b.md").write_text("b", encoding="utf-8")
    (tmp_path / "a.md").write_text("a", encoding="utf-8")
    (tmp_path / "ignored.txt").write_text("nope", encoding="utf-8")
    result = resolve_requirement_files(None, tmp_path)
    assert [p.name for p in result] == ["a.md", "b.md"]


def test_resolve_requirement_files_empty_dir_raises(tmp_path):
    with pytest.raises(FileNotFoundError):
        resolve_requirement_files(None, tmp_path)


def test_resolve_requirement_files_missing_dir_raises(tmp_path):
    with pytest.raises(NotADirectoryError):
        resolve_requirement_files(None, tmp_path / "does-not-exist")


# ---- select_log_file --------------------------------------------------------

def test_select_log_file_explicit_path(tmp_path):
    log = tmp_path / "app.log"
    log.write_text("log line", encoding="utf-8")
    assert select_log_file(str(log), str(tmp_path)) == log


def test_select_log_file_missing_explicit_path_raises(tmp_path):
    with pytest.raises(FileNotFoundError):
        select_log_file(str(tmp_path / "missing.log"), str(tmp_path))


def test_select_log_file_defaults_to_first_sorted_log(tmp_path):
    (tmp_path / "b.log").write_text("b", encoding="utf-8")
    (tmp_path / "a.log").write_text("a", encoding="utf-8")
    result = select_log_file(None, str(tmp_path))
    assert result.name == "a.log"


def test_select_log_file_no_logs_raises(tmp_path):
    with pytest.raises(FileNotFoundError):
        select_log_file(None, str(tmp_path))
