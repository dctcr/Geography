# Geography

**Geography** is an educational Discord quiz bot built with **Discord.js** that tests your knowledge of world geography through interactive quizzes.  
While designed to be fun and competitive, the bot’s primary goal is learning and retention.

> 🌍 Early development — features, datasets, and quiz modes will continue to expand.

---

## ✨ Current Features

### 🎮 Quiz System
Start a quiz using the `/quiz` command and customize your experience step by step.

#### Quiz Types
- **Multiple Choice Quiz**
- **Written Quiz** (type your answer)

#### Game Modes
- **Countries by Flag**
- **Capitals by Flag**
- **Continents by Flag**

#### Difficulty Levels
- Easy
- Medium
- Hard
- Expert
- Mr. Worldwide 🌐

Difficulty currently affects question selection and recognizability.

---

### 📊 Quiz Flow
1. Run `/quiz`
2. Select:
   - Quiz type
   - Game mode
   - Difficulty
3. Answer questions interactively
4. Use in-quiz controls to:
   - Skip a question
   - End the quiz early
5. Receive a **final score summary**, including:
   - Correct answers
   - Incorrect answers

---

## 🧠 Educational Focus

Geography Bot is designed to:
- Improve flag recognition
- Reinforce country–capital–continent associations
- Encourage repeat play and gradual difficulty progression

It’s meant to be **fun first**, but genuinely educational.

---

## 🔮 Planned Features

### Quiz Enhancements
- Customizable difficulty (question count, recognizability tiers)
- Optional hints (e.g. show country name in capital/continent modes)
- Continent-specific quizzes (e.g. Europe-only, Asia-only)

### New Quiz Types
- **Map Quiz** – identify countries based on map highlights
- **U.S. States Quiz** - identify states by map/flag/capital/etc.

### Dataset Expansion
- Population
- Surface area / landmass
- Additional geographic metadata

---

## 🛠️ Tech Stack

- **Node.js**
- **Discord.js**
- JavaScript (CommonJS)
- Slash commands
- Component-based interactions (buttons & select menus)

---

## 📦 Installation

1. Clone the repository:
```bash
git clone https://github.com/dctcr/Geography.git
cd Geography
```

2. Install Dependencies:
```bash
npm install
```

3. Create a `.env` file in the project root
```env
TOKEN=your_discord_bot_token
CLIENT_ID=your_application_id
GUILD_ID=your_test_guild_id
OWNERS=your_id,example_id_2
```
> `.env` is required and is intentionally not tracked

---

## 🚀 Running the Bot

1. Deploy Slash Commands
```bash
npm src/deployCommand.js
```

2. Start the Bot
```bash
npm src/index.js
```

---

## 📁 Project Structure

```
src/
  commands/
     general/
        quiz.js
      utility/
         ping.js
  config/
     colors.json
     countries.json
     emojis.json
  events/
     clientReady.js
     interactionCreate.js
  flags/
  deployCommand.js
  index.js
  quizEngine.js
.env
```

---

## 🧪 Notes
Some emojis currently aren't supported through this installation method, if you are using this version of the Bot and want emojis, I recommend editing the `emojis.json` file to include your own personal emojis to replace the difficulty and correct/incorrect emojis

---

## 📄 License
This project is currently unlicensed.
