import React, { useState, useRef, useEffect } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormLabel,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  BitKeepAdapter,
  BybitWalletAdapter,
  GateWalletAdapter,
  GuardaAdapter,
  MetaMaskAdapter,
  OkxWalletAdapter,
  OneKeyAdapter,
  TokenPocketAdapter,
  TronLinkAdapter,
  TrustAdapter,
} from '@tronweb3/tronwallet-adapters';
import type { Adapter } from '@tronweb3/tronwallet-abstract-adapter';

// ── Inline types (SecurityOptions and friends aren't re-exported yet) ──────

type RiskItem = { title: string; noticeType: 1 | 2 | 3 };

interface SecurityOptions {
  enabled?: boolean;
  configUrls?: string[];
  onRiskDetected?: (result: { risks: RiskItem[] }) => Promise<void>;
  timeout?: number;
  retries?: number;
  cacheTTL?: number;
}

// ── Adapter factory ────────────────────────────────────────────────────────

// Individual adapter configs don't yet expose securityOptions in their TypeScript
// interfaces (it ships in v1.2.27). Cast to `any` so the demo compiles against
// the currently installed package types while still passing the option at runtime.
//
// `adapterName` is the exact string used as the key in the security config JSON
// (i.e. `result.wallets[adapterName]`). It must match the adapter's `name` property.
const ADAPTERS = [
  { label: 'TronLink', adapterName: 'TronLink', create: (o: SecurityOptions) => new TronLinkAdapter({ securityOptions: o } as any) as Adapter },
  { label: 'OKX Wallet', adapterName: 'OKX Wallet', create: (o: SecurityOptions) => new OkxWalletAdapter({ securityOptions: o } as any) as Adapter },
  { label: 'Bitget Wallet', adapterName: 'Bitget Wallet', create: (o: SecurityOptions) => new BitKeepAdapter({ securityOptions: o } as any) as Adapter },
  { label: 'Bybit Wallet', adapterName: 'Bybit Wallet', create: (o: SecurityOptions) => new BybitWalletAdapter({ securityOptions: o } as any) as Adapter },
  { label: 'Trust', adapterName: 'Trust', create: (o: SecurityOptions) => new TrustAdapter({ securityOptions: o } as any) as Adapter },
  { label: 'Guarda', adapterName: 'Guarda', create: (o: SecurityOptions) => new GuardaAdapter({ securityOptions: o } as any) as Adapter },
  { label: 'OneKey', adapterName: 'OneKey', create: (o: SecurityOptions) => new OneKeyAdapter({ securityOptions: o } as any) as Adapter },
  { label: 'TokenPocket', adapterName: 'TokenPocket', create: (o: SecurityOptions) => new TokenPocketAdapter({ securityOptions: o } as any) as Adapter },
  { label: 'Gate Wallet', adapterName: 'Gate Wallet', create: (o: SecurityOptions) => new GateWalletAdapter({ securityOptions: o } as any) as Adapter },
  { label: 'MetaMask', adapterName: 'MetaMask', create: (o: SecurityOptions) => new MetaMaskAdapter({ securityOptions: o } as any) as Adapter },
];

// ── Pre-built scenarios ────────────────────────────────────────────────────

interface FormState {
  enabled: boolean;
  configUrls: string;
  throwOnRisk: boolean;
  timeout: number;
  retries: number;
  cacheTTL: number;
}

// Local mock config URLs served by the Vite dev-server plugin (see vite.config.ts).
const LOCAL_MOCK_ALL = '/mock-security-config.json';
const LOCAL_MOCK_PARTIAL = '/mock-security-config-partial.json';

const SCENARIOS: { label: string; description: string; form: FormState }[] = [
  {
    label: 'Disabled (default)',
    description: 'Security check is off. Config URL is never fetched.',
    form: { enabled: false, configUrls: 'https://wallet-adapter.tronscan.org/config.json', throwOnRisk: true, timeout: 2000, retries: 0, cacheTTL: 600000 },
  },
  // ── Local mock scenarios (served by Vite dev server) ──────────────────────
  {
    label: 'Mock — all wallets blocked',
    description: 'Local mock config flags every adapter. Connect will be blocked for whichever wallet you select.',
    form: { enabled: true, configUrls: LOCAL_MOCK_ALL, throwOnRisk: true, timeout: 2000, retries: 0, cacheTTL: 600000 },
  },
  {
    label: 'Mock — partial (TronLink / MetaMask)',
    description: 'Local mock config flags only TronLink and MetaMask. Other adapters connect successfully.',
    form: { enabled: true, configUrls: LOCAL_MOCK_PARTIAL, throwOnRisk: true, timeout: 2000, retries: 0, cacheTTL: 600000 },
  },
  {
    label: 'Mock — log only',
    description: 'Local mock config is fetched but onRiskDetected only logs — connect is NOT blocked.',
    form: { enabled: true, configUrls: LOCAL_MOCK_ALL, throwOnRisk: false, timeout: 2000, retries: 0, cacheTTL: 600000 },
  },
  // ── Remote / edge-case scenarios ──────────────────────────────────────────
  {
    label: 'Real config URL',
    description: 'Fetches from the live Tronscan endpoint. Currently no wallets should be flagged.',
    form: { enabled: true, configUrls: 'https://wallet-adapter.tronscan.org/config.json', throwOnRisk: true, timeout: 2000, retries: 0, cacheTTL: 600000 },
  },
  {
    label: 'Log-only mode',
    description: 'Risk detected but onRiskDetected only logs — connect is NOT blocked.',
    form: { enabled: true, configUrls: 'https://wallet-adapter.tronscan.org/config.json', throwOnRisk: false, timeout: 2000, retries: 0, cacheTTL: 600000 },
  },
  {
    label: 'Server error fallback',
    description: 'Config URL is unreachable. Adapter falls back to safe (allow connect).',
    form: { enabled: true, configUrls: 'https://will-fail.invalid/config.json', throwOnRisk: true, timeout: 2000, retries: 0, cacheTTL: 600000 },
  },
  {
    label: 'With retries',
    description: 'Retries 2 times on fetch failure. You can observe the extra delay.',
    form: { enabled: true, configUrls: 'https://will-fail.invalid/config.json', throwOnRisk: true, timeout: 3000, retries: 2, cacheTTL: 600000 },
  },
  {
    label: 'Short cache TTL',
    description: 'Cache expires after 5 seconds — every connect re-fetches the config.',
    form: { enabled: true, configUrls: 'https://wallet-adapter.tronscan.org/config.json', throwOnRisk: true, timeout: 2000, retries: 0, cacheTTL: 5000 },
  },
];

const DEFAULT_FORM: FormState = SCENARIOS[0].form;

// ── Styled helpers ─────────────────────────────────────────────────────────

const PageTitle = styled(Typography)({
  fontFamily: 'Wix Madefor Display, sans-serif',
  fontSize: '36px',
  fontWeight: 800,
  textAlign: 'center',
  color: 'rgba(7, 9, 76, 1)',
  marginBottom: '8px',
});

const SectionCard = styled(Paper)({
  padding: '20px 24px',
  borderRadius: '12px',
  backgroundColor: '#e8e8ef',
  marginBottom: '16px',
  boxShadow: 'none',
});

const SectionTitle = styled(Typography)({
  fontWeight: 700,
  color: '#07094c',
  marginBottom: '12px',
});

const ConnectButton = styled(Button)({
  width: '100%',
  lineHeight: '60px',
  backgroundColor: '#000000',
  color: '#fff',
  borderRadius: '10px',
  fontSize: '16px',
  fontWeight: 700,
  padding: 0,
  '&:hover': { backgroundColor: '#07094c' },
  '&.Mui-disabled': { color: '#fff', backgroundColor: '#555' },
});

const MonoBox = styled(Box)({
  backgroundColor: '#1a1a2e',
  borderRadius: '8px',
  padding: '12px 16px',
  fontFamily: 'monospace',
  fontSize: '12px',
  color: '#c0c0c0',
  overflowX: 'auto',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-all',
});

// ── Log ────────────────────────────────────────────────────────────────────

type LogLevel = 'info' | 'warn' | 'error' | 'success';
type LogEntry = { time: string; level: LogLevel; message: string };

const LOG_COLORS: Record<LogLevel, string> = {
  info: '#c0c0c0',
  warn: '#ffd93d',
  error: '#ff6b6b',
  success: '#6bcb77',
};

// ── Main component ─────────────────────────────────────────────────────────

type ConnectStatus = 'idle' | 'connecting' | 'success' | 'error';

export default function SecurityDemo() {
  const [adapterIdx, setAdapterIdx] = useState(0);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [status, setStatus] = useState<ConnectStatus>('idle');
  const [address, setAddress] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [log, setLog] = useState<LogEntry[]>([]);
  const adapterRef = useRef<Adapter | null>(null);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  useEffect(() => {
    return () => {
      adapterRef.current?.removeAllListeners();
    };
  }, []);

  function addLog(level: LogLevel, message: string) {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLog((prev) => [...prev, { time, level, message }]);
  }

  function buildOptions(): SecurityOptions {
    if (!form.enabled) return { enabled: false };

    const configUrls = form.configUrls
      .split(',')
      .map((u) => u.trim())
      .filter(Boolean);

    return {
      enabled: true,
      configUrls,
      timeout: form.timeout,
      retries: form.retries,
      cacheTTL: form.cacheTTL,
      onRiskDetected: form.throwOnRisk
        ? async (result) => {
            const titles = result.risks.map((r) => r.title).join(', ');
            addLog('error', `onRiskDetected — blocking connect. Risks: ${titles}`);
            throw new Error(`[WalletAdapter] Security risk detected: ${titles}`);
          }
        : async (result) => {
            const titles = result.risks.map((r) => r.title).join(', ');
            addLog('warn', `onRiskDetected — logging only (not blocking). Risks: ${titles}`);
          },
    };
  }

  async function handleConnect() {
    if (adapterRef.current) {
      try {
        await adapterRef.current.disconnect();
      } catch {
        /* ignore */
      }
      adapterRef.current.removeAllListeners();
      adapterRef.current = null;
    }

    const options = buildOptions();
    const adapterDef = ADAPTERS[adapterIdx];
    addLog('info', `Creating ${adapterDef.label} with securityOptions.enabled=${options.enabled}`);

    let adapter: Adapter;
    try {
      adapter = adapterDef.create(options);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      addLog('error', `Adapter construction failed: ${msg}`);
      setStatus('error');
      setErrorMsg(msg);
      return;
    }

    adapterRef.current = adapter;
    adapter.on('connect', (addr: string) => {
      addLog('success', `connect event — address: ${addr}`);
    });
    adapter.on('disconnect', () => addLog('info', 'disconnect event'));

    setStatus('connecting');
    setErrorMsg('');
    addLog('info', 'Calling adapter.connect()…');

    try {
      await adapter.connect();
      setStatus('success');
      setAddress(adapter.address || '');
      addLog('success', `Connected! address=${adapter.address}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      addLog('error', `connect() threw: ${msg}`);
      setStatus('error');
      setErrorMsg(msg);
      adapterRef.current?.removeAllListeners();
      adapterRef.current = null;
    }
  }

  async function handleDisconnect() {
    try {
      await adapterRef.current?.disconnect();
    } catch (e: unknown) {
      addLog('error', `disconnect() threw: ${e instanceof Error ? e.message : String(e)}`);
    }
    adapterRef.current?.removeAllListeners();
    adapterRef.current = null;
    setStatus('idle');
    setAddress('');
    addLog('info', 'Disconnected');
  }

  const isConnected = status === 'success';
  const isConnecting = status === 'connecting';
  const configUrlsList = form.configUrls
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean);
  const isValid = !form.enabled || configUrlsList.length > 0;

  const configPreview = JSON.stringify(
    {
      securityOptions: {
        enabled: form.enabled,
        ...(form.enabled && {
          configUrls: configUrlsList,
          onRiskDetected: form.throwOnRisk ? '(throws — blocks connect)' : '(logs only — allows connect)',
          timeout: `${form.timeout}ms`,
          retries: form.retries,
          cacheTTL: `${form.cacheTTL}ms`,
        }),
      },
    },
    null,
    2
  );

  return (
    <Box sx={{ pt: '40px', pb: '60px', maxWidth: '980px', mx: 'auto', px: 2 }}>
      <PageTitle>Security Policy Demo</PageTitle>
      <Typography sx={{ textAlign: 'center', color: '#7b7c9d', mb: 3, fontFamily: 'Wix Madefor Display, sans-serif' }}>
        Configure <code>securityOptions</code> and observe how the adapter responds at connect time.
      </Typography>

      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} alignItems="flex-start">
        {/* ── Left: configuration ────────────────────────────────── */}
        <Box sx={{ flex: '1 1 0', minWidth: 0 }}>
          {/* Quick scenarios */}
          <SectionCard>
            <SectionTitle variant="subtitle1">Quick Scenarios</SectionTitle>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {SCENARIOS.map((s) => (
                <Tooltip title={s.description} key={s.label} arrow>
                  <Chip
                    label={s.label}
                    onClick={() => {
                      setForm(s.form);
                      addLog('info', `Scenario: "${s.label}"`);
                    }}
                    clickable
                    sx={{ fontWeight: 600 }}
                  />
                </Tooltip>
              ))}
            </Stack>
          </SectionCard>

          {/* Adapter */}
          <SectionCard>
            <SectionTitle variant="subtitle1">Wallet Adapter</SectionTitle>
            <FormControl fullWidth size="small">
              <Select value={adapterIdx} onChange={(e) => setAdapterIdx(Number(e.target.value))} sx={{ backgroundColor: '#fff', borderRadius: '8px', '& fieldset': { border: 'none' } }}>
                {ADAPTERS.map((a, i) => (
                  <MenuItem key={a.label} value={i}>
                    {a.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {/* Show the exact key used in the security config JSON */}
            <Typography fontSize={12} color="#7b7c9d" sx={{ mt: 0.5 }}>
              Config JSON key:{' '}
              <Box component="code" sx={{ backgroundColor: '#d8d8e8', borderRadius: '4px', px: 0.5, fontFamily: 'monospace', color: '#07094c' }}>
                {ADAPTERS[adapterIdx].adapterName}
              </Box>
            </Typography>
          </SectionCard>

          {/* securityOptions form */}
          <SectionCard>
            <SectionTitle variant="subtitle1">securityOptions</SectionTitle>

            {/* enabled */}
            <FormControlLabel
              control={<Switch checked={form.enabled} onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))} color="primary" />}
              label={
                <Typography fontWeight={600} fontSize={14}>
                  enabled
                </Typography>
              }
              sx={{ mb: 2, display: 'flex' }}
            />

            {/* configUrls */}
            <TextField
              fullWidth
              label="configUrls (comma-separated)"
              size="small"
              value={form.configUrls}
              onChange={(e) => setForm((f) => ({ ...f, configUrls: e.target.value }))}
              disabled={!form.enabled}
              multiline
              rows={2}
              sx={{ mb: 2, '& .MuiInputBase-root': { backgroundColor: '#fff', borderRadius: '8px' } }}
              placeholder="https://example.com/config.json"
              error={form.enabled && configUrlsList.length === 0}
              helperText={form.enabled && configUrlsList.length === 0 ? 'At least one URL is required when enabled' : ''}
            />

            {/* onRiskDetected */}
            <FormControl component="fieldset" sx={{ mb: 2 }}>
              <FormLabel component="legend" sx={{ fontWeight: 600, color: '#07094c', fontSize: '14px', mb: 0.5 }}>
                onRiskDetected behavior
              </FormLabel>
              <RadioGroup row value={form.throwOnRisk ? 'throw' : 'log'} onChange={(e) => setForm((f) => ({ ...f, throwOnRisk: e.target.value === 'throw' }))}>
                <FormControlLabel value="throw" control={<Radio size="small" />} label={<Typography fontSize={14}>Throw (block connect)</Typography>} disabled={!form.enabled} />
                <FormControlLabel value="log" control={<Radio size="small" />} label={<Typography fontSize={14}>Log only (allow connect)</Typography>} disabled={!form.enabled} />
              </RadioGroup>
            </FormControl>

            {/* timeout / retries / cacheTTL */}
            <Stack direction="row" spacing={2}>
              <TextField
                label="timeout (ms)"
                type="number"
                size="small"
                value={form.timeout}
                onChange={(e) => setForm((f) => ({ ...f, timeout: Number(e.target.value) }))}
                disabled={!form.enabled}
                sx={{ flex: 1, '& .MuiInputBase-root': { backgroundColor: '#fff', borderRadius: '8px' } }}
                inputProps={{ min: 100, step: 500 }}
              />
              <TextField
                label="retries"
                type="number"
                size="small"
                value={form.retries}
                onChange={(e) => setForm((f) => ({ ...f, retries: Number(e.target.value) }))}
                disabled={!form.enabled}
                sx={{ flex: 1, '& .MuiInputBase-root': { backgroundColor: '#fff', borderRadius: '8px' } }}
                inputProps={{ min: 0, max: 5 }}
              />
              <TextField
                label="cacheTTL (ms)"
                type="number"
                size="small"
                value={form.cacheTTL}
                onChange={(e) => setForm((f) => ({ ...f, cacheTTL: Number(e.target.value) }))}
                disabled={!form.enabled}
                sx={{ flex: 1, '& .MuiInputBase-root': { backgroundColor: '#fff', borderRadius: '8px' } }}
                inputProps={{ min: 0, step: 60000 }}
              />
            </Stack>
          </SectionCard>

          {/* Connect / Disconnect */}
          <ConnectButton onClick={isConnected ? handleDisconnect : handleConnect} disabled={isConnecting || !isValid}>
            {isConnecting ? (
              <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" height="100%">
                <CircularProgress size={18} sx={{ color: '#fff' }} />
                <span>Connecting…</span>
              </Stack>
            ) : isConnected ? (
              'Disconnect'
            ) : (
              'Connect'
            )}
          </ConnectButton>
        </Box>

        {/* ── Right: result + log + config preview ───────────────── */}
        <Box sx={{ flex: '1 1 0', minWidth: 0 }}>
          {/* Connection result */}
          <SectionCard>
            <SectionTitle variant="subtitle1">Connection Result</SectionTitle>
            {status === 'idle' && (
              <Typography color="#7b7c9d" fontSize={14}>
                Not connected. Configure options and click Connect.
              </Typography>
            )}
            {status === 'connecting' && (
              <Stack direction="row" spacing={1} alignItems="center">
                <CircularProgress size={16} />
                <Typography fontSize={14}>Connecting…</Typography>
              </Stack>
            )}
            {status === 'success' && (
              <Alert severity="success" sx={{ borderRadius: '8px' }}>
                <Typography fontWeight={700}>Connected</Typography>
                <Typography fontSize={13} sx={{ wordBreak: 'break-all', mt: 0.5, fontFamily: 'monospace' }}>
                  {address}
                </Typography>
              </Alert>
            )}
            {status === 'error' && (
              <Alert severity="error" sx={{ borderRadius: '8px' }}>
                <Typography fontWeight={700}>Connection Failed</Typography>
                <Typography fontSize={12} sx={{ wordBreak: 'break-all', mt: 0.5, fontFamily: 'monospace' }}>
                  {errorMsg}
                </Typography>
              </Alert>
            )}
          </SectionCard>

          {/* Event log */}
          <SectionCard>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
              <SectionTitle variant="subtitle1" sx={{ mb: 0 }}>
                Event Log
              </SectionTitle>
              <Button size="small" onClick={() => setLog([])} sx={{ color: '#7b7c9d', textTransform: 'none', minWidth: 0 }}>
                Clear
              </Button>
            </Stack>
            <MonoBox sx={{ maxHeight: 240, overflowY: 'auto' }}>
              {log.length === 0 && <span style={{ color: '#555' }}>Events will appear here after you click Connect.</span>}
              {log.map((entry, i) => (
                <div key={i}>
                  <span style={{ color: '#666' }}>[{entry.time}] </span>
                  <span style={{ color: LOG_COLORS[entry.level] }}>{entry.message}</span>
                </div>
              ))}
              <div ref={logEndRef} />
            </MonoBox>
          </SectionCard>

          {/* Config preview */}
          <SectionCard>
            <SectionTitle variant="subtitle1">Config Preview</SectionTitle>
            <MonoBox>{configPreview}</MonoBox>
          </SectionCard>
        </Box>
      </Stack>
    </Box>
  );
}
