// src/App.tsx
import React, { useMemo, useState } from 'react'
import { Routes, Route, Link, useNavigate, useParams } from 'react-router-dom'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi'
import { formatEther, parseEther } from 'viem'

import {
  donationsFactoryConfig,
  donationsCampaignConfig,
  FACTORY_ADDRESS,
} from './contracts'

// Local type (safe)
type Tier = {
  name: string
  description: string
  amount: bigint
  donators: bigint
  active: boolean
}

type CampaignFromFactory = {
  campaignAddress: `0x${string}`
  owner: `0x${string}`
  name: string
  orgName: string
  goal: bigint
  creationTime: bigint
}

//
// =========================================================
// Layout
// =========================================================
//
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="app-root">
    <header className="app-header">
      <Link to="/" className="logo">
        🎓 UPRM Donations
      </Link>
      <ConnectButton />
    </header>
    <main className="app-main">{children}</main>
  </div>
)

//
// =========================================================
// HOME — LIST ALL CAMPAIGNS
// =========================================================
//
const CampaignListPage: React.FC = () => {
  const { data: campaignsCount } = useReadContract({
    ...donationsFactoryConfig,
    functionName: 'getCampaignsCount',
  })

  const count = Number(campaignsCount ?? 0n)

  const { data: campaignsData, isLoading } = useReadContracts({
    contracts:
      count > 0
        ? Array.from({ length: count }, (_, i) => ({
            ...donationsFactoryConfig,
            functionName: 'campaigns',
            args: [BigInt(i)],
          }))
        : [],
  })

  const safeFormatEther = (value: unknown) => {
    if (typeof value !== 'bigint') return '0'
    return formatEther(value)
  }

  const campaigns: CampaignFromFactory[] = useMemo(() => {
    if (!campaignsData) return []

    return campaignsData
      .map((c) => c.result)
      .filter((r): r is readonly any[] => Array.isArray(r))
      .map((r) => {
        const [
          campaignAddress,
          owner,
          name,
          orgName,
          goal,
          creationTime,
        ] = r as readonly [string, string, string, string, bigint, bigint]

        return {
          campaignAddress: campaignAddress as `0x${string}`,
          owner: owner as `0x${string}`,
          name: String(name ?? ''),
          orgName: String(orgName ?? ''),
          goal: (goal ?? 0n) as bigint,
          creationTime: (creationTime ?? 0n) as bigint,
        }
      })
  }, [campaignsData])

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>Donation Campaigns</h1>
          <p className="muted">Support UPRM student organizations and make a difference in our community.</p>
        </div>
        <Link to="/create" className="btn primary">
          ✨ Create Campaign
        </Link>
      </div>

      {isLoading && <p className="muted">Loading campaigns…</p>}

      {!isLoading && campaigns.length === 0 && (
        <div className="card">
          <p className="muted">No campaigns created yet. Be the first to create one!</p>
        </div>
      )}

      <div className="cards-grid">
        {campaigns.map((c) => (
          <Link
            key={c.campaignAddress}
            to={`/campaign/${c.campaignAddress}`}
            className="card card-link"
          >
            <h2>{c.name}</h2>
            <p className="org-name">{c.orgName}</p>
            <p className="muted">🎯 Goal: {safeFormatEther(c.goal)} ETH</p>
          </Link>
        ))}
      </div>
    </Layout>
  )
}

//
// =========================================================
// CREATE CAMPAIGN
// =========================================================
//
const CreateCampaignPage: React.FC = () => {
  const navigate = useNavigate()
  const { isConnected } = useAccount()

  const [name, setName] = useState('')
  const [orgName, setOrgName] = useState('')
  const [description, setDescription] = useState('')
  const [goalEth, setGoalEth] = useState('')

  const { writeContract, data: txHash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  const handleSubmit: React.FormEventHandler = (e) => {
    e.preventDefault()
    if (!goalEth) return

    writeContract({
      ...donationsFactoryConfig,
      functionName: 'createCampaign',
      args: [name, orgName, description, parseEther(goalEth)],
    })
  }

  if (!isConnected) {
    return (
      <Layout>
        <div className="card">
          <h1>Create Campaign</h1>
          <p className="muted">Please connect your wallet to create a campaign.</p>
        </div>
      </Layout>
    )
  }

  if (isSuccess) {
    return (
      <Layout>
        <div className="card">
          <h1>🎉 Campaign Created Successfully!</h1>
          <p className="muted">Your campaign is now live and ready to receive donations.</p>
          <button className="btn primary" onClick={() => navigate('/')}>
            View All Campaigns
          </button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>Create Campaign</h1>
          <p className="muted">Launch a fundraising campaign for your organization.</p>
        </div>
      </div>

      <div className="card">
        <form className="form" onSubmit={handleSubmit}>
          <label>
            Campaign Name
            <input
              value={name}
              required
              placeholder="e.g., Annual Science Fair 2024"
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <label>
            Organization Name
            <input
              value={orgName}
              required
              placeholder="e.g., UPRM Robotics Club"
              onChange={(e) => setOrgName(e.target.value)}
            />
          </label>

          <label>
            Description
            <textarea
              value={description}
              required
              placeholder="Tell people about your campaign and how the funds will be used..."
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          <label>
            Funding Goal (ETH)
            <input
              type="number"
              min="0"
              step="0.001"
              value={goalEth}
              required
              placeholder="0.00"
              onChange={(e) => setGoalEth(e.target.value)}
            />
          </label>

          {error && <p className="error">{error.message}</p>}

          <button className="btn primary full" disabled={isPending || isConfirming}>
            {isPending || isConfirming ? '⏳ Creating Campaign...' : '🚀 Create Campaign'}
          </button>
        </form>
      </div>
    </Layout>
  )
}

//
// =========================================================
// CAMPAIGN DETAIL
// =========================================================
//
const CampaignDetailPage: React.FC = () => {
  const { address } = useParams<{ address: `0x${string}` }>()
  const { address: userAddress } = useAccount()
  const campaignAddress = address as `0x${string}`

  const { data: name } = useReadContract({
    address: campaignAddress,
    abi: donationsCampaignConfig.abi,
    functionName: 'name',
  })

  const { data: orgName } = useReadContract({
    address: campaignAddress,
    abi: donationsCampaignConfig.abi,
    functionName: 'org_name',
  })

  const { data: description } = useReadContract({
    address: campaignAddress,
    abi: donationsCampaignConfig.abi,
    functionName: 'description',
  })

  const { data: goal } = useReadContract({
    address: campaignAddress,
    abi: donationsCampaignConfig.abi,
    functionName: 'goal',
  })

  const { data: balance } = useReadContract({
    address: campaignAddress,
    abi: donationsCampaignConfig.abi,
    functionName: 'getBalance',
  })

  const { data: tiersData } = useReadContract({
    address: campaignAddress,
    abi: donationsCampaignConfig.abi,
    functionName: 'getTiers',
  })

  const { data: owner } = useReadContract({
    address: campaignAddress,
    abi: donationsCampaignConfig.abi,
    functionName: 'owner',
  })

  const { data: paused } = useReadContract({
    address: campaignAddress,
    abi: donationsCampaignConfig.abi,
    functionName: 'pause',
  })

  const tiers: Tier[] = useMemo(() => {
    if (!tiersData) return []
    return (tiersData as any[]).map((t: any) => ({
      name: t.name,
      description: t.description,
      amount: t.amount,
      donators: t.donators,
      active: t.active,
    }))
  }, [tiersData])

  const isOwner =
    owner &&
    userAddress &&
    owner.toLowerCase() === userAddress.toLowerCase()

  const numericGoal = goal ? (goal as bigint) : 0n
  const numericBalance = balance ? (balance as bigint) : 0n
  const progress =
    numericGoal > 0n
      ? Number((numericBalance * 10000n) / numericGoal) / 100
      : 0

  return (
    <Layout>
      <section className="campaign-header">
        <div>
          <h1>{name ?? 'Loading…'}</h1>
          <p className="org-name">🏛️ {orgName}</p>
          <p className="muted">{description}</p>
        </div>
        <div className="card stats-card">
          <p>
            <strong>💰 Raised:</strong> {formatEther(numericBalance)} ETH
          </p>
          <p>
            <strong>🎯 Goal:</strong> {formatEther(numericGoal)} ETH
          </p>
          <div className="progress">
            <div
              className="progress-bar"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <p className="muted">
            {progress.toFixed(1)}% funded {paused ? '⏸️ Paused' : ''}
          </p>
        </div>
      </section>

      <section className="campaign-layout">
        <div className="campaign-main">
          <h2>💎 Donation Tiers</h2>
          {tiers.length === 0 && (
            <p className="muted">No tiers available yet.</p>
          )}
          <div className="cards-grid">
            {tiers.map((tier, idx) => (
              <TierCard
                key={idx}
                index={idx}
                campaignAddress={campaignAddress}
                tier={tier}
                disabled={!!paused || !tier.active}
              />
            ))}
          </div>

          <h2>💝 Custom Donation</h2>
          <DonateCustomCard
            campaignAddress={campaignAddress}
            disabled={!!paused}
          />
        </div>

        {isOwner && (
          <div className="campaign-sidebar">
            <OwnerControls
              campaignAddress={campaignAddress}
              tiers={tiers}
              paused={!!paused}
            />
          </div>
        )}
      </section>
    </Layout>
  )
}

//
// =========================================================
// TIER CARD
// =========================================================
//
const TierCard: React.FC<{
  campaignAddress: `0x${string}`
  index: number
  tier: Tier
  disabled: boolean
}> = ({ campaignAddress, index, tier, disabled }) => {
  const { isConnected } = useAccount()

  const { writeContract, data: txHash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  const handleFund = () => {
    if (disabled) return
    writeContract({
      address: campaignAddress,
      abi: donationsCampaignConfig.abi,
      functionName: 'fund',
      args: [BigInt(index)],
      value: tier.amount,
    })
  }

  return (
    <div className={`card tier-card ${!tier.active ? 'inactive' : ''}`}>
      <h3>{tier.name}</h3>
      <p className="muted">{tier.description}</p>
      <p className="amount">
        {formatEther(tier.amount)} ETH
      </p>
      <p className="muted small">
        👥 {tier.donators.toString()} supporters
      </p>

      {error && <p className="error small">{error.message}</p>}

      <button
        className="btn primary full"
        disabled={!isConnected || isPending || isConfirming || disabled}
        onClick={handleFund}
      >
        {disabled
          ? '❌ Unavailable'
          : isPending || isConfirming
          ? '⏳ Processing...'
          : '💰 Fund This Tier'}
      </button>

      {isSuccess && (
        <p className="success small">✨ Thank you for your support!</p>
      )}
    </div>
  )
}

//
// =========================================================
// CUSTOM DONATION FORM
// =========================================================
//
const DonateCustomCard: React.FC<{
  campaignAddress: `0x${string}`
  disabled: boolean
}> = ({ campaignAddress, disabled }) => {
  const { isConnected } = useAccount()
  const [amountEth, setAmountEth] = useState('')

  const { writeContract, data: txHash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  const handleDonate: React.FormEventHandler = (e) => {
    e.preventDefault()
    if (!amountEth || disabled) return

    writeContract({
      address: campaignAddress,
      abi: donationsCampaignConfig.abi,
      functionName: 'donate',
      value: parseEther(amountEth),
    })
  }

  return (
    <div className="card">
      <form className="form" onSubmit={handleDonate}>
        <label>
          Donation Amount (ETH)
          <input
            type="number"
            min="0"
            step="0.001"
            value={amountEth}
            placeholder="0.00"
            onChange={(e) => setAmountEth(e.target.value)}
          />
        </label>

        {error && <p className="error small">{error.message}</p>}
        {isSuccess && (
          <p className="success small">🎉 Thank you for your donation!</p>
        )}

        <button
          className="btn primary full"
          type="submit"
          disabled={!isConnected || isPending || isConfirming || disabled}
        >
          {disabled
            ? '⏸️ Campaign Paused'
            : isPending || isConfirming
            ? '⏳ Processing Donation...'
            : '💝 Donate Now'}
        </button>
      </form>
    </div>
  )
}

//
// =========================================================
// OWNER CONTROLS
// =========================================================
//
const OwnerControls: React.FC<{
  campaignAddress: `0x${string}`
  tiers: Tier[]
  paused: boolean
}> = ({ campaignAddress, tiers, paused }) => {
  const [tierName, setTierName] = useState('')
  const [tierDesc, setTierDesc] = useState('')
  const [tierAmountEth, setTierAmountEth] = useState('')

  const { writeContract, data: txHash, isPending, error } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  })

  const handleAddTier: React.FormEventHandler = (e) => {
    e.preventDefault()
    if (!tierAmountEth) return

    writeContract({
      address: campaignAddress,
      abi: donationsCampaignConfig.abi,
      functionName: 'addTier',
      args: [tierName, tierDesc, parseEther(tierAmountEth)],
    })
  }

  const handleToggleTier = (index: number, active: boolean) => {
    writeContract({
      address: campaignAddress,
      abi: donationsCampaignConfig.abi,
      functionName: 'setTierActive',
      args: [BigInt(index), !active],
    })
  }

  const handleTogglePause = () => {
    writeContract({
      address: campaignAddress,
      abi: donationsCampaignConfig.abi,
      functionName: 'togglePause',
    })
  }

  const handleWithdraw = () => {
    writeContract({
      address: campaignAddress,
      abi: donationsCampaignConfig.abi,
      functionName: 'withdraw',
    })
  }

  return (
    <div className="card owner-card">
      <h2>⚙️ Owner Controls</h2>

      <button
        className="btn secondary full"
        onClick={handleTogglePause}
        disabled={isPending || isConfirming}
      >
        {paused ? '▶️ Unpause Campaign' : '⏸️ Pause Campaign'}
      </button>

      <button
        className="btn outline full"
        onClick={handleWithdraw}
        disabled={isPending || isConfirming}
      >
        💸 Withdraw Funds
      </button>

      <h3>Add New Tier</h3>
      <form className="form" onSubmit={handleAddTier}>
        <label>
          Tier Name
          <input
            value={tierName}
            required
            placeholder="e.g., Gold Supporter"
            onChange={(e) => setTierName(e.target.value)}
          />
        </label>
        <label>
          Description
          <textarea
            value={tierDesc}
            required
            placeholder="What benefits does this tier provide?"
            onChange={(e) => setTierDesc(e.target.value)}
          />
        </label>
        <label>
          Amount (ETH)
          <input
            type="number"
            min="0"
            step="0.001"
            value={tierAmountEth}
            required
            placeholder="0.00"
            onChange={(e) => setTierAmountEth(e.target.value)}
          />
        </label>

        {error && (
          <p className="error small">{error.message}</p>
        )}
        {isSuccess && (
          <p className="success small">✅ Tier added successfully!</p>
        )}

        <button
          className="btn primary full"
          type="submit"
          disabled={isPending || isConfirming}
        >
          {isPending || isConfirming ? '⏳ Adding...' : '✨ Add Tier'}
        </button>
      </form>

      <h3>Manage Tiers</h3>
      <ul className="tier-toggle-list">
        {tiers.map((t, idx) => (
          <li key={idx} className="tier-toggle-item">
            <span>
              {t.name} · {formatEther(t.amount)} ETH
            </span>
            <button
              className="btn tiny"
              type="button"
              disabled={isPending || isConfirming}
              onClick={() => handleToggleTier(idx, t.active)}
            >
              {t.active ? '❌ Deactivate' : '✅ Activate'}
            </button>
          </li>
        ))}

        {tiers.length === 0 && (
          <li className="muted small">No tiers created yet.</li>
        )}
      </ul>
    </div>
  )
}

//
// =========================================================
// APP ROUTES
// =========================================================
//
const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<CampaignListPage />} />
      <Route path="/create" element={<CreateCampaignPage />} />
      <Route path="/campaign/:address" element={<CampaignDetailPage />} />
    </Routes>
  )
}

export default App