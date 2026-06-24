import React from "react";
import ReactDOM from "react-dom/client";
import { Activity, CheckCircle2, ExternalLink, Loader2, PlugZap, Radio, Vote, Wallet } from "lucide-react";
import { POLL_OPTIONS, TESTNET, type PollOptionId } from "./config";
import { createDemoEvent, createInitialResults } from "./lib/demoStream";
import { classifyWalletError, errorMessage } from "./lib/errors";
import { formatPercent, shortAddress } from "./lib/format";
import { connectWallet } from "./lib/wallet";
import { fetchBalance, fetchVoteEvents, readResults, submitVote, waitForTransaction } from "./lib/stellar";
import type { PollResults, TxState, VoteEvent, WalletErrorType, WalletInfo, WalletStatus } from "./types";
import "./styles.css";

const emptyResults = POLL_OPTIONS.reduce(
  (acc, option) => ({ ...acc, [option.id]: 0 }),
  {} as PollResults
);

function App() {
  const [wallet, setWallet] = React.useState<WalletInfo | null>(null);
  const [walletStatus, setWalletStatus] = React.useState<WalletStatus>("idle");
  const [walletError, setWalletError] = React.useState<WalletErrorType | null>(null);
  const [selectedOption, setSelectedOption] = React.useState<PollOptionId>("dex");
  const [results, setResults] = React.useState<PollResults>(
    TESTNET.demoMode ? createInitialResults() : emptyResults
  );
  const [events, setEvents] = React.useState<VoteEvent[]>([]);
  const [cursor, setCursor] = React.useState<string | undefined>();
  const [tx, setTx] = React.useState<TxState>({
    status: "idle",
    message: "Connect a wallet and cast a testnet vote."
  });
  const [toasts, setToasts] = React.useState<{ id: number; message: string; type: "success" | "info" }[]>([]);
  const [votedPopup, setVotedPopup] = React.useState<{ option: string; hash?: string } | null>(null);

  const addToast = (message: string, type: "success" | "info" = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const totalVotes = Object.values(results).reduce((sum, value) => sum + value, 0);

  const refreshResults = React.useCallback(async () => {
    if (!TESTNET.contractId || TESTNET.demoMode) {
      return;
    }

    const nextResults = await readResults();
    setResults(nextResults);
  }, []);

  React.useEffect(() => {
    refreshResults().catch(() => {
      setTx((current) => ({
        ...current,
        message: "Could not read contract results. Check the configured contract ID."
      }));
    });
  }, [refreshResults]);

  React.useEffect(() => {
    if (TESTNET.demoMode || !TESTNET.contractId) {
      let index = 0;
      const interval = window.setInterval(() => {
        const event = createDemoEvent(index);
        index += 1;
        setEvents((current) => [event, ...current].slice(0, 8));
        setResults((current) => ({
          ...current,
          [event.option]: current[event.option] + 1
        }));
      }, 5500);

      return () => window.clearInterval(interval);
    }

    const interval = window.setInterval(async () => {
      const response = await fetchVoteEvents(cursor);
      setCursor(response.cursor);

      if (response.events.length > 0) {
        setEvents((current) => [...response.events.reverse(), ...current].slice(0, 12));
        await refreshResults();
      }
    }, 4500);

    return () => window.clearInterval(interval);
  }, [cursor, refreshResults]);

  async function handleConnect() {
    setWalletStatus("connecting");
    setWalletError(null);

    try {
      const nextWallet = await connectWallet();
      setWallet(nextWallet);
      setWalletStatus("connected");
      setTx({ status: "idle", message: "Wallet connected. Ready for a contract call." });
    } catch (error) {
      const type = classifyWalletError(error);
      setWalletStatus("error");
      setWalletError(type);
      setTx({ status: "failed", message: errorMessage(type) });
    }
  }

  async function handleVote() {
    if (!wallet) {
      setWalletError("wallet_not_found");
      setTx({ status: "failed", message: errorMessage("wallet_not_found") });
      return;
    }

    try {
      setTx({ status: "pending", message: "Waiting for wallet signature..." });

      if (TESTNET.demoMode || !TESTNET.contractId) {
        await new Promise((resolve) => window.setTimeout(resolve, 900));
        const event = createDemoEvent(Date.now());
        const demoHash = `demo-${crypto.randomUUID().slice(0, 8)}`;
        setResults((current) => ({
          ...current,
          [selectedOption]: current[selectedOption] + 1
        }));
        setEvents((current) => [{ ...event, option: selectedOption, voter: wallet.address, txHash: demoHash }, ...current]);
        setTx({
          status: "success",
          hash: demoHash,
          message: "Demo vote synced. Add VITE_CONTRACT_ID to submit this on testnet."
        });
        addToast(`Demo vote successful! (${TESTNET.voteCost} XLM deducted from dummy balance)`, "success");
        setVotedPopup({ option: POLL_OPTIONS.find(o => o.id === selectedOption)?.label || selectedOption, hash: demoHash });
        setTimeout(() => setVotedPopup(null), 8000);
        if (wallet) {
           setWallet({ ...wallet, balance: (parseFloat(wallet.balance || "0") - parseFloat(TESTNET.voteCost)).toFixed(7) });
        }
        return;
      }

      const hash = await submitVote(selectedOption, wallet.address);
      setTx({ status: "pending", hash, message: "Submitted. Waiting for Stellar confirmation..." });
      await waitForTransaction(hash);
      setTx({ status: "success", hash, message: "Vote confirmed on Stellar testnet." });
      addToast(`Vote confirmed! ${TESTNET.voteCost} XLM paid.`, "success");
      setVotedPopup({ option: POLL_OPTIONS.find(o => o.id === selectedOption)?.label || selectedOption, hash });
      setTimeout(() => setVotedPopup(null), 8000);
      await refreshResults();
      
      const newBalance = await fetchBalance(wallet.address);
      setWallet({ ...wallet, balance: newBalance });
    } catch (error) {
      const type = classifyWalletError(error);
      setWalletError(type);
      setTx({ status: "failed", message: errorMessage(type) });
      addToast(errorMessage(type), "info");
    }
  }

  const sortedOptions = [...POLL_OPTIONS].sort((a, b) => results[b.id] - results[a.id]);

  const explorerTxUrl =
    tx.hash && !tx.hash.startsWith("demo-") ? `${TESTNET.explorerBase}/tx/${tx.hash}` : undefined;

  return (
    <main className="app-shell">
      {votedPopup && (
        <div className="vote-popup">
          <div className="vote-popup-content">
            <CheckCircle2 size={24} className="success-icon" />
            <div>
              <h3>Vote Successful!</h3>
              <p>You voted for <strong>{votedPopup.option}</strong></p>
              <p>{TESTNET.voteCost} XLM was deducted from your wallet.</p>
              {votedPopup.hash && !votedPopup.hash.startsWith("demo-") && (
                <a href={`${TESTNET.explorerBase}/tx/${votedPopup.hash}`} target="_blank" rel="noreferrer" className="verify-link">
                  Verify transaction on Stellar <ExternalLink size={14} />
                </a>
              )}
            </div>
            <button className="close-popup" onClick={() => setVotedPopup(null)}>×</button>
          </div>
        </div>
      )}
      <section className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark">
            <Radio size={22} />
          </span>
          <div>
            <p className="eyebrow">Stellar Level 2 Submission</p>
            <h1>PulsePoll</h1>
          </div>
        </div>

        <button className="wallet-button" onClick={handleConnect} disabled={walletStatus === "connecting"}>
          {walletStatus === "connecting" ? <Loader2 className="spin" size={18} /> : <Wallet size={18} />}
          {wallet ? (
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {shortAddress(wallet.address, 6, 4)} 
              {wallet.balance && <span className="balance-badge">{wallet.balance} XLM</span>}
            </span>
          ) : "Connect wallet"}
        </button>
      </section>

      <div className="toasts-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.type === "success" && <CheckCircle2 size={16} />}
            {t.message}
          </div>
        ))}
      </div>

      <section className="workspace">
        <aside className="control-panel">
          <div className="status-strip">
            <span className={TESTNET.demoMode ? "pill warning" : "pill live"}>
              {TESTNET.demoMode ? "Demo stream" : "Testnet live"}
            </span>
            <span className="network">Soroban testnet</span>
          </div>

          <h2>Choose the next build</h2>
          <p className="subtle">
            Cast a wallet-signed vote. The contract emits events and the frontend keeps the totals in sync.
          </p>

          <div className="option-list">
            {POLL_OPTIONS.map((option) => (
              <button
                className={`option-card ${selectedOption === option.id ? "selected" : ""}`}
                key={option.id}
                onClick={() => setSelectedOption(option.id)}
                style={{ "--accent": option.accent } as React.CSSProperties}
              >
                <span className="option-swatch" />
                <span>
                  <strong>{option.label}</strong>
                  <small>{option.description}</small>
                </span>
                <CheckCircle2 size={18} />
              </button>
            ))}
          </div>

          <button className="vote-button" onClick={handleVote} disabled={tx.status === "pending"}>
            {tx.status === "pending" ? <Loader2 className="spin" size={20} /> : <Vote size={20} />}
            Vote on contract ({TESTNET.voteCost} XLM)
          </button>

          <div className={`tx-panel ${tx.status}`}>
            <div>
              <span>Transaction status</span>
              <strong>{tx.status}</strong>
            </div>
            <p>{tx.message}</p>
            {explorerTxUrl ? (
              <a href={explorerTxUrl} target="_blank" rel="noreferrer">
                View on explorer <ExternalLink size={14} />
              </a>
            ) : null}
          </div>

          {walletError ? <p className="error-copy">{errorMessage(walletError)}</p> : null}
        </aside>

        <section className="results-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Live Results</p>
              <h2>{totalVotes} votes tracked</h2>
            </div>
            <PlugZap size={22} />
          </div>

          <div className="results-list">
            {sortedOptions.map((option) => {
              const count = results[option.id];
              const percent = formatPercent(count, totalVotes);

              return (
                <div className="result-row" key={option.id}>
                  <div className="result-label">
                    <span>{option.label}</span>
                    <strong>{count}</strong>
                  </div>
                  <div className="meter" aria-label={`${option.label} has ${percent}`}>
                    <span style={{ width: percent, background: option.accent }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="contract-facts">
            <div>
              <span>Contract</span>
              <strong>{TESTNET.contractId ? shortAddress(TESTNET.contractId, 8, 8) : "Not configured"}</strong>
            </div>
            <div>
              <span>Wallet</span>
              <strong>{wallet ? wallet.name : "Multi-wallet ready"}</strong>
            </div>
            <div>
              <span>Error coverage</span>
              <strong>Not found, rejected, balance</strong>
            </div>
          </div>
        </section>

        <section className="feed-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Event Feed</p>
              <h2>Realtime sync</h2>
            </div>
            <Activity size={22} />
          </div>

          <div className="feed-list">
            {events.length === 0 ? (
              <p className="empty">Waiting for vote events from the contract.</p>
            ) : (
              events.map((event) => (
                <article className="feed-item" key={event.id}>
                  <span className="feed-dot" />
                  <div>
                    <strong>{POLL_OPTIONS.find((option) => option.id === event.option)?.label}</strong>
                    <p>{shortAddress(event.voter, 7, 5)} voted</p>
                  </div>
                  <small>Ledger {event.ledger}</small>
                </article>
              ))
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
