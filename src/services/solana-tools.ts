import { Connection, PublicKey, LAMPORTS_PER_SOL, ParsedAccountData } from '@solana/web3.js';

// Solana RPC endpoints
const MAINNET_RPC = 'https://api.mainnet-beta.solana.com';
const DEVNET_RPC = 'https://api.devnet.solana.com';

// Tool definitions for AI function calling
export const SOLANA_TOOLS = [
  {
    name: 'get_sol_balance',
    description: 'Get the SOL balance of a Solana wallet address',
    parameters: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          description: 'The Solana wallet address (base58 public key)',
        },
        network: {
          type: 'string',
          enum: ['mainnet', 'devnet'],
          description: 'The Solana network to query (default: mainnet)',
        },
      },
      required: ['address'],
    },
  },
  {
    name: 'get_token_balances',
    description: 'Get all SPL token balances for a Solana wallet',
    parameters: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          description: 'The Solana wallet address',
        },
        network: {
          type: 'string',
          enum: ['mainnet', 'devnet'],
          description: 'The Solana network to query',
        },
      },
      required: ['address'],
    },
  },
  {
    name: 'get_transaction',
    description: 'Get details of a Solana transaction by signature',
    parameters: {
      type: 'object',
      properties: {
        signature: {
          type: 'string',
          description: 'The transaction signature',
        },
        network: {
          type: 'string',
          enum: ['mainnet', 'devnet'],
          description: 'The Solana network',
        },
      },
      required: ['signature'],
    },
  },
  {
    name: 'get_recent_transactions',
    description: 'Get recent transactions for a Solana wallet',
    parameters: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          description: 'The Solana wallet address',
        },
        limit: {
          type: 'number',
          description: 'Number of transactions to fetch (max 20)',
        },
        network: {
          type: 'string',
          enum: ['mainnet', 'devnet'],
        },
      },
      required: ['address'],
    },
  },
  {
    name: 'get_token_info',
    description: 'Get information about an SPL token by mint address',
    parameters: {
      type: 'object',
      properties: {
        mint: {
          type: 'string',
          description: 'The token mint address',
        },
        network: {
          type: 'string',
          enum: ['mainnet', 'devnet'],
        },
      },
      required: ['mint'],
    },
  },
  {
    name: 'get_sol_price',
    description: 'Get the current SOL price in USD from Jupiter aggregator',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_token_price',
    description: 'Get the price of any Solana token in USD',
    parameters: {
      type: 'object',
      properties: {
        mint: {
          type: 'string',
          description: 'The token mint address',
        },
      },
      required: ['mint'],
    },
  },
  {
    name: 'lookup_domain',
    description: 'Resolve a .sol domain name to a Solana address',
    parameters: {
      type: 'object',
      properties: {
        domain: {
          type: 'string',
          description: 'The .sol domain name (e.g., "toly.sol")',
        },
      },
      required: ['domain'],
    },
  },
  {
    name: 'get_stake_accounts',
    description: 'Get staking accounts and rewards for a wallet',
    parameters: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          description: 'The Solana wallet address',
        },
      },
      required: ['address'],
    },
  },
  {
    name: 'get_nfts',
    description: 'Get NFTs owned by a Solana wallet',
    parameters: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          description: 'The Solana wallet address',
        },
        limit: {
          type: 'number',
          description: 'Maximum NFTs to return (default 10)',
        },
      },
      required: ['address'],
    },
  },
];

// Tool execution functions
export class SolanaToolExecutor {
  private getConnection(network: string = 'mainnet'): Connection {
    const rpc = network === 'devnet' ? DEVNET_RPC : MAINNET_RPC;
    return new Connection(rpc, 'confirmed');
  }

  async executeTool(name: string, params: Record<string, any>): Promise<string> {
    try {
      switch (name) {
        case 'get_sol_balance':
          return await this.getSolBalance(params.address, params.network);
        case 'get_token_balances':
          return await this.getTokenBalances(params.address, params.network);
        case 'get_transaction':
          return await this.getTransaction(params.signature, params.network);
        case 'get_recent_transactions':
          return await this.getRecentTransactions(params.address, params.limit, params.network);
        case 'get_token_info':
          return await this.getTokenInfo(params.mint, params.network);
        case 'get_sol_price':
          return await this.getSolPrice();
        case 'get_token_price':
          return await this.getTokenPrice(params.mint);
        case 'lookup_domain':
          return await this.lookupDomain(params.domain);
        case 'get_stake_accounts':
          return await this.getStakeAccounts(params.address);
        case 'get_nfts':
          return await this.getNFTs(params.address, params.limit);
        default:
          return JSON.stringify({ error: `Unknown tool: ${name}` });
      }
    } catch (error: any) {
      return JSON.stringify({ error: error.message });
    }
  }

  async getSolBalance(address: string, network?: string): Promise<string> {
    const connection = this.getConnection(network);
    const pubkey = new PublicKey(address);
    const balance = await connection.getBalance(pubkey);
    const solBalance = balance / LAMPORTS_PER_SOL;

    return JSON.stringify({
      address,
      balance: solBalance,
      lamports: balance,
      network: network || 'mainnet',
    });
  }

  async getTokenBalances(address: string, network?: string): Promise<string> {
    const connection = this.getConnection(network);
    const pubkey = new PublicKey(address);

    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubkey, {
      programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    });

    const tokens = tokenAccounts.value.map((account) => {
      const info = account.account.data.parsed.info;
      return {
        mint: info.mint,
        balance: info.tokenAmount.uiAmountString,
        decimals: info.tokenAmount.decimals,
        rawBalance: info.tokenAmount.amount,
      };
    });

    return JSON.stringify({
      address,
      tokenCount: tokens.length,
      tokens: tokens.slice(0, 20), // Limit to 20
    });
  }

  async getTransaction(signature: string, network?: string): Promise<string> {
    const connection = this.getConnection(network);
    const tx = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) {
      return JSON.stringify({ error: 'Transaction not found' });
    }

    return JSON.stringify({
      signature,
      blockTime: tx.blockTime,
      slot: tx.slot,
      fee: tx.meta?.fee,
      status: tx.meta?.err ? 'failed' : 'success',
      instructions: tx.transaction.message.instructions.length,
    });
  }

  async getRecentTransactions(address: string, limit: number = 10, network?: string): Promise<string> {
    const connection = this.getConnection(network);
    const pubkey = new PublicKey(address);

    const signatures = await connection.getSignaturesForAddress(pubkey, {
      limit: Math.min(limit, 20),
    });

    const transactions = signatures.map((sig) => ({
      signature: sig.signature,
      slot: sig.slot,
      blockTime: sig.blockTime,
      status: sig.err ? 'failed' : 'success',
      memo: sig.memo,
    }));

    return JSON.stringify({
      address,
      count: transactions.length,
      transactions,
    });
  }

  async getTokenInfo(mint: string, network?: string): Promise<string> {
    const connection = this.getConnection(network);
    const mintPubkey = new PublicKey(mint);

    const accountInfo = await connection.getParsedAccountInfo(mintPubkey);

    if (!accountInfo.value) {
      return JSON.stringify({ error: 'Token not found' });
    }

    const data = accountInfo.value.data as ParsedAccountData;

    return JSON.stringify({
      mint,
      decimals: data.parsed?.info?.decimals,
      supply: data.parsed?.info?.supply,
      freezeAuthority: data.parsed?.info?.freezeAuthority,
      mintAuthority: data.parsed?.info?.mintAuthority,
    });
  }

  async getSolPrice(): Promise<string> {
    try {
      const response = await fetch(
        'https://price.jup.ag/v6/price?ids=So11111111111111111111111111111111111111112'
      );
      const data = await response.json();
      const solData = data.data['So11111111111111111111111111111111111111112'];

      return JSON.stringify({
        symbol: 'SOL',
        price: solData?.price || 0,
        timestamp: Date.now(),
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to fetch SOL price' });
    }
  }

  async getTokenPrice(mint: string): Promise<string> {
    try {
      const response = await fetch(`https://price.jup.ag/v6/price?ids=${mint}`);
      const data = await response.json();
      const tokenData = data.data[mint];

      return JSON.stringify({
        mint,
        price: tokenData?.price || 0,
        timestamp: Date.now(),
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to fetch token price' });
    }
  }

  async lookupDomain(domain: string): Promise<string> {
    // SNS domain resolution using Bonfida API
    try {
      const cleanDomain = domain.replace('.sol', '');
      const response = await fetch(
        `https://sns-sdk-proxy.bonfida.workers.dev/resolve/${cleanDomain}`
      );
      const data = await response.json();

      if (data.result) {
        return JSON.stringify({
          domain: `${cleanDomain}.sol`,
          address: data.result,
        });
      }
      return JSON.stringify({ error: 'Domain not found' });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to resolve domain' });
    }
  }

  async getStakeAccounts(address: string): Promise<string> {
    const connection = this.getConnection('mainnet');
    const pubkey = new PublicKey(address);

    const stakeAccounts = await connection.getParsedProgramAccounts(
      new PublicKey('Stake11111111111111111111111111111111111111'),
      {
        filters: [
          {
            memcmp: {
              offset: 12,
              bytes: pubkey.toBase58(),
            },
          },
        ],
      }
    );

    const stakes = stakeAccounts.map((account) => {
      const data = account.account.data as ParsedAccountData;
      return {
        pubkey: account.pubkey.toBase58(),
        lamports: account.account.lamports,
        stake: account.account.lamports / LAMPORTS_PER_SOL,
        state: data.parsed?.info?.stake?.delegation?.stake ? 'active' : 'inactive',
        validator: data.parsed?.info?.stake?.delegation?.voter,
      };
    });

    const totalStaked = stakes.reduce((sum, s) => sum + s.stake, 0);

    return JSON.stringify({
      address,
      totalStaked,
      accountCount: stakes.length,
      accounts: stakes.slice(0, 10),
    });
  }

  async getNFTs(address: string, limit: number = 10): Promise<string> {
    // Using Helius DAS API (free tier available)
    try {
      const response = await fetch(
        `https://mainnet.helius-rpc.com/?api-key=15319bf4-5b40-4958-ac8d-6313aa55eb92`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 'nft-query',
            method: 'getAssetsByOwner',
            params: {
              ownerAddress: address,
              page: 1,
              limit: Math.min(limit, 20),
            },
          }),
        }
      );

      const data = await response.json();
      const nfts = data.result?.items?.map((item: any) => ({
        id: item.id,
        name: item.content?.metadata?.name || 'Unknown',
        symbol: item.content?.metadata?.symbol,
        collection: item.grouping?.[0]?.group_value,
        image: item.content?.links?.image,
      })) || [];

      return JSON.stringify({
        address,
        count: nfts.length,
        nfts,
      });
    } catch (error) {
      return JSON.stringify({ error: 'Failed to fetch NFTs' });
    }
  }
}

// Singleton instance
export const solanaTools = new SolanaToolExecutor();
