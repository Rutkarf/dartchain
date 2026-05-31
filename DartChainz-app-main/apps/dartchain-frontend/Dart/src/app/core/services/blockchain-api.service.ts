import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import {
  Observable,
  Subject,
  catchError,
  map,
  of,
  throwError,
  switchMap,
} from 'rxjs';
import { environment } from '../../../environments/environment';
import { Block } from '../models/block.model';
import { BannerResponse } from '../models/banner-response.model';
import { ExplorerSearchResponse } from '../models/explorer-search.model';

export type PeerStatus =
  | 'CONNECTING'
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'ERROR';

export interface HealthResponse {
  ok: boolean;
  service: string;
}

export interface BlockchainStats {
  totalBlocks: number;
  latestHash: string;
  chainSize: number;
}

export interface PendingTransaction {
  id: string;
  hash?: string;
  data?: string;
  createdAt?: number;
  sender?: string;
  recipient?: string;
  amount?: number;
  timestamp?: number;
  signature?: string;
  systemReward?: boolean;
  payload?: string;

  fromAddress?: string;
  toAddress?: string;
  status?: string;
}

export interface Transaction {
  id: string;
  sender: string;
  recipient: string;
  amount: number;
  timestamp: number;
  signature: string;
  systemReward?: boolean;
  payload?: string;

  fromAddress?: string;
  toAddress?: string;
  status?: string;
  data?: string;
  hash?: string;
  createdAt?: number;
}

export interface WalletResponse {
  address: string;
  publicKey: string;
  privateKey: string;
}

export interface BalanceResponse {
  address: string;
  balance: number;
  chainBalance?: number;
  testnetAdjusted?: boolean;
}

export interface WalletCreateResponse {
  wallet: WalletResponse;
  testnetSeeded: boolean;
  welcomeMessage: string | null;
}

export interface MineBlockRequest {
  data: string;
}

export interface MineBlockResponse {
  block: Block;
}

export interface MinePendingTransactionRequest {
  id: string;
}

export interface MinePendingTransactionResponse {
  message: string;
  block: Block;
}

export interface AddPendingTransactionResponse {
  message: string;
  transaction: PendingTransaction;
}

export interface CreatePendingTransactionRequest {
  fromAddress: string;
  toAddress: string;
  amount: number;
  data?: string;
}

export interface PeerView {
  url: string;
  status: PeerStatus;
  message: string;
}

export interface AddPeerResponse {
  ok: boolean;
  peer: string;
  status: PeerStatus;
  message?: string;
}

export interface PeerStatsResponse {
  active: number;
  total: number;
}

export interface ExchangePanelResponse {
  fromToken: string;
  toToken: string;
  availableTokens: string[];
  fromBalance: number;
  toBalance: number;
  rate: number;
  testnet?: boolean;
}

export interface ExchangeSwapRequest {
  fromToken: string;
  toToken: string;
  amount: number;
  walletAddress: string;
}

export interface ExchangeSwapResponse {
  fromToken: string;
  toToken: string;
  rate: number;
  amountIn: number;
  amountOut: number;
  fromBalance: number;
  toBalance: number;
  message: string;
}

export interface CreateTransactionRequest {
  senderAddress: string;
  senderPublicKey: string;
  senderPrivateKey: string;
  recipientAddress: string;
  amount: number;
}

export interface MinePendingTransactionsRequest {
  minerAddress: string;
}

export interface MineLegacyOrModernResponse {
  block: Block;
  mode: 'legacy' | 'modern';
}

export interface ApiMessageResponse {
  ok?: boolean;
  message?: string;
  [key: string]: unknown;
}

export type LiveUpdateMessage =
  | {
      type: 'stats';
      data: BlockchainStats;
    }
  | {
      type: 'blocks';
      data: Block[];
    }
  | {
      type: 'pending-transactions';
      data: PendingTransaction[];
    }
  | {
      type: 'snapshot';
      data: {
        stats: BlockchainStats;
        blocks: Block[];
        pendingTransactions: PendingTransaction[];
      };
    };

@Injectable({
  providedIn: 'root',
})
export class BlockchainApiService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = environment.apiUrl.replace(/\/+$/, '');
  private readonly liveWsUrl = environment.liveWsUrl.replace(/\/+$/, '');

  private liveSocket: WebSocket | null = null;
  private liveReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private liveReconnectAttempt = 0;
  private liveUpdatesWanted = false;
  private readonly liveUpdatesSubject = new Subject<LiveUpdateMessage>();

  public readonly liveUpdates = this.liveUpdatesSubject.asObservable();

  // =========================================================
  // HEALTH / INFO
  // =========================================================

  public getHealth(): Observable<HealthResponse> {
    return this.http.get<HealthResponse>(`${this.apiUrl}/health`).pipe(
      catchError(() =>
        of({
          ok: true,
          service: 'blockchain-api',
        })
      )
    );
  }

  public searchExplorer(query: string): Observable<ExplorerSearchResponse> {
    const q = query.trim();
    if (!q) {
      return of({ query: '', results: [] });
    }

    return this.http
      .get<ExplorerSearchResponse>(`${this.apiUrl}/explorer/search`, {
        params: { q },
      })
      .pipe(catchError(() => of({ query: q, results: [] })));
  }

  // =========================================================
  // BLOCKS - LEGACY SIGNATURES + MODERN BACKEND COMPAT
  // =========================================================

  public getBlocks(): Observable<Block[]> {
    return this.http.get<Block[]>(`${this.apiUrl}/blocks`).pipe(
      catchError(() => this.http.get<Block[]>(`${this.apiUrl}/blockchain/blocks`))
    );
  }

  public getBlockByHash(hash: string): Observable<Block> {
    return this.http
      .get<Block>(`${this.apiUrl}/blocks/${encodeURIComponent(hash)}`)
      .pipe(catchError((error) => this.handleError(error)));
  }

  public getLatestBlock(): Observable<Block> {
    return this.http.get<Block>(`${this.apiUrl}/blocks/latest`).pipe(
      catchError(() => this.http.get<Block>(`${this.apiUrl}/blockchain/blocks/latest`))
    );
  }

  public getStats(): Observable<BlockchainStats> {
    return this.http.get<BlockchainStats>(`${this.apiUrl}/stats`).pipe(
      catchError(() => this.http.get<BlockchainStats>(`${this.apiUrl}/blockchain/stats`))
    );
  }

  public isChainValid(): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/blockchain/valid`).pipe(
      catchError(() => of(false))
    );
  }

  public mineBlock(data: string): Observable<MineBlockResponse> {
    const payload: MineBlockRequest = { data };

    return this.http.post<Block>(`${this.apiUrl}/blocks`, payload).pipe(
      map((block) => ({ block })),
      catchError(() =>
        this.http.post<Block>(`${this.apiUrl}/blockchain/blocks`, payload).pipe(
          map((block) => ({ block }))
        )
      ),
      catchError((error) => this.handleError(error))
    );
  }

  // =========================================================
  // MODERN MINING
  // =========================================================

  public minePendingTransactions(
    body: MinePendingTransactionsRequest
  ): Observable<Block> {
    return this.http.post<Block>(`${this.apiUrl}/blockchain/mine`, body).pipe(
      catchError((error) => this.handleError(error))
    );
  }

  public minePendingTransaction(
    body: MinePendingTransactionRequest
  ): Observable<MinePendingTransactionResponse> {
    return this.http
      .post<MinePendingTransactionResponse>(
        `${this.apiUrl}/pending-transactions/${encodeURIComponent(body.id)}/mine`,
        {}
      )
      .pipe(catchError((error) => this.handleError(error)));
  }

  public mineAuto(
    options: { minerAddress?: string; data?: string; pendingId?: string }
  ): Observable<MineLegacyOrModernResponse> {
    if (options.minerAddress) {
      return this.minePendingTransactions({
        minerAddress: options.minerAddress,
      }).pipe(
        map((block) => ({
          block,
          mode: 'modern' as const,
        }))
      );
    }

    if (options.pendingId) {
      return this.minePendingTransaction({ id: options.pendingId }).pipe(
        map((response) => ({
          block: response.block,
          mode: 'legacy' as const,
        }))
      );
    }

    if (options.data) {
      return this.mineBlock(options.data).pipe(
        map((response) => ({
          block: response.block,
          mode: 'legacy' as const,
        }))
      );
    }

    return throwError(() => new Error('No mining options provided'));
  }

  // =========================================================
  // PENDING TRANSACTIONS - LEGACY + MODERN
  // =========================================================

  public getPendingTransactions(): Observable<PendingTransaction[]> {
    return this.http
      .get<PendingTransaction[]>(`${this.apiUrl}/pending-transactions`)
      .pipe(
        catchError(() =>
          this.http.get<PendingTransaction[]>(`${this.apiUrl}/transactions/pending`)
        ),
        catchError((error) => this.handleError(error))
      );
  }

  public addPendingTransaction(
    payload: string | CreatePendingTransactionRequest
  ): Observable<AddPendingTransactionResponse> {
    const body =
      typeof payload === 'string'
        ? { data: payload }
        : {
            fromAddress: payload.fromAddress,
            toAddress: payload.toAddress,
            amount: payload.amount,
            data: payload.data ?? '',
          };

    return this.http
      .post<AddPendingTransactionResponse>(`${this.apiUrl}/pending-transactions`, body)
      .pipe(
        catchError(() =>
          this.http
            .post<AddPendingTransactionResponse>(
              `${this.apiUrl}/transactions/pending`,
              body
            )
            .pipe(catchError((error) => this.handleError(error)))
        ),
        catchError((error) => this.handleError(error))
      );
  }

  // =========================================================
  // MODERN TRANSACTIONS / WALLET
  // =========================================================

  public createWallet(): Observable<WalletCreateResponse> {
    return this.http.post<WalletCreateResponse>(`${this.apiUrl}/wallets/create`, {}).pipe(
      catchError((error) => this.handleError(error))
    );
  }

  public createTransaction(
    body: CreateTransactionRequest
  ): Observable<Transaction> {
    return this.http.post<Transaction>(`${this.apiUrl}/transactions`, body).pipe(
      catchError((error) => this.handleError(error))
    );
  }

  public sendSignedTransaction(
    body: CreatePendingTransactionRequest
  ): Observable<AddPendingTransactionResponse> {
    return this.addPendingTransaction(body);
  }

  public getBalance(address: string): Observable<BalanceResponse> {
    return this.http
      .get<BalanceResponse>(
        `${this.apiUrl}/blockchain/balance/${encodeURIComponent(address)}`
      )
      .pipe(
        catchError((error) => this.handleError(error))
      );
  }

  // Helpers métier pour l'UI
  public sendTransaction(
    senderAddress: string,
    senderPublicKey: string,
    senderPrivateKey: string,
    recipientAddress: string,
    amount: number
  ): Observable<Transaction> {
    return this.createTransaction({
      senderAddress,
      senderPublicKey,
      senderPrivateKey,
      recipientAddress,
      amount,
    });
  }

  public rewardMiner(minerAddress: string): Observable<Block> {
    return this.minePendingTransactions({ minerAddress });
  }

  // =========================================================
  // PEERS
  // =========================================================

  public getPeers(): Observable<PeerView[]> {
    return this.http.get<PeerView[]>(`${this.apiUrl}/peers`).pipe(
      catchError(() => of([]))
    );
  }

  public getPeerStats(): Observable<PeerStatsResponse> {
    return this.http.get<PeerStatsResponse>(`${this.apiUrl}/peers/stats`).pipe(
      catchError((error) => this.handleError(error))
    );
  }

  public addPeer(peer: string): Observable<AddPeerResponse> {
    return this.http.post<AddPeerResponse>(`${this.apiUrl}/peers`, { peer }).pipe(
      catchError((error) => this.handleError(error))
    );
  }

  public reconnectPeer(peer: string): Observable<AddPeerResponse> {
    return this.http.post<AddPeerResponse>(`${this.apiUrl}/peers/reconnect`, { peer }).pipe(
      catchError((error) => this.handleError(error))
    );
  }

  // =========================================================
  // BANNER
  // =========================================================

  public getBanner(): Observable<BannerResponse> {
    return this.http.get<BannerResponse>(`${this.apiUrl}/banner`).pipe(
      catchError(() =>
        of({
          message1: 'DartChain',
          lastTransaction: 'Aucune transaction récente',
          lastTransactionShort: 'Aucune',
          userCount: 0,
        })
      )
    );
  }

  // =========================================================
  // EXCHANGE PANEL
  // =========================================================

  public getExchangePanel(params?: {
    walletAddress?: string;
    fromToken?: string;
    toToken?: string;
  }): Observable<ExchangePanelResponse> {
    let httpParams = new HttpParams();

    if (params?.walletAddress) {
      httpParams = httpParams.set('walletAddress', params.walletAddress);
    }
    if (params?.fromToken) {
      httpParams = httpParams.set('fromToken', params.fromToken);
    }
    if (params?.toToken) {
      httpParams = httpParams.set('toToken', params.toToken);
    }

    return this.http
      .get<ExchangePanelResponse>(`${this.apiUrl}/exchange-panel`, { params: httpParams })
      .pipe(
        catchError(() =>
          of({
            fromToken: 'BTC',
            toToken: 'R4V3',
            availableTokens: ['R4V3', 'BTC'],
            fromBalance: 0,
            toBalance: 0,
            rate: 1,
            testnet: true,
          })
        )
      );
  }

  public swapExchangeTokens(
    body: ExchangeSwapRequest
  ): Observable<ExchangeSwapResponse> {
    return this.http
      .post<ExchangeSwapResponse>(`${this.apiUrl}/exchange-panel/swap`, body)
      .pipe(
        catchError((error) => this.handleError(error))
      );
  }

  // =========================================================
  // COMPAT HELPERS
  // =========================================================

  public getLegacyBlocks(): Observable<Block[]> {
    return this.http.get<Block[]>(`${this.apiUrl}/blocks`).pipe(
      catchError((error) => this.handleError(error))
    );
  }

  public getModernBlocks(): Observable<Block[]> {
    return this.http.get<Block[]>(`${this.apiUrl}/blockchain/blocks`).pipe(
      catchError((error) => this.handleError(error))
    );
  }

  public getLegacyStats(): Observable<BlockchainStats> {
    return this.http.get<BlockchainStats>(`${this.apiUrl}/stats`).pipe(
      catchError((error) => this.handleError(error))
    );
  }

  public getModernStats(): Observable<BlockchainStats> {
    return this.http.get<BlockchainStats>(`${this.apiUrl}/blockchain/stats`).pipe(
      catchError((error) => this.handleError(error))
    );
  }

  public getLegacyPendingTransactions(): Observable<PendingTransaction[]> {
    return this.http.get<PendingTransaction[]>(
      `${this.apiUrl}/pending-transactions`
    ).pipe(
      catchError((error) => this.handleError(error))
    );
  }

  public getModernPendingTransactions(): Observable<Transaction[]> {
    return this.http.get<Transaction[]>(`${this.apiUrl}/transactions/pending`).pipe(
      catchError((error) => this.handleError(error))
    );
  }

  // =========================================================
  // LIVE WS
  // =========================================================

  public connectLiveUpdates(): Observable<LiveUpdateMessage> {
    this.liveUpdatesWanted = true;
    this.openLiveSocket();
    return this.liveUpdates;
  }

  private openLiveSocket(): void {
    if (!this.liveUpdatesWanted) {
      return;
    }

    if (
      this.liveSocket &&
      (this.liveSocket.readyState === WebSocket.OPEN ||
        this.liveSocket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    this.liveSocket = new WebSocket(this.liveWsUrl);

    this.liveSocket.onopen = () => {
      this.liveReconnectAttempt = 0;
    };

    this.liveSocket.onmessage = (event: MessageEvent<string>) => {
      const parsed = this.parseLiveUpdate(event.data);

      if (parsed) {
        this.liveUpdatesSubject.next(parsed);
      }
    };

    this.liveSocket.onerror = () => {
      // onclose déclenche la reconnexion (cold start Render, réseau, etc.)
    };

    this.liveSocket.onclose = () => {
      this.liveSocket = null;
      this.scheduleLiveReconnect();
    };
  }

  private scheduleLiveReconnect(): void {
    if (!this.liveUpdatesWanted || this.liveReconnectTimer) {
      return;
    }

    const delay = Math.min(30_000, 1_000 * 2 ** this.liveReconnectAttempt);
    this.liveReconnectAttempt += 1;

    this.liveReconnectTimer = setTimeout(() => {
      this.liveReconnectTimer = null;
      this.openLiveSocket();
    }, delay);
  }

  private clearLiveReconnect(): void {
    if (this.liveReconnectTimer) {
      clearTimeout(this.liveReconnectTimer);
      this.liveReconnectTimer = null;
    }
    this.liveReconnectAttempt = 0;
  }

  public disconnectLiveUpdates(): void {
    this.liveUpdatesWanted = false;
    this.clearLiveReconnect();

    if (!this.liveSocket) {
      return;
    }

    this.liveSocket.onopen = null;
    this.liveSocket.onmessage = null;
    this.liveSocket.onerror = null;
    this.liveSocket.onclose = null;

    if (
      this.liveSocket.readyState === WebSocket.OPEN ||
      this.liveSocket.readyState === WebSocket.CONNECTING
    ) {
      this.liveSocket.close();
    }

    this.liveSocket = null;
  }

  private parseLiveUpdate(raw: string): LiveUpdateMessage | null {
    try {
      return JSON.parse(raw) as LiveUpdateMessage;
    } catch (error) {
      console.error('Invalid live update payload:', error);
      return null;
    }
  }

  // =========================================================
  // GENERIC HELPERS
  // =========================================================

  public get<T>(path: string): Observable<T> {
    return this.http.get<T>(this.buildUrl(path)).pipe(
      catchError((error) => this.handleError(error))
    );
  }

  public post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<T>(this.buildUrl(path), body).pipe(
      catchError((error) => this.handleError(error))
    );
  }

  public pingEndpoint(path: string): Observable<boolean> {
    return this.http.get(this.buildUrl(path)).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  private buildUrl(path: string): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.apiUrl}${normalizedPath}`;
  }

  private handleError(error: unknown): Observable<never> {
    if (error instanceof HttpErrorResponse) {
      const message =
        typeof error.error?.message === 'string'
          ? error.error.message
          : `HTTP ${error.status} - ${error.statusText || 'Unknown error'}`;

      return throwError(() => new Error(message));
    }

    return throwError(() => new Error('Unexpected API error'));
  }
}

export type { Block };