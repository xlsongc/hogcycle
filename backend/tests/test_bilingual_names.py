"""Both names have to be present, distinct, and actually English.

The English page reads `name_en` straight from the contract. A missing or
copied-over Chinese name would not raise anywhere — it would render as Chinese
text in an English sentence, which looks like a font bug and is really a
missing definition. These are cheap guards on a file that is edited by hand
every time an indicator is added.
"""

import pathlib

from hogcycle.registry.loader import load_registry

CONFIG = pathlib.Path(__file__).resolve().parents[2] / "config" / "sources.yaml"


def test_every_indicator_carries_both_names() -> None:
    for spec in load_registry(CONFIG):
        assert spec.name_zh.strip(), f"{spec.id}: empty name_zh"
        assert spec.name_en.strip(), f"{spec.id}: empty name_en"
        assert spec.name_en != spec.name_zh, f"{spec.id}: name_en copies name_zh"


def test_english_names_have_no_han_characters() -> None:
    # Pasting the Chinese name into name_en is the likely slip, and it survives
    # the distinctness check above as soon as a single character differs.
    for spec in load_registry(CONFIG):
        han = [c for c in spec.name_en if "一" <= c <= "鿿"]
        assert not han, f"{spec.id}: name_en {spec.name_en!r} contains {han}"


def test_the_two_slaughter_calibers_stay_distinguishable_in_english() -> None:
    # The 2025-07 caliber change stepped the level up, so these two must never
    # read as the same series. Translating both to "Slaughter volume" would
    # undo in the frontend a distinction the backend keeps in two tables.
    reg = load_registry(CONFIG)
    a = reg["slaughter"].name_en
    b = reg["slaughter_above_scale"].name_en
    assert a != b
