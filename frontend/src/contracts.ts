// src/contracts.ts
import factoryArtifact from './abi/DonationsFactory.json'
import campaignArtifact from './abi/Donations.json'
import type { Abi } from 'viem'

export const FACTORY_ADDRESS = import.meta.env
  .VITE_FACTORY_ADDRESS as `0x${string}`

if (!FACTORY_ADDRESS) {
  console.warn('VITE_FACTORY_ADDRESS is not set in .env')
}

// ---- Factory config ----
export const donationsFactoryConfig = {
  address: FACTORY_ADDRESS,
  abi: factoryArtifact.abi as Abi,
} as const

// ---- Single campaign (Donations) config ----
export const donationsCampaignConfig = {
  abi: campaignArtifact.abi as Abi,
} as const

// ---- Types ----
// Shape of what a single campaign from the factory "campaigns" array looks like
export type CampaignFromFactory = {
  campaignAddress: `0x${string}`
  owner: `0x${string}`
  name: string
  orgName: string
  goal: bigint
  creationTime: bigint
}
