$issues = @(
    @{ title="Define User model"; body="Implement the User schema with role enum and streak tracking as defined in the DB schema specs." },
    @{ title="Define Subject model and Exam relations"; body="Implement the Subject schema referencing Exam and User models." },
    @{ title="Define Topic model with status enum"; body="Implement the Topic schema with Weak/Medium/Strong status tracking." },
    @{ title="Define PYQ model for PDF uploads"; body="Implement the PYQ schema including the JSON structure for analysisResults." },
    @{ title="Define StudyPlan model with nested DailyGoals"; body="Implement the StudyPlan schema containing nested arrays for dailyGoals and tasks." },
    @{ title="Define Quiz model for AI and Manual generation"; body="Implement the Quiz schema to store multiple-choice questions and correct answers." },
    @{ title="Define Flashcard model with SM-2 parameters"; body="Implement the Flashcard schema including interval, repetitions, and efactor fields." },
    @{ title="Define Progress model for syllabus analytics"; body="Implement the Progress schema to track completion percentage and quiz scores." },
    @{ title="Define ActivityLog model for tracking engagement"; body="Implement the ActivityLog schema for auditing student platform events." },
    @{ title="Create GET /api/subjects endpoint"; body="Develop an endpoint to fetch all subjects for a given exam." },
    @{ title="Create POST /api/subjects endpoint"; body="Develop an endpoint to allow users/admins to add a new subject." },
    @{ title="Create GET /api/topics endpoint"; body="Develop an endpoint to fetch topics filtered by subject." },
    @{ title="Create PUT /api/topics/:id/status endpoint"; body="Develop an endpoint to update a topic's confidence status (Weak/Medium/Strong)." },
    @{ title="Create POST /api/pyq/upload endpoint"; body="Develop an endpoint to handle PYQ PDF file uploads using multer." },
    @{ title="Create GET /api/pyq/analysis endpoint"; body="Develop an endpoint to fetch parsed text and AI analysis results for a PYQ." },
    @{ title="Create POST /api/study-plan endpoint"; body="Develop an endpoint to generate and save a new study plan." },
    @{ title="Create GET /api/study-plan/active endpoint"; body="Develop an endpoint to retrieve the current user's active study plan." },
    @{ title="Create POST /api/quizzes endpoint"; body="Develop an endpoint to save an AI-generated or manually created quiz." },
    @{ title="Create POST /api/quizzes/:id/submit endpoint"; body="Develop an endpoint to grade a quiz submission and update Progress." },
    @{ title="Create GET /api/flashcards/due endpoint"; body="Develop an endpoint to fetch all flashcards whose nextReviewDate is past." },
    @{ title="Create POST /api/flashcards/:id/review endpoint"; body="Develop an endpoint to calculate and update SM-2 parameters based on a review score." },
    @{ title="Create GET /api/progress/dashboard endpoint"; body="Develop an endpoint to aggregate progress stats for the user dashboard." },
    @{ title="Create GET /api/activity-logs endpoint"; body="Develop an endpoint to fetch a paginated list of user activity history." },
    @{ title="Write unit tests for SM-2 interval calculation logic"; body="Add Jest tests to verify the SuperMemo SM-2 algorithm math." },
    @{ title="Write integration tests for User Auth flow"; body="Add supertest specs for register, login, and token refresh endpoints." }
)

foreach ($issue in $issues) {
    gh issue create --title $issue.title --body $issue.body
    Start-Sleep -Seconds 2
}
