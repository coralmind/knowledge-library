"""Tests for the models-to-schema generator and its ``--check`` mode."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

import generate_json_schemas
from coralmap.models import Pathway


@pytest.fixture
def schema_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """Point the generator at a temporary directory instead of the real ``schema/``."""
    target = tmp_path / "schema"
    target.mkdir()
    monkeypatch.setattr(generate_json_schemas, "SCHEMA_DIR", target)
    return target


class TestRender:
    def test_produces_valid_json_schema(self) -> None:
        schema = json.loads(generate_json_schemas.render(Pathway))
        assert schema["title"] == "Pathway"
        assert "id" in schema["properties"]
        assert "display_id" in schema["properties"]

    def test_is_deterministic(self) -> None:
        """Two renders of the same model in one process are byte-identical."""
        assert generate_json_schemas.render(Pathway) == generate_json_schemas.render(Pathway)

    def test_ends_with_a_newline(self) -> None:
        assert generate_json_schemas.render(Pathway).endswith("\n")


class TestMissingSchemaDir:
    def test_check_fails_on_an_empty_dir(self, schema_dir: Path) -> None:
        assert generate_json_schemas.main(["--check"]) == 1

    def test_every_missing_schema_is_named(self, schema_dir: Path) -> None:
        problems = generate_json_schemas.check_all()
        assert len(problems) == len(generate_json_schemas.REGISTRY)
        assert all("is missing" in p for p in problems)

    def test_readme_alone_does_not_satisfy_the_gate(self, schema_dir: Path) -> None:
        (schema_dir / "README.md").write_text("docs, not a schema")
        assert generate_json_schemas.main(["--check"]) == 1


class TestDriftGate:
    def test_writes_one_schema_per_registered_type(self, schema_dir: Path) -> None:
        written = generate_json_schemas.write_all()
        assert len(written) == len(generate_json_schemas.REGISTRY)
        assert (schema_dir / "pathway.schema.json").exists()

    def test_freshly_written_schemas_pass_check(self, schema_dir: Path) -> None:
        generate_json_schemas.write_all()
        assert generate_json_schemas.check_all() == []
        assert generate_json_schemas.main(["--check"]) == 0

    def test_edited_schema_fails_check(self, schema_dir: Path) -> None:
        generate_json_schemas.write_all()
        (schema_dir / "pathway.schema.json").write_text('{"title": "edited by hand"}\n')

        problems = generate_json_schemas.check_all()
        assert len(problems) == 1
        assert "out of date" in problems[0]
        assert generate_json_schemas.main(["--check"]) == 1

    def test_missing_schema_fails_check(self, schema_dir: Path) -> None:
        generate_json_schemas.write_all()
        (schema_dir / "impact.schema.json").unlink()

        problems = generate_json_schemas.check_all()
        assert len(problems) == 1
        assert "missing" in problems[0]
        assert generate_json_schemas.main(["--check"]) == 1

    def test_filenames_follow_the_entry_type_values(self, schema_dir: Path) -> None:
        generate_json_schemas.write_all()
        for type_name in generate_json_schemas.REGISTRY:
            assert (schema_dir / f"{type_name}.schema.json").exists()
