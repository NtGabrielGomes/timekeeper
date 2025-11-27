# Timekeeper C2 Framework

Timekeeper is a Command and Control (C2) framework developed for educational and cybersecurity research. The project consists of a client written in Rust and a backend server in Python with FastAPI.

![Timekeeper C2 Panel](img/painel.png)


## Architecture

The project is divided into two main parts:

- **Client (Rust)**: Agent that runs on target machines
- **Server (Python)**: Command and control interface with REST API and web frontend

## Features

### Client (Rust)

- System information collection
- Screenshot capture
- Wi-Fi credential extraction
- Keylogger
- System persistence
- Anti-VM detection
- Encrypted communication with server

### Server (Python)

- REST API with FastAPI
- Web interface for management
- SQLite/PostgreSQL database
- Operator authentication
- Implant management
- Real-time dashboard

## Technologies Used

### Client

- **Rust** - Main language
- **WinAPI** - Windows integration
- **Tokio** - Async runtime
- **Reqwest** - HTTP client
- **Serde** - JSON serialization

### Server

- **Python 3.8+**
- **FastAPI** - Web framework
- **SQLAlchemy** - ORM
- **Uvicorn** - ASGI server
- **HTML/CSS/JavaScript** - Frontend

## Installation

### Prerequisites

- **Rust** (1.70+)
- **Python** (3.8+)
- **Git**

### 1. Clone the repository

```bash
git clone https://github.com/your-username/timekeeper-c2.git
cd timekeeper-c2
```

### 2. Server Setup

```bash
cd server
pip install -r requirements.txt
```

Configure environment variables:

```bash
# Create a .env file
DATABASE_URL=sqlite:///./timekeeper.db
SECRET_KEY=your-secret-key-here
JWT_SECRET=your-jwt-secret-here
```

### 3. Database Initialization

```bash
python create_user.py  # Create admin user
```

### 4. Client Compilation

```bash
cd ../client
cargo build --release
```

## Usage

### 1. Start the server

```bash
cd server
python run.py
```

The server will be available at `http://localhost:8000`

### 2. Configure the client

Edit the `client/src/config.rs` file to configure the server URL:

```rust
pub const URL: &str = "http://your-server.com:8000";
pub const TIME: u64 = 30; // Communication interval in seconds
```

### 3. Compile and run the client

```bash
cd client
cargo run --release
```

## Configuration

### Client Configuration

- `config.rs` - General settings (server URL, communication interval)
- Compilation with different targets: `cargo build --target x86_64-pc-windows-gnu`

### Server Configuration

- `app/config.py` - Application settings
- Multiple database support via SQLAlchemy
- JWT authentication settings

## Project Structure

```text
timekeeper-c2/
├── client/                 # Rust Client
│   ├── src/
│   │   ├── main.rs        # Entry point
│   │   ├── config.rs      # Configuration
│   │   ├── info.rs        # Information collection
│   │   ├── persistence.rs # Persistence
│   │   ├── printscrn.rs   # Screenshots
│   │   ├── wifi.rs        # Wi-Fi extraction
│   │   └── antvm.rs       # Anti-VM
│   └── Cargo.toml
├── server/                 # Python Server
│   ├── app/
│   │   ├── api/           # API endpoints
│   │   ├── crud/          # Database operations
│   │   ├── db/            # Database configuration
│   │   ├── models/        # SQLAlchemy models
│   │   ├── schemas/       # Pydantic schemas
│   │   └── security/      # Authentication
│   ├── frontend/          # Web interface
│   └── requirements.txt
└── README.md
```

## Security

- Encrypted communication between client and server
- JWT authentication for operators
- Unique tokens for each implant
- Anti-debugging and anti-VM in client

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.

## Disclaimer

This software is provided for educational and research purposes only. Use on systems without authorization is **ILLEGAL**. The developers are not responsible for any malicious use of this code.
---

**IMPORTANT**: This project is intended only for cybersecurity research and education. Use responsibly and ethically.
