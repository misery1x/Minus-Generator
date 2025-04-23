# 🎮 Minus Generator

A powerful Discord bot for managing and generating stock from various services with role-based access control.

## ✨ Features

### 🛠️ Service Management
- Create and manage multiple services
- Upload stock via files or direct input
- Real-time stock monitoring
- Secure stock generation

### 👑 Role-Based Access
| Role | Generation Limit | Cooldown |
|------|-----------------|----------|
| Owner | ∞ Unlimited | None |
| Silver | 3 accounts | 30s |
| Bronze | 1 account | 60s |

### 🤖 Commands
| Command | Description | Permission |
|---------|-------------|------------|
| `/help` | View all available commands | Everyone |
| `/stock` | Check available services and stock | Everyone |
| `/generate` | Generate accounts from a service | Role-based |
| `/createservice` | Create a new service | Owner |
| `/addstock` | Add stock to existing service | Owner |
| `/deleteservice` | Remove a service | Owner |

## 🚀 Quick Start

### 1️⃣ Installation
```bash
git clone https://github.com/misery1x/Minus-Generator.git
cd minus-generator
npm install
```

### 2️⃣ Configuration
Create a `config.json` file in the root directory:
```json
{
    "token": "your_bot_token_here",
    "clientId": "your_client_id_here",
    "owner": "your_discord_id_here",
    "roles": {
        "bronze": {
            "id": "bronze_role_id_here",
            "maxGenerate": 1,
            "cooldown": 60000
        },
        "silver": {
            "id": "silver_role_id_here",
            "maxGenerate": 3,
            "cooldown": 30000
        }
    }
}
```

### 3️⃣ Launch
```bash
node index.js
```

## 📁 Project Structure
```
minus-generator/
├── 📄 index.js        # Main bot file
├── ⚙️ config.json     # Configuration
├── 📦 package.json    # Dependencies
└── 📂 stock/         # Stock storage
    ├── service1.txt
    ├── service2.txt
    └── ...
```

## 🔧 Dependencies
- [discord.js](https://discord.js.org/) - Discord API wrapper
- dotenv - Environment configuration

## 📜 License
This project is licensed under the MIT License.

## 💬 Support
Need help? Open an issue in the GitHub repository or join our Discord server.

## 🔐 Security
- All stock operations are role-protected
- Secure file handling
- Rate limiting and cooldowns
- Permission-based command access 
