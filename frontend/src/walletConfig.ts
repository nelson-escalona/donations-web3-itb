// src/walletConfig.ts
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';
import { http } from 'wagmi';

export const factoryAddress =
  import.meta.env.VITE_FACTORY_ADDRESS as `0x${string}`;

if (!factoryAddress) {
  console.warn('VITE_FACTORY_ADDRESS is not set in .env');
}

export const config = getDefaultConfig({
  appName: 'UPRM Donations',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID as string,
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(import.meta.env.VITE_SEPOLIA_RPC_URL as string),
  },
  ssr: false,
});
