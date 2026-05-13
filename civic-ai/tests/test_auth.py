"""JWT auth test suite — run from civic-ai/ root."""
import httpx

BASE = "http://127.0.0.1:8000"

# 1. No token → 401
r = httpx.post(f"{BASE}/ask", json={"question": "test"})
assert r.status_code == 401, f"Expected 401, got {r.status_code}"
print("PASS  [1] No token → 401 Unauthorized")

# 2. Wrong password → 401
r = httpx.post(f"{BASE}/auth/token", data={"username": "resident", "password": "wrong"})
assert r.status_code == 401, f"Expected 401, got {r.status_code}"
print("PASS  [2] Wrong password → 401")

# 3. Resident login → token
r = httpx.post(f"{BASE}/auth/token", data={"username": "resident", "password": "resident123"})
assert r.status_code == 200, f"Login failed: {r.text}"
resident_token = r.json()["access_token"]
print(f"PASS  [3] Resident login → token  (role={r.json()['role']})")

# 4. /auth/me
r = httpx.get(f"{BASE}/auth/me", headers={"Authorization": f"Bearer {resident_token}"})
assert r.status_code == 200 and r.json()["role"] == "resident"
print(f"PASS  [4] /auth/me → {r.json()}")

# 5. Resident can call /ask
r = httpx.post(
    f"{BASE}/ask",
    json={"question": "How many wards are in BBMP?"},
    headers={"Authorization": f"Bearer {resident_token}"},
    timeout=60,
)
assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
print(f"PASS  [5] Resident /ask → 200  (answer len={len(r.json()['answer'])})")

# 6. Resident cannot upload → 403
r = httpx.post(
    f"{BASE}/ingest/file",
    files={"file": ("test.txt", b"hello", "text/plain")},
    headers={"Authorization": f"Bearer {resident_token}"},
)
assert r.status_code == 403, f"Expected 403, got {r.status_code}: {r.text}"
print("PASS  [6] Resident /ingest/file → 403 Forbidden")

# 7. Organizer login → token
r = httpx.post(f"{BASE}/auth/token", data={"username": "organizer", "password": "organizer123"})
assert r.status_code == 200
org_token = r.json()["access_token"]
print(f"PASS  [7] Organizer login → token  (role={r.json()['role']})")

# 8. Organizer can call /ask
r = httpx.post(
    f"{BASE}/ask",
    json={"question": "How many wards are in BBMP?"},
    headers={"Authorization": f"Bearer {org_token}"},
    timeout=60,
)
assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
print("PASS  [8] Organizer /ask → 200")

# 9. Invalid token → 401
r = httpx.post(
    f"{BASE}/ask",
    json={"question": "test"},
    headers={"Authorization": "Bearer this.is.invalid"},
)
assert r.status_code == 401, f"Expected 401, got {r.status_code}"
print("PASS  [9] Invalid token → 401 Unauthorized")

print()
print("All 9 auth tests passed ✓")
