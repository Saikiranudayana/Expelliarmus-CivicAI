import streamlit as st
import requests
import os

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")

st.set_page_config(
    page_title="Expelliarmus – Civic Intelligence Platform",
    page_icon="⚖️",
    layout="wide",
)

st.title("⚖️ Expelliarmus")
st.subheader("AI-Powered Local Governance Explainer")

# --- Sidebar ---
with st.sidebar:
    st.header("Upload Document")
    uploaded_file = st.file_uploader(
        "Upload a governance document (PDF / DOCX)",
        type=["pdf", "docx"],
    )
    if uploaded_file and st.button("Ingest Document"):
        with st.spinner("Ingesting document…"):
            files = {"file": (uploaded_file.name, uploaded_file.getvalue())}
            response = requests.post(f"{API_BASE_URL}/ingest", files=files)
            if response.status_code == 200:
                st.success("Document ingested successfully.")
            else:
                st.error(f"Ingestion failed: {response.text}")

# --- Main area ---
st.markdown("---")
st.header("Ask a Question")

query = st.text_input(
    "What would you like to know?",
    placeholder="e.g. What happened in the latest council meeting?",
)

if st.button("Ask") and query:
    with st.spinner("Thinking…"):
        response = requests.post(
            f"{API_BASE_URL}/ask",
            json={"query": query},
        )
        if response.status_code == 200:
            data = response.json()
            st.markdown("### Answer")
            st.write(data.get("answer", "No answer returned."))

            citations = data.get("citations", [])
            if citations:
                st.markdown("### Sources")
                for i, cite in enumerate(citations, 1):
                    st.markdown(f"**[{i}]** {cite}")
        else:
            st.error(f"Request failed: {response.text}")
