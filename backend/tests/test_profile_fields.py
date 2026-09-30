"""Profile answers the frontend saves come back from the account (so they restore on a new device)."""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
sys.path.insert(0, os.path.join(ROOT, "ai"))
os.environ["MOIDOCTAR_DATA_DIR"] = os.path.join(ROOT, ".data_test")

from app.schemas.user import UserOut  # noqa: E402


def test_demographics_keep_genotype_dob_and_unknown_answers():
    out = UserOut(
        _id="1",
        userName="Korede Omotosho",
        email="k@example.com",
        demographics={"bloodType": "Don't know", "genotype": "Prefer not to say", "dateOfBirth": "1995-04-12", "age": "31"},
    )
    demo = out.model_dump()["demographics"]
    assert demo["bloodType"] == "Don't know"
    assert demo["genotype"] == "Prefer not to say"
    assert demo["dateOfBirth"] == "1995-04-12"
