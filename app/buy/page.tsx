// pages/buy.tsx

'use client';

import { useEffect, useState } from 'react';
import { useAccount, useConnect, useDisconnect, useContractWrite, usePrepareContractWrite, useWaitForTransaction } from 'wagmi';
import { InjectedConnector } from 'wagmi/connectors/injected';
import { parseEther } from 'viem';

const SALE_ADDRESS = '0x88795A56E214267deEb749b5d5B129757702d1d6';
const AXN_ADDRESS = '0x306dDE35Cf4DD52679143AeD4107B6FC0C63F5E7';
const AXN_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "spender", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [ { "internalType": "bool", "name": "", "type": "bool" } ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

const SALE_ABI = [
  {
    "inputs": [ { "internalType": "uint256", "name": "axnAmount", "type": "uint256" } ],
    "name": "buyWithAXN",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

export default function Buy() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect({ connector: new InjectedConnector() });
  const { disconnect } = useDisconnect();

  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<'idle' | 'approving' | 'buying'>('idle');

  const axnAmount = parseEther(amount || '0');

  const { config: approveConfig } = usePrepareContractWrite({
    address: AXN_ADDRESS,
    abi: AXN_ABI,
    functionName: 'approve',
    args: [SALE_ADDRESS, axnAmount],
    enabled: isConnected && amount !== ''
  });

  const { write: approve, data: approveTx } = useContractWrite(approveConfig);
  const { isSuccess: isApproved } = useWaitForTransaction({ hash: approveTx?.hash });

  const { config: buyConfig } = usePrepareContractWrite({
    address: SALE_ADDRESS,
    abi: SALE_ABI,
    functionName: 'buyWithAXN',
    args: [axnAmount],
    enabled: isApproved
  });

  const { write: buy, data: buyTx } = useContractWrite(buyConfig);
  const { isSuccess: isBought } = useWaitForTransaction({ hash: buyTx?.hash });

  useEffect(() => {
    if (isApproved) setStep('buying');
    if (isBought) setStep('idle');
  }, [isApproved, isBought]);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-4">Buy KWI with AXN</h1>
      {!isConnected ? (
        <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={() => connect()}>Connect Wallet</button>
      ) : (
        <div className="flex flex-col gap-4">
          <p>Connected: {address}</p>
          <input
            type="number"
            placeholder="Amount of AXN"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="border px-2 py-1 rounded"
          />
          <button
            className="bg-green-600 text-white px-4 py-2 rounded disabled:opacity-50"
            disabled={!approve || step !== 'idle'}
            onClick={() => { setStep('approving'); approve?.(); }}
          >Approve</button>
          <button
            className="bg-purple-600 text-white px-4 py-2 rounded disabled:opacity-50"
            disabled={!buy || step !== 'buying'}
            onClick={() => buy?.()}
          >Buy</button>
          <button className="text-red-600 underline mt-2" onClick={() => disconnect()}>Disconnect</button>
        </div>
      )}
    </main>
  );
}

