from pathlib import Path
import unittest

from scripts.check_site import policy

ROOT = Path(__file__).resolve().parents[1]


class SitePolicyTests(unittest.TestCase):
    def test_every_page_hash_matches_its_inline_scripts(self):
        for file in ROOT.glob("*.html"):
            with self.subTest(file=file.name):
                source = file.read_text()
                updated, page = policy(source)
                self.assertEqual(updated, source)
                self.assertEqual(page.handlers, [])

    def test_injected_script_has_no_approved_hash(self):
        source = (ROOT / "index.html").read_text()
        injected = source.replace("</body>", "<script>alert('injected')</script></body>")
        updated, _ = policy(injected)
        self.assertNotEqual(updated, injected)

    def test_inline_event_handlers_are_rejected(self):
        source = (ROOT / "index.html").read_text()
        with self.assertRaises(ValueError):
            policy(source.replace("</body>", '<img src="x" onerror="alert(1)"></body>'))


if __name__ == "__main__":
    unittest.main()
