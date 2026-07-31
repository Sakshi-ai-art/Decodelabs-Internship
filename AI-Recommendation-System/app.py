import streamlit as st
import pandas as pd

st.title("AI Career Recommendation System")

df = pd.read_csv("careers.csv")

all_skills = [
    "Python","SQL","Excel","Power BI",
    "Spark","Hadoop",
    "Machine Learning","LLM",
    "Java","DSA",
    "Linux","Networking","Security"
]

user_skills = st.multiselect(
    "Select Your Skills",
    all_skills
)

if st.button("Recommend Career"):

    recommendations = []

    for _, row in df.iterrows():

        career = row["career"]
        skills = row["skills"].split(",")

        matched = len(
            set(user_skills) & set(skills)
        )

        score = (
            matched / len(skills)
        ) * 100

        missing = list(
            set(skills) - set(user_skills)
        )

        recommendations.append(
            [career, score, missing]
        )

    recommendations.sort(
        key=lambda x: x[1],
        reverse=True
    )

    st.subheader("Top Recommendations")

    for career, score, missing in recommendations:

        st.write(f"### {career}")
        st.write(f"Match Score: {score:.0f}%")
        st.write(
            f"Missing Skills: {', '.join(missing)}"
        )