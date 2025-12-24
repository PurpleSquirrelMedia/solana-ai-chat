# Solana AI Chat

A multi-AI chat application built for **Solana Seeker** and the Solana Mobile ecosystem. Chat with Claude, OpenAI, Gemini, and Doubao while connected to your Solana wallet.

## Features

- **Multi-AI Chat**: Switch between Claude, OpenAI GPT, Google Gemini, and ByteDance Doubao
- **Solana Wallet Integration**: Connect via Mobile Wallet Adapter (Phantom, Backpack, etc.)
- **Wallet-Aware AI**: AI assistants can see your wallet balance and provide personalized crypto advice
- **Send SOL**: Quick send functionality right from the chat
- **Dark Mode**: Beautiful Solana-branded dark theme optimized for OLED displays
- **Conversation History**: All chats saved locally with search and export

## Tech Stack

- **React Native** with Expo (SDK 52)
- **Expo Router** for navigation
- **Solana Mobile Stack**
  - Mobile Wallet Adapter 2.1.0
  - @solana/web3.js
- **TypeScript** for type safety
- **Secure Store** for API keys and wallet data

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- Android Studio (for Android builds)
- A Solana Seeker device or Android emulator

### Installation

```bash
# Clone the repository
cd solana-ai-chat

# Install dependencies
npm install

# Start the development server
npm start

# Run on Android
npm run android
```

### Configuration

1. Open the app and go to **Settings**
2. Add your API keys for the AI providers you want to use:
   - **Claude**: Get from [console.anthropic.com](https://console.anthropic.com)
   - **OpenAI**: Get from [platform.openai.com](https://platform.openai.com)
   - **Gemini**: Get from [aistudio.google.com](https://aistudio.google.com)
   - **Doubao**: Get from [volcengine.com](https://www.volcengine.com)

## Building for Solana dApp Store

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build for dApp Store
eas build --platform android --profile dapp-store
```

### Publishing to Solana dApp Store

1. Build your APK using the command above
2. Follow the [Solana dApp Store Publishing Guide](https://docs.solanamobile.com/dapp-publishing/intro)
3. Submit via the Solana dApp Publisher Portal

## Project Structure

```
solana-ai-chat/
├── app/                    # Expo Router screens
│   ├── _layout.tsx        # Root layout with providers
│   ├── index.tsx          # Main chat screen
│   ├── settings.tsx       # API keys and preferences
│   └── history.tsx        # Conversation history
├── src/
│   ├── components/        # UI components
│   ├── providers/         # Context providers
│   │   ├── SolanaProvider.tsx
│   │   └── AIProvider.tsx
│   ├── services/          # API services
│   ├── types/             # TypeScript types
│   └── utils/             # Utilities
├── assets/                # Images and icons
└── package.json
```

## AI Providers

| Provider | Models | Context Window |
|----------|--------|----------------|
| Claude | Sonnet 4, Haiku 3.5, Opus 4 | 200K |
| OpenAI | GPT-4o, GPT-4o Mini, o1 | 128K-200K |
| Gemini | 2.0 Flash, 1.5 Pro, 1.5 Flash | 1M-2M |
| Doubao | 1.5 Pro, 1.5 Lite, Pro 256K | 32K-256K |

## Solana Features

- **Connect Wallet**: Use Mobile Wallet Adapter to connect any compatible wallet
- **View Balance**: See your SOL and SPL token balances
- **Send SOL**: Transfer SOL directly from the app
- **Sign Messages**: Sign arbitrary messages for verification

## Solana MCP Tools

The AI assistants have access to real-time Solana blockchain data through function calling:

| Tool | Description |
|------|-------------|
| `get_sol_balance` | Check SOL balance of any wallet |
| `get_token_balances` | Get SPL token holdings |
| `get_transaction` | Look up transaction details by signature |
| `get_recent_transactions` | Get recent wallet activity |
| `get_token_info` | Get token metadata by mint address |
| `get_sol_price` | Current SOL/USD price via Jupiter |
| `get_token_price` | Price of any SPL token |
| `lookup_domain` | Resolve .sol domains (Bonfida SNS) |
| `get_stake_accounts` | View staking positions and validators |
| `get_nfts` | List NFTs owned by a wallet |

### Example Queries

Try asking the AI:
- "What's the balance of toly.sol?"
- "Show me the recent transactions for [wallet address]"
- "What's the current SOL price?"
- "What NFTs does [address] own?"
- "Look up this transaction: [signature]"

The AI will automatically use the appropriate tools to fetch real-time data from the Solana blockchain.

## Security

- API keys stored in Expo Secure Store (encrypted)
- Wallet private keys never leave the wallet app
- No data sent to external servers (except AI APIs)

## License

MIT

## Links

- [Solana Mobile Docs](https://docs.solanamobile.com/)
- [Solana dApp Store](https://solanamobile.com/appstore)
- [Anthropic Claude API](https://docs.anthropic.com/)
- [OpenAI API](https://platform.openai.com/docs)
- [Google Gemini API](https://ai.google.dev/docs)
- [ByteDance Doubao](https://team.doubao.com/)
