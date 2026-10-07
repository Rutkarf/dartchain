import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { AuthService } from '@auth/services/auth.service';
import { ShowcaseChatService } from '@showcase/services/showcase-chat.service';
import { ShowcaseChatStateService } from '@showcase/services/showcase-chat-state.service';
import { ChatStylePreferencesService } from '@showcase/services/chat-style-preferences.service';
import { ShowcaseChatComponent } from './showcase-chat';

describe('ShowcaseChatComponent (Phase V)', () => {
  let fixture: ComponentFixture<ShowcaseChatComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShowcaseChatComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ChatStylePreferencesService,
        {
          provide: ShowcaseChatService,
          useValue: {
            messages: signal([]).asReadonly(),
            connected: signal(true).asReadonly(),
            sendError: signal<string | null>(null).asReadonly(),
            refreshingHistory: signal(false).asReadonly(),
            connect: vi.fn(),
            disconnect: vi.fn(),
            setUsername: vi.fn(),
            sendMessage: vi.fn(),
            refreshMessages: vi.fn(() => Promise.resolve()),
            clearChat: vi.fn(() => Promise.resolve()),
          },
        },
        {
          provide: ShowcaseChatStateService,
          useValue: {
            refreshing: signal(false),
            sendError: signal<string | null>(null),
            chatLedClass: () => 'showcase-chat__live-led showcase-chat__live-led--active',
            statusLabel: () => 'Chat disponible',
            refreshMessages: vi.fn(() => Promise.resolve()),
            markAsRead: vi.fn(),
          },
        },
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: vi.fn(() => true),
            promptLogin: vi.fn(() => true),
            user: vi.fn(() => ({ username: 'alice' })),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ShowcaseChatComponent);
    fixture.componentRef.setInput('isExpanded', true);
    HTMLElement.prototype.scrollIntoView = function () {};
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create and render chat composer with unified header', () => {
    expect(fixture.componentInstance).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.showcase-chat__composer')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.showcase-chat__live-led')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.showcase-meta__room')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('.showcase-meta__rail')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('.showcase-meta__refresh')).toBeFalsy();
    expect(fixture.nativeElement.textContent).toContain('Envoyer');
  });
});
