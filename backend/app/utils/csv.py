from typing import Any


FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")


def safe_csv_cell(value: Any) -> Any:
    """Prefix risky strings so spreadsheet software treats them as text, not formulas."""
    if isinstance(value, str) and value.startswith(FORMULA_PREFIXES):
        return "'" + value
    return value
