'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, useChainId } from 'wagmi';
import { parseUnits } from 'viem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useConnectModal } from '@rainbow-me/rainbowkit';

const SALE_ADDRESS = '0xYourSaleContractAddress';
const AXN_ADDRESS = '0xYourAXNTokenAddress';

const SALE_ABI = [
  {
    type: 'function',
    name: 'buyWithAXN',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'kwiAmount', type: 'uint256' }],
    outputs: [],
  }
];

const AXN_ABI = [
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    outputs: [{ type: 'uint256' }],
  },
];

export default function BuyWithWagmi() {
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState('');
  const [step, setStep] = useState<'idle' | 'approving' | 'buying'>('idle');

  const chainId = useChainId();
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

  const { data: allowance } = useReadContract({
    abi: AXN_ABI,
    address: AXN_ADDRESS,
    functionName: 'allowance',
    args: address ? [address, SALE_ADDRESS] : undefined,
    query: { enabled: !!address },
  });

  const axnAmount = amount ? (BigInt(parseUnits(amount, 18)) * 10n ** 18n) / 10n ** 17n : 0n;

  const { writeContract: approveWrite, data: approveTx } = useWriteContract();
  const { writeContract: buyWrite, data: buyTx } = useWriteContract();

  const { isLoading: waitingApprove } = useWaitForTransactionReceipt({
    hash: approveTx,
    query: {
      enabled: !!approveTx && step === 'approving',
      onSuccess: () => {
        setStep('buying');
        buyWrite({
          abi: SALE_ABI,
          address: SALE_ADDRESS,
          functionName: 'buyWithAXN',
          args: [parseUnits(amount, 18)],
        });
      },
    },
  });

  const { isLoading: waitingBuy } = useWaitForTransactionReceipt({
    hash: buyTx,
    query: {
      enabled: !!buyTx && step === 'buying',
      onSuccess: () => {
        setStatus('✅ Achat réussi');
        setAmount('');
        setStep('idle');
      },
      onError: (err) => {
        setStatus('❌ Erreur lors de l\'achat');
        setStep('idle');
      },
    },
  });

  const handleBuy = async () => {
    setStatus('');
    if (!isConnected) return openConnectModal?.();
    if (!amount || axnAmount === 0n) return;

    if (!allowance || BigInt(allowance) < axnAmount) {
      setStep('approving');
      approveWrite({
        abi: AXN_ABI,
        address: AXN_ADDRESS,
        functionName: 'approve',
        args: [SALE_ADDRESS, axnAmount],
      });
    } else {
      setStep('buying');
      buyWrite({
        abi: SALE_ABI,
        address: SALE_ADDRESS,
        functionName: 'buyWithAXN',
        args: [parseUnits(amount, 18)],
      });
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-2xl shadow">
      <h2 className="text-xl font-bold mb-4">Acheter des KWI avec vos AXN</h2>

      <Label htmlFor="amount">Montant de KWI</Label>
      <Input
        id="amount"
        placeholder="1000"
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="mb-4"
      />

      <Button onClick={handleBuy} disabled={!amount || step !== 'idle'} className="w-full">
        {step === 'approving' ? 'Approbation...' : step === 'buying' ? 'Achat en cours...' : 'Acheter'}
      </Button>

      {status && <p className="mt-4 text-center text-sm text-muted-foreground">{status}</p>}
    </div>
  );
}
