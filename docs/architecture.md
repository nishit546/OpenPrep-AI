# 🏛️ OpenPrep AI — System Architecture

This document describes the architecture, major components, and core data flows of **OpenPrep AI**. It is intended to help contributors understand how the React frontend communicates with the Express backend, database, Gemini AI service, and real-time Socket.IO layer.

---

## 🔍 System Architecture Overview

OpenPrep AI follows a decoupled, multi-tier architecture:

* **Frontend:** React + Vite + Tailwind CSS
* **Backend:** Node.js + Express.js REST API
* **Authentication:** JWT-based authentication and protected middleware
* **Database:** PostgreSQL accessed through Sequelize ORM
* **AI Integration:** Google Gemini through the backend service layer
* **Real-time communication:** Socket.IO
* **Background processing:** Backend jobs and scheduled tasks
* **Infrastructure:** Docker / Docker Compose and repository automation

### Architecture Diagram

```mermaid
flowchart TD
    User["Student / Client Browser"]

    subgraph Frontend["Frontend — React + Vite"]
        UI["React UI Components"]
        State["Redux Toolkit / Application State"]
        API["Frontend API Services"]
        SocketClient["Socket.IO Client"]
    end

    subgraph Backend["Backend — Node.js + Express"]
        Server["Express Server"]
        Routes["API Routes"]
        Middleware["Authentication / Validation Middleware"]
        Controllers["Controllers"]
        Services["Services"]
        Sockets["Socket.IO Event Handlers"]
        Jobs["Background Jobs"]
        Models["Sequelize Models"]
    end

    subgraph External["External Services"]
        Gemini["Google Gemini API"]
    end

    DB[("PostgreSQL Database")]

    User --> UI
    UI --> State
    UI --> API
    UI --> SocketClient

    API -->|"HTTP / REST / JSON"| Server
    SocketClient -->|"WebSocket / Socket.IO"| Sockets

    Server --> Routes
    Routes --> Middleware
    Middleware --> Controllers

    Controllers --> Services
    Controllers --> Models
    Services --> Gemini
    Services --> Models

    Sockets --> Controllers
    Sockets --> Models

    Jobs --> Services
    Jobs --> Models

    Models -->|"SQL via Sequelize"| DB

    Gemini -->|"Generated content / structured responses"| Services
```

### Accessibility Description

The React frontend is the primary client. It communicates with the Express backend through REST APIs and communicates with the Socket.IO server for real-time features. Express routes pass requests through authentication and validation middleware before reaching controllers. Controllers and services interact with Sequelize models, which persist data in PostgreSQL. AI-related services communicate with Google Gemini. Background jobs use the same backend services and database layer.

---

# 🔐 Authentication and JWT Flow

Authentication is handled by the backend authentication layer and protected middleware. The frontend sends authentication credentials or tokens through the API service layer. Protected requests are checked before reaching application controllers.

> **Implementation note:** The sequence below describes the authentication lifecycle without assuming a specific refresh endpoint name. The exact route and token-storage mechanism should remain aligned with the active authentication implementation.

```mermaid
sequenceDiagram
    autonumber

    actor User as Student
    participant FE as React Frontend
    participant API as Frontend API Service
    participant Route as Auth Route
    participant Controller as Auth Controller
    participant Model as User Sequelize Model
    participant MW as Auth Middleware
    participant JWT as JWT Service
    participant DB as PostgreSQL

    User->>FE: Enter credentials
    FE->>API: Submit authentication request
    API->>Route: HTTP authentication request
    Route->>Controller: Forward credentials

    Controller->>Model: Find user
    Model->>DB: Query user record
    DB-->>Model: User record

    alt Invalid credentials
        Controller-->>API: Authentication error
        API-->>FE: Display login error
        FE-->>User: Authentication failed
    else Valid credentials
        Controller->>JWT: Generate authentication token
        JWT-->>Controller: Signed JWT
        Controller-->>API: Authentication response
        API-->>FE: Store authentication state
        FE-->>User: Authenticated
    end

    FE->>API: Request protected resource
    API->>MW: Send request with authentication token
    MW->>JWT: Verify token

    alt Token valid
        JWT-->>MW: Valid token
        MW->>Controller: Continue request
        Controller->>Model: Access protected data
        Model->>DB: Query database
        DB-->>Model: Result
        Model-->>Controller: Result
        Controller-->>FE: Protected response
    else Token invalid or expired
        JWT-->>MW: Verification failure
        MW-->>FE: Unauthorized response
        FE-->>User: Re-authentication / session recovery
    end
```

### Accessibility Description

A user authenticates through the React frontend. The request reaches the authentication route and controller, which retrieves the user through the Sequelize model and database. On successful authentication, a JWT is generated and returned to the frontend. Protected requests pass through authentication middleware, which verifies the token before allowing the request to continue. Invalid or expired authentication results in an unauthorized response.

---

# 🤖 Gemini AI Question Generation Flow

AI-generated questions are requested by the frontend and processed by the backend. Keeping Gemini communication inside the backend service layer prevents the frontend from directly handling the Gemini API credentials.

```mermaid
sequenceDiagram
    autonumber

    actor User as Student
    participant FE as React Frontend
    participant API as Frontend API Service
    participant Route as Quiz / AI Route
    participant MW as Auth Middleware
    participant Controller as Quiz / AI Controller
    participant Service as Gemini AI Service
    participant Gemini as Google Gemini API
    participant Model as Sequelize Models
    participant DB as PostgreSQL

    User->>FE: Request AI-generated questions
    FE->>API: Submit topic / syllabus / quiz parameters
    API->>Route: POST AI generation request
    Route->>MW: Validate authentication

    alt Authentication fails
        MW-->>API: Unauthorized response
        API-->>FE: Authentication error
        FE-->>User: Request rejected
    else Authentication succeeds
        MW->>Controller: Forward authenticated request
        Controller->>Service: Generate questions
        Service->>Gemini: Send structured prompt
        Gemini-->>Service: Generated question response

        alt Gemini request succeeds
            Service->>Service: Parse and validate generated data

            alt Response is valid
                Service->>Model: Prepare question records
                Model->>DB: Persist generated questions
                DB-->>Model: Saved records
                Model-->>Controller: Generated questions
                Controller-->>API: Success response
                API-->>FE: Question set
                FE-->>User: Render quiz
            else Response is invalid
                Service-->>Controller: Generation / validation error
                Controller-->>API: Error response
                API-->>FE: Generation failed
                FE-->>User: Display retry / error state
            end

        else Gemini API fails
            Gemini-->>Service: API error / timeout
            Service-->>Controller: AI service error
            Controller-->>API: Error response
            API-->>FE: Generation unavailable
            FE-->>User: Display retry / fallback message
        end
    end
```

### Accessibility Description

The frontend sends quiz-generation parameters to the backend. Authentication middleware verifies the request before the controller invokes the Gemini service. The service sends a structured prompt to Gemini and validates the response. Valid questions can be persisted through Sequelize and PostgreSQL before being returned to the frontend. Authentication failures, invalid AI responses, API failures, and timeouts are returned as error states rather than exposing Gemini credentials to the client.

---

# ⚡ Real-time Quiz Battle — Socket.IO Flow

Socket.IO provides real-time communication for multiplayer quiz or study-battle functionality. Unlike normal REST requests, clients maintain a real-time connection and receive events from the server as the shared quiz state changes.

```mermaid
sequenceDiagram
    autonumber

    actor PlayerA as Player A
    actor PlayerB as Player B
    participant ClientA as React + Socket.IO Client A
    participant Server as Socket.IO Server
    participant Room as Quiz Battle Room
    participant ClientB as React + Socket.IO Client B
    participant Model as Sequelize Models
    participant DB as PostgreSQL

    PlayerA->>ClientA: Start / join battle
    ClientA->>Server: Establish Socket.IO connection
    Server-->>ClientA: Connection established

    PlayerB->>ClientB: Join battle
    ClientB->>Server: Establish Socket.IO connection
    Server-->>ClientB: Connection established

    ClientA->>Server: Create / join quiz room
    Server->>Room: Create room state
    Server-->>ClientA: Room state

    ClientB->>Server: Join quiz room
    Server->>Room: Add Player B
    Server-->>ClientA: Player joined event
    Server-->>ClientB: Room state

    Server->>Room: Start quiz
    Room-->>ClientA: Question event
    Room-->>ClientB: Question event

    ClientA->>Server: Submit answer
    Server->>Room: Validate answer / update score
    Server-->>ClientA: Answer result
    Server-->>ClientB: Opponent state / score update

    ClientB->>Server: Submit answer
    Server->>Room: Validate answer / update score
    Server-->>ClientA: Score update
    Server-->>ClientB: Answer result

    alt Quiz continues
        Server->>Room: Advance to next question
        Room-->>ClientA: Next question
        Room-->>ClientB: Next question
    else Quiz completed
        Server->>Model: Persist relevant result
        Model->>DB: Save quiz / battle result
        DB-->>Model: Persistence result
        Server-->>ClientA: Final results
        Server-->>ClientB: Final results
    end

    alt Player disconnects
        ClientA--xServer: Socket disconnect
        Server->>Room: Update participant state
        Server-->>ClientB: Player disconnected event
    end
```

### Accessibility Description

Players connect to the Socket.IO server and join a shared quiz room. The server maintains the room state and broadcasts questions and state changes to connected clients. Players submit answers through Socket.IO events. The server updates the shared state and sends score or answer results to the participants. When the quiz ends, relevant results can be persisted through the Sequelize and PostgreSQL layers. Disconnect events update the remaining participants.

---

# 🗄️ Database Architecture

OpenPrep AI uses PostgreSQL as its persistent data store and Sequelize as the ORM layer. Database access should occur through Sequelize models rather than directly from the React frontend.

The repository contains database models and migrations under:

```text
backend/
├── migrations/
└── models/
```

The following diagram provides the architecture-level relationship between the application and database layer.

> **Note:** Entity names and relationships should be kept synchronized with the active Sequelize models and migrations. When adding or changing a model, update this diagram in the same documentation change.

```mermaid
flowchart LR
    Controllers["Backend Controllers"]
    Services["Backend Services"]
    Jobs["Background Jobs"]

    Models["Sequelize Models"]
    Migrations["Database Migrations"]
    DB[("PostgreSQL")]

    Controllers --> Models
    Services --> Models
    Jobs --> Models

    Models -->|"SQL / ORM queries"| DB
    Migrations -->|"Schema changes"| DB
```

### Accessibility Description

Controllers, services, and background jobs use Sequelize models to access persistent data. Sequelize translates model operations into database queries against PostgreSQL. Migration files define and evolve the PostgreSQL schema.

---

# 🚀 Deployment Architecture

The repository includes Docker and Docker Compose configuration for local and reproducible service environments.

```mermaid
flowchart TD
    Developer["Developer"]

    GitHub["GitHub Repository"]
    Actions["GitHub Actions / Repository Automation"]

    subgraph Local["Local Development"]
        Compose["Docker Compose"]
        Frontend["React + Vite Frontend"]
        Backend["Node.js + Express Backend"]
        PostgreSQL[("PostgreSQL")]
    end

    Developer --> GitHub
    GitHub --> Actions

    Developer --> Compose
    Compose --> Frontend
    Compose --> Backend
    Compose --> PostgreSQL

    Backend --> PostgreSQL
    Frontend -->|"REST / Socket.IO"| Backend
```

### Accessibility Description

Developers work with the GitHub repository and can use Docker Compose to run the frontend, backend, and PostgreSQL services locally. GitHub Actions provides repository automation. The frontend communicates with the backend through REST APIs and Socket.IO, while the backend communicates with PostgreSQL.

---

# 📁 Repository Architecture

```text
OpenPrep-AI/
├── .github/                    # GitHub Actions and repository automation
│
├── backend/                    # Node.js + Express backend
│   ├── config/                 # Application and database configuration
│   ├── controllers/            # Request and business logic controllers
│   ├── jobs/                   # Background and scheduled jobs
│   ├── middleware/             # Authentication, validation and request middleware
│   ├── migrations/             # Database migration files
│   ├── models/                 # Sequelize database models
│   ├── routes/                 # Express API route definitions
│   ├── scripts/                # Backend utility and maintenance scripts
│   ├── services/               # External services and AI integrations
│   ├── sockets/                # Socket.IO event handling
│   ├── tests/                  # Backend test suites
│   └── utils/                  # Shared backend utilities
│
├── frontend/                   # React + Vite frontend
│   ├── e2e/                    # End-to-end tests
│   ├── public/                 # Static assets
│   └── src/                    # Frontend source code
│
├── docs/                       # Project documentation
│   └── adr/                    # Architecture Decision Records
│
├── issues/                     # Issue-related resources
├── pr/                         # Pull-request resources
├── scripts/                    # Repository-level automation
│
├── docker-compose.yml          # Local Docker service configuration
├── package.json                # Root project scripts and dependencies
├── pnpm-workspace.yaml         # pnpm workspace configuration
├── CONTRIBUTING.md             # Contribution guidelines
├── CODE_OF_CONDUCT.md          # Community guidelines
├── SECURITY.md                 # Security policy
├── ROADMAP.md                  # Project roadmap
├── CHANGELOG.md                # Project change history
└── README.md                   # Project overview
```

---

# 🔗 Related Documentation

For contribution and development information, see:

* `CONTRIBUTING.md` — contribution workflow and development guidelines
* `SECURITY.md` — security practices and vulnerability reporting
* `docs/adr/` — architecture decisions and their rationale
* `README.md` — project overview, setup, and usage

The architecture documentation should be updated whenever a major backend service, frontend integration, database relationship, authentication mechanism, or real-time communication flow changes.

---

# 📝 Documentation Guidelines for Contributors

When modifying the architecture:

1. Keep Mermaid diagrams compatible with GitHub Markdown.
2. Use descriptive labels that correspond to repository modules.
3. Do not include API keys, credentials, tokens, private URLs, or other secrets.
4. Update diagrams when introducing new services or major data flows.
5. Keep a text-based accessibility description alongside each visual diagram.
6. Verify Mermaid rendering in GitHub or a compatible Markdown previewer before submitting documentation changes.
7. Prefer documenting actual application flows over hypothetical or future architecture.
