"""Backward-compatible entry point for the Sprint 1 finance rules tests.

Run this file from its directory with: ``python test-functions.py``.
The implementation lives in ``finance_rules.py`` and the assertions live in
``test_finance_rules.py``.
"""

import unittest

import test_finance_rules


if __name__ == "__main__":
    unittest.main(module=test_finance_rules)
