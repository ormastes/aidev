# AIIDE Quick Start Guide

## 🚀 Get Started in 3 Minutes

### Step 1: Install Dependencies
```bash
cd layer/themes/portal_aiide
npm install
```

### Step 2: Configure API Keys
```bash
cp .env.example .env
# Edit .env and add your API keys:
# - CLAUDE_API_KEY=sk-ant-...
# - DEEPSEEK_API_KEY=...
# - OPENAI_API_KEY=sk-... (optional)
```

### Step 3: Launch AIIDE
```bash
npm start
```

That's it! AIIDE is now running at http://localhost:5173

## 🎯 First Steps

### 1. Open the Application
Navigate to http://localhost:5173 in your browser

### 2. Choose Your Layout
Click the layout button in the toolbar to switch between:
- **IDE Mode**: Code editor + AI chat side by side
- **Chat Mode**: Full-screen AI chat
- **Split Mode**: Horizontal split view

### 3. Start a Chat Session
1. Select an AI provider from the dropdown (Claude, Ollama, DeepSeek)
2. Type your message in the input box
3. Press Enter or click Send

### 4. Work with Files
1. Use the file explorer on the left sidebar
2. Right-click to create new files/folders
3. Double-click to open files in the editor
4. Files auto-save as you type

### 5. Add Context to Chat
1. Select code in the editor
2. Right-click and choose "Add to Context"
3. The AI will see this code in your conversation

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + S` | Save current file |
| `Ctrl/Cmd + P` | Quick file search |
| `Ctrl/Cmd + Shift + P` | Command palette |
| `Ctrl/Cmd + B` | Toggle sidebar |
| `Ctrl/Cmd + J` | Toggle chat panel |
| `Ctrl/Cmd + \` | Split editor |
| `Alt + 1-9` | Switch between open files |
| `Ctrl/Cmd + W` | Close current file |
| `F2` | Rename file/folder |
| `Delete` | Delete selected file/folder |

## 🎨 Customization

### Change Theme
Click the bulb icon (💡) in the toolbar to toggle between light and dark themes.

### Adjust Layout
Drag the dividers between panels to resize them to your preference.

### Configure Settings
Access settings through the gear icon (⚙️) in the toolbar.

## 💬 AI Provider Tips

### Claude
- Best for: Complex reasoning, code generation, detailed explanations
- Max context: 200K tokens
- Requires API key from Anthropic

### Ollama (Local)
- Best for: Privacy, offline use, no API costs
- Models: Llama2, CodeLlama, Mistral
- Requires Ollama running locally on port 11434

### DeepSeek
- Best for: Code-specific tasks, competitive pricing
- Specialized models for coding
- Requires API key from DeepSeek

### OpenAI (Optional)
- Best for: General purpose, GPT-4 capabilities
- Wide model selection
- Requires OpenAI API key

## 📁 Working with Files

### Create a New Project
1. Right-click in file explorer
2. Select "New Folder"
3. Name your project
4. Start creating files inside

### Import Existing Code
1. Copy files to the `workspace/` directory
2. Refresh the file explorer (F5)
3. Your files will appear in the tree

### Export Your Work
1. Files are saved in `workspace/` directory
2. Use git or copy files directly
3. Or use File → Export in the menu

## 🔧 Troubleshooting

### Can't Connect to AI Provider?
- Check your API keys in `.env`
- Verify internet connection
- Check provider status in console

### Files Not Showing?
- Refresh the file explorer (F5)
- Check `workspace/` directory permissions
- Restart the backend server

### Editor Not Loading?
- Clear browser cache
- Try a different browser
- Check console for errors

### Port Already in Use?
```bash
# Kill processes on ports
lsof -ti:5173 | xargs kill -9
lsof -ti:3457 | xargs kill -9
```

## 🎓 Example Workflows

### 1. Code Review with AI
1. Open your code file
2. Select the code to review
3. Add to context
4. Ask: "Review this code for improvements"

### 2. Generate Documentation
1. Open your source file
2. Add file to context
3. Ask: "Generate JSDoc comments for all functions"

### 3. Debug with AI
1. Copy error message
2. Add relevant code to context
3. Ask: "Help me fix this error: [paste error]"

### 4. Learn New Concepts
1. Create a new file for notes
2. Ask AI to explain concepts
3. Save examples in your file

### 5. Refactor Code
1. Select code block
2. Add to context
3. Ask: "Refactor this to use modern JavaScript"

## 📊 API Testing

Test the API endpoints directly:

```bash
# Check available providers
curl http://localhost:3457/api/providers

# Get file tree
curl http://localhost:3457/api/files/tree?path=workspace

# Check server health
curl http://localhost:3457/api/health
```

## 🚦 Status Indicators

- **Green dot**: Connected to backend
- **Yellow dot**: Connecting...
- **Red dot**: Connection lost
- **Blue spinner**: AI is thinking
- **Check mark**: File saved
- **Asterisk (*)**: Unsaved changes

## 💡 Pro Tips

1. **Use Multiple Sessions**: Create separate chat sessions for different tasks
2. **Save Context**: Export important conversations for later reference
3. **Keyboard Navigation**: Learn shortcuts for faster workflow
4. **Split Views**: Use split layout for documentation + coding
5. **Local Models**: Use Ollama for sensitive code that shouldn't leave your machine

## 📚 Next Steps

- Read the full [README](README.md) for detailed features
- Check [DEPLOYMENT](DEPLOYMENT.md) for production setup
- Explore the [API Documentation](API.md)
- Join discussions in GitHub Issues

## 🆘 Getting Help

- **Quick Help**: Press F1 in the app
- **Documentation**: Check the docs/ folder
- **Issues**: Report bugs on GitHub
- **Community**: Join our Discord (coming soon)

---

Happy coding with AIIDE! 🚀