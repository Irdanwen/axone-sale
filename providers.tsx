'use client';

import { WagmiProvider, createConfig, http } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, getDefaultWallets } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient();
const { connectors } = getDefaultWallets({
  appName: 'Axone Sale',
  projectId: 'YOUR_WALLETCONNECT_PROJECT_ID',
});

const config = createConfig({
  connectors,
  chains: [sepolia],
  transports: {
    [sepolia.id]: http('https://sepolia.infura.io/v3/YOUR_INFURA_KEY'),
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
