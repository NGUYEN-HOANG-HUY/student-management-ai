# Student AI Management System

## Project

Xây dựng hệ thống quản lý sinh viên tích hợp AI phân tích kết quả học tập và đưa ra khuyến nghị học tập.

## Goal

Build a simple, maintainable and demo-ready student management web application with local AI.

## Technology

* React + Vite
* JavaScript
* Node.js
* Express.js
* SQLite
* Axios
* Ollama local AI

## Cost constraint

* Do not use paid AI APIs.
* Do not require OpenAI API.
* Do not require Gemini API.
* Do not require cloud services.
* AI must work with local Ollama.
* Provide rule-based fallback when Ollama is unavailable.

## Coding style

* Keep the architecture simple.
* Prefer readable code over clever code.
* Use async/await.
* Validate user input.
* Handle errors explicitly.
* Avoid unnecessary dependencies.
* Avoid over-engineering.
* Keep components and functions small.
* Use clear naming.
* Add Vietnamese comments only for important business logic.

## AI requirements

AI analyzes:

* GPA
* subject performance
* weak subjects
* strong subjects
* learning risks
* learning trends

AI recommendations must be explainable.

Expected AI JSON:

{
"summary": "",
"strengths": [],
"weaknesses": [],
"riskLevel": "LOW",
"prioritySubjects": [],
"recommendations": [],
"studyPlan": []
}

Always validate AI JSON before returning it to the frontend.

## Reliability

If Ollama fails:

* never crash the server
* return rule-based recommendations
* inform frontend that local AI is unavailable

## Student-friendly development

The developer is a university student learning from the basics.

Every implementation should include:

1. What the code does.
2. Which file is changed.
3. Exact terminal commands.
4. How to run.
5. How to test.

Do not implement the entire project in one response.
Work phase by phase.

Never replace the existing architecture unless there is a strong technical reason.
