import httpx

BASE_URL = "http://127.0.0.1:8000/api/v1"

with httpx.Client(base_url=BASE_URL, timeout=10.0) as client:
    # 1. Signin
    res_auth = client.post("/auth/manualAuthentication", json={
        "type": "SIGNIN_MANUALLY",
        "email": "alex.morgan@moidoctar.com",
        "password": "Password123!"
    })
    assert res_auth.status_code == 200
    token = res_auth.json()["authorization"]
    print("1. [PASS] Real HTTP Network Login: Received Token =", token[:25] + "...")

    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get Profile
    res_prof = client.get("/user/listData", headers=headers)
    assert res_prof.status_code == 200
    user = res_prof.json()["data"]
    print(f"2. [PASS] Real HTTP Profile fetch: {user['userName']} ({user['email']})")

    # 3. Medications
    res_meds = client.get("/medication", headers=headers)
    assert res_meds.status_code == 200
    meds = res_meds.json()["data"]
    print(f"3. [PASS] Real HTTP Medications: {len(meds)} active medications retrieved")

    # 4. Triage Chat
    res_triage = client.post("/triage/chat", data={
        "symptoms": "High fever, chills and headache",
        "messages": "[]"
    }, headers=headers)
    assert res_triage.status_code == 200
    triage = res_triage.json()
    print(f"4. [PASS] Real HTTP Triage Chat: Urgency={triage['urgency_level']}, Confidence={triage['confidence_score']}")
    print(f"   Possible conditions: {', '.join(triage['possible_conditions'])}")

    print("\nSUCCESS: All real network HTTP requests from client to FastAPI succeeded 100%!")
