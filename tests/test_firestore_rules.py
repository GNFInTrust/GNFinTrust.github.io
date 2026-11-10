"""Run against Firebase emulators only; never contacts a production project."""
import json
import os
import re
import unittest
import urllib.error
import urllib.request
import uuid

HOST = os.environ.get("FIRESTORE_EMULATOR_HOST", "")
AUTH_HOST = os.environ.get("FIREBASE_AUTH_EMULATOR_HOST", "")
PROJECT = "demo-gnfintrust"


def fields(data):
    result = {}
    for key, value in data.items():
        if isinstance(value, bool):
            result[key] = {"booleanValue": value}
        elif isinstance(value, int):
            result[key] = {"integerValue": str(value)}
        elif isinstance(value, list):
            result[key] = {"arrayValue": {"values": [{"stringValue": item} for item in value]}}
        else:
            result[key] = {"stringValue": value}
    return result


@unittest.skipUnless(HOST and AUTH_HOST, "Firebase Auth/Firestore emulators are not running")
class FirestoreRulesTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        for host in [HOST, AUTH_HOST]:
            if not re.fullmatch(r"(?:127\.0\.0\.1|localhost):\d+", host):
                raise RuntimeError("Refusing to test a non-loopback emulator")
        cls.base = f"http://{HOST}/v1/projects/{PROJECT}/databases/(default)/documents"

    def call(self, url, method="GET", body=None, token=None):
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = "Bearer " + token
        request = urllib.request.Request(url, data=json.dumps(body).encode() if body is not None else None, headers=headers, method=method)
        try:
            with urllib.request.urlopen(request, timeout=10) as response:
                return response.status, json.loads(response.read() or b"{}")
        except urllib.error.HTTPError as error:
            return error.code, json.loads(error.read())

    def write(self, collection, identifier, data, token=None):
        return self.call(f"{self.base}/{collection}/{identifier}", "PATCH", {"fields": fields(data)}, token)

    def setUp(self):
        self.call(f"http://{HOST}/emulator/v1/projects/{PROJECT}/databases/(default)/documents", "DELETE", token="owner")
        status, auth = self.call(f"http://{AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=emulator-key", "POST", {
            "email": f"{uuid.uuid4().hex}@example.test", "password": "test-password-123", "returnSecureToken": True,
        })
        self.assertEqual(status, 200, auth)
        self.uid, self.token = auth["localId"], auth["idToken"]
        status, data = self.write("users", self.uid, {"email": auth["email"], "admin": False, "tokens": 5, "purchases": []}, self.token)
        self.assertEqual(status, 200, data)

    def test_profile_privileges_balances_and_other_users_are_protected(self):
        for data in [{"admin": True}, {"tokens": 6}, {"purchases": ["paid-course"]}]:
            # Updating with a field mask preserves the other profile fields.
            key = next(iter(data))
            status, _ = self.call(f"{self.base}/users/{self.uid}?updateMask.fieldPaths={key}", "PATCH", {"fields": fields(data)}, self.token)
            self.assertEqual(status, 403)
        status, _ = self.call(f"{self.base}/users/{self.uid}?updateMask.fieldPaths=tokens", "PATCH", {"fields": fields({"tokens": 4})}, self.token)
        self.assertEqual(status, 200)
        status, _ = self.call(f"{self.base}/users/someone-else", token=self.token)
        self.assertEqual(status, 403)

    def test_catalog_and_paid_content_access(self):
        self.write("products", "course", {"title": "Course"}, "owner")
        self.write("productContent", "course", {"text": "Paid content"}, "owner")
        self.assertEqual(self.call(f"{self.base}/products/course")[0], 200)
        self.assertEqual(self.call(f"{self.base}/productContent/course")[0], 403)
        self.assertEqual(self.call(f"{self.base}/productContent/course", token=self.token)[0], 403)
        self.write("users", self.uid, {"admin": False, "tokens": 4, "purchases": ["course"]}, "owner")
        self.assertEqual(self.call(f"{self.base}/productContent/course", token=self.token)[0], 200)

    def test_orders_require_valid_contact_price_and_private_reads(self):
        valid = {"status": "new", "contact": "customer@example.test", "price": 500}
        self.assertEqual(self.write("orders", "valid", valid)[0], 200)
        self.assertEqual(self.call(f"{self.base}/orders/valid")[0], 403)
        for index, data in enumerate([{**valid, "price": -1}, {**valid, "contact": ""}, {**valid, "status": "done"}]):
            self.assertEqual(self.write("orders", f"invalid{index}", data)[0], 403)

    def meeting(self):
        return {"kind": "consult", "place": "online", "date": "2030-01-15", "time": "10:00", "method": "Email", "contact": "customer@example.test", "status": "new", "slot": "2030-01-15_10:00"}

    def book(self, identifier):
        meeting = self.meeting()
        busy = {"date": meeting["date"], "time": meeting["time"], "meetingId": identifier}
        return self.call(self.base + ":commit", "POST", {"writes": [
            {"update": {"name": f"projects/{PROJECT}/databases/(default)/documents/meetings/{identifier}", "fields": fields(meeting)}},
            {"update": {"name": f"projects/{PROJECT}/databases/(default)/documents/busy/{meeting['slot']}", "fields": fields(busy)}},
        ]})

    def test_orphan_slots_and_unreserved_meetings_are_rejected(self):
        meeting = self.meeting()
        self.assertEqual(self.write("busy", meeting["slot"], {"date": meeting["date"], "time": meeting["time"], "meetingId": "orphan"})[0], 403)
        self.assertEqual(self.write("meetings", "orphan", meeting)[0], 403)
        del meeting["slot"]
        self.assertEqual(self.write("meetings", "legacy", meeting)[0], 403)

    def test_atomic_booking_works_and_duplicate_booking_changes_nothing(self):
        status, data = self.book("first")
        self.assertEqual(status, 200, data)
        self.assertEqual(self.book("second")[0], 403)
        status, busy = self.call(self.base + "/busy/2030-01-15_10:00")
        self.assertEqual(status, 200)
        self.assertEqual(busy["fields"]["meetingId"]["stringValue"], "first")


if __name__ == "__main__":
    unittest.main()
