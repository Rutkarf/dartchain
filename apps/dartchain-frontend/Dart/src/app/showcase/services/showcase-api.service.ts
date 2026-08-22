import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ChartRange,
  ChartResponse,
  ChatHistoryResponse,
  CreateLaunchProjectRequest,
  LaunchProject,
  ChatMessage,
  NewsActionType,
  NewsFeedResponse,
  NewsItem,
  NewsSource,
  PostChatMessageRequest,
  R4v3ShowcaseResponse,
  CommunityFaqApiQuestion,
  CommunityFaqListResponse,
  CreateCommunityFaqQuestionRequest,
  CommunityFaqVoteRequest,
} from '@showcase/models/showcase.model';

import { formatFromMessage } from '@core/constants/chat-format.constants';

export interface NewsFeedParams {
  category?: string;
  source?: NewsSource | 'all';
  limit?: number;
  offset?: number;
}

@Injectable({
  providedIn: 'root',
})
export class ShowcaseApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl.replace(/\/+$/, '')}/showcase`;

  getNewsFeed(params: NewsFeedParams = {}): Observable<NewsFeedResponse> {
    const limit = params.limit ?? 20;
    const offset = params.offset ?? 0;

    let httpParams = new HttpParams()
      .set('limit', limit)
      .set('offset', offset);

    if (params.category && params.category !== 'all') {
      httpParams = httpParams.set('category', params.category);
    }

    if (params.source && params.source !== 'all') {
      httpParams = httpParams.set('source', params.source);
    }

    return this.http
      .get<NewsFeedResponse>(`${this.baseUrl}/news`, { params: httpParams })
      .pipe(
        map((feed) => this.normalizeFeed(feed)),
        catchError(() => of(this.emptyNewsFeed()))
      );
  }

  getNewsItem(id: string): Observable<NewsItem | null> {
    return this.http
      .get<NewsItem>(`${this.baseUrl}/news/${encodeURIComponent(id)}`)
      .pipe(
        map((item) => this.normalizeItem(item)),
        catchError(() => of(null))
      );
  }

  getR4v3Dashboard(params: NewsFeedParams = {}): Observable<R4v3ShowcaseResponse | null> {
    const limit = params.limit ?? 12;
    const offset = params.offset ?? 0;

    let httpParams = new HttpParams()
      .set('limit', limit)
      .set('offset', offset);

    if (params.source && params.source !== 'all') {
      httpParams = httpParams.set('source', params.source);
    }

    return this.http
      .get<R4v3ShowcaseResponse>(`${this.baseUrl}/r4v3`, { params: httpParams })
      .pipe(
        map((payload) => ({
          ...payload,
          news: this.normalizeFeed(payload.news),
          panel: {
            ...payload.panel,
            points: [...(payload.panel?.points ?? [])],
          },
        })),
        catchError(() => of(null))
      );
  }

  getChart(range: ChartRange = '24h', pair = 'R4V3-CHF'): Observable<ChartResponse | null> {
    const params = new HttpParams().set('range', range).set('pair', pair);

    return this.http
      .get<ChartResponse>(`${this.baseUrl}/chart`, { params })
      .pipe(catchError(() => of(null)));
  }

  getChatMessages(limit = 50): Observable<ChatHistoryResponse> {
    const params = new HttpParams().set('limit', limit);

    return this.http
      .get<ChatHistoryResponse>(`${this.baseUrl}/chat/messages`, { params })
      .pipe(
        map((history) => ({
          ...history,
          messages: history.messages.map((msg) => this.normalizeChatMessage(msg)),
        })),
        catchError(() => of({ roomId: 'global', messages: [] }))
      );
  }

  postChatMessage(body: PostChatMessageRequest): Observable<ChatMessage> {
    return this.http
      .post<ChatMessage>(`${this.baseUrl}/chat/messages`, body)
      .pipe(map((msg) => this.normalizeChatMessage(msg)));
  }

  clearChatMessages(roomId = 'global'): Observable<void> {
    const params = new HttpParams().set('roomId', roomId);

    return this.http.delete<void>(`${this.baseUrl}/chat/messages`, { params });
  }

  getLaunchProjects(): Observable<LaunchProject[]> {
    return this.http
      .get<LaunchProject[]>(`${this.baseUrl}/launch/projects`)
      .pipe(catchError(() => of([])));
  }

  createLaunchProject(body: CreateLaunchProjectRequest): Observable<LaunchProject> {
    return this.http.post<LaunchProject>(`${this.baseUrl}/launch/projects`, body);
  }

  getCommunityFaqQuestions(limit = 50): Observable<CommunityFaqListResponse> {
    const params = new HttpParams().set('limit', limit).set('sort', 'rank');

    return this.http
      .get<CommunityFaqListResponse>(`${this.baseUrl}/faq/questions`, { params })
      .pipe(catchError(() => of({ questions: [], totalCount: 0 })));
  }

  getLatestCommunityFaqQuestion(): Observable<CommunityFaqApiQuestion | null> {
    return this.http
      .get<CommunityFaqApiQuestion>(`${this.baseUrl}/faq/questions/latest`)
      .pipe(catchError(() => of(null)));
  }

  getPopularCommunityFaqQuestions(limit = 10): Observable<CommunityFaqListResponse> {
    const params = new HttpParams().set('limit', limit);

    return this.http
      .get<CommunityFaqListResponse>(`${this.baseUrl}/faq/questions/popular`, { params })
      .pipe(catchError(() => of({ questions: [], totalCount: 0 })));
  }

  createCommunityFaqQuestion(
    body: CreateCommunityFaqQuestionRequest
  ): Observable<CommunityFaqApiQuestion> {
    return this.http.post<CommunityFaqApiQuestion>(`${this.baseUrl}/faq/questions`, body);
  }

  voteCommunityFaqQuestion(
    id: string,
    body: CommunityFaqVoteRequest
  ): Observable<CommunityFaqApiQuestion> {
    return this.http.post<CommunityFaqApiQuestion>(
      `${this.baseUrl}/faq/questions/${encodeURIComponent(id)}/vote`,
      body
    );
  }

  private normalizeFeed(feed: NewsFeedResponse): NewsFeedResponse {
    return {
      ...feed,
      items: feed.items.map((item) => this.normalizeItem(item)),
    };
  }

  private normalizeItem(item: NewsItem): NewsItem {
    return {
      ...item,
      body: item.body || item.summary,
      actionType: (item.actionType ?? 'NONE') as NewsActionType,
      actionTarget: item.actionTarget ?? null,
      featured: !!item.featured,
    };
  }

  private normalizeChatMessage(message: ChatMessage): ChatMessage {
    const format = formatFromMessage(message);
    return {
      ...message,
      ...format,
    };
  }

  private emptyNewsFeed(): NewsFeedResponse {
    return {
      headline: 'DartChain',
      lastTransaction: '—',
      featuredId: null,
      items: [],
      categories: ['Réseau', 'R4V3', 'Peers', 'Écosystème'],
      liveActivity: 'Chaîne en attente',
      lastRefreshedAt: new Date().toISOString(),
      totalCount: 0,
      hasMore: false,
    };
  }
}
