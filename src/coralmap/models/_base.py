"""Shared model machinery: the id types, the contract marks, and the bases.

:func:`contract` marks a field that ships to consumers, and
:func:`contract_validator` a rule they enforce too. :class:`Base` rejects
undeclared public fields and keeps underscore-prefixed internal ones. Every
model is frozen and every sequence field is a tuple, so a loaded library
cannot be edited in place.
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Annotated, Any, Literal, Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

KlId = Annotated[str, Field(pattern=r"^kl-\d{6}$")]

#: The key :func:`contract` sets in a field's ``json_schema_extra``.
CONTRACT_KEY = "contract"


def contract(*args: Any, **kwargs: Any) -> Any:
    """``Field(...)`` for a field that ships to consumers.

    Every class reachable from a marked field must mark at least one field of
    its own; a subclass that redeclares a marked field must mark it again.
    """
    extra = dict(kwargs.pop("json_schema_extra", None) or {})
    extra[CONTRACT_KEY] = True
    return Field(*args, json_schema_extra=extra, **kwargs)


def contract_validator(fn: Callable[..., Any]) -> Any:
    """``model_validator(mode="after")`` for a rule consumers enforce too.

    The rule should read only fields declared with :func:`contract`, so that a
    consumer holding only :meth:`Base.contract_fields` can apply it.
    """
    return model_validator(mode="after")(fn)


def _strip_internal(node: Any) -> Any:
    """Drop every underscore-prefixed key, recursing through mappings and sequences."""
    if isinstance(node, dict):
        return {
            k: _strip_internal(v)
            for k, v in node.items()
            if not (isinstance(k, str) and k.startswith("_"))
        }
    if isinstance(node, list | tuple):
        return [_strip_internal(v) for v in node]
    return node


def _is_contract_marked(info: Any) -> bool:
    """Whether ``contract()`` marked this field."""
    extra = getattr(info, "json_schema_extra", None)
    return isinstance(extra, dict) and bool(extra.get(CONTRACT_KEY))


def _contract_value(value: Any, dumped: Any, *, mode: Literal["python", "json"]) -> Any:
    """``dumped`` with every nested model reduced to its own marked fields."""
    if isinstance(value, Base):
        return value.contract_fields(mode=mode)
    if isinstance(value, list | tuple):
        return [
            _contract_value(item, rendered, mode=mode)
            for item, rendered in zip(value, dumped, strict=True)
        ]
    if isinstance(value, dict):
        return {
            key: _contract_value(value[key], rendered, mode=mode)
            for key, rendered in dumped.items()
        }
    return dumped


class Base(BaseModel):
    """The root of every catalog model: frozen, and closed to undeclared public fields.

    An undeclared key whose name starts with an underscore is an internal
    annotation and is kept; :meth:`public_fields` removes it. An undeclared
    key without the prefix fails validation.
    :meth:`contract_fields` is the narrower cut: only fields marked with
    :func:`contract`.
    """

    model_config = ConfigDict(frozen=True, extra="allow")

    def public_fields(self, *, mode: Literal["python", "json"] = "python") -> dict[str, Any]:
        """The published catalog: everything not prefixed with an underscore.

        Recurses, because internal keys nest: ``standing._basis``,
        ``claim_evidence[]._claim_full``. ``mode`` is forwarded to
        ``model_dump``: pass ``"json"`` when the result leaves Python, since a
        python-mode dump holds enum members, which ``yaml.safe_dump`` refuses.
        """
        return dict(_strip_internal(self.model_dump(mode=mode, exclude_none=True)))

    def contract_fields(self, *, mode: Literal["python", "json"] = "python") -> dict[str, Any]:
        """The fields marked with :func:`contract`, and the same cut inside each nested model.

        A marked key whose value is ``None`` is omitted, as in :meth:`public_fields`.
        ``mode`` is forwarded to ``model_dump``: pass ``"json"`` when the result
        leaves Python, since a python-mode dump holds enum members.
        """
        marked = [
            name for name, info in type(self).model_fields.items() if _is_contract_marked(info)
        ]
        dumped = self.model_dump(mode=mode, include=set(marked), exclude_none=True)
        return {
            name: _contract_value(getattr(self, name), dumped[name], mode=mode)
            for name in marked
            if name in dumped
        }

    @model_validator(mode="after")
    def _no_undeclared_public_fields(self) -> Self:
        declared = set(type(self).model_fields)
        extras = self.__pydantic_extra__ or {}
        stray = sorted(k for k in extras if not k.startswith("_") and k not in declared)
        if stray:
            raise ValueError(
                f"undeclared public field(s): {stray}. Internal fields must be prefixed with '_'."
            )
        return self
